import { nightReport, length, barWidth } from '../src/lib/report.js'

let fail = 0
const check = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  if (!ok) fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : `\n   got  ${JSON.stringify(got)}\n   want ${JSON.stringify(want)}`}`)
}

const people = {
  jo: { name: 'Jo', color: '#D6473F' },
  sam: { name: 'Sam K.', color: '#4A7FD1' },
  alec: { name: 'Alec', color: '#3F9E62' },
  kim: { name: 'Kim', color: '#8A5FCB' },
  bart: { name: 'Bartholomew Ashworth-Pike', color: '#E8E0D2' },
}
const player = (id) => people[id]
const seat = (id, amounts, cashOut) => ({
  playerId: id,
  buyIns: amounts.map((a, i) => ({ id: `${id}${i}`, amount: a, at: i })),
  cashOut,
})

const start = new Date(2026, 7, 30, 19, 40).getTime()
const game = {
  id: 'g',
  startedAt: start,
  endedAt: start + 305 * 60000, // 5h 05
  defaultBuyIn: 2000,
  seats: [
    seat('jo', [2000, 2000, 2000], 11500),
    seat('sam', [2000, 2000], 1000),
    seat('alec', [2000, 2000, 2000, 2000], 2500),
    seat('kim', [2000], 3500),
    seat('bart', [2000, 2000, 2000, 2000, 2000, 2000], 13500),
  ],
}

const r = nightReport(game, player)

check('pot is every buy-in', r.pot, 32000)
check('player count', r.players, 5)
check('buy-in count is aggregate', r.buyInCount, 16)
check('balanced night reports no discrepancy', r.off, 0)
check('nets sum to zero', r.rows.reduce((s, x) => s + x.net, 0), 0)
check('sorted by net descending', r.rows.map((x) => x.name),
  ['Jo', 'Bartholomew Ashworth-Pike', 'Kim', 'Sam K.', 'Alec'])
check('biggest swing', r.maxAbsNet, 5500)
console.log('   ->', r.rows.map((x) => `${x.name} ${x.net / 100}`).join(', '))

// The biggest winner and biggest loser must both reach full length.
const top = r.rows[0]
const bottom = r.rows[r.rows.length - 1]
check('winner and loser bars are the same length',
  barWidth(top.net, r.maxAbsNet), barWidth(bottom.net, r.maxAbsNet))
check('full-length bar is the full half-track',
  barWidth(top.net, r.maxAbsNet), 'max(3px, calc((50% - 3px) * 1))')

// A $1 net still has to be visible, which the max(3px, ...) floor guarantees.
check('a $1 net still draws a bar', barWidth(100, 5500) !== null, true)
check('and never collapses to nothing', barWidth(100, 5500).startsWith('max(3px,'), true)
check('a zero net draws no bar', barWidth(0, 5500), null)
check('no bars at all when nobody moved', barWidth(0, 0), null)

// Ties break on who risked more.
const tied = {
  ...game,
  seats: [seat('jo', [2000], 4000), seat('alec', [2000, 2000, 2000], 8000), seat('sam', [6000], 0)],
}
const t = nightReport(tied, player)
check('tie breaks toward the bigger buy-in', t.rows.map((x) => x.name), ['Alec', 'Jo', 'Sam K.'])

// Everyone flat.
const flat = { ...game, seats: [seat('jo', [2000], 2000), seat('sam', [2000], 2000)] }
check('flat night has no swing', nightReport(flat, player).maxAbsNet, 0)

// An unbalanced game is surfaced, never thrown.
const bad = { ...game, seats: [seat('jo', [2000], 2000), seat('sam', [2000], 500)] }
check('unbalanced night reports the gap', nightReport(bad, player).off, -1500)

check('length over an hour pads minutes', length(305), '5h 05')
check('length on the hour', length(300), '5h 00')
check('length under an hour', length(47), '47m')
check('length at zero', length(0), '0m')

console.log(fail ? `\n${fail} FAILED` : '\nAll passed')
process.exit(fail ? 1 : 0)
