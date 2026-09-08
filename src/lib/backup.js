import { sanitise } from './persist.js'

// A backup is the whole store in a file. It exists because the app keeps
// everything on one device: a lost phone is a lost ledger, and unpaid debts are
// the most valuable thing in here.
export const FORMAT = 'poker-night-backup'
export const VERSION = 1

export function toBackup(state, now) {
  const { past, undoLabel, ...rest } = state
  return JSON.stringify(
    { format: FORMAT, version: VERSION, exportedAt: now ?? Date.now(), state: sanitise(rest) },
    null,
    2,
  )
}

export function backupName(now) {
  const d = new Date(now ?? Date.now())
  const pad = (n) => String(n).padStart(2, '0')
  return `poker-night-backup-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`
}

// Returns { state, meta } or throws an Error whose message is safe to show.
export function fromBackup(text) {
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error("That file isn't readable. Pick the .json file the app exported.")
  }
  if (!parsed || parsed.format !== FORMAT) {
    throw new Error("That file didn't come from Poker Night.")
  }
  if (!(parsed.version <= VERSION)) {
    throw new Error('That backup was made by a newer version of the app.')
  }
  const state = sanitise(parsed.state)
  return {
    state,
    meta: {
      exportedAt: parsed.exportedAt ?? null,
      players: state.players.length,
      nights: state.history.length,
      hasGameInProgress: !!state.game,
    },
  }
}
