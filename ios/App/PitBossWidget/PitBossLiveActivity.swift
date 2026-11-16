import ActivityKit
import SwiftUI
import WidgetKit

// The app's palette, from src/index.css. Brass is "touch this" in the app; here
// there is nothing to touch, so it is used for the one number that matters.
private let table = Color(red: 0.078, green: 0.067, blue: 0.063)
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

@available(iOS 16.2, *)
private struct Label: View {
    let text: String
    var body: some View {
        Text(text)
            .font(.system(size: 11, weight: .semibold))
            .tracking(1.1)
            .foregroundStyle(smoke)
    }
}

// The lock screen presentation: the two numbers worth standing up for, and
// nothing else. The duration counts itself — `style: .timer` is rendered by the
// system from a fixed start date, so it stays right with no updates from us.
@available(iOS 16.2, *)
struct LockScreenView: View {
    let context: ActivityViewContext<PitBossAttributes>

    var body: some View {
        HStack(alignment: .center, spacing: 18) {
            VStack(alignment: .leading, spacing: 3) {
                Label(text: "ON THE TABLE")
                Text(money(context.state.potCents))
                    .font(.system(size: 34, weight: .bold, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(chalk)
                    .minimumScaleFactor(0.6)
                    .lineLimit(1)
            }

            Spacer(minLength: 8)

            VStack(alignment: .trailing, spacing: 3) {
                Label(text: "RUNNING")
                Text(context.attributes.startedAt, style: .timer)
                    .font(.system(size: 34, weight: .bold, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(brass)
                    .multilineTextAlignment(.trailing)
                    .minimumScaleFactor(0.6)
                    .lineLimit(1)
            }
            .frame(maxWidth: 150, alignment: .trailing)
        }
        .padding(.horizontal, 18)
        .padding(.vertical, 14)
        .overlay(alignment: .bottomLeading) {
            Text(seatLine)
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(smoke)
                .padding(.leading, 18)
                .padding(.bottom, 4)
        }
    }

    private var seatLine: String {
        let p = context.state.players
        let seated = "\(p) player\(p == 1 ? "" : "s")"
        return context.state.stillIn < p
            ? "\(seated) · \(context.state.stillIn) still in"
            : seated
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
                    VStack(alignment: .leading, spacing: 2) {
                        Label(text: "ON THE TABLE")
                        Text(money(context.state.potCents))
                            .font(.system(size: 26, weight: .bold, design: .rounded))
                            .monospacedDigit()
                            .foregroundStyle(chalk)
                    }
                }
                DynamicIslandExpandedRegion(.trailing) {
                    VStack(alignment: .trailing, spacing: 2) {
                        Label(text: "RUNNING")
                        Text(context.attributes.startedAt, style: .timer)
                            .font(.system(size: 26, weight: .bold, design: .rounded))
                            .monospacedDigit()
                            .foregroundStyle(brass)
                            .frame(maxWidth: 110, alignment: .trailing)
                    }
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text("\(context.state.stillIn) of \(context.state.players) still in")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(smoke)
                }
            } compactLeading: {
                Text(money(context.state.potCents))
                    .monospacedDigit()
                    .foregroundStyle(chalk)
            } compactTrailing: {
                Text(context.attributes.startedAt, style: .timer)
                    .monospacedDigit()
                    .foregroundStyle(brass)
                    .frame(maxWidth: 44)
            } minimal: {
                Image(systemName: "suit.spade.fill").foregroundStyle(brass)
            }
            .widgetURL(URL(string: "pitboss://table"))
            .keylineTint(brass)
        }
    }
}
