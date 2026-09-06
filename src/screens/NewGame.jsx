import { useState } from 'react'
import { useStore } from '../store'
import { fmt, toCents } from '../lib/money'
import { uid } from '../lib/id'
import { Avatar, Dock, Empty } from '../components/UI'
import { ChipSheet } from '../components/ChipSheet'

const PRESETS = [1000, 2000, 2500, 5000]

export function NewGame() {
  const { state, dispatch } = useStore()
  const [selected, setSelected] = useState([])
  const [preset, setPreset] = useState(2000)
  const [custom, setCustom] = useState('')
  const [sheet, setSheet] = useState(null)
  const [newName, setNewName] = useState('')

  const amount = custom.trim() ? toCents(custom) : preset
  const cold = state.players.length === 0

  const toggle = (id) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  // Generate the id here so the person who just walked in is already in.
  const addPlayer = (e) => {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    const id = uid()
    dispatch({ type: 'ADD_PLAYER', id, name })
    setSelected((s) => [...s, id])
    setNewName('')
    setSheet(null)
  }

  return (
    <>
      <div className="scroll">
        <div className="sec"><span>Buy-in</span></div>
        <div className="chips">
          {PRESETS.map((p) => (
            <button
              key={p}
              className="chip num"
              data-on={!custom.trim() && preset === p}
              onClick={() => {
                setPreset(p)
                setCustom('')
              }}
            >
              {fmt(p)}
            </button>
          ))}
          <span className="chip dash">
            <input
              className="num"
              inputMode="decimal"
              aria-label="Custom buy-in"
              placeholder="Custom"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
            />
          </span>
        </div>

        {state.groups.length > 0 && (
          <>
            <div className="sec"><span>Groups</span></div>
            <div className="chips">
              {state.groups.map((g) => (
                <button
                  key={g.id}
                  className="chip grp"
                  onClick={() => setSelected((s) => [...new Set([...s, ...g.playerIds])])}
                >
                  {g.name} · {g.playerIds.length}
                </button>
              ))}
            </div>
          </>
        )}

        <div className="sec">
          <span>Who is playing</span>
          {!cold && <span className="num">{selected.length} of {state.players.length}</span>}
        </div>

        {cold ? (
          <Empty boxed title="Add the people you actually play with.">
            Names stay saved, so you only do this once.
          </Empty>
        ) : (
          <div className="list">
            {state.players.map((p) => {
              const on = selected.includes(p.id)
              return (
                <button key={p.id} className="pick" data-on={on} onClick={() => toggle(p.id)}>
                  <Avatar player={p} size={30} />
                  <div className="who"><div className="nm sm">{p.name}</div></div>
                  <span className="tick" aria-hidden="true" />
                </button>
              )
            })}
          </div>
        )}

        <form onSubmit={addPlayer} className="row" style={{ marginTop: 10, borderStyle: 'dashed' }}>
          <div
            className="av s30"
            style={{ background: 'var(--rail)', color: 'var(--smoke)', fontSize: 19, fontWeight: 400 }}
            aria-hidden="true"
          >
            +
          </div>
          <div className="who">
            <input
              style={{ width: '100%', outline: 'none', fontSize: 15.5 }}
              placeholder="First name"
              aria-label="Add a player to the roster"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </div>
          <button type="submit" className="chip sm" disabled={!newName.trim()}>
            Add
          </button>
        </form>

        <div className="subrow">
          <button className="lnk" onClick={() => setSheet('chips')}>
            Chip breakdown for {fmt(amount)}
          </button>
        </div>
      </div>

      <Dock>
        <button
          className={`btn${selected.length < 2 || amount <= 0 ? ' off' : ''}`}
          disabled={selected.length < 2 || amount <= 0}
          onClick={() =>
            dispatch({ type: 'START_GAME', playerIds: selected, defaultBuyIn: amount })
          }
        >
          {amount <= 0
            ? 'Set a buy-in'
            : cold
              ? 'Add two players to start'
              : selected.length < 2
                ? `Pick ${2 - selected.length} more player${selected.length === 1 ? '' : 's'}`
                : `Start game · ${selected.length} players at ${fmt(amount)}`}
        </button>
      </Dock>

      {sheet === 'chips' && <ChipSheet amount={amount} onClose={() => setSheet(null)} />}
    </>
  )
}
