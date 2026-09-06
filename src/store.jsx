import { createContext, useContext, useEffect, useMemo, useReducer } from 'react'
import { uid } from './lib/id'
import { minimizePayments, nets } from './lib/settle'

const KEY = 'poker-night/v1'

// Clay chip denominations rather than a generic colour wheel. Assigned in
// roster order and permanent — this is how two players named Sam stay apart.
export const COLORS = [
  '#D6473F', '#4A7FD1', '#3F9E62', '#8A5FCB',
  '#D9BC4A', '#4FAEB8', '#DB6E9E', '#E8E0D2',
]

const DEFAULT_CHIPS = [
  { color: '#E8E0D2', value: 25 },
  { color: '#D6473F', value: 100 },
  { color: '#4A7FD1', value: 500 },
  { color: '#3F9E62', value: 2500 },
  { color: '#14100E', value: 10000 },
]

const empty = { players: [], groups: [], game: null, history: [], chips: DEFAULT_CHIPS }

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return empty
    const saved = JSON.parse(raw)
    if (!saved || typeof saved !== 'object') return empty
    // Valid JSON of the wrong shape is the dangerous case: it parses, then
    // explodes on the first .map() during render.
    const list = (v, fallback) => (Array.isArray(v) ? v : fallback)
    return {
      players: list(saved.players, []),
      groups: list(saved.groups, []),
      history: list(saved.history, []),
      chips: list(saved.chips, DEFAULT_CHIPS),
      game:
        saved.game && Array.isArray(saved.game.seats)
          ? { ...saved.game, payments: list(saved.game.payments, []) }
          : null,
    }
  } catch {
    return empty
  }
}

function seatFor(playerId) {
  return { playerId, buyIns: [], cashOut: null }
}

function reducer(state, action) {
  switch (action.type) {
    case 'ADD_PLAYER': {
      const player = {
        // The caller may pass an id so it can select the new player right away.
        id: action.id || uid(),
        name: action.name.trim(),
        color: COLORS[state.players.length % COLORS.length],
        venmo: '',
        cashapp: '',
      }
      return { ...state, players: [...state.players, player] }
    }

    case 'UPDATE_PLAYER':
      return {
        ...state,
        players: state.players.map((p) =>
          p.id === action.id ? { ...p, ...action.patch } : p,
        ),
      }

    case 'DELETE_PLAYER':
      return {
        ...state,
        players: state.players.filter((p) => p.id !== action.id),
        groups: state.groups.map((g) => ({
          ...g,
          playerIds: g.playerIds.filter((id) => id !== action.id),
        })),
        // An orphaned seat would show up as "Unknown" all night; drop it too.
        game: state.game
          ? { ...state.game, seats: state.game.seats.filter((s) => s.playerId !== action.id) }
          : null,
      }

    case 'SAVE_GROUP': {
      const exists = state.groups.some((g) => g.id === action.group.id)
      return {
        ...state,
        groups: exists
          ? state.groups.map((g) => (g.id === action.group.id ? action.group : g))
          : [...state.groups, { ...action.group, id: action.group.id || uid() }],
      }
    }

    case 'DELETE_GROUP':
      return { ...state, groups: state.groups.filter((g) => g.id !== action.id) }

    case 'START_GAME':
      return {
        ...state,
        game: {
          id: uid(),
          startedAt: Date.now(),
          defaultBuyIn: action.defaultBuyIn,
          phase: 'playing',
          seats: action.playerIds.map(seatFor),
          payments: [],
        },
      }

    case 'ADD_SEAT': {
      if (state.game.seats.some((s) => s.playerId === action.playerId)) return state
      return {
        ...state,
        game: { ...state.game, seats: [...state.game.seats, seatFor(action.playerId)] },
      }
    }

    case 'REMOVE_SEAT':
      return {
        ...state,
        game: {
          ...state.game,
          seats: state.game.seats.filter((s) => s.playerId !== action.playerId),
        },
      }

    case 'BUY_IN':
      return {
        ...state,
        game: {
          ...state.game,
          seats: state.game.seats.map((s) =>
            s.playerId === action.playerId
              ? {
                  ...s,
                  buyIns: [
                    ...s.buyIns,
                    {
                      id: uid(),
                      amount: action.amount,
                      at: Date.now(),
                      signature: action.signature ?? null,
                    },
                  ],
                }
              : s,
          ),
        },
      }

    case 'REMOVE_LAST_BUY_IN':
      return {
        ...state,
        game: {
          ...state.game,
          seats: state.game.seats.map((s) =>
            s.playerId === action.playerId ? { ...s, buyIns: s.buyIns.slice(0, -1) } : s,
          ),
        },
      }

    case 'SET_CASH_OUT':
      return {
        ...state,
        game: {
          ...state.game,
          seats: state.game.seats.map((s) =>
            s.playerId === action.playerId
              ? {
                  ...s,
                  cashOut: action.amount,
                  // Marks someone who left mid-game, so the end-of-night count
                  // shows their number as already settled rather than asking
                  // the host to count a stack that is no longer there.
                  leftEarly: action.amount == null ? false : (action.leftEarly ?? s.leftEarly ?? false),
                }
              : s,
          ),
        },
      }

    case 'SET_PHASE': {
      const game = { ...state.game, phase: action.phase }
      if (action.phase === 'settle') {
        game.payments = minimizePayments(nets(game)).map((p) => ({
          ...p,
          id: uid(),
          paid: false,
        }))
      }
      return { ...state, game }
    }

    case 'TOGGLE_PAID':
      return {
        ...state,
        game: {
          ...state.game,
          payments: state.game.payments.map((p) =>
            p.id === action.id ? { ...p, paid: !p.paid } : p,
          ),
        },
      }

    case 'FINISH_GAME':
      return {
        ...state,
        game: null,
        history: [{ ...state.game, endedAt: Date.now() }, ...state.history],
      }

    case 'CANCEL_GAME':
      return { ...state, game: null }

    // The bomb pot lives on the game because it is part of how tonight is being
    // played. It deliberately never touches seats, buy-ins, or the pot.
    case 'SET_BOMB_POT':
      return { ...state, game: { ...state.game, bombPot: action.bombPot } }

    case 'SET_CHIPS':
      return { ...state, chips: action.chips }

    case 'DELETE_HISTORY':
      return { ...state, history: state.history.filter((g) => g.id !== action.id) }

    default:
      return state
  }
}

// Actions that change money get one level of undo, surfaced as a toast.
const UNDOABLE = new Set([
  'BUY_IN', 'REMOVE_LAST_BUY_IN', 'REMOVE_SEAT', 'FINISH_GAME', 'SET_CASH_OUT',
  'CANCEL_GAME', 'DELETE_PLAYER', 'DELETE_GROUP', 'DELETE_HISTORY',
])

function withUndo(state, action) {
  if (action.type === 'UNDO') {
    return state.past ? { ...state.past, past: null, undoLabel: null } : state
  }
  const next = reducer(state, action)
  if (next === state) return state
  if (!UNDOABLE.has(action.type)) return { ...next, past: state.past, undoLabel: state.undoLabel }
  const clean = { ...state }
  delete clean.past
  delete clean.undoLabel
  return { ...next, past: clean, undoLabel: action.label || 'Change' }
}

const Ctx = createContext(null)

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(withUndo, null, () => ({
    ...load(),
    past: null,
    undoLabel: null,
  }))

  useEffect(() => {
    const { past, undoLabel, ...persist } = state
    localStorage.setItem(KEY, JSON.stringify(persist))
  }, [state])

  const value = useMemo(() => {
    const byId = Object.fromEntries(state.players.map((p) => [p.id, p]))
    return { state, dispatch, player: (id) => byId[id] || { name: 'Unknown', color: '#666' } }
  }, [state])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useStore must be used inside StoreProvider')
  return ctx
}
