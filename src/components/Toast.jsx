import { useEffect, useState } from 'react'
import { useStore } from '../store'

export function Toast() {
  const { state, dispatch } = useStore()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!state.undoLabel) return setVisible(false)
    setVisible(true)
    const t = setTimeout(() => setVisible(false), 4000)
    return () => clearTimeout(t)
  }, [state.undoLabel, state.past])

  if (!visible || !state.undoLabel) return null

  return (
    <div className="toast">
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
