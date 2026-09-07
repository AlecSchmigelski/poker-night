// Chip denomination helpers. Values are cents, same as all other money.
//
// Distribution follows standard home-game practice:
//   · The smallest chip in play is set by the SMALL BLIND. A .25/.50 game needs
//     sub-dollar chips; a 1/1 game does not, and putting quarters in it just
//     clutters the table.
//   · Nobody gets more than 15 of any one colour. Twenty each across eight
//     players is 160 chips of a single colour before anyone rebuys.
//   · Most of the VALUE sits in the big chips; most of the COUNT in the small.
//   · Three denominations is the norm. Two is clunky, four is fiddly.
//   · Leave chips in the rack for rebuys — never deal out the whole set.

export const MAX_PER_COLOUR = 15

const TARGET_CHIPS = 30
const SMALL_CHIP_MIN = 8 // enough of the blind chip to actually post and bet
const RESERVE = 0.7 // deal out at most this share of any colour
const BIGGEST_CHIP = 0.25 // no single chip worth more than this share of a stack
const DEFAULT_OWNED = 100

function combinations(list, k) {
  if (k === 0) return [[]]
  if (list.length < k) return []
  const [head, ...rest] = list
  return [...combinations(rest, k - 1).map((c) => [head, ...c]), ...combinations(rest, k)]
}

// Every count is capped, so the space is small enough to enumerate exactly.
// Fix the larger denominations, then solve the smallest for an exact total.
function solutions(combo, amount) {
  const out = []
  const [d0, ...rest] = combo.map((d) => d.value)

  const walk = (i, remaining, counts) => {
    if (i === rest.length) {
      if (remaining < 0 || remaining % d0 !== 0) return
      const c0 = remaining / d0
      if (c0 < 1 || c0 > MAX_PER_COLOUR) return
      out.push([c0, ...counts])
      return
    }
    for (let c = 1; c <= MAX_PER_COLOUR; c++) {
      const left = remaining - c * rest[i]
      if (left < 0) break
      walk(i + 1, left, [...counts, c])
    }
  }
  walk(0, amount, [])
  return out
}

function penalise(combo, counts, players, owned, enforceInventory) {
  if (enforceInventory && combo.some((d, i) => counts[i] * players > owned(d))) return null

  const chipCount = counts.reduce((a, b) => a + b, 0)
  let penalty = Math.abs(chipCount - TARGET_CHIPS) * 0.4

  // Enough of the blind chip to post and make change.
  if (counts[0] < SMALL_CHIP_MIN) penalty += (SMALL_CHIP_MIN - counts[0]) * 3
  // All else equal, prefer the version that eats less of the small-chip rack.
  penalty += counts[0] * 0.15

  // Value should climb with denomination, not sit in the low chips.
  for (let i = 1; i < combo.length; i++) {
    if (combo[i].value * counts[i] <= combo[i - 1].value * counts[i - 1]) penalty += 4
  }

  if (combo.length !== 3) penalty += 6

  combo.forEach((d, i) => {
    const share = (counts[i] * players) / owned(d)
    if (share > RESERVE) penalty += (share - RESERVE) * 30
  })
  return penalty
}

export function suggestStack(chips, amount, players = 1, blinds) {
  const denoms = [...chips].filter((c) => c.value > 0).sort((a, b) => a.value - b.value)
  const owned = (d) => (Number.isFinite(d.count) && d.count > 0 ? d.count : DEFAULT_OWNED)
  const empty = { rows: [], total: 0, chipCount: 0, players, usage: [], short: [] }
  if (!denoms.length || amount <= 0) return empty

  // The small blind sets the floor: anything below it never enters play.
  const smallBlind = blinds?.small > 0 ? blinds.small : null
  const floor = smallBlind
    ? (denoms.filter((d) => d.value <= smallBlind).pop()?.value ?? denoms[0].value)
    : denoms[0].value
  const ceiling = amount * BIGGEST_CHIP

  const pool = denoms.filter((d) => d.value >= floor && d.value <= ceiling)
  if (!pool.length) return { ...empty, impossible: true, floor }

  const search = (enforceInventory) => {
    let best = null
    for (const size of [3, 2, 4, 1]) {
      for (const combo of combinations(pool, size)) {
        for (const counts of solutions(combo, amount)) {
          const p = penalise(combo, counts, players, owned, enforceInventory)
          if (p == null) continue
          if (!best || p < best.penalty) best = { combo, counts, penalty: p }
        }
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
  if (!best) return { ...empty, impossible: true, floor }

  const rows = best.combo.map((d, i) => ({ ...d, count: best.counts[i] }))
  return {
    rows,
    total: rows.reduce((sum, r) => sum + r.value * r.count, 0),
    chipCount: best.counts.reduce((a, b) => a + b, 0),
    players,
    floor,
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
