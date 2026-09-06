import { useEffect, useState } from 'react'
import { useStore } from '../store'

// Undo, not confirmation (§4.3). The action already happened; this is the way
// back. Auto-dismisses at 4s so it never blocks the bottom of the screen.
export function Toast() {
  const { state, dispatch } = useStore()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!state.undoLabel) {
      setVisible(false)
      return
    }
    setVisible(true)
    const t = setTimeout(() => setVisible(false), 4000)
    return () => clearTimeout(t)
  }, [state.undoLabel, state.past])

  if (!visible || !state.undoLabel) return null

  return (
    <div className="toast" role="status" aria-live="polite">
      <span>{state.undoLabel}</span>
      <button
        onClick={() => {
          dispatch({ type: 'UNDO' })
          setVisible(false)
        }}
      >
        Undo
      </button>
    </div>
  )
}
