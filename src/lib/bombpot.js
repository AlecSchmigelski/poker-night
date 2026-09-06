// A bomb pot moves chips that are already on the table, so it never touches
// buy-ins, the pot total, or the cash-out balance. This is a timer and nothing
// more.

export const INTERVALS = [10, 15, 20, 30]

export function makeBombPot(minutes, ante, now) {
  return { on: true, minutes, ante, nextAt: now + minutes * 60000, count: 0 }
}

// Remaining time is derived from an absolute timestamp rather than counted
// down. A phone that sleeps for twenty minutes suspends timers; recomputing
// from nextAt means the countdown is still correct when the screen comes back.
export function status(bomb, now) {
  if (!bomb?.on) return { active: false, remaining: 0, due: false }
  const remaining = bomb.nextAt - now
  return { active: true, remaining: Math.max(0, remaining), due: remaining <= 0 }
}

// After firing, schedule from now rather than from the missed deadline, so a
// long sleep does not queue up a burst of catch-up alerts.
export function advance(bomb, now) {
  return { ...bomb, nextAt: now + bomb.minutes * 60000, count: bomb.count + 1 }
}

export function clock(ms) {
  const total = Math.ceil(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
