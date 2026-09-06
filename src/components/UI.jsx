import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { display, toCents } from '../lib/money'

export function Avatar({ player, size }) {
  const initials = player.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
  return (
    <div className={`av${size ? ` s${size}` : ''}`} style={{ background: player.color }} aria-hidden="true">
      {initials}
    </div>
  )
}

export function Empty({ title, ring, boxed, children }) {
  return (
    <div className={`empty${boxed ? ' boxed' : ''}`}>
      {ring && <div className="ring" />}
      <h4>{title}</h4>
      {children && <p>{children}</p>}
    </div>
  )
}

// Screens portal their primary action into the dock so it sits above the tab
// bar without each screen having to know the shell's layout.
export function Dock({ children }) {
  const [slot, setSlot] = useState(null)
  useEffect(() => setSlot(document.getElementById('dock-slot')), [])
  return slot ? createPortal(<div className="dock-inner">{children}</div>, slot) : null
}

export function Sheet({ title, hint, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const slot = document.getElementById('sheet-slot')
  if (!slot) return null

  return createPortal(
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        {title && <h2>{title}</h2>}
        {hint && <div className="sheet-hint">{hint}</div>}
        {children}
      </div>
    </div>,
    slot,
  )
}

const PATHS = {
  game: <><rect x="3" y="5" width="18" height="14" rx="3" /><circle cx="12" cy="12" r="3" /></>,
  players: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19c.6-3.2 2.9-5 5.5-5s4.9 1.8 5.5 5" />
      <path d="M16.5 7.2a3 3 0 0 1 0 5.6M18 14.4c2 .8 3.2 2.4 3.5 4.6" />
    </>
  ),
  ledger: <path d="M4 6h16M4 12h16M4 18h10" />,
}

export function Icon({ name }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      {PATHS[name]}
    </svg>
  )
}

// A money field that keeps the "$" as furniture rather than as typed input.
// It holds its own draft string: deriving the text from cents on every render
// rewrites "47." into "47.00" under the cursor and makes cents impossible to type.
export function MoneyInput({ cents, onCents, placeholder = '0', autoFocus }) {
  const [draft, setDraft] = useState(display(cents))

  // Resync only when the value changed somewhere else (an undo, a reset).
  useEffect(() => {
    if (toCents(draft) !== (cents ?? 0)) setDraft(display(cents))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cents])

  return (
    <div className="numin">
      <span aria-hidden="true">$</span>
      <input
        className="num"
        inputMode="decimal"
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={draft}
        onFocus={(e) => e.target.select()}
        onChange={(e) => {
          const raw = e.target.value
          if (!/^[0-9]*\.?[0-9]{0,2}$/.test(raw)) return
          setDraft(raw)
          onCents(raw === '' ? null : toCents(raw))
        }}
      />
    </div>
  )
}
