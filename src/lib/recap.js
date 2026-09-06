import { fmt, fmtSigned } from './money'
import { nets, potTotal } from './settle'

// The superlatives that make a night worth sharing.
export function recapStats(game, player) {
  const ranked = nets(game).sort((a, b) => b.net - a.net)
  const seatOf = Object.fromEntries(game.seats.map((s) => [s.playerId, s]))
  const rebuys = (id) => Math.max(0, seatOf[id].buyIns.length - 1)

  const mostRebuys = [...ranked].sort((a, b) => rebuys(b.playerId) - rebuys(a.playerId))[0]
  const deepest = [...ranked].sort((a, b) => b.buyIn - a.buyIn)[0]
  // A recap can be opened mid-settle, before the night is saved.
  const minutes = Math.round(((game.endedAt || Date.now()) - game.startedAt) / 60000)

  return {
    ranked,
    pot: potTotal(game),
    players: game.seats.length,
    winner: ranked[0],
    loser: ranked[ranked.length - 1],
    mostRebuys: rebuys(mostRebuys.playerId) > 0 ? mostRebuys : null,
    mostRebuyCount: rebuys(mostRebuys.playerId),
    deepest,
    minutes,
    date: new Date(game.endedAt || game.startedAt),
    rebuys,
    name: (id) => player(id).name,
  }
}

export function duration(minutes) {
  if (minutes < 60) return `${minutes}m`
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}

const W = 1080
const H = 1350

// Draw the share card. Everything is hand-drawn on a canvas so the export stays
// self-contained — no html2canvas, no fonts to load, no network.
export function renderRecapCanvas(game, player) {
  const s = recapStats(game, player)
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')
  const font = (size, weight = 400) =>
    `${weight} ${size}px ui-sans-serif, -apple-system, "SF Pro Text", "Segoe UI", Inter, sans-serif`

  g.fillStyle = '#141110'
  g.fillRect(0, 0, W, H)

  // The lamp, same move as the app header.
  const lamp = g.createRadialGradient(W / 2, 40, 0, W / 2, 40, 620)
  lamp.addColorStop(0, 'rgba(233,161,59,0.20)')
  lamp.addColorStop(0.45, 'rgba(233,161,59,0.06)')
  lamp.addColorStop(1, 'rgba(233,161,59,0)')
  g.fillStyle = lamp
  g.fillRect(0, 0, W, 700)

  g.textBaseline = 'alphabetic'
  g.fillStyle = '#E9A13B'
  g.font = font(30, 640)
  g.letterSpacing = '6px'
  g.fillText('POKER NIGHT', 72, 130)
  g.letterSpacing = '0px'

  g.fillStyle = '#F3ECE3'
  g.font = font(78, 680)
  g.fillText(
    s.date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }),
    72,
    226,
  )

  // Headline stats.
  const stats = [
    ['On the table', fmt(s.pot)],
    ['Players', String(s.players)],
    ['Ran for', s.minutes ? duration(s.minutes) : '—'],
  ]
  stats.forEach(([k, v], i) => {
    const x = 72 + i * 316
    g.fillStyle = '#A69890'
    g.font = font(26, 500)
    g.fillText(k, x, 300)
    g.fillStyle = '#F3ECE3'
    g.font = font(54, 660)
    g.fillText(v, x, 362)
  })

  g.strokeStyle = '#38302B'
  g.lineWidth = 2
  g.beginPath()
  g.moveTo(72, 416)
  g.lineTo(W - 72, 416)
  g.stroke()

  // Standings.
  let y = 492
  const rowH = 92
  const shown = s.ranked.slice(0, 7)
  for (const [i, n] of shown.entries()) {
    const p = player(n.playerId)

    g.fillStyle = '#A69890'
    g.font = font(28, 500)
    g.fillText(String(i + 1), 74, y + 10)

    g.beginPath()
    g.arc(150, y, 30, 0, Math.PI * 2)
    g.fillStyle = p.color
    g.fill()

    g.fillStyle = '#14100E'
    g.font = font(24, 660)
    g.textAlign = 'center'
    g.fillText(initials(p.name), 150, y + 9)
    g.textAlign = 'left'

    g.fillStyle = '#F3ECE3'
    g.font = font(38, 560)
    g.fillText(clip(g, p.name, 480), 202, y + 2)

    g.fillStyle = '#A69890'
    g.font = font(24, 500)
    g.fillText(`in ${fmt(n.buyIn)} · out ${fmt(n.cashOut)}`, 202, y + 36)

    g.fillStyle = n.net > 0 ? '#5DBE8C' : n.net < 0 ? '#E4695A' : '#A69890'
    g.font = font(42, 680)
    g.textAlign = 'right'
    g.fillText(fmtSigned(n.net), W - 72, y + 12)
    g.textAlign = 'left'

    y += rowH
  }

  // Superlatives.
  const notes = []
  if (s.winner && s.winner.net > 0) notes.push(`${player(s.winner.playerId).name} took the night`)
  if (s.mostRebuys) {
    notes.push(
      `${player(s.mostRebuys.playerId).name} reloaded ${s.mostRebuyCount} time${s.mostRebuyCount === 1 ? '' : 's'}`,
    )
  }
  if (s.loser && s.loser.net < 0) notes.push(`${player(s.loser.playerId).name} funded it`)
  if (game.bombPot?.count > 0) {
    notes.push(
      `${game.bombPot.count} bomb pot${game.bombPot.count === 1 ? '' : 's'} at ${fmt(game.bombPot.ante)} a head`,
    )
  }

  if (notes.length) {
    const boxY = Math.max(y + 24, H - 232)
    g.fillStyle = '#1D1917'
    roundRect(g, 72, boxY, W - 144, 150, 22)
    g.fill()
    g.strokeStyle = '#38302B'
    g.stroke()

    g.fillStyle = '#A69890'
    g.font = font(28, 500)
    notes.slice(0, 3).forEach((t, i) => g.fillText(clip(g, t, W - 220), 108, boxY + 52 + i * 40))
  }

  return c
}

function initials(name) {
  return name.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

function clip(g, text, max) {
  if (g.measureText(text).width <= max) return text
  let t = text
  while (t.length > 1 && g.measureText(`${t}…`).width > max) t = t.slice(0, -1)
  return `${t}…`
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath()
  g.moveTo(x + r, y)
  g.arcTo(x + w, y, x + w, y + h, r)
  g.arcTo(x + w, y + h, x, y + h, r)
  g.arcTo(x, y + h, x, y, r)
  g.arcTo(x, y, x + w, y, r)
  g.closePath()
}

export function canvasToBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
}
