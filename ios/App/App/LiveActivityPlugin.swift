import ActivityKit
import Capacitor
import Foundation

// The web layer cannot touch ActivityKit, so this is the whole bridge: start,
// update, end. It keeps a handle on the running activity rather than looking it
// up each time, because `Activity.activities` is empty for a moment after a
// cold start and an update that lands in that gap would be dropped silently.
@objc(LiveActivityPlugin)
public class LiveActivityPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "LiveActivityPlugin"
    public let jsName = "LiveActivity"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isSupported", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "update", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "end", returnType: CAPPluginReturnPromise),
    ]

    private var current: Any?

    @objc func isSupported(_ call: CAPPluginCall) {
        if #available(iOS 16.2, *) {
            // The user can switch live activities off per app, and then nothing
            // we do here will show. Report that honestly so the web side can
            // stop trying rather than failing on every buy-in.
            call.resolve(["supported": ActivityAuthorizationInfo().areActivitiesEnabled])
        } else {
            call.resolve(["supported": false])
        }
    }

    @available(iOS 16.2, *)
    private func state(from call: CAPPluginCall) -> PitBossAttributes.ContentState {
        // Seats arrive as [{ color, out }]. Anything malformed is dropped
        // rather than defaulted: a seat drawn in the wrong colour is worse
        // than one missing, because the strip is read as the table.
        let raw = call.getArray("seats", JSObject.self) ?? []
        let seats: [PitBossAttributes.Seat] = raw.compactMap { entry in
            guard let color = entry["color"] as? String else { return nil }
            return PitBossAttributes.Seat(color: color, out: (entry["out"] as? Bool) ?? false)
        }
        return PitBossAttributes.ContentState(
            potCents: call.getInt("potCents") ?? 0,
            players: call.getInt("players") ?? 0,
            stillIn: call.getInt("stillIn") ?? 0,
            seats: seats
        )
    }

    @objc func start(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            call.resolve(["started": false]); return
        }
        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
            call.resolve(["started": false]); return
        }

        // Starting twice would stack two cards on the lock screen, so an
        // existing one is ended first. A night is singular by definition.
        endAll()

        // Milliseconds since epoch, the same clock the app's own timer uses.
        let startedMs = call.getDouble("startedAt") ?? (Date().timeIntervalSince1970 * 1000)
        let attributes = PitBossAttributes(startedAt: Date(timeIntervalSince1970: startedMs / 1000))

        do {
            let activity = try Activity.request(
                attributes: attributes,
                content: .init(state: state(from: call), staleDate: nil),
                pushType: nil
            )
            current = activity
            call.resolve(["started": true, "id": activity.id])
        } catch {
            call.resolve(["started": false, "error": error.localizedDescription])
        }
    }

    @objc func update(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else { call.resolve(); return }
        let next = state(from: call)
        Task {
            if let activity = current as? Activity<PitBossAttributes> {
                await activity.update(.init(state: next, staleDate: nil))
            } else {
                // Lost the handle — the app was relaunched while a night ran.
                for activity in Activity<PitBossAttributes>.activities {
                    await activity.update(.init(state: next, staleDate: nil))
                    current = activity
                }
            }
            call.resolve()
        }
    }

    @objc func end(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else { call.resolve(); return }
        endAll()
        call.resolve()
    }

    @available(iOS 16.2, *)
    private func endAll() {
        let running = Activity<PitBossAttributes>.activities
        current = nil
        Task {
            for activity in running {
                // .immediate, not .default: the night is over and a card that
                // lingers for hours afterwards is just wrong information.
                await activity.end(nil, dismissalPolicy: .immediate)
            }
        }
    }
}
