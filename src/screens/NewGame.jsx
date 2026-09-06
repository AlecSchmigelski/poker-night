import { useState } from 'react'
import { useStore } from '../store'
import { fmt, toCents } from '../lib/money'
import { Avatar, Empty } from '../components/UI'

const PRESETS = [1000, 2000, 2500, 5000]

export function NewGame() {
  const { state, dispatch } = useStore()
  const [selected, setSelected] = useState([])
  const [buyIn, setBuyIn] = useState(2000)
  const [custom, setCustom] = useState('')
  const [newName, setNewName] = useState('')

  const toggle = (id) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  const loadGroup = (group) =>
    setSelected((s) => [...new Set([...s, ...group.playerIds])])

  const addPlayer = (e) => {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    // Reducer assigns the id, so read it back off the next state via the name.
    dispatch({ type: 'ADD_PLAYER', name })
    setNewName('')
  }

  // Newly added players aren't selected yet; auto-select any player not in a
  // previous render is overkill, so we just select on tap like the rest.
  const amount = custom ? toCents(custom) : buyIn

  return (
    <div className="screen">
      <div className="section-label">Buy-in</div>
      <div className="chip-list">
        {PRESETS.map((p) => (
          <button
            key={p}
            className="chip"
            data-on={!custom && buyIn === p}
            onClick={() => {
              setBuyIn(p)
              setCustom('')
            }}
          >
            {fmt(p)}
          </button>
        ))}
        <input
          className="chip"
          style={{ width: 92, textAlign: 'center' }}
          inputMode="decimal"
          placeholder="Custom"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
        />
      </div>

      {state.groups.length > 0 && (
        <>
          <div className="section-label">Load a group</div>
          <div className="chip-list">
            {state.groups.map((g) => (
              <button key={g.id} className="chip" onClick={() => loadGroup(g)}>
                {g.name} · {g.playerIds.length}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="section-label">
        Players {selected.length > 0 && `· ${selected.length} in`}
      </div>

      {state.players.length === 0 ? (
        <Empty>No players yet. Add your regulars below.</Empty>
      ) : (
        state.players.map((p) => (
          <button
            key={p.id}
            className="seat"
            style={{ width: '100%', textAlign: 'left' }}
            onClick={() => toggle(p.id)}
          >
            <Avatar player={p} />
            <div className="info">
              <div className="name">{p.name}</div>
            </div>
            <div
              className="avatar"
              style={{
                width: 24,
                height: 24,
                fontSize: 14,
                background: selected.includes(p.id) ? 'var(--accent)' : 'var(--surface-2)',
                color: selected.includes(p.id) ? 'var(--accent-ink)' : 'transparent',
              }}
            >
              ✓
            </div>
          </button>
        ))
      )}

      <form onSubmit={addPlayer} className="row" style={{ marginTop: 12 }}>
        <input
          className="chip"
          style={{ flex: 1 }}
          placeholder="Add a player"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button className="btn btn-sm" type="submit" disabled={!newName.trim()}>
          Add
        </button>
      </form>

      <button
        className="btn btn-primary btn-block"
        style={{ marginTop: 24 }}
        disabled={selected.length < 2 || amount <= 0}
        onClick={() =>
          dispatch({ type: 'START_GAME', playerIds: selected, defaultBuyIn: amount })
        }
      >
        Start game · {selected.length} players at {fmt(amount)}
      </button>
    </div>
  )
}
