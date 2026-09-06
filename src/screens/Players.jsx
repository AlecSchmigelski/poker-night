import { useState } from 'react'
import { useStore } from '../store'
import { Avatar, Empty, Sheet } from '../components/UI'

export function Players() {
  const { state, dispatch } = useStore()
  const [editing, setEditing] = useState(null)
  const [groupDraft, setGroupDraft] = useState(null)
  const [newName, setNewName] = useState('')

  const add = (e) => {
    e.preventDefault()
    if (!newName.trim()) return
    dispatch({ type: 'ADD_PLAYER', name: newName })
    setNewName('')
  }

  return (
    <>
      <div className="screen">
        <div className="section-label">Groups</div>
        <div className="chip-list">
          {state.groups.map((g) => (
            <button
              key={g.id}
              className="chip"
              onClick={() => setGroupDraft({ ...g })}
            >
              {g.name} · {g.playerIds.length}
            </button>
          ))}
          <button
            className="chip"
            onClick={() => setGroupDraft({ id: '', name: '', playerIds: [] })}
          >
            + New group
          </button>
        </div>

        <div className="section-label">Roster</div>
        {state.players.length === 0 && <Empty>Add the people you actually play with.</Empty>}
        {state.players.map((p) => (
          <button
            key={p.id}
            className="seat"
            style={{ width: '100%', textAlign: 'left' }}
            onClick={() => setEditing({ ...p })}
          >
            <Avatar player={p} />
            <div className="info">
              <div className="name">{p.name}</div>
              <div className="meta">
                {p.venmo || p.cashapp
                  ? [p.venmo && `@${p.venmo}`, p.cashapp && `$${p.cashapp}`]
                      .filter(Boolean)
                      .join(' · ')
                  : 'No payment handle'}
              </div>
            </div>
            <span style={{ color: 'var(--muted)' }}>›</span>
          </button>
        ))}

        <form onSubmit={add} className="row" style={{ marginTop: 12 }}>
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
            <span>Venmo username (no @)</span>
            <input
              autoCapitalize="none"
              placeholder="jane-doe"
              value={editing.venmo}
              onChange={(e) => setEditing({ ...editing, venmo: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Cash App $cashtag (no $)</span>
            <input
              autoCapitalize="none"
              placeholder="janedoe"
              value={editing.cashapp}
              onChange={(e) => setEditing({ ...editing, cashapp: e.target.value })}
            />
          </label>
          <button
            className="btn btn-primary btn-block"
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
              dispatch({ type: 'DELETE_PLAYER', id: editing.id, label: `Deleted ${editing.name}` })
              setEditing(null)
            }}
          >
            Delete player
          </button>
        </Sheet>
      )}

      {groupDraft && (
        <Sheet title={groupDraft.id ? 'Edit group' : 'New group'} onClose={() => setGroupDraft(null)}>
          <label className="field">
            <span>Group name</span>
            <input
              autoFocus={!groupDraft.id}
              placeholder="College Group"
              value={groupDraft.name}
              onChange={(e) => setGroupDraft({ ...groupDraft, name: e.target.value })}
            />
          </label>
          <div className="section-label" style={{ marginTop: 4 }}>Members</div>
          {state.players.map((p) => {
            const on = groupDraft.playerIds.includes(p.id)
            return (
              <button
                key={p.id}
                className="cashout-row"
                style={{ width: '100%', textAlign: 'left' }}
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
                <span style={{ color: on ? 'var(--accent)' : 'var(--border)' }}>✓</span>
              </button>
            )
          })}
          <button
            className="btn btn-primary btn-block"
            style={{ marginTop: 16 }}
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
