import ActivityKit
import SwiftUI
import WidgetKit

// The app's palette, from src/index.css.
private let table = Color(red: 0.078, green: 0.067, blue: 0.063)
private let brass = Color(red: 0.914, green: 0.631, blue: 0.231)
private let chalk = Color(red: 0.953, green: 0.925, blue: 0.890)
private let smoke = Color(red: 0.651, green: 0.596, blue: 0.565)
private let hairline = Color(red: 0.220, green: 0.188, blue: 0.169)

// Whole dollars when it divides evenly, which at a home game it almost always
// does. A lock screen is read at a glance and ".00" is noise.
private func money(_ cents: Int) -> String {
    cents % 100 == 0
        ? "$\(cents / 100)"
        : String(format: "$%.2f", Double(cents) / 100)
}

private func hex(_ s: String) -> Color {
    var v: UInt64 = 0
    Scanner(string: s.replacingOccurrences(of: "#", with: "")).scanHexInt64(&v)
    return Color(
        red: Double((v >> 16) & 0xFF) / 255,
        green: Double((v >> 8) & 0xFF) / 255,
        blue: Double(v & 0xFF) / 255
    )
}

@available(iOS 16.2, *)
private struct Eyebrow: View {
    let text: String
    var body: some View {
        Text(text)
            .font(.system(size: 10, weight: .semibold))
            .tracking(1.2)
            .foregroundStyle(smoke)
    }
}

// The table, as chips. One dot per seat in roster colour, dimmed once someone
// cashes out — so a glance says both how many are left and that the night is
// winding down, without a single word. This is the app's own identity: player
// colours are real clay denominations.
@available(iOS 16.2, *)
private struct SeatStrip: View {
    let seats: [PitBossAttributes.Seat]
    var dot: CGFloat = 9

    var body: some View {
        HStack(spacing: 5) {
            ForEach(Array(seats.prefix(12).enumerated()), id: \.offset) { _, seat in
                Circle()
                    .fill(hex(seat.color))
                    .frame(width: dot, height: dot)
                    .opacity(seat.out ? 0.22 : 1)
                    .overlay(
                        Circle().strokeBorder(.white.opacity(seat.out ? 0 : 0.14), lineWidth: 0.5)
                    )
            }
            if seats.count > 12 {
                Text("+\(seats.count - 12)")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(smoke)
            }
        }
    }
}

// Lock screen. One hero number — the pot — with the clock as quiet metadata
// beside it, not competing. Brass is reserved for the seat strip's live dots
// and the hairline, so the eye lands on the money first.
@available(iOS 16.2, *)
struct LockScreenView: View {
    let context: ActivityViewContext<PitBossAttributes>

    private var state: PitBossAttributes.ContentState { context.state }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .firstTextBaseline) {
                Eyebrow(text: "ON THE TABLE")
                Spacer()
                Eyebrow(text: "RUNNING")
            }

            HStack(alignment: .firstTextBaseline, spacing: 12) {
                Text(money(state.potCents))
                    .font(.system(size: 40, weight: .bold, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(chalk)
                    .lineLimit(1)
                    .minimumScaleFactor(0.5)

                Spacer(minLength: 0)

                // Deliberately smaller and in smoke. It is context, not the
                // headline, and it was previously shouting louder than the pot.
                Text(context.attributes.startedAt, style: .timer)
                    .font(.system(size: 19, weight: .semibold, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(smoke)
                    .multilineTextAlignment(.trailing)
                    .lineLimit(1)
                    .minimumScaleFactor(0.5)
                    .frame(maxWidth: 108, alignment: .trailing)
            }
            .padding(.top, 2)

            Rectangle()
                .fill(hairline)
                .frame(height: 1)
                .padding(.vertical, 11)

            HStack(spacing: 10) {
                SeatStrip(seats: state.seats)
                Spacer(minLength: 6)
                Text(seatLine)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(smoke)
                    .lineLimit(1)
            }
        }
        .padding(.horizontal, 18)
        .padding(.vertical, 15)
        .background(alignment: .top) {
            // The lamp. Every screen in the app has one restrained warm wash at
            // the top; without it this card is just black with text on it.
            RadialGradient(
                colors: [brass.opacity(0.13), .clear],
                center: .top, startRadius: 0, endRadius: 190
            )
        }
    }

    private var seatLine: String {
        state.stillIn < state.players
            ? "\(state.stillIn) of \(state.players) still in"
            : "\(state.players) player\(state.players == 1 ? "" : "s")"
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
                        Eyebrow(text: "ON THE TABLE")
                        Text(money(context.state.potCents))
                            .font(.system(size: 28, weight: .bold, design: .rounded))
                            .monospacedDigit()
                            .foregroundStyle(chalk)
                    }
                }
                DynamicIslandExpandedRegion(.trailing) {
                    VStack(alignment: .trailing, spacing: 1) {
                        Eyebrow(text: "RUNNING")
                        Text(context.attributes.startedAt, style: .timer)
                            .font(.system(size: 17, weight: .semibold, design: .rounded))
                            .monospacedDigit()
                            .foregroundStyle(smoke)
                            .frame(maxWidth: 92, alignment: .trailing)
                            .lineLimit(1)
                            .minimumScaleFactor(0.5)
                    }
                }
                DynamicIslandExpandedRegion(.bottom) {
                    HStack(spacing: 10) {
                        SeatStrip(seats: context.state.seats, dot: 8)
                        Spacer(minLength: 6)
                        Text("\(context.state.stillIn) of \(context.state.players) still in")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundStyle(smoke)
                    }
                    .padding(.top, 4)
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
