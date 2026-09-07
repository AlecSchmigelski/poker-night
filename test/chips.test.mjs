import { suggestStack, stackValue } from '../src/lib/chips.js'

let fail = 0
const check = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  if (!ok) fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : `\n   got  ${JSON.stringify(got)}\n   want ${JSON.stringify(want)}`}`)
}
const show = (s) =>
  s.rows.map((r) => `${r.count}x$${r.value / 100}`).join(' + ') + ` = ${s.chipCount} chips`

// A typical home set: many workhorse chips, few big ones.
const SET = [
  { color: '#E8E0D2', value: 25, count: 150 },
  { color: '#D6473F', value: 100, count: 150 },
  { color: '#4A7FD1', value: 500, count: 100 },
  { color: '#3F9E62', value: 2500, count: 50 },
  { color: '#14100E', value: 10000, count: 25 },
]

const sane = (s, label) => {
  check(`${label} is exact`, s.total, s.rows.reduce((a, r) => a + r.value * r.count, 0))
  check(`${label} smallest chip is not a mountain`, s.rows[0].count <= 20, true)
  check(`${label} stack is a sane size`, s.chipCount >= 12 && s.chipCount <= 50, true)
  // No single chip worth more than a quarter of the stack.
  check(`${label} has no unspendable chip`, s.rows.every((r) => r.value <= s.total * 0.25), true)
  console.log(`   ${label} ->`, show(s))
}

// The bug that started this: a $20 buy-in used to suggest a mountain of whites.
const s20 = suggestStack(SET, 2000, 6)
check('$20 totals the buy-in', s20.total, 2000)
sane(s20, '$20')

// The canonical $1/$2 stack from the standard guidance: about twenty $1, a
// stack of $5, a few $25.
const s200 = suggestStack(SET, 20000, 6)
check('$200 totals the buy-in', s200.total, 20000)
sane(s200, '$200')
check('$200 matches the canonical shape', s200.rows.map((r) => [r.value, r.count]),
  [[100, 20], [500, 16], [2500, 4]])
check('value sits in the big chips',
  s200.rows[2].value * s200.rows[2].count > s200.rows[0].value * s200.rows[0].count, true)

const s100 = suggestStack(SET, 10000, 6)
check('$100 totals the buy-in', s100.total, 10000)
sane(s100, '$100')

// Inventory is a real constraint, and a shortfall is reported rather than hidden.
const deep = suggestStack(SET, 50000, 8)
check('deep game still gets a suggestion', deep.rows.length > 0, true)
check('and names what the rack is missing', deep.short.length > 0, true)
check('shortfall says how many are needed', deep.short.every((x) => x.need > x.owned), true)
console.log('   $500 x8 ->', show(deep), '· short:',
  deep.short.map((x) => `${x.need} of $${x.value / 100}, own ${x.owned}`).join('; '))

// A comfortable game stays within the rack.
check('normal game has no shortfall', suggestStack(SET, 20000, 6).short.length, 0)

// A set that cannot make the amount says so instead of guessing.
const coarse = [{ color: '#fff', value: 3000, count: 100 }]
check('coarse set reports impossible', suggestStack(coarse, 2000, 4).impossible, true)
check('coarse set suggests nothing', suggestStack(coarse, 2000, 4).rows, [])

check('empty set is safe', suggestStack([], 2000, 4).total, 0)
check('zero buy-in is safe', suggestStack(SET, 0, 4).total, 0)
check('stackValue sums', stackValue(SET, [4, 5, 2, 1, 0]), 25 * 4 + 100 * 5 + 500 * 2 + 2500)

console.log(fail ? `\n${fail} FAILED` : '\nAll passed')
process.exit(fail ? 1 : 0)
