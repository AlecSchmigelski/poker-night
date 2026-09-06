import { nets, potTotal, countedTotal, inPlay, stillIn, minimizePayments } from '../src/lib/settle.js'

let fail = 0
const check = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  if (!ok) fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : `\n   got  ${JSON.stringify(got)}\n   want ${JSON.stringify(want)}`}`)
}

const seat = (id, amounts, cashOut = null, leftEarly = false) => ({
  playerId: id,
  buyIns: amounts.map((a, i) => ({ id: `${id}${i}`, amount: a, at: i, signature: null })),
  cashOut,
  leftEarly,
})

// Seven buy-ins at $20 = $140 on the table. Priya leaves early with $50.
const mid = {
  defaultBuyIn: 2000,
  phase: 'playing',
  seats: [
    seat('jo', [2000, 2000]),
    seat('sam', [2000]),
    seat('alec', [2000, 2000, 2000]),
    seat('priya', [2000], 5000, true),
  ],
}

check('pot still counts every buy-in', potTotal(mid), 14000)
check('already walked out', countedTotal(mid), 5000)
check('chips left on the table', inPlay(mid), 9000)
check('three players still holding chips', stillIn(mid).map((s) => s.playerId), ['jo', 'sam', 'alec'])
check('early leaver has a net already', nets(mid).find((n) => n.playerId === 'priya').net, 3000)

// End of night: the remaining three count down to exactly what is left.
const end = {
  ...mid,
  seats: [
    seat('jo', [2000, 2000], 6000),
    seat('sam', [2000], 1000),
    seat('alec', [2000, 2000, 2000], 2000),
    seat('priya', [2000], 5000, true),
  ],
}

check('remaining stacks equal chips in play', 6000 + 1000 + 2000, inPlay(mid))
check('counted now equals the pot', countedTotal(end), potTotal(end))
check('nets still sum to zero', nets(end).reduce((s, n) => s + n.net, 0), 0)

const pay = minimizePayments(nets(end))
check('early leaver is included in settlement', pay.some((p) => p.from === 'priya' || p.to === 'priya'), true)
const settled = {}
for (const p of pay) {
  settled[p.from] = (settled[p.from] || 0) - p.amount
  settled[p.to] = (settled[p.to] || 0) + p.amount
}
check('settlement clears every net including the leaver',
  nets(end).every((n) => (settled[n.playerId] || 0) === n.net), true)
console.log('   ->', pay.map((p) => `${p.from} pays ${p.to} ${p.amount / 100}`).join(', '))

// Sitting back down clears the number and puts the chips back in play.
const backIn = { ...mid, seats: mid.seats.map((s) => (s.playerId === 'priya' ? { ...s, cashOut: null, leftEarly: false } : s)) }
check('sitting back down restores the table', inPlay(backIn), 14000)
check('and nobody is counted yet', countedTotal(backIn), 0)

console.log(fail ? `\n${fail} FAILED` : '\nAll passed')
process.exit(fail ? 1 : 0)
