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
                // `.relative`, not `.timer`: a stopwatch ticking seconds is the
                // wrong grain for "how long has this been going", and it is the
                // system that draws it either way. Coarse also means never
                // stale — the app cannot push an update from behind a locked
                // screen, so anything pre-formatted would freeze there.
                Tile(label: "Running") {
                    Text(context.attributes.startedAt, style: .relative)
                }
                Tile(label: "Buy-in") { Text(money(state.buyInCents)) }
                Tile(label: "Players") { Text("\(state.players)") }
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
                        Text("GAME IN PROGRESS")
                            .font(.system(size: 10, weight: .bold))
                            .tracking(1.1)
                            .foregroundStyle(brass)
                        Text(money(context.state.potCents))
                            .font(.system(size: 28, weight: .bold, design: .rounded))
                            .monospacedDigit()
                            .foregroundStyle(chalk)
                    }
                }
                DynamicIslandExpandedRegion(.trailing) {
                    VStack(alignment: .trailing, spacing: 1) {
                        Text("RUNNING")
                            .font(.system(size: 10, weight: .bold))
                            .tracking(1.1)
                            .foregroundStyle(smoke)
                        Text(context.attributes.startedAt, style: .timer)
                            .font(.system(size: 17, weight: .semibold, design: .rounded))
                            .monospacedDigit()
                            .foregroundStyle(chalk)
                            .frame(maxWidth: 92, alignment: .trailing)
                            .lineLimit(1)
                            .minimumScaleFactor(0.5)
                    }
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text("\(money(context.state.boughtInCents)) bought in · \(context.state.stillIn) still playing")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(smoke)
                        .padding(.top, 2)
                }
            } compactLeading: {
                Text(money(context.state.potCents))
                    .monospacedDigit()
                    .foregroundStyle(chalk)
            } compactTrailing: {
                Text(context.attributes.startedAt, style: .timer)
                    .monospacedDigit()
                    .foregroundStyle(smoke)
                    .frame(maxWidth: 44)
            } minimal: {
                Image(systemName: "suit.spade.fill").foregroundStyle(brass)
            }
            .widgetURL(URL(string: "pitboss://table"))
            .keylineTint(brass)
        }
    }
}
