// Net position per seat: what they walked out with minus what they put in.
export function nets(game) {
  return game.seats.map((seat) => {
    const buyIn = seat.buyIns.reduce((sum, b) => sum + b.amount, 0)
    const cashOut = seat.cashOut ?? 0
    return { playerId: seat.playerId, buyIn, cashOut, net: cashOut - buyIn }
  })
}

export function potTotal(game) {
  return game.seats.reduce(
    (sum, seat) => sum + seat.buyIns.reduce((s, b) => s + b.amount, 0),
    0,
  )
}

export function countedTotal(game) {
  return game.seats.reduce((sum, seat) => sum + (seat.cashOut ?? 0), 0)
}

// Greedy largest-debtor-to-largest-creditor. Produces at most n-1 payments and
// in practice lands on the minimum for the shapes a home game actually hits.
export function minimizePayments(netList) {
  const debtors = netList
    .filter((n) => n.net < 0)
    .map((n) => ({ id: n.playerId, amount: -n.net }))
    .sort((a, b) => b.amount - a.amount)

  const creditors = netList
    .filter((n) => n.net > 0)
    .map((n) => ({ id: n.playerId, amount: n.net }))
    .sort((a, b) => b.amount - a.amount)

  const payments = []
  let i = 0
  let j = 0

  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].amount, creditors[j].amount)
    if (amount > 0) {
      payments.push({ from: debtors[i].id, to: creditors[j].id, amount })
    }
    debtors[i].amount -= amount
    creditors[j].amount -= amount
    if (debtors[i].amount === 0) i += 1
    if (creditors[j].amount === 0) j += 1
  }

  return payments
}
