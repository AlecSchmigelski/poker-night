import ActivityKit
import Foundation

// Shared by the app (which starts and updates the activity) and the widget
// extension (which draws it). Both targets compile this same file — the types
// must be identical on each side or the activity silently fails to decode.
@available(iOS 16.2, *)
struct PitBossAttributes: ActivityAttributes {
    // Everything that changes while the night runs. These are exactly the
    // numbers the app's own "game in progress" card shows, because the lock
    // screen card is that card: a host who has seen one has seen the other.
    public struct ContentState: Codable, Hashable {
        // Cents, like every other amount in this app. Formatting happens at the
        // edge so rounding never creeps into a total.
        var potCents: Int // still in front of people
        var boughtInCents: Int // everything ever put on the table
        var buyInCents: Int
        var players: Int
        var stillIn: Int
        // When the next bomb pot is due. Nil when no timer is armed. Unlike
        // the night's start this moves — every time one fires it re-arms — so
        // it belongs in the state rather than in the attributes.
        var bombPotAt: Date?
    }

    // Fixed for the life of the activity. The duration is rendered from this by
    // the system, counting up on its own, so the app does not have to push an
    // update every second — or every minute — to keep the clock honest.
    var startedAt: Date
}
