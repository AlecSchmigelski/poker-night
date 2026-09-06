import { useState } from 'react'
import { useStore } from '../store'
import { uid } from '../lib/id'
import { Avatar, Empty, Sheet } from '../components/UI'

const handlesOf = (p) =>
  [p.venmo && `@${p.venmo}`, p.cashapp && `$${p.cashapp}`].filter(Boolean).join(' · ')

export function Players() {
  const { state, dispatch } = useStore()
  const [editing, setEditing] = useState(null)
  const [groupDraft, setGroupDraft] = useState(null)
  const [newName, setNewName] = useState('')

  // A roster with handles turns Settle Up from a list into a set of buttons,
  // so the missing ones are counted rather than left as a shrug.
  const missing = state.players.filter((p) => !p.venmo && !p.cashapp).length

  const add = (e) => {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    dispatch({ type: 'ADD_PLAYER', id: uid(), name })
    setNewName('')
  }

  return (
    <>
      <div className="screen">
        <div className="section-label">Groups</div>
        <div className="chip-list">
          {state.groups.map((g) => (
            <button key={g.id} className="chip chip-group" onClick={() => setGroupDraft({ ...g })}>
              {g.name}
              <span className="n num">{g.playerIds.length}</span>
            </button>
          ))}
          <button
            className="chip"
            onClick={() => setGroupDraft({ id: '', name: '', playerIds: [] })}
          >
            + New group
          </button>
        </div>

        <div className="section-label">
          <span>Roster</span>
          {missing > 0 && <span className="count num">{missing} without a handle</span>}
        </div>

        {state.players.length === 0 && (
          <Empty title="Nobody here yet.">Add the people you actually play with.</Empty>
        )}

        {state.players.map((p) => {
          const handles = handlesOf(p)
          return (
            <button key={p.id} className="seat" onClick={() => setEditing({ ...p })}>
              <Avatar player={p} />
              <div className="info">
                <div className="name">{p.name}</div>
                <div className={`meta${handles ? '' : ' todo'}`}>
                  {handles || 'No payment handle'}
                </div>
              </div>
              <span style={{ color: 'var(--text-3)', paddingRight: 4 }} aria-hidden="true">
                ›
              </span>
            </button>
          )
        })}

        <form onSubmit={add} className="row" style={{ marginTop: 12 }}>
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

        <p className="hint">
          Handles are only used to prefill Venmo or Cash App on the settle screen. Nothing
          here leaves this phone.
        </p>
      </div>

      {editing && (
        <Sheet title="Edit player" onClose={() => setEditing(null)}>
          <label className="field">
            <span>Name</span>
            <input
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Venmo username</span>
            <input
              autoCapitalize="none"
              autoCorrect="off"
              placeholder="jane-doe"
              value={editing.venmo}
              onChange={(e) => setEditing({ ...editing, venmo: e.target.value.replace(/^@/, '') })}
            />
          </label>
          <label className="field">
            <span>Cash App $cashtag</span>
            <input
              autoCapitalize="none"
              autoCorrect="off"
              placeholder="janedoe"
              value={editing.cashapp}
              onChange={(e) =>
                setEditing({ ...editing, cashapp: e.target.value.replace(/^\$/, '') })
              }
            />
          </label>
          <button
            className="btn btn-primary btn-block"
            disabled={!editing.name.trim()}
            onClick={() => {
              dispatch({ type: 'UPDATE_PLAYER', id: editing.id, patch: editing })
              setEditing(null)
            }}
          >
            Save
          </button>
          <button
            className="btn btn-block btn-danger"
            style={{ marginTop: 8 }}
            onClick={() => {
              dispatch({ type: 'DELETE_PLAYER', id: editing.id, label: `${editing.name} deleted` })
              setEditing(null)
            }}
          >
            Delete player
          </button>
        </Sheet>
      )}

      {groupDraft && (
        <Sheet
          title={groupDraft.id ? 'Edit group' : 'New group'}
          onClose={() => setGroupDraft(null)}
        >
          <label className="field">
            <span>Group name</span>
            <input
              autoFocus={!groupDraft.id}
              placeholder="College Group"
              value={groupDraft.name}
              onChange={(e) => setGroupDraft({ ...groupDraft, name: e.target.value })}
            />
          </label>

          <div className="section-label" style={{ marginTop: 2 }}>
            <span>Members</span>
            <span className="count num">{groupDraft.playerIds.length}</span>
          </div>

          {state.players.length === 0 && <Empty>Add players to the roster first.</Empty>}

          <div className="card">
            {state.players.map((p) => {
              const on = groupDraft.playerIds.includes(p.id)
              return (
                <button
                  key={p.id}
                  className="net-row"
                  style={{ width: '100%', textAlign: 'left' }}
                  aria-pressed={on}
                  onClick={() =>
                    setGroupDraft({
                      ...groupDraft,
                      playerIds: on
                        ? groupDraft.playerIds.filter((id) => id !== p.id)
                        : [...groupDraft.playerIds, p.id],
                    })
                  }
                >
                  <Avatar player={p} size={30} />
                  <div className="info">
                    <div className="name">{p.name}</div>
                  </div>
                  <span className="tick" data-on={on} aria-hidden="true">
                    ✓
                  </span>
                </button>
              )
            })}
          </div>

          <button
            className="btn btn-primary btn-block"
            style={{ marginTop: 14 }}
            disabled={!groupDraft.name.trim() || groupDraft.playerIds.length === 0}
            onClick={() => {
              dispatch({ type: 'SAVE_GROUP', group: groupDraft })
              setGroupDraft(null)
            }}
          >
            Save group
          </button>
          {groupDraft.id && (
            <button
              className="btn btn-block btn-danger"
              style={{ marginTop: 8 }}
              onClick={() => {
                dispatch({ type: 'DELETE_GROUP', id: groupDraft.id, label: 'Group deleted' })
                setGroupDraft(null)
              }}
            >
              Delete group
            </button>
          )}
        </Sheet>
      )}
    </>
  )
}
