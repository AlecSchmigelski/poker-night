import { playerStats, chartNote } from '../src/lib/playerStats.js'
import { chartGeometry } from '../src/lib/chart.js'

let fail = 0
const check = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  if (!ok) fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : `\n   got  ${JSON.stringify(got)}\n   want ${JSON.stringify(want)}`}`)
}

const DAY = 86400000
const NOW = new Date(2026, 8, 8).getTime()

// Each night: [playerId, buyInAmounts, cashOut]. Games are balanced.
const night = (id, daysAgo, rows) => ({
  id,
  startedAt: NOW - daysAgo * DAY - 3 * 3600000,
  endedAt: NOW - daysAgo * DAY,
  defaultBuyIn: 2000,
  seats: rows.map(([pid, amounts, out]) => ({
    playerId: pid,
    buyIns: amounts.map((a, i) => ({ id: `${pid}${i}`, amount: a, at: i })),
    cashOut: out,
  })),
})

// Jo plays all four. Sam joins at the third. Kim played once, long ago.
const history = [
  night('n1', 90, [['kim', [2000], 1000], ['jo', [2000], 3000]]),
  night('n2', 60, [['jo', [2000, 2000], 2000]]),
  night('n3', 30, [['jo', [2000], 4000], ['sam', [2000], 0]]),
  night('n4', 2, [['jo', [2000, 2000, 2000], 3000], ['sam', [2000], 9000]]),
]

const jo = playerStats(history, 'jo', NOW)
check('counts every night played', jo.nights, 4)
check('running total is cumulative', jo.series, [1000, -1000, 1000, -2000])
check('total matches the last point', jo.total, jo.series[jo.series.length - 1])
check('total bought in', jo.totalIn, 2000 + 4000 + 2000 + 6000)
check('best night', jo.best.net, 2000)
check('worst night', jo.worst.net, -3000)
check('buy-ins a night', jo.buyInsPerNight, 7 / 4)
check('attended every night since starting', jo.held, 4)
check('subtitle names the month', jo.subtitle.startsWith('Playing since'), true)

// Sam joined late: the denominator is nights held since he arrived, not all of them.
const sam = playerStats(history, 'sam', NOW)
check('late joiner counts only nights since arriving', sam.held, 2)
check('late joiner nights', sam.nights, 2)
check('late joiner total', sam.total, 5000)

// One night, months ago.
const kim = playerStats(history, 'kim', NOW)
check('single night', kim.nights, 1)
check('single night subtitle', kim.subtitle.startsWith('First night'), true)
check('flagged as away', kim.away, true)

// Someone on the roster who has never finished a night.
const ghost = playerStats(history, 'nobody', NOW)
check('no history is safe', ghost.nights, 0)
check('no history has no series', ghost.series, [])
check('no history subtitle', ghost.subtitle, 'Not played yet')

// Notes say what the shape means when the shape alone would mislead.
check('one night note', chartNote(kim), 'One night in. The line starts after the second.')
check('two nights is not a pattern', chartNote(sam), '2 nights is not a pattern yet.')
check('flat run says so', chartNote({ ...jo, total: 0, nights: 8 }),
  '8 nights, back where they started.')
check('a dominating night is called out',
  chartNote({ nights: 12, away: false, total: -31000, best: { net: 3000 }, worst: { net: -40000 } }),
  'One night accounts for nearly all of it. The rest are close to even.')
check('an ordinary run gets no note',
  chartNote({ nights: 12, away: false, total: 5000, best: { net: 2000 }, worst: { net: -1500 } }), null)

// Chart geometry: zero is always on the canvas, and one night is a single point.
const g = chartGeometry(jo.series)
check('one point per night', g.points.length, 4)
check('zero line is inside the plot', g.zeroY >= 29.8 && g.zeroY <= 114.2, true)
check('area closes on the baseline', g.area[0][1], g.zeroY)
check('all-positive series still shows zero',
  (() => { const z = chartGeometry([1000, 2000, 3000]).zeroY; return z >= 29.8 && z <= 114.2 })(), true)
check('single point does not span the width', chartGeometry([500]).points, [[4, 29.8]])
check('empty series has no geometry', chartGeometry([]), null)

console.log(fail ? `\n${fail} FAILED` : '\nAll passed')
process.exit(fail ? 1 : 0)
