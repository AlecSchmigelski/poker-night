import { nets, potTotal, countedTotal, minimizePayments } from '../src/lib/settle.js'
import { fmt, fmtSigned, toCents, toInput } from '../src/lib/money.js'

const seat = (id, buyIns, cashOut) => ({
  playerId: id,
  buyIns: buyIns.map((a, i) => ({ id: `${id}${i}`, amount: a })),
  cashOut,
})

let fail = 0
const check = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  if (!ok) fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : `\n   got  ${JSON.stringify(got)}\n   want ${JSON.stringify(want)}`}`)
}

// Buy-ins: 40 + 20 + 60 + 20 + 20 = $160. Cash-outs must match exactly.
const g = { seats: [
  seat('alec', [2000, 2000], 8000),
  seat('sam',  [2000], 0),
  seat('jo',   [2000, 2000, 2000], 3000),
  seat('kim',  [2000], 2000),
  seat('lee',  [2000], 3000),
]}

check('pot total', potTotal(g), 16000)
check('counted equals pot', countedTotal(g), potTotal(g))

const n = nets(g)
check('nets sum to zero', n.reduce((s, x) => s + x.net, 0), 0)
check('alec net +40', n.find(x => x.playerId === 'alec').net, 4000)
check('jo net -30', n.find(x => x.playerId === 'jo').net, -3000)
check('kim breaks even', n.find(x => x.playerId === 'kim').net, 0)

const pay = minimizePayments(n)
check('at most n-1 payments', pay.length <= g.seats.length - 1, true)
check('payments total the winnings', pay.reduce((s, p) => s + p.amount, 0), 5000)
check('break-even player is untouched', pay.some(p => p.from === 'kim' || p.to === 'kim'), false)
console.log('   ->', pay.map(p => `${p.from} pays ${p.to} ${fmt(p.amount)}`).join(', '))

const settled = {}
for (const p of pay) {
  settled[p.from] = (settled[p.from] || 0) - p.amount
  settled[p.to] = (settled[p.to] || 0) + p.amount
}
check('settlement exactly clears every net', n.every(x => (settled[x.playerId] || 0) === x.net), true)

// Two-player edge case.
const g2 = { seats: [seat('a', [2000], 3500), seat('b', [2000], 500)] }
check('heads up: one payment', minimizePayments(nets(g2)).length, 1)
check('heads up: correct amount', minimizePayments(nets(g2))[0].amount, 1500)

// Everyone flat: no payments at all.
const g3 = { seats: [seat('a', [2000], 2000), seat('b', [2000], 2000)] }
check('all flat: no payments', minimizePayments(nets(g3)).length, 0)

check('toCents 47.50', toCents('47.50'), 4750)
check('toCents $20', toCents('$20'), 2000)
check('toCents empty', toCents(''), 0)
check('toCents junk', toCents('abc'), 0)
check('toCents rounds to the cent', toCents('33.333'), 3333)
check('fmt whole', fmt(2000), '$20')
check('fmt cents', fmt(4750), '$47.50')
check('fmt groups thousands', fmt(123456), '$1,234.56')
check('fmt negative', fmt(-2000), '-$20')
check('fmtSigned up', fmtSigned(4000), '+$40')
check('fmtSigned down', fmtSigned(-3000), '-$30')
check('fmtSigned flat', fmtSigned(0), '$0')
// What a text field shows: never a trailing .00 the host has to backspace past.
check('toInput whole', toInput(2000), '20')
check('toInput cents', toInput(4750), '47.50')
check('toInput empty', toInput(null), '')

// A three-way split with cents: the settlement still has to clear exactly.
const g4 = { seats: [
  seat('a', [3333], 5000),
  seat('b', [3333], 2500),
  seat('c', [3334], 2500),
]}
const n4 = nets(g4)
check('odd cents: counted equals pot', countedTotal(g4), potTotal(g4))
const pay4 = minimizePayments(n4)
const cleared = {}
for (const p of pay4) {
  cleared[p.from] = (cleared[p.from] || 0) - p.amount
  cleared[p.to] = (cleared[p.to] || 0) + p.amount
}
check('odd cents: settlement clears every net', n4.every(x => (cleared[x.playerId] || 0) === x.net), true)

console.log(fail ? `\n${fail} FAILED` : '\nAll passed')
process.exit(fail ? 1 : 0)
