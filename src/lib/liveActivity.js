import { potTotal, stillIn } from './settle.js'
import { endLiveActivity, startLiveActivity, updateLiveActivity } from './device.js'

// What the lock screen card shows, derived from the same functions the Game
// screen uses so the two can never disagree.
export function activityState(game) {
  return {
    potCents: potTotal(game),
    players: game.seats.length,
    stillIn: stillIn(game).length,
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
