import { useState } from 'react'
import { useStore } from '../store'
import { fmt, toCents } from '../lib/money'
import { uid } from '../lib/id'
import { Avatar, Dock, Empty } from '../components/UI'

const PRESETS = [1000, 2000, 2500, 5000]

export function NewGame() {
  const { state, dispatch } = useStore()
  const [selected, setSelected] = useState([])
  const [preset, setPreset] = useState(2000)
  const [custom, setCustom] = useState('')
  const [newName, setNewName] = useState('')

  const amount = custom.trim() ? toCents(custom) : preset

  const toggle = (id) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  const addPlayer = (e) => {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    // Generate the id here so the person who just walked in is already in.
    const id = uid()
    dispatch({ type: 'ADD_PLAYER', id, name })
    setSelected((s) => [...s, id])
    setNewName('')
  }

  return (
    <>
      <div className="screen">
        <div className="section-label">Buy-in</div>
        <div className="chip-list">
          {PRESETS.map((p) => (
            <button
              key={p}
              className="chip num"
              aria-pressed={!custom.trim() && preset === p}
              onClick={() => {
                setPreset(p)
                setCustom('')
              }}
            >
              {fmt(p)}
            </button>
          ))}
          <input
            className="chip num"
            style={{ width: 96, textAlign: 'center' }}
            inputMode="decimal"
            aria-label="Custom buy-in"
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
                <button
                  key={g.id}
                  className="chip chip-group"
                  onClick={() =>
                    setSelected((s) => [...new Set([...s, ...g.playerIds])])
                  }
                >
                  {g.name}
                  <span className="n num">{g.playerIds.length}</span>
                </button>
              ))}
            </div>
          </>
        )}

        <div className="section-label">
          <span>Players</span>
          {selected.length > 0 && <span className="count num">{selected.length} in</span>}
        </div>

        {state.players.length === 0 ? (
          <Empty title="Nobody in the roster yet.">
            Add the people you actually play with.
            <br />
            They stay saved for next time.
          </Empty>
        ) : (
          state.players.map((p) => {
            const on = selected.includes(p.id)
            return (
              <button key={p.id} className="seat" aria-pressed={on} onClick={() => toggle(p.id)}>
                <Avatar player={p} />
                <div className="info">
                  <div className="name">{p.name}</div>
                </div>
                <span className="tick" data-on={on} aria-hidden="true">
                  ✓
                </span>
              </button>
            )
          })
        )}

        <form onSubmit={addPlayer} className="row" style={{ marginTop: 12 }}>
          <input
            className="chip"
            style={{ flex: 1 }}
            placeholder="Add a player"
            aria-label="Add a player to the roster"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <button className="btn btn-sm" type="submit" disabled={!newName.trim()}>
            Add
          </button>
        </form>
      </div>

      <Dock>
        <div className="footer">
          <button
            className="btn btn-primary btn-block"
            disabled={selected.length < 2 || amount <= 0}
            onClick={() =>
              dispatch({ type: 'START_GAME', playerIds: selected, defaultBuyIn: amount })
            }
          >
            {selected.length < 2
              ? 'Pick at least two players'
              : `Start game · ${selected.length} players at ${fmt(amount)}`}
          </button>
        </div>
      </Dock>
    </>
  )
}
