import { suggestStack, stackValue } from '../src/lib/chips.js'

let fail = 0
const check = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  if (!ok) fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : `\n   got  ${JSON.stringify(got)}\n   want ${JSON.stringify(want)}`}`)
}

const SET = [
  { color: '#E8E0D2', value: 25 },
  { color: '#D6473F', value: 100 },
  { color: '#4A7FD1', value: 500 },
  { color: '#3F9E62', value: 2500 },
  { color: '#14100E', value: 10000 },
]

// A $20 buy-in has to come out to exactly $20 in chips.
const s20 = suggestStack(SET, 2000)
check('$20 stack is exact', s20.total, 2000)
check('$20 stack flagged exact', s20.exact, true)
check('$20 uses more than one denomination', s20.counts.filter((c) => c > 0).length > 1, true)
console.log('   ->', s20.denoms.map((d, i) => `${d.value / 100}×${s20.counts[i]}`).join(' '))

const s50 = suggestStack(SET, 5000)
check('$50 stack is exact', s50.total, 5000)
check('value is weighted toward small chips', s50.counts[0] >= s50.counts[s50.counts.length - 1], true)

// A set that cannot represent the buy-in must say so rather than lie.
const coarse = [{ color: '#fff', value: 3000 }]
const odd = suggestStack(coarse, 2000)
check('coarse set is not exact', odd.exact, false)
check('coarse set does not overshoot', odd.total <= 2000, true)

check('empty set is handled', suggestStack([], 2000).total, 0)
check('zero buy-in is handled', suggestStack(SET, 0).total, 0)
check('stackValue sums', stackValue(SET, [4, 5, 2, 1, 0]), 25 * 4 + 100 * 5 + 500 * 2 + 2500)

console.log(fail ? `\n${fail} FAILED` : '\nAll passed')
process.exit(fail ? 1 : 0)
