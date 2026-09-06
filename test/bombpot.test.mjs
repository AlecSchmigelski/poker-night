import { makeBombPot, status, advance, clock } from '../src/lib/bombpot.js'

let fail = 0
const check = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  if (!ok) fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : `\n   got  ${JSON.stringify(got)}\n   want ${JSON.stringify(want)}`}`)
}

const T0 = 1_000_000_000_000
const bomb = makeBombPot(20, 500, T0)

check('schedules 20 minutes out', bomb.nextAt, T0 + 20 * 60000)
check('starts at zero fired', bomb.count, 0)

check('not due at start', status(bomb, T0).due, false)
check('remaining at start', clock(status(bomb, T0).remaining), '20:00')
check('remaining after 12m30s', clock(status(bomb, T0 + 12.5 * 60000).remaining), '7:30')
check('due exactly on time', status(bomb, T0 + 20 * 60000).due, true)
check('due after overshoot', status(bomb, T0 + 25 * 60000).due, true)
check('remaining never goes negative', status(bomb, T0 + 99 * 60000).remaining, 0)

// The phone slept through the deadline by 40 minutes. It should fire once and
// schedule from now, not queue up two missed rounds.
const fired = advance(bomb, T0 + 60 * 60000)
check('reschedules from now, not the missed deadline', fired.nextAt, T0 + 80 * 60000)
check('counts one firing', fired.count, 1)
check('not immediately due again', status(fired, T0 + 60 * 60000).due, false)

check('off timer is never due', status({ on: false, nextAt: 0 }, T0).due, false)
check('missing timer is safe', status(undefined, T0).active, false)

check('clock pads seconds', clock(65000), '1:05')
check('clock at zero', clock(0), '0:00')
check('clock rounds partial seconds up', clock(1500), '0:02')

console.log(fail ? `\n${fail} FAILED` : '\nAll passed')
process.exit(fail ? 1 : 0)
