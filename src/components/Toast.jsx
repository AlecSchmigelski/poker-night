import { useEffect, useState } from 'react'
import { useStore } from '../store'

// The toast states the amount every time, which is why the rebuy button itself
// does not have to carry it. Labels are structured rather than markup — player
// names are user input and must never be interpreted as HTML.
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
  const label = state.undoLabel
  const { text, amount } = typeof label === 'string' ? { text: label } : label

  return (
    <div className="toast" role="status">
      <span>
        {text}
        {amount && <> <b className="num">{amount}</b></>}
      </span>
      <button
        className="u"
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
