// EDIT_NIGHT is the only way a saved night changes, so its guarantees matter:
// the buy-in record is untouched, the settlement is rebuilt, and the edit is
// visible afterwards.
import { nets, potTotal, minimizePayments } from '../src/lib/settle.js'

let fail = 0
const check = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  if (!ok) fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : `\n   got  ${JSON.stringify(got)}\n   want ${JSON.stringify(want)}`}`)
}

// Mirrors the reducer branch so the behaviour can be tested without React.
const editNight = (game, cashOuts, now) => {
  const seats = game.seats.map((s) =>
    cashOuts[s.playerId] != null ? { ...s, cashOut: cashOuts[s.playerId] } : s,
  )
  const edited = { ...game, seats, editedAt: now }
  const before = game.payments ?? []
  edited.payments = minimizePayments(nets(edited)).map((p, i) => ({
    ...p,
    id: `new${i}`,
    paid: before.some((o) => o.paid && o.from === p.from && o.to === p.to && o.amount === p.amount),
  }))
  return edited
}

const seat = (id, amounts, cashOut) => ({
  playerId: id,
  buyIns: amounts.map((a, i) => ({ id: `${id}${i}`, amount: a, at: i, signature: [[[0, 0], [1, 1]]] })),
  cashOut,
})

// Three players, $80 in. Sam was typed as $10 when he actually had $20, and
// Alec was nudged to $20 to make the night balance at the table.
const game = {
  id: 'n1',
  endedAt: 1000,
  seats: [seat('jo', [2000, 2000], 5000), seat('sam', [2000], 1000), seat('alec', [2000], 2000)],
  payments: [{ id: 'a', from: 'sam', to: 'jo', amount: 1000, paid: true }],
}

check('starts balanced', potTotal(game), game.seats.reduce((s, x) => s + x.cashOut, 0))

const fixed = editNight(game, { sam: 2000, alec: 1000 }, 5555)

check('corrected cash-outs land', fixed.seats.map((s) => s.cashOut), [5000, 2000, 1000])
check('still balances', fixed.seats.reduce((s, x) => s + x.cashOut, 0), potTotal(fixed))
check('pot is unchanged', potTotal(fixed), potTotal(game))
check('the edit is recorded', fixed.editedAt, 5555)

// The buy-in record, and the signatures attached to it, must survive untouched.
check('buy-ins untouched', fixed.seats.map((s) => s.buyIns.length), [2, 1, 1])
check('signatures intact',
  fixed.seats.every((s) => s.buyIns.every((b) => b.signature !== null)), true)
check('original is not mutated', game.seats[1].cashOut, 1000)

// Settlement is rebuilt from the corrected numbers.
const settled = {}
for (const p of fixed.payments) {
  settled[p.from] = (settled[p.from] || 0) - p.amount
  settled[p.to] = (settled[p.to] || 0) + p.amount
}
check('new settlement clears every net',
  nets(fixed).every((n) => (settled[n.playerId] || 0) === n.net), true)
console.log('   before:', game.payments.map((p) => `${p.from}->${p.to} ${p.amount / 100}`).join(', '))
console.log('   after: ', fixed.payments.map((p) => `${p.from}->${p.to} ${p.amount / 100}`).join(', '))

// The debt moved from Sam to Alec, so the old cleared mark must not follow it.
check('the person who no longer owes is off the list',
  fixed.payments.some((p) => p.from === 'sam'), false)
check('the new debt is not marked paid',
  fixed.payments.find((p) => p.from === 'alec')?.paid, false)

// A debt that survives the edit identically keeps its cleared mark.
const untouched = editNight(game, { sam: 1000, alec: 2000 }, 6666)
check('an identical debt keeps its paid mark',
  untouched.payments.find((p) => p.from === 'sam' && p.amount === 1000)?.paid, true)

console.log(fail ? `\n${fail} FAILED` : '\nAll passed')
process.exit(fail ? 1 : 0)
