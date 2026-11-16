import ActivityKit
import Foundation

// Shared by the app (which starts and updates the activity) and the widget
// extension (which draws it). Both targets compile this same file — the types
// must be identical on each side or the activity silently fails to decode.
@available(iOS 16.2, *)
struct PitBossAttributes: ActivityAttributes {
    // Everything that changes while the night runs.
    public struct ContentState: Codable, Hashable {
        // Cents, like every other amount in this app. Formatting happens at the
        // edge so rounding never creeps into a total.
        var potCents: Int
        var players: Int
        var stillIn: Int
    }

    // Fixed for the life of the activity. The duration is rendered from this by
    // the system, counting up on its own, so the app does not have to push an
    // update every second — or every minute — to keep the clock honest.
    var startedAt: Date
}
