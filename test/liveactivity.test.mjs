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

check('pot is every buy-in while all are in', activityState(playing).potCents, 8000)
check('players is every seat', activityState(playing).players, 3)
check('everyone is still in', activityState(playing).stillIn, 3)

const oneOut = { ...playing, seats: [seat('a', [2000], 1000), seat('b', [2000, 2000]), seat('c', [2000])] }
// The card says "ON THE TABLE", which in this app means still in play — the
// same words and the same number as the Game header. A cash-out takes chips
// off the table, so it must come off the card too.
check('cashing out takes it off the table', activityState(oneOut).potCents, 7000)
check('but it does shrink still-in', activityState(oneOut).stillIn, 2)

// --- what the card shows ----------------------------------------------------
//
// These are the app's own "game in progress" numbers. The card IS that card,
// so if these two ever disagree one of them is lying and the host cannot tell
// which.

check('bought in is every buy-in', activityState(playing).boughtInCents, 8000)
check('the buy-in rides along', activityState(playing).buyInCents, 2000)
check('nobody has cashed out yet',
  activityState(playing).players - activityState(playing).stillIn, 0)
check('one cashed out shows as one out',
  activityState(oneOut).players - activityState(oneOut).stillIn, 1)
// bought in stays put when someone leaves; only what is on the table moves.
check('bought in survives a cash-out', activityState(oneOut).boughtInCents, 8000)

// The bomb pot tile counts down to the same absolute timestamp the in-app
// countdown uses, so the card and the screen cannot drift apart. No timer
// armed reads as "Off" on the card, which is a null here.
check('no bomb pot is null', activityState(playing).bombPotAt, null)
const armed = { ...playing, bombPot: { on: true, minutes: 15, ante: 500, nextAt: 9_999_000, count: 0 } }
check('an armed timer carries its deadline', activityState(armed).bombPotAt, 9_999_000)
const disarmed = { ...playing, bombPot: { on: false, minutes: 15, ante: 500, nextAt: 9_999_000, count: 2 } }
check('a switched-off timer is null, not a stale deadline',
  activityState(disarmed).bombPotAt, null)

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
