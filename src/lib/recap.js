import { fmt, fmtSigned } from './money.js'
import { nets, potTotal } from './settle.js'

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
const M = 84 // margin
const ROW = 132 // one standings row
const MAX_ROWS = 10

// Drawn on a canvas so the export stays self-contained — no library, no fonts
// to load, no network.
//
// Sizes are set for how this is actually seen: scaled to a few hundred pixels
// wide in a group chat. The card grows taller with the field rather than
// shrinking the type to fit a fixed frame — a squeezed row is unreadable at
// thumbnail size, and a tall image just scrolls.
export function renderRecapCanvas(game, player, makeCanvas) {
  const s = recapStats(game, player)
  const notes = superlatives(game, s, player)
  const shown = s.ranked.slice(0, MAX_ROWS)
  const hidden = s.ranked.length - shown.length

  const top = 560
  const footer = (notes.length ? notes.length * 54 + 40 : 0) + (hidden ? 54 : 0)
  const H = top + shown.length * ROW + footer + 76

  // makeCanvas lets this run outside a browser (sample generation, tests).
  let c
  if (makeCanvas) {
    c = makeCanvas(W, H)
  } else {
    c = document.createElement('canvas')
    c.width = W
    c.height = H
  }
  const g = c.getContext('2d')
  const font = (size, weight = 400) =>
    `${weight} ${size}px ui-sans-serif, -apple-system, "SF Pro Text", "Segoe UI", Inter, sans-serif`

  g.fillStyle = '#141110'
  g.fillRect(0, 0, W, H)

  // One restrained wash at the top, not a gradient over the whole card.
  const lamp = g.createRadialGradient(W / 2, -60, 0, W / 2, -60, 680)
  lamp.addColorStop(0, 'rgba(233,161,59,0.16)')
  lamp.addColorStop(1, 'rgba(233,161,59,0)')
  g.fillStyle = lamp
  g.fillRect(0, 0, W, 640)

  g.textBaseline = 'alphabetic'

  g.fillStyle = '#E9A13B'
  g.font = font(34, 640)
  tracked(g, 'POKER NIGHT', M, 150, 9)

  // The date is the headline. Shrink to fit rather than truncate a weekday.
  const date = s.date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
  g.fillStyle = '#F3ECE3'
  let dateSize = 92
  g.font = font(dateSize, 680)
  while (g.measureText(date).width > W - M * 2 && dateSize > 52) {
    dateSize -= 2
    g.font = font(dateSize, 680)
  }
  g.fillText(date, M, 272)

  const stats = [
    ['On the table', fmt(s.pot)],
    ['Players', String(s.players)],
    ['Ran for', s.minutes ? duration(s.minutes) : '—'],
  ]
  const colW = (W - M * 2) / 3
  stats.forEach(([k, v], i) => {
    const x = M + i * colW
    g.fillStyle = '#A69890'
    g.font = font(32, 500)
    g.fillText(k, x, 384)
    g.fillStyle = '#F3ECE3'
    g.font = font(70, 660)
    g.fillText(v, x, 460)
  })

  g.strokeStyle = '#38302B'
  g.lineWidth = 2
  g.beginPath()
  g.moveTo(M, 512)
  g.lineTo(W - M, 512)
  g.stroke()

  shown.forEach((n, i) => {
    const p = player(n.playerId)
    const y = top + ROW * i + ROW / 2

    g.fillStyle = '#A69890'
    g.font = font(32, 500)
    g.fillText(String(i + 1), M, y + 12)

    const r = 38
    const cx = M + 58 + r
    g.beginPath()
    g.arc(cx, y, r, 0, Math.PI * 2)
    g.fillStyle = p.color
    g.fill()

    g.fillStyle = '#14100E'
    g.font = font(30, 660)
    g.textAlign = 'center'
    g.fillText(initials(p.name), cx, y + 11)
    g.textAlign = 'left'

    // Reserve the right-hand column for the number before measuring the name.
    g.font = font(62, 680)
    const netText = fmtSigned(n.net)
    const netW = g.measureText(netText).width
    const textX = cx + r + 32

    g.fillStyle = '#F3ECE3'
    g.font = font(54, 580)
    g.fillText(clip(g, p.name, W - M - textX - netW - 40), textX, y - 8)

    g.fillStyle = '#A69890'
    g.font = font(34, 500)
    g.fillText(`in ${fmt(n.buyIn)} · out ${fmt(n.cashOut)}`, textX, y + 38)

    g.fillStyle = n.net > 0 ? '#5DBE8C' : n.net < 0 ? '#E4695A' : '#A69890'
    g.font = font(62, 680)
    g.textAlign = 'right'
    g.fillText(netText, W - M, y + 20)
    g.textAlign = 'left'
  })

  // Plain lines. No box, no bullets, no emoji.
  let fy = top + shown.length * ROW + 62
  g.fillStyle = '#A69890'
  g.font = font(34, 520)
  if (hidden) {
    g.fillText(`and ${hidden} more`, M, fy)
    fy += 54
  }
  notes.forEach((t) => {
    g.fillText(clip(g, t, W - M * 2), M, fy)
    fy += 54
  })

  return c
}

// The two facts worth reading that the standings do not already show.
function superlatives(game, s, player) {
  const out = []
  if (s.mostRebuys && s.mostRebuyCount > 0) {
    out.push(
      `${player(s.mostRebuys.playerId).name} reloaded ${s.mostRebuyCount} time${s.mostRebuyCount === 1 ? '' : 's'}`,
    )
  }
  if (game.bombPot?.count > 0) {
    out.push(
      `${game.bombPot.count} bomb pot${game.bombPot.count === 1 ? '' : 's'} at ${fmt(game.bombPot.ante)} a head`,
    )
  }
  return out.slice(0, 2)
}

// ctx.letterSpacing is recent and not everywhere. Drawing per character keeps
// the wordmark identical wherever the card is rendered.
function tracked(g, text, x, y, spacing) {
  let cx = x
  for (const ch of text) {
    g.fillText(ch, cx, y)
    cx += g.measureText(ch).width + spacing
  }
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


export function canvasToBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
}
