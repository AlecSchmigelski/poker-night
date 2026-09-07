import { nets, potTotal } from './settle.js'

// Everything the night report needs, derived once.
//
// Bars are scaled to the night, not to an absolute axis: the biggest winner and
// the biggest loser both reach full length. Buy-in amounts vary through a night,
// so a per-buy-in axis would be meaningless — never reintroduce one.
export function nightReport(game, player) {
  const rows = nets(game).map((n) => ({
    ...n,
    name: player(n.playerId).name,
    color: player(n.playerId).color,
  }))

  // Net descending; ties to whoever risked more, then by name.
  rows.sort((a, b) => b.net - a.net || b.buyIn - a.buyIn || a.name.localeCompare(b.name))

  const pot = potTotal(game)
  const counted = game.seats.reduce((s, seat) => s + (seat.cashOut ?? 0), 0)

  return {
    rows,
    pot,
    players: game.seats.length,
    buyInCount: game.seats.reduce((s, seat) => s + seat.buyIns.length, 0),
    minutes: Math.max(0, Math.round(((game.endedAt ?? Date.now()) - game.startedAt) / 60000)),
    maxAbsNet: rows.reduce((m, r) => Math.max(m, Math.abs(r.net)), 0),
    date: new Date(game.endedAt ?? game.startedAt),
    // Should be zero: a game cannot be saved unbalanced. Surfaced, never thrown.
    off: counted - pot,
  }
}

// "5h 05" over an hour, "47m" under one.
export function length(minutes) {
  if (minutes < 60) return `${minutes}m`
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}`
}

// Bar width as a share of half the track. Rendered with CSS max() so a $1 net
// still shows, and so the bar scales with the column at any screen width.
export function barWidth(net, maxAbsNet) {
  if (!net || !maxAbsNet) return null
  return `max(3px, calc((50% - 3px) * ${Math.abs(net) / maxAbsNet}))`
}
