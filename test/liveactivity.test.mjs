import { activityState, reconcile, shouldShow } from '../src/lib/liveActivity.js'

let fail = 0
const check = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  if (!ok) fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : `\n   got  ${JSON.stringify(got)}\n   want ${JSON.stringify(want)}`}`)
}

const seat = (id, ins, cashOut = null) => ({
  playerId: id,
  buyIns: ins.map((a, i) => ({ id: `${id}${i}`, amount: a, at: i })),
  cashOut,
})

const playing = {
  id: 'g1', startedAt: 1000, phase: 'playing', defaultBuyIn: 2000, payments: [],
  seats: [seat('a', [2000]), seat('b', [2000, 2000]), seat('c', [2000])],
}

// --- what the card shows ---------------------------------------------------

check('pot is every buy-in', activityState(playing).potCents, 8000)
check('players is every seat', activityState(playing).players, 3)
check('everyone is still in', activityState(playing).stillIn, 3)

const oneOut = { ...playing, seats: [seat('a', [2000], 1000), seat('b', [2000, 2000]), seat('c', [2000])] }
check('cashing out does not shrink the pot', activityState(oneOut).potCents, 8000)
check('but it does shrink still-in', activityState(oneOut).stillIn, 2)

// --- the seat strip --------------------------------------------------------
//
// The card draws one dot per seat in that player's own chip colour, dimmed
// once they cash out. Order matters: it is read as the table.

const colours = { a: '#D6473F', b: '#4A7FD1', c: '#3F9E62' }
const player = (id) => ({ id, name: id, color: colours[id] })

check('a dot per seat, in seat order', activityState(playing, player).seats,
  [{ color: '#D6473F', out: false }, { color: '#4A7FD1', out: false }, { color: '#3F9E62', out: false }])

check('cashing out dims that seat only', activityState(oneOut, player).seats,
  [{ color: '#D6473F', out: true }, { color: '#4A7FD1', out: false }, { color: '#3F9E62', out: false }])

// A seat whose player was deleted must still draw, or the strip stops matching
// the table — in smoke rather than in somebody else's colour.
check('an unknown player falls back to smoke',
  activityState(playing, () => undefined).seats.map((s) => s.color),
  ['#A69890', '#A69890', '#A69890'])
check('no lookup at all does not throw',
  activityState(playing).seats.length, 3)

// --- when it shows ---------------------------------------------------------
//
// Only during play. A pot frozen on the lock screen after the night ended is
// worse than no card: it is a number someone might act on.

check('a live game shows', shouldShow(playing), true)
check('cash out does not', shouldShow({ ...playing, phase: 'cashout' }), false)
check('settling does not', shouldShow({ ...playing, phase: 'settle' }), false)
check('no game does not', shouldShow(null), false)

// --- the transitions -------------------------------------------------------

check('first render of a live game starts it', reconcile(playing, false), 'start')
check('later renders update it', reconcile(playing, true), 'update')
check('ending the night ends it', reconcile({ ...playing, phase: 'cashout' }, true), 'end')
check('discarding the game ends it', reconcile(null, true), 'end')
check('no game and no card does nothing', reconcile(null, false), 'none')
check('cash out with no card does nothing', reconcile({ ...playing, phase: 'settle' }, false), 'none')

// A relaunch mid-night starts rather than updates, because the handle is gone.
check('a cold start re-starts the card', reconcile(playing, false), 'start')

console.log(fail ? `\n${fail} failed` : '\nAll passed')
process.exit(fail ? 1 : 0)
