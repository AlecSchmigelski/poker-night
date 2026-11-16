import ActivityKit
import Foundation

// Shared by the app (which starts and updates the activity) and the widget
// extension (which draws it). Both targets compile this same file — the types
// must be identical on each side or the activity silently fails to decode.
@available(iOS 16.2, *)
struct PitBossAttributes: ActivityAttributes {
    // One seat at the table. Carries the player's chip colour so the card can
    // be read as the table itself rather than as a count: the same colours the
    // app gives people, in the same order, dimming as they cash out.
    public struct Seat: Codable, Hashable {
        var color: String // "#RRGGBB", straight from the roster
        var out: Bool
    }

    // Everything that changes while the night runs. A content state is capped
    // at 4KB; a dozen seats is a few hundred bytes.
    public struct ContentState: Codable, Hashable {
        // Cents, like every other amount in this app. Formatting happens at the
        // edge so rounding never creeps into a total.
        var potCents: Int
        var players: Int
        var stillIn: Int
        var seats: [Seat]
    }

    // Fixed for the life of the activity. The duration is rendered from this by
    // the system, counting up on its own, so the app does not have to push an
    // update every second — or every minute — to keep the clock honest.
    var startedAt: Date
}
