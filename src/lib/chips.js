// Chip denomination helpers. Values are cents, same as all other money.
//
// Distribution follows the standard home-game guidance rather than spreading
// value evenly:
//   · Most of the VALUE sits in the big chips; most of the COUNT in the small.
//     Inverting that is how you end up handing someone eighty whites.
//   · The smallest chip is a betting chip, not a store of value: ~10-12 per
//     stack is plenty and 20 is too many.
//   · Three denominations is the norm. Two is clunky, four is fiddly.
//   · A starting stack is roughly 30-50 chips.
//   · Leave inventory behind for rebuys — never deal out the whole set.

// A low buy-in genuinely needs fewer chips than a deep one, so the band is
// wide and the ideal is only a nudge.
const TARGET_CHIPS = { min: 18, ideal: 32, max: 50 }
// Twenty of the smallest is the canonical $1/$2 stack; beyond that it is a pile.
const SMALL_CHIP = { min: 6, max: 20, hardMax: 26 }
const RESERVE = 0.7 // deal out at most this share of any colour
// No single chip should be worth more than this share of a starting stack.
// Otherwise you get a $100 chip in a $200 stack, which nobody can bet with.
const BIGGEST_CHIP = 0.25

// Value shares, smallest denomination first. They rise with denomination.
const SHARES = {
  1: [1],
  2: [0.3, 0.7],
  3: [0.1, 0.35, 0.55],
  4: [0.07, 0.18, 0.33, 0.42],
}

const DEFAULT_OWNED = 100

function combinations(list, k) {
  if (k === 0) return [[]]
  if (list.length < k) return []
  const [head, ...rest] = list
  return [...combinations(rest, k - 1).map((c) => [head, ...c]), ...combinations(rest, k)]
}

function allocate(combo, amount) {
  const shares = SHARES[combo.length]
  const counts = combo.map((d, i) => Math.floor((amount * shares[i]) / d.value))

  // Close the gap from the largest denomination down, so the shape survives.
  let rem = amount - combo.reduce((sum, d, i) => sum + d.value * counts[i], 0)
  for (let i = combo.length - 1; i >= 0 && rem > 0; i--) {
    const add = Math.floor(rem / combo[i].value)
    counts[i] += add
    rem -= add * combo[i].value
  }
  return { counts, remainder: rem }
}

function score(combo, counts, players, owned, enforceInventory) {
  const chipCount = counts.reduce((a, b) => a + b, 0)
  const smallest = counts[0]

  if (smallest > SMALL_CHIP.hardMax) return null
  if (counts.some((c) => c <= 0)) return null
  // Never suggest more chips than the host owns — unless nothing fits at all,
  // in which case the caller retries and reports the shortfall instead.
  if (enforceInventory && combo.some((d, i) => counts[i] * players > owned(d))) return null

  let penalty = Math.abs(chipCount - TARGET_CHIPS.ideal) * 0.35
  if (chipCount < TARGET_CHIPS.min) penalty += (TARGET_CHIPS.min - chipCount) * 2
  if (chipCount > TARGET_CHIPS.max) penalty += (chipCount - TARGET_CHIPS.max) * 2
  if (smallest < SMALL_CHIP.min) penalty += (SMALL_CHIP.min - smallest) * 3
  if (smallest > SMALL_CHIP.max) penalty += (smallest - SMALL_CHIP.max) * 4
  if (combo.length !== 3) penalty += 6
  // Leave chips in the rack for rebuys.
  combo.forEach((d, i) => {
    const share = (counts[i] * players) / owned(d)
    if (share > RESERVE) penalty += (share - RESERVE) * 30
  })
  return penalty
}

export function suggestStack(chips, amount, players = 1) {
  const denoms = [...chips].filter((c) => c.value > 0).sort((a, b) => a.value - b.value)
  const owned = (d) => (Number.isFinite(d.count) && d.count > 0 ? d.count : DEFAULT_OWNED)
  const empty = { rows: [], total: 0, chipCount: 0, exact: false, players, usage: [] }
  if (!denoms.length || amount <= 0) return empty

  const usable = denoms.filter((d) => d.value <= amount * BIGGEST_CHIP)
  const pool = usable.length ? usable : denoms.slice(0, 1)

  const search = (enforceInventory) => {
    let best = null
    for (const size of [3, 2, 4, 1]) {
      for (const combo of combinations(pool, size)) {
        const { counts, remainder } = allocate(combo, amount)
        if (remainder !== 0) continue
        const p = score(combo, counts, players, owned, enforceInventory)
        if (p == null) continue
        if (!best || p < best.penalty) best = { combo, counts, penalty: p }
      }
    }
    return best
  }

  // Prefer a stack that fits the rack. If none does, still suggest the best
  // shape and name what is missing — silence is less useful than a shortfall.
  let best = search(true)
  const short = []
  if (!best) {
    best = search(false)
    if (best) {
      best.combo.forEach((d, i) => {
        const need = best.counts[i] * players
        if (need > owned(d)) short.push({ value: d.value, color: d.color, need, owned: owned(d) })
      })
    }
  }

  if (!best) return { ...empty, impossible: true }

  const rows = best.combo.map((d, i) => ({ ...d, count: best.counts[i] }))
  const total = rows.reduce((sum, r) => sum + r.value * r.count, 0)
  return {
    rows,
    total,
    chipCount: best.counts.reduce((a, b) => a + b, 0),
    exact: total === amount,
    players,
    short,
    usage: rows.map((r) => ({
      value: r.value,
      color: r.color,
      used: r.count * players,
      owned: owned(r),
    })),
  }
}

// What a pile of chips is worth, for the count-this-stack helper.
export function stackValue(chips, counts) {
  return chips.reduce((s, c, i) => s + c.value * (counts[i] || 0), 0)
}
