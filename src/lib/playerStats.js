import { nets } from './settle.js'

const DAY = 86400000

// Everything the player detail screen needs, derived from saved history.
//
// The screen exists at n=8..26, so this returns counting stats and never a
// rate. No win percentage, no streaks, no projection: at this sample size they
// would be noise wearing a number.
export function playerStats(history, playerId, now) {
  const today = now ?? Date.now()

  // Oldest first, so the running total reads left to right.
  const ordered = [...history].sort((a, b) => (a.endedAt ?? 0) - (b.endedAt ?? 0))

  const sessions = []
  for (const game of ordered) {
    const seat = game.seats.find((s) => s.playerId === playerId)
    if (!seat) continue
    const n = nets(game).find((x) => x.playerId === playerId)
    sessions.push({
      gameId: game.id,
      date: new Date(game.endedAt ?? game.startedAt),
      buyIn: n.buyIn,
      cashOut: n.cashOut,
      net: n.net,
      entries: seat.buyIns.length,
    })
  }

  const nights = sessions.length
  if (!nights) {
    return { nights: 0, sessions: [], series: [], total: 0, subtitle: 'Not played yet' }
  }

  // Running total, one point per night.
  let running = 0
  const series = sessions.map((s) => (running += s.net))

  const total = running
  const totalIn = sessions.reduce((sum, s) => sum + s.buyIn, 0)
  const entries = sessions.reduce((sum, s) => sum + s.entries, 0)
  const best = sessions.reduce((m, s) => (s.net > m.net ? s : m), sessions[0])
  const worst = sessions.reduce((m, s) => (s.net < m.net ? s : m), sessions[0])

  const first = sessions[0].date
  const last = sessions[nights - 1].date
  const daysSince = Math.floor((today - last.getTime()) / DAY)
  const away = daysSince > 60

  // Nights held since they first showed up — the honest denominator for
  // attendance. Counting every night the group has ever played would punish
  // someone who joined last month.
  const held = ordered.filter((g) => (g.endedAt ?? g.startedAt) >= first.getTime()).length

  return {
    nights,
    sessions,
    series,
    total,
    totalIn,
    best,
    worst,
    buyInsPerNight: entries / nights,
    first,
    last,
    away,
    monthsAway: Math.floor(daysSince / 30),
    held,
    subtitle: subtitleFor({ nights, first, last, away }),
  }
}

function monthName(d) {
  return d.toLocaleDateString(undefined, { month: 'long' })
}

function shortDate(d) {
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function subtitleFor({ nights, first, last, away }) {
  if (nights === 1) return `First night ${shortDate(first)}`
  if (away) return `Last played ${shortDate(last)}`
  return `Playing since ${monthName(first)}`
}

// One line under the chart, or null. Says what the shape means when the shape
// on its own would mislead.
export function chartNote(s) {
  if (!s.nights) return null
  if (s.nights === 1) return 'One night in. The line starts after the second.'
  if (s.away) {
    const m = Math.max(1, s.monthsAway)
    return `Has not played in ${m} month${m === 1 ? '' : 's'}.`
  }
  if (s.nights <= 3) return `${s.nights} nights is not a pattern yet.`

  // A single night carrying almost the whole total is the real story, and the
  // line alone would read as a trend.
  const biggest = Math.max(Math.abs(s.best.net), Math.abs(s.worst.net))
  if (s.total !== 0 && biggest >= Math.abs(s.total) * 0.7) {
    return 'One night accounts for nearly all of it. The rest are close to even.'
  }
  if (s.total === 0) return `${s.nights} nights, back where they started.`
  return null
}
