// A spectator link carries the table in the URL fragment: no server, no account,
// nothing to host beyond the app itself. It is a SNAPSHOT — the moment it is
// generated — because there is nowhere for a viewer to poll for changes.
//
// Signatures are deliberately never included. They are the private half of the
// record and would dominate the payload.
const VERSION = 1

export function buildSnapshot(game, player) {
  const seats = game.seats.map((seat) => {
    const p = player(seat.playerId)
    return [
      p.name,
      p.color,
      seat.buyIns.reduce((s, b) => s + b.amount, 0),
      seat.buyIns.length,
      seat.cashOut ?? null,
    ]
  })

  const snap = {
    v: VERSION,
    t: Date.now(),
    b: game.defaultBuyIn,
    ph: game.phase === 'playing' ? 'playing' : 'settle',
    p: seats,
  }

  if (game.phase !== 'playing' && game.payments?.length) {
    const index = Object.fromEntries(game.seats.map((s, i) => [s.playerId, i]))
    snap.pay = game.payments.map((x) => [index[x.from], index[x.to], x.amount])
  }
  return snap
}

// base64url of UTF-8 JSON. btoa is Latin-1 only, so the bytes go through
// TextEncoder first or any non-ASCII name throws.
export function encodeSnapshot(snap) {
  const bytes = new TextEncoder().encode(JSON.stringify(snap))
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function decodeSnapshot(encoded) {
  try {
    const padded = encoded.replace(/-/g, '+').replace(/_/g, '/')
    const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4))
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
    const snap = JSON.parse(new TextDecoder().decode(bytes))
    if (snap?.v !== VERSION || !Array.isArray(snap.p)) return null
    return snap
  } catch {
    return null
  }
}

export function shareUrl(game, player, origin) {
  const base = origin || `${location.origin}${location.pathname}`
  return `${base}#g=${encodeSnapshot(buildSnapshot(game, player))}`
}

// Derived views the spectator screen needs, computed from the snapshot alone.
export function snapshotTotals(snap) {
  const pot = snap.p.reduce((s, row) => s + row[2], 0)
  const counted = snap.p.reduce((s, row) => s + (row[4] ?? 0), 0)
  const allCounted = snap.p.every((row) => row[4] != null)
  return { pot, counted, allCounted }
}
