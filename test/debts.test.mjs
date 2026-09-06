import { outstanding, totalOutstanding, standings } from '../src/lib/debts.js'
import { nets } from '../src/lib/settle.js'

let fail = 0
const check = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  if (!ok) fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : `\n   got  ${JSON.stringify(got)}\n   want ${JSON.stringify(want)}`}`)
}

const seat = (id, n, cashOut) => ({
  playerId: id,
  buyIns: Array.from({ length: n }, (_, i) => ({ id: `${id}${i}`, amount: 2000, at: i })),
  cashOut,
})

const older = {
  id: 'g1', endedAt: 1000,
  seats: [seat('alec', 2, 1000), seat('jo', 1, 5000)],
  payments: [{ id: 'x1', from: 'alec', to: 'jo', amount: 3000, paid: true }],
}
const newer = {
  id: 'g2', endedAt: 2000,
  seats: [seat('alec', 2, 0), seat('jo', 1, 6000)],
  payments: [
    { id: 'y1', from: 'alec', to: 'jo', amount: 4000, paid: false },
    { id: 'y2', from: 'sam', to: 'jo', amount: 1500, paid: false },
  ],
}
const history = [newer, older]

check('only unpaid rows surface', outstanding(history).map((r) => r.paymentId), ['y1', 'y2'])
check('newest night first', outstanding(history)[0].endedAt, 2000)
check('total owed', totalOutstanding(history), 5500)
check('a fully settled history owes nothing', totalOutstanding([older]), 0)
check('empty history is safe', totalOutstanding([]), 0)
check('a game with no payments is safe', outstanding([{ id: 'g', endedAt: 1, seats: [] }]), [])

const table = standings(history, nets)
check('standings sorted by net', table.map(([id]) => id), ['jo', 'alec'])
check('jo total', table.find(([id]) => id === 'jo')[1].net, 3000 + 4000)
check('alec total', table.find(([id]) => id === 'alec')[1].net, -3000 + -4000)
check('nights counted', table.find(([id]) => id === 'jo')[1].nights, 2)
check('nights up counted', table.find(([id]) => id === 'jo')[1].up, 2)

console.log(fail ? `\n${fail} FAILED` : '\nAll passed')
process.exit(fail ? 1 : 0)
