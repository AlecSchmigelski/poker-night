// Shape of everything that gets persisted, and the one place that decides
// whether saved data is usable. Shared by the store's loader and by backup
// import, so a restored file gets exactly the same scrutiny as local state.

// A typical home set: far more of the small workhorse chips than the big ones.
// `count` is how many the host owns, which caps what can be dealt out.
export const DEFAULT_CHIPS = [
  { color: '#E8E0D2', value: 25, count: 150 },
  { color: '#D6473F', value: 100, count: 150 },
  { color: '#4A7FD1', value: 500, count: 100 },
  { color: '#3F9E62', value: 2500, count: 50 },
  { color: '#14100E', value: 10000, count: 25 },
]

// Blinds drive which denominations belong in play, so they live with the set.
export const DEFAULT_BLINDS = { small: 25, big: 50 }

export const EMPTY = {
  players: [],
  groups: [],
  game: null,
  history: [],
  chips: DEFAULT_CHIPS,
  blinds: DEFAULT_BLINDS,
}

// Valid JSON of the wrong shape is the dangerous case: it parses, then throws
// on the first .map() during render. Every list is coerced before it can reach
// a component.
export function sanitise(saved) {
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return EMPTY
  const list = (v, fallback) => (Array.isArray(v) ? v : fallback)
  return {
    players: list(saved.players, []),
    groups: list(saved.groups, []),
    history: list(saved.history, []),
    chips: list(saved.chips, DEFAULT_CHIPS),
    blinds: saved.blinds?.small > 0 ? saved.blinds : DEFAULT_BLINDS,
    game:
      saved.game && Array.isArray(saved.game.seats)
        ? { ...saved.game, payments: list(saved.game.payments, []) }
        : null,
  }
}
