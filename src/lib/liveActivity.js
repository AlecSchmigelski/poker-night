import { inPlay, potTotal, stillIn } from './settle.js'
import { endLiveActivity, startLiveActivity, updateLiveActivity } from './device.js'

// The lock screen card is the app's own "game in progress" card, so it shows
// exactly the same numbers, derived the same way. If the two ever disagree one
// of them is lying, and the host cannot tell which.
export function activityState(game) {
  return {
    // "On the table" means what is still in front of people, which is what the
    // Game header means by it too. Once someone cashes out this diverges from
    // the total bought in, and both are on the card.
    potCents: inPlay(game),
    boughtInCents: potTotal(game),
    buyInCents: game.defaultBuyIn,
    players: game.seats.length,
    stillIn: stillIn(game).length,
    // Absolute milliseconds, the same value the in-app countdown is derived
    // from, so the card and the screen cannot disagree. Null when no timer is
    // armed, which the card shows as "Off".
    bombPotAt: game.bombPot?.on ? game.bombPot.nextAt : null,
  }
}

// Only a live game earns a card. Cash-out and settling are screens you are
// looking at, not glancing at, and a stale pot on the lock screen after the
// night ends is worse than no card at all.
export function shouldShow(game) {
  return !!game && game.phase === 'playing'
}

// One place that decides what to do, so the component is a single effect and
// the rules are testable without a device. Returns the action taken.
export function reconcile(game, shown) {
  if (!shouldShow(game)) return shown ? 'end' : 'none'
  return shown ? 'update' : 'start'
}

// Applies that decision. Separate from the decision itself so the decision can
// be tested, which is the half with the rules in it.
export async function apply(action, game) {
  if (action === 'end') return endLiveActivity()
  if (action === 'none') return false
  const state = activityState(game)
  if (action === 'update') return updateLiveActivity(state)
  return startLiveActivity({ startedAt: game.startedAt, ...state })
}
