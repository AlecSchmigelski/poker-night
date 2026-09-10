import { useState } from 'react'
import { useStore } from '../store'
import { Avatar, Dock, Empty, Sheet } from '../components/UI'

export function Players({ onOpenPlayer }) {
  const { state } = useStore()
  const [editing, setEditing] = useState(null)
  const [group, setGroup] = useState(null)
  const [adding, setAdding] = useState(false)

  const missing = state.players.filter((p) => !p.venmo && !p.cashapp).length

  return (
    <>
      <div className="scroll">
        <div className="sec"><span>Groups</span></div>
        <div className="chips">
          {state.groups.map((g) => (
            <button key={g.id} className="chip grp" onClick={() => setGroup({ ...g })}>
              {g.name} · {g.playerIds.length}
            </button>
          ))}
          <button
            className="chip dash"
            onClick={() => setGroup({ id: '', name: '', playerIds: [] })}
          >
            + New group
          </button>
        </div>

        <div className="sec">
          <span>Roster</span>
          {/* Missing handles read as an unfinished task. Complete rows stay silent. */}
          {missing > 0 && <span>{missing} without a handle</span>}
        </div>

        {state.players.length === 0 ? (
          <Empty boxed title="Nobody in the roster yet.">
            Add the people you actually play with.
          </Empty>
        ) : (
          <div className="list">
            {state.players.map((p) => {
              const handles = [p.venmo && `@${p.venmo}`, p.cashapp && `$${p.cashapp}`].filter(Boolean)
              return (
                <button key={p.id} className="row compact" onClick={() => onOpenPlayer(p.id)}>
                  <Avatar player={p} size={30} />
                  <div className="who">
                    <div className="nm sm">{p.name}</div>
                    {handles.length > 0 && <div className="meta">{handles.join(' · ')}</div>}
                  </div>
                  {handles.length === 0 && <span className="chip dash sm">Add handle</span>}
                  <span className="chev" aria-hidden="true">›</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <Dock>
        <button className="btn ghost" onClick={() => setAdding(true)}>Add a player</button>
      </Dock>

      {adding && <AddPlayer onClose={() => setAdding(false)} />}
      {editing && <EditPlayer draft={editing} setDraft={setEditing} onClose={() => setEditing(null)} />}
      {group && <EditGroup draft={group} setDraft={setGroup} onClose={() => setGroup(null)} />}
    </>
  )
}

function AddPlayer({ onClose }) {
  const { dispatch } = useStore()
  const [name, setName] = useState('')
  return (
    <Sheet title="Add a player" hint="They stay saved for every future night." onClose={onClose}>
      <label className="field">
        <span>Name</span>
        <input autoFocus placeholder="First name" value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <button
        className={`btn${name.trim() ? '' : ' off'}`}
        disabled={!name.trim()}
        onClick={() => {
          dispatch({ type: 'ADD_PLAYER', name })
          onClose()
        }}
      >
        Add to roster
      </button>
    </Sheet>
  )
}

export function EditPlayer({ draft, setDraft, onClose }) {
  const { dispatch } = useStore()
  return (
    <Sheet
      title={draft.name}
      hint="A saved handle turns settling up into one tap."
      onClose={onClose}
    >
      <label className="field">
        <span>Name</span>
        <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
      </label>
      <label className="field">
        <span>Venmo username (no @)</span>
        <input autoCapitalize="none" placeholder="jane-doe" value={draft.venmo}
          onChange={(e) => setDraft({ ...draft, venmo: e.target.value })} />
      </label>
      <label className="field">
        <span>Cash App $cashtag (no $)</span>
        <input autoCapitalize="none" placeholder="janedoe" value={draft.cashapp}
          onChange={(e) => setDraft({ ...draft, cashapp: e.target.value })} />
      </label>
      <button
        className="btn"
        onClick={() => {
          dispatch({ type: 'UPDATE_PLAYER', id: draft.id, patch: draft })
          onClose()
        }}
      >
        Save
      </button>
      <button
        className="btn ghost danger"
        onClick={() => {
          dispatch({ type: 'DELETE_PLAYER', id: draft.id, label: { text: `Deleted ${draft.name}` } })
          onClose()
        }}
      >
        Delete player
      </button>
    </Sheet>
  )
}

function EditGroup({ draft, setDraft, onClose }) {
  const { state, dispatch } = useStore()
  return (
    <Sheet
      title={draft.id ? draft.name || 'Group' : 'New group'}
      hint="Load the whole table in one tap when you start a night."
      onClose={onClose}
    >
      <label className="field">
        <span>Group name</span>
        <input autoFocus={!draft.id} placeholder="College Group" value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
      </label>

      <div className="sec"><span>Members</span><span className="num">{draft.playerIds.length}</span></div>
      <div className="list">
        {state.players.map((p) => {
          const on = draft.playerIds.includes(p.id)
          return (
            <button
              key={p.id}
              className="pick"
              data-on={on}
              onClick={() =>
                setDraft({
                  ...draft,
                  playerIds: on
                    ? draft.playerIds.filter((id) => id !== p.id)
                    : [...draft.playerIds, p.id],
                })
              }
            >
              <Avatar player={p} size={30} />
              <div className="who"><div className="nm sm">{p.name}</div></div>
              <span className="tick" aria-hidden="true" />
            </button>
          )
        })}
      </div>

      <button
        className={`btn${draft.name.trim() && draft.playerIds.length ? '' : ' off'}`}
        style={{ marginTop: 16 }}
        disabled={!draft.name.trim() || draft.playerIds.length === 0}
        onClick={() => {
          dispatch({ type: 'SAVE_GROUP', group: draft })
          onClose()
        }}
      >
        Save group
      </button>
      {draft.id && (
        <button
          className="btn ghost danger"
          onClick={() => {
            dispatch({ type: 'DELETE_GROUP', id: draft.id, label: { text: 'Group deleted' } })
            onClose()
          }}
        >
          Delete group
        </button>
      )}
    </Sheet>
  )
}
