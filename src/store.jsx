import { createContext, useContext, useEffect, useMemo, useReducer } from 'react'
import { uid } from './lib/id'
import { minimizePayments, nets } from './lib/settle'

const KEY = 'poker-night/v1'

export const COLORS = [
  '#e5544b', '#f0a04b', '#e8cf4b', '#5bc47a',
  '#4bb8c4', '#5a8ce8', '#9b6be8', '#e56bb0',
]

const empty = { players: [], groups: [], game: null, history: [] }

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return empty
    return { ...empty, ...JSON.parse(raw) }
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
        id: uid(),
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
              ? { ...s, buyIns: [...s.buyIns, { id: uid(), amount: action.amount, at: Date.now() }] }
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
            s.playerId === action.playerId ? { ...s, cashOut: action.amount } : s,
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

    case 'DELETE_HISTORY':
      return { ...state, history: state.history.filter((g) => g.id !== action.id) }

    default:
      return state
  }
}

// Actions that change money get one level of undo, surfaced as a toast.
const UNDOABLE = new Set([
  'BUY_IN', 'REMOVE_LAST_BUY_IN', 'REMOVE_SEAT', 'FINISH_GAME',
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
