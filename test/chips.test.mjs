import { suggestStack, stackValue, MAX_PER_COLOUR } from '../src/lib/chips.js'

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
  // The rule that started this: never a pile of one colour.
  check(`${label} caps every colour at ${MAX_PER_COLOUR}`,
    s.rows.every((r) => r.count <= MAX_PER_COLOUR), true)
  check(`${label} stack is a sane size`, s.chipCount >= 12 && s.chipCount <= 45, true)
  // No single chip worth more than a quarter of the stack.
  check(`${label} has no unspendable chip`, s.rows.every((r) => r.value <= s.total * 0.25), true)
  console.log(`   ${label} ->`, show(s))
}

const QUARTER = { small: 25, big: 50 }
const ONE_ONE = { small: 100, big: 100 }
const ONE_TWO = { small: 100, big: 200 }

// The bug that started this: a $20 buy-in used to suggest a mountain of whites.
const s20 = suggestStack(SET, 2000, 8, QUARTER)
check('$20 totals the buy-in', s20.total, 2000)
sane(s20, '$20 at .25/.50')

// Blinds decide whether sub-dollar chips belong in play at all.
check('a .25/.50 game gets sub-dollar chips', s20.rows[0].value < 100, true)
const s20flat = suggestStack(SET, 2000, 8, ONE_ONE)
check('a 1/1 game gets no chip below the blind', s20flat.rows.every((r) => r.value >= 100), true)
console.log('   $20 at 1/1 ->', show(s20flat))

const s100flat = suggestStack(SET, 10000, 8, ONE_ONE)
check('$100 at 1/1 has no quarters', s100flat.rows.every((r) => r.value >= 100), true)
sane(s100flat, '$100 at 1/1')

// Eight players must never need more than 15 x 8 of any colour.
check('eight players never need a mountain of one colour',
  s20.rows.every((r) => r.count * 8 <= MAX_PER_COLOUR * 8), true)

// The canonical $1/$2 stack from the standard guidance: about twenty $1, a
// stack of $5, a few $25.
const s200 = suggestStack(SET, 20000, 8, ONE_TWO)
check('$200 totals the buy-in', s200.total, 20000)
sane(s200, '$200 at 1/2')
check('value sits in the big chips',
  s200.rows[2].value * s200.rows[2].count > s200.rows[0].value * s200.rows[0].count, true)

const s100 = suggestStack(SET, 10000, 6, ONE_TWO)
check('$100 totals the buy-in', s100.total, 10000)
sane(s100, '$100 at 1/2')

// A deep game now fits the rack, because capping every colour shrank the stack.
const deep = suggestStack(SET, 50000, 8, { small: 500, big: 500 })
check('deep game fits a normal rack', deep.short.length, 0)
sane(deep, '$500 at 5/5')

// A genuinely undersized rack reports the shortfall rather than hiding it.
const thin = [
  { color: '#D6473F', value: 100, count: 40 },
  { color: '#4A7FD1', value: 500, count: 30 },
  { color: '#3F9E62', value: 2500, count: 12 },
]
const strained = suggestStack(thin, 20000, 8, ONE_TWO)
check('undersized rack still gets a suggestion', strained.rows.length > 0, true)
check('and names what is missing', strained.short.length > 0, true)
check('shortfall says how many are needed', strained.short.every((x) => x.need > x.owned), true)
console.log('   thin rack ->', show(strained), '· short:',
  strained.short.map((x) => `${x.need} of $${x.value / 100}, own ${x.owned}`).join('; '))

// A comfortable game stays within the rack.
check('normal game has no shortfall', suggestStack(SET, 20000, 8, ONE_TWO).short.length, 0)

// A set that cannot make the amount says so instead of guessing.
const coarse = [{ color: '#fff', value: 3000, count: 100 }]
check('coarse set reports impossible', suggestStack(coarse, 2000, 4, QUARTER).impossible, true)
check('coarse set suggests nothing', suggestStack(coarse, 2000, 4, QUARTER).rows, [])

check('empty set is safe', suggestStack([], 2000, 4, QUARTER).total, 0)
check('zero buy-in is safe', suggestStack(SET, 0, 4, QUARTER).total, 0)
check('no blinds still works', suggestStack(SET, 20000, 6).total, 20000)
check('stackValue sums', stackValue(SET, [4, 5, 2, 1, 0]), 25 * 4 + 100 * 5 + 500 * 2 + 2500)

console.log(fail ? `\n${fail} FAILED` : '\nAll passed')
process.exit(fail ? 1 : 0)
