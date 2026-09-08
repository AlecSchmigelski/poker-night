import { toBackup, fromBackup, backupName, FORMAT } from '../src/lib/backup.js'
import { sanitise, EMPTY } from '../src/lib/persist.js'

let fail = 0
const check = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  if (!ok) fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : `\n   got  ${JSON.stringify(got)}\n   want ${JSON.stringify(want)}`}`)
}
const throws = (label, fn, match) => {
  try {
    fn()
    fail++
    console.log(`FAIL  ${label}\n   expected a throw`)
  } catch (e) {
    const ok = e.message.includes(match)
    if (!ok) fail++
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : `\n   got  ${e.message}`}`)
  }
}

const state = {
  players: [{ id: 'p1', name: 'Jo', color: '#D6473F', venmo: 'jo', cashapp: '' }],
  groups: [{ id: 'g1', name: 'College', playerIds: ['p1'] }],
  chips: [{ color: '#E8E0D2', value: 25, count: 150 }],
  blinds: { small: 25, big: 50 },
  game: null,
  history: [{
    id: 'h1', endedAt: 1000, startedAt: 0,
    seats: [{ playerId: 'p1', buyIns: [{ id: 'b', amount: 2000, at: 0 }], cashOut: 2000 }],
    payments: [{ id: 'q', from: 'p1', to: 'p1', amount: 0, paid: false }],
  }],
  // Runtime-only fields must not travel.
  past: { players: [] },
  undoLabel: { text: 'nope' },
}

const text = toBackup(state, 1700000000000)
const parsed = JSON.parse(text)

check('carries the format marker', parsed.format, FORMAT)
check('records when it was made', parsed.exportedAt, 1700000000000)
check('undo buffer is not exported', 'past' in parsed.state, false)
check('undo label is not exported', 'undoLabel' in parsed.state, false)

const round = fromBackup(text)
check('round trip keeps the roster', round.state.players, state.players)
check('round trip keeps history', round.state.history, state.history)
check('round trip keeps the chip set', round.state.chips, state.chips)
check('round trip keeps blinds', round.state.blinds, state.blinds)
check('meta counts players', round.meta.players, 1)
check('meta counts nights', round.meta.nights, 1)
check('meta flags no game in progress', round.meta.hasGameInProgress, false)

// A file from someone else, or a mangled one, must fail with a readable reason.
throws('rejects unreadable text', () => fromBackup('not json {{'), "isn't readable")
throws('rejects a foreign file', () => fromBackup('{"hello":true}'), "didn't come from Poker Night")
throws('rejects a newer format', () =>
  fromBackup(JSON.stringify({ format: FORMAT, version: 99, state: {} })), 'newer version')

// A backup whose payload is the wrong shape restores as empty, never as a crash.
const wrongShape = JSON.stringify({ format: FORMAT, version: 1, state: { players: 'nope', history: 7 } })
check('wrong-shaped payload is coerced', fromBackup(wrongShape).state.players, [])
check('and history too', fromBackup(wrongShape).state.history, [])

check('an in-progress game is flagged', fromBackup(
  JSON.stringify({ format: FORMAT, version: 1, state: { ...EMPTY, game: { seats: [] } } })
).meta.hasGameInProgress, true)

check('sanitise rejects an array', sanitise([1, 2, 3]), EMPTY)
check('sanitise rejects null', sanitise(null), EMPTY)
check('file name is dated', backupName(new Date(2026, 8, 8).getTime()), 'poker-night-backup-2026-09-08.json')

console.log(fail ? `\n${fail} FAILED` : '\nAll passed')
process.exit(fail ? 1 : 0)
