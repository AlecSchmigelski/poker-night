import { renderRecapCanvas } from '../src/lib/recap.js'

let fail = 0
const check = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  if (!ok) fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : `\n   got  ${JSON.stringify(got)}\n   want ${JSON.stringify(want)}`}`)
}

// A canvas stand-in that records every string drawn. renderRecapCanvas takes a
// makeCanvas for exactly this: the card can be rendered and inspected with no
// browser and no fonts.
function fakeCanvas(w, h) {
  const drawn = []
  return {
    width: w,
    height: h,
    drawn,
    getContext: () => ({
      drawn,
      set fillStyle(_v) {},
      set strokeStyle(_v) {},
      set lineWidth(_v) {},
      set font(_v) {},
      set textAlign(_v) {},
      set textBaseline(_v) {},
      fillRect() {},
      fillText(t) { drawn.push(String(t)) },
      measureText(t) { return { width: String(t).length * 20 } },
      beginPath() {}, arc() {}, fill() {}, moveTo() {}, lineTo() {}, stroke() {},
      createRadialGradient: () => ({ addColorStop() {} }),
    }),
  }
}

const COLORS = ['#D6473F', '#4A7FD1', '#3F9E62', '#8A5FCB']

// A balanced night: every cash-out is the buy-in plus a delta, and the deltas
// sum to zero, so total in equals total out.
function night(n) {
  const deltas = Array.from({ length: n }, (_, i) => (i - (n - 1) / 2) * 200)
  const players = Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    name: `Player${i}`,
    color: COLORS[i % COLORS.length],
  }))
  const seats = players.map((p, i) => ({
    playerId: p.id,
    buyIns: [{ id: `b${i}`, amount: 2000, at: i }],
    cashOut: 2000 + deltas[i],
  }))
  const game = {
    id: 'g', startedAt: 0, endedAt: 3600e3, phase: 'settle',
    defaultBuyIn: 2000, payments: [], seats,
  }
  const inTot = seats.reduce((s, x) => s + x.buyIns.reduce((a, b) => a + b.amount, 0), 0)
  const outTot = seats.reduce((s, x) => s + x.cashOut, 0)
  if (inTot !== outTot) throw new Error(`fixture does not balance: ${inTot} vs ${outTot}`)
  return { game, player: (id) => players.find((p) => p.id === id) }
}

const render = (n) => {
  const { game, player } = night(n)
  const c = renderRecapCanvas(game, player, fakeCanvas)
  return { height: c.height, drawn: c.drawn }
}

// --- nobody is dropped ------------------------------------------------------
//
// The bug this guards: the card stopped at ten rows and printed "and N more".
// It sliced the END of the standings, so the players left off were always the
// ones who owed money — on the single image that gets sent to the group chat.

for (const n of [2, 6, 8, 9, 10, 11, 14, 20]) {
  const { drawn } = render(n)
  const missing = []
  for (let i = 0; i < n; i++) if (!drawn.includes(`Player${i}`)) missing.push(i)
  check(`${n} players: every name is on the card`, missing, [])
}

const { drawn: d14 } = render(14)
check('the last-placed player is drawn', d14.includes('Player0'), true)
check('no "and N more" line survives', d14.some((t) => /more$/.test(t)), false)
check('every rank is numbered', [1, 7, 14].every((k) => d14.includes(String(k))), true)

// --- the card stays a readable shape ---------------------------------------

const h8 = render(8).height
const h9 = render(9).height

// Nine players must not be taller than eight, even though it has another row:
// crossing the threshold switches to compact rows, which more than pays for it.
check('compact kicks in without growing the card', h9 < h8, true)
check('8 players keeps the roomy layout', h8, 560 + 8 * 132 + 58 + 76)
check('9 players uses compact rows', h9, 560 + 9 * 84 + 58 + 76)

// 14 used to render at 2162px — ten rows plus an apology. All fourteen now fit
// in less height than ten rows took.
check('14 players is shorter than the old truncated card', render(14).height < 2162, true)
check('height grows one compact row at a time', render(15).height - render(14).height, 84)

// --- the in/out detail is what compact gives up -----------------------------

check('roomy rows carry in/out', render(8).drawn.some((t) => t.startsWith('in $')), true)
check('compact rows drop in/out', render(9).drawn.some((t) => t.startsWith('in $')), false)
check('compact still carries every net', render(9).drawn.filter((t) => /^[+-]?\$/.test(t)).length >= 9, true)

console.log(fail ? `\n${fail} failed` : '\nAll passed')
process.exit(fail ? 1 : 0)
