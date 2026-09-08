import { useRef, useState } from 'react'
import { useStore } from '../store'
import { backupName, fromBackup, toBackup } from '../lib/backup'
import { Sheet } from '../components/UI'

// Everything lives on one device, so a lost phone is a lost ledger. This is the
// way out, and the way onto a new phone.
export function Backup({ onClose }) {
  const { state, dispatch } = useStore()
  const [pending, setPending] = useState(null) // a parsed file waiting on confirmation
  const [error, setError] = useState(null)
  const [done, setDone] = useState(null)
  const fileRef = useRef(null)

  const save = async () => {
    const name = backupName()
    const blob = new Blob([toBackup(state)], { type: 'application/json' })
    const file = new File([blob], name, { type: 'application/json' })

    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file] })
        setDone('Backup shared.')
        return
      } catch {
        /* fall through to download */
      }
    }
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    setDone(`Saved as ${name}`)
  }

  const pick = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError(null)
    setDone(null)
    try {
      setPending(fromBackup(await file.text()))
    } catch (err) {
      setPending(null)
      setError(err.message)
    }
  }

  if (pending) {
    const { meta } = pending
    return (
      <Sheet
        title="Restore this backup?"
        hint="This replaces everything on this device. What is here now is gone."
        onClose={() => setPending(null)}
      >
        <div className="card">
          <div className="net">
            <div className="who">
              <div className="nm sm">
                {meta.players} player{meta.players === 1 ? '' : 's'} · {meta.nights} night
                {meta.nights === 1 ? '' : 's'}
              </div>
              <div className="meta">
                {meta.exportedAt
                  ? `Saved ${new Date(meta.exportedAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}`
                  : 'No date recorded'}
                {meta.hasGameInProgress && ' · includes a game in progress'}
              </div>
            </div>
          </div>
        </div>

        <button
          className="btn btn-danger"
          style={{ marginTop: 16 }}
          onClick={() => {
            dispatch({ type: 'REPLACE_STATE', state: pending.state })
            setPending(null)
            setDone('Restored.')
          }}
        >
          Replace everything
        </button>
        <button className="btn ghost" onClick={() => setPending(null)}>
          Keep what I have
        </button>
      </Sheet>
    )
  }

  return (
    <Sheet
      title="Back up"
      hint="Everything in this app lives on this phone. A backup is a single file you can keep anywhere and restore onto a new one."
      onClose={onClose}
    >
      <div className="card">
        <div className="net">
          <div className="who">
            <div className="nm sm">
              {state.players.length} player{state.players.length === 1 ? '' : 's'} ·{' '}
              {state.history.length} night{state.history.length === 1 ? '' : 's'}
            </div>
            <div className="meta">Roster, groups, chip set, and every saved night</div>
          </div>
        </div>
      </div>

      {error && <div className="warn">{error}</div>}
      {done && <div className="meta" style={{ marginTop: 12 }}>{done}</div>}

      <button className="btn" style={{ marginTop: 16 }} onClick={save}>
        Save a backup
      </button>
      <button className="btn ghost" onClick={() => fileRef.current?.click()}>
        Restore from a file
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        onChange={pick}
        style={{ display: 'none' }}
      />
    </Sheet>
  )
}
