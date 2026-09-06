// Money still owed across every saved night. Once a game is archived its unpaid
// payments are invisible — the ledger shows net position, not who still has to
// hand over cash. This is the one thing a home view knows that no tab does.

export function outstanding(history) {
  const rows = []
  for (const game of history) {
    for (const p of game.payments || []) {
      if (p.paid) continue
      rows.push({
        gameId: game.id,
        paymentId: p.id,
        endedAt: game.endedAt,
        from: p.from,
        to: p.to,
        amount: p.amount,
      })
    }
  }
  // Newest first: last week's debt is the one people actually remember.
  return rows.sort((a, b) => b.endedAt - a.endedAt)
}

export function totalOutstanding(history) {
  return outstanding(history).reduce((sum, r) => sum + r.amount, 0)
}

// Lifetime standing per player across saved nights.
export function standings(history, netsOf) {
  const totals = {}
  for (const game of history) {
    for (const n of netsOf(game)) {
      const t = (totals[n.playerId] ??= { net: 0, nights: 0, up: 0 })
      t.net += n.net
      t.nights += 1
      if (n.net > 0) t.up += 1
    }
  }
  return Object.entries(totals).sort((a, b) => b[1].net - a[1].net)
}
