// Chip denomination helpers. Values are cents, same as all other money.

// Suggest a starting stack for a given buy-in: weight the value toward the
// small denominations so people can actually bet, then close the remainder
// from the largest chip down.
export function suggestStack(chips, amount) {
  const denoms = [...chips].filter((c) => c.value > 0).sort((a, b) => a.value - b.value)
  if (!denoms.length || amount <= 0) return { denoms: [], counts: [], total: 0, exact: false }

  const weights = [0.3, 0.28, 0.22, 0.14, 0.06]
  const counts = denoms.map((d, i) =>
    Math.floor((amount * weights[Math.min(i, weights.length - 1)]) / d.value),
  )

  let rem = amount - total(denoms, counts)
  for (let i = denoms.length - 1; i >= 0 && rem > 0; i--) {
    const add = Math.floor(rem / denoms[i].value)
    counts[i] += add
    rem -= add * denoms[i].value
  }

  const sum = total(denoms, counts)
  return { denoms, counts, total: sum, exact: sum === amount }
}

function total(denoms, counts) {
  return denoms.reduce((s, d, i) => s + d.value * counts[i], 0)
}

// What a pile of chips is worth, for the count-this-stack helper.
export function stackValue(chips, counts) {
  return chips.reduce((s, c, i) => s + c.value * (counts[i] || 0), 0)
}
