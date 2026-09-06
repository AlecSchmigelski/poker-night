import { buildSnapshot, encodeSnapshot, decodeSnapshot, snapshotTotals } from '../src/lib/share.js'

let fail = 0
const check = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  if (!ok) fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : `\n   got  ${JSON.stringify(got)}\n   want ${JSON.stringify(want)}`}`)
}

const seat = (id, amounts, cashOut = null) => ({
  playerId: id,
  buyIns: amounts.map((a, i) => ({ id: `${id}${i}`, amount: a, at: 1, signature: [[[0, 0], [1, 1]]] })),
  cashOut,
})

const people = {
  a: { name: 'Alec', color: '#D6473F' },
  b: { name: 'Sam K.', color: '#4A7FD1' },
  c: { name: 'Ana Sofía Ruiz-Hernández', color: '#3F9E62' },
}
const player = (id) => people[id]

const game = {
  defaultBuyIn: 2000,
  phase: 'playing',
  seats: [seat('a', [2000, 2000]), seat('b', [2000]), seat('c', [2000, 2000, 2000])],
  payments: [],
}

const snap = buildSnapshot(game, player)
check('pot survives the round trip', snapshotTotals(snap).pot, 12000) // 6 buy-ins at $20
check('buy-in counts carried', snap.p.map((r) => r[3]), [2, 1, 3])

const round = decodeSnapshot(encodeSnapshot(snap))
check('round trip is lossless', round, snap)
check('non-ASCII name survives', round.p[2][0], 'Ana Sofía Ruiz-Hernández')

// Signatures must never leave the host's phone.
const encoded = encodeSnapshot(snap)
check('no signature data in payload', JSON.stringify(snap).includes('signature'), false)
check('payload is link-sized', encoded.length < 1200, true)
console.log(`   -> ${encoded.length} chars for 3 players`)

// Settled game carries the payments.
const settled = {
  ...game,
  phase: 'settle',
  seats: [seat('a', [2000, 2000], 8000), seat('b', [2000], 0), seat('c', [2000, 2000, 2000], 2000)],
  payments: [{ from: 'b', to: 'a', amount: 2000 }, { from: 'c', to: 'a', amount: 2000 }],
}
const s2 = decodeSnapshot(encodeSnapshot(buildSnapshot(settled, player)))
check('payments carried as indices', s2.pay, [[1, 0, 2000], [2, 0, 2000]])
check('cash-outs carried', s2.p.map((r) => r[4]), [8000, 0, 2000])
check('counted total', snapshotTotals(s2).counted, 10000)
check('all counted flag', snapshotTotals(s2).allCounted, true)

// Garbage in, null out — never a crash on a mangled link.
check('rejects nonsense', decodeSnapshot('not-base64!!'), null)
check('rejects empty', decodeSnapshot(''), null)
check('rejects wrong version', decodeSnapshot(encodeSnapshot({ v: 99, p: [] })), null)

console.log(fail ? `\n${fail} FAILED` : '\nAll passed')
process.exit(fail ? 1 : 0)
