import ActivityKit
import SwiftUI
import WidgetKit

// The app's palette, from src/index.css.
private let table = Color(red: 0.078, green: 0.067, blue: 0.063)
private let rail = Color(red: 0.161, green: 0.137, blue: 0.125)
private let hairline = Color(red: 0.220, green: 0.188, blue: 0.169)
private let brass = Color(red: 0.914, green: 0.631, blue: 0.231)
private let chalk = Color(red: 0.953, green: 0.925, blue: 0.890)
private let smoke = Color(red: 0.651, green: 0.596, blue: 0.565)

// Whole dollars when it divides evenly, which at a home game it almost always
// does. A lock screen is read at a glance and ".00" is noise.
private func money(_ cents: Int) -> String {
    cents % 100 == 0
        ? "$\(cents / 100)"
        : String(format: "$%.2f", Double(cents) / 100)
}

// Durations are computed here rather than handed to SwiftUI's .timer or
// .relative styles. Those draw themselves and never go stale, which is why the
// first pass used them, but neither can be told what grain to use: .timer ticks
// seconds forever, and .relative renders "2 min, 15 sec" — which truncates to
// "2 min, 1…" in the compact island. Computing costs staleness between activity
// updates and buys exact control of the format.

// "7m" under the hour, "1h 20m" over it. Never seconds: on a glance surface
// they are noise, and they make the value jitter at a width it cannot afford.
private func elapsed(since start: Date) -> String {
    let minutes = max(0, Int(Date().timeIntervalSince(start) / 60))
    return minutes < 60 ? "\(minutes)m" : "\(minutes / 60)h \(minutes % 60)m"
}

// Whole hours for the compact island, where there is room for about four
// characters. "<1h" rather than a bare "0h", which reads as a broken clock.
private func hoursOnly(since start: Date) -> String {
    let hours = Int(Date().timeIntervalSince(start) / 3600)
    return hours < 1 ? "<1h" : "\(hours)h"
}

// Counting down to the next bomb pot. Past due reads "Now" rather than running
// negative: the app only re-arms the timer while it is open, so a deadline can
// sit in the past until the host comes back to it.
private func countdown(to due: Date) -> String {
    let minutes = Int(due.timeIntervalSinceNow / 60)
    if minutes < 1 { return "Now" }
    return minutes < 60 ? "\(minutes)m" : "\(minutes / 60)h \(minutes % 60)m"
}

// One of the three small boxes along the bottom, same as the app's home card:
// a quiet label over a bold value, on a raised panel.
@available(iOS 16.2, *)
private struct Tile<Value: View>: View {
    let label: String
    @ViewBuilder var value: Value

    var body: some View {
        VStack(alignment: .leading, spacing: 1) {
            Text(label)
                .font(.system(size: 10, weight: .medium))
                .foregroundStyle(smoke)
            value
                .font(.system(size: 15, weight: .bold))
                .foregroundStyle(chalk)
                .lineLimit(1)
                .minimumScaleFactor(0.6)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 9)
        .padding(.vertical, 6)
        .background(
            RoundedRectangle(cornerRadius: 9, style: .continuous)
                .fill(rail.opacity(0.55))
                .overlay(
                    RoundedRectangle(cornerRadius: 9, style: .continuous)
                        .strokeBorder(hairline, lineWidth: 1)
                )
        )
    }
}

// The lock screen card is the app's own "game in progress" card. Same eyebrow,
// same hero number, same supporting line, same three tiles — so it is read
// without being learned.
@available(iOS 16.2, *)
struct LockScreenView: View {
    let context: ActivityViewContext<PitBossAttributes>

    private var state: PitBossAttributes.ContentState { context.state }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .top) {
                Text("GAME IN PROGRESS")
                    .font(.system(size: 11, weight: .bold))
                    .tracking(1.3)
                    .foregroundStyle(brass)

                Spacer(minLength: 8)

                // The widget cannot reach the app's AppIcon, so it ships its
                // own copy. Clipped to the same continuous rounded square iOS
                // masks app icons with, rather than left as a bare square.
                Image("AppMark")
                    .resizable()
                    .frame(width: 26, height: 26)
                    .clipShape(RoundedRectangle(cornerRadius: 26 * 0.2237, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 26 * 0.2237, style: .continuous)
                            .strokeBorder(.white.opacity(0.08), lineWidth: 0.5)
                    )
            }

            Text(money(state.potCents))
                .font(.system(size: 38, weight: .bold, design: .rounded))
                .monospacedDigit()
                .foregroundStyle(chalk)
                .lineLimit(1)
                .minimumScaleFactor(0.5)
                .padding(.top, 2)

            Text(summary)
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(smoke)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
                .padding(.top, 1)

            HStack(spacing: 7) {
                Tile(label: "Running") {
                    Text(elapsed(since: context.attributes.startedAt))
                }
                Tile(label: "Buy-in") { Text(money(state.buyInCents)) }
                Tile(label: "Bomb pot") {
                    if let due = state.bombPotAt {
                        Text(countdown(to: due))
                    } else {
                        Text("Off").foregroundStyle(smoke)
                    }
                }
            }
            .padding(.top, 10)
        }
        .padding(.horizontal, 15)
        .padding(.vertical, 14)
        .background(alignment: .top) {
            // The lamp. Every screen in the app carries one restrained warm
            // wash at the top; without it this is black with text on it.
            RadialGradient(
                colors: [brass.opacity(0.14), .clear],
                center: .top, startRadius: 0, endRadius: 200
            )
        }
    }

    // "$300 bought in · 5 still playing · 1 cashed out" — the cashed-out clause
    // only once somebody has, so an untouched table does not read as a list of
    // zeroes.
    private var summary: String {
        let out = state.players - state.stillIn
        var parts = ["\(money(state.boughtInCents)) bought in",
                     "\(state.stillIn) still playing"]
        if out > 0 { parts.append("\(out) cashed out") }
        return parts.joined(separator: " · ")
    }
}

@available(iOS 16.2, *)
struct PitBossLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: PitBossAttributes.self) { context in
            LockScreenView(context: context)
                .activityBackgroundTint(table)
                .activitySystemActionForegroundColor(brass)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    VStack(alignment: .leading, spacing: 1) {
                        // Shorter than the lock screen's "GAME IN PROGRESS",
                        // which wraps to two lines in this narrow region and
                        // pushes the amount down. This also labels the number
                        // under it, which the longer eyebrow does not.
                        Text("ON THE TABLE")
                            .font(.system(size: 10, weight: .bold))
                            .tracking(1.1)
                            .foregroundStyle(brass)
                        Text(money(context.state.potCents))
                            .font(.system(size: 28, weight: .bold, design: .rounded))
                            .monospacedDigit()
                            .foregroundStyle(chalk)
                    }
                    // The expanded regions butt right up to the island's edge
                    // on their own; nothing in the layout gives them room.
                    .padding(.leading, 6)
                    .padding(.top, 2)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    VStack(alignment: .trailing, spacing: 1) {
                        Text("RUNNING")
                            .font(.system(size: 10, weight: .bold))
                            .tracking(1.1)
                            .foregroundStyle(smoke)
                        Text(elapsed(since: context.attributes.startedAt))
                            .font(.system(size: 17, weight: .semibold, design: .rounded))
                            .monospacedDigit()
                            .foregroundStyle(chalk)
                            .frame(maxWidth: 92, alignment: .trailing)
                            .lineLimit(1)
                            .minimumScaleFactor(0.5)
                    }
                    .padding(.trailing, 6)
                    .padding(.top, 2)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text("\(money(context.state.boughtInCents)) bought in · \(context.state.stillIn) still playing")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(smoke)
                        .padding(.top, 4)
                        .padding(.horizontal, 6)
                        .padding(.bottom, 2)
                }
            } compactLeading: {
                Text(money(context.state.potCents))
                    .monospacedDigit()
                    .foregroundStyle(chalk)
            } compactTrailing: {
                Text(hoursOnly(since: context.attributes.startedAt))
                    .monospacedDigit()
                    .foregroundStyle(smoke)
                    .frame(maxWidth: 46)
                    .lineLimit(1)
            } minimal: {
                Image(systemName: "suit.spade.fill").foregroundStyle(brass)
            }
            .widgetURL(URL(string: "pitboss://table"))
            .keylineTint(brass)
        }
    }
}
