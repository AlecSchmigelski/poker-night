import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

// Two initials max. Names are user-typed, so tolerate junk: an empty name
// still needs a stable circle rather than an empty one.
export function initialsOf(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// Colour is identity (§9) — it is what tells two Mikes apart, so it is never
// decorative and never varies by screen.
export function Avatar({ player, size = 36 }) {
  return (
    <div
      className="avatar"
      aria-hidden="true"
      style={{
        background: player.color,
        width: size,
        height: size,
        fontSize: Math.round(size * 0.39),
      }}
    >
      {initialsOf(player.name)}
    </div>
  )
}

export function Empty({ title, children }) {
  return (
    <div className="empty">
      {title && <strong>{title}</strong>}
      {children}
    </div>
  )
}

// Bottom sheet (§8.7). Backdrop tap or Escape closes; there is no cancel
// button because dismissal is the gesture, not a control.
export function Sheet({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return (
    <div className="sheet-backdrop" onPointerDown={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="grabber" />
        {title && <h2>{title}</h2>}
        {children}
      </div>
    </div>
  )
}

// Primary actions belong in the thumb zone (§5), so screens render them into
// the dock above the tab bar instead of at the bottom of a scrolling list.
export function Dock({ children }) {
  const [slot, setSlot] = useState(null)
  useEffect(() => setSlot(document.getElementById('dock-slot')), [])
  return slot ? createPortal(children, slot) : null
}

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

export function Icon({ name, size = 21 }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': 'true' }
  if (name === 'game')
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8.5" {...stroke} />
        <circle cx="12" cy="12" r="3.5" {...stroke} />
        <path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2" {...stroke} />
      </svg>
    )
  if (name === 'players')
    return (
      <svg {...common}>
        <circle cx="9" cy="8.5" r="3.5" {...stroke} />
        <path d="M3.5 19.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5" {...stroke} />
        <path d="M16 5.6a3.5 3.5 0 0 1 0 6.3M17.5 14.9c1.9.6 3 2.4 3 4.6" {...stroke} />
      </svg>
    )
  if (name === 'ledger')
    return (
      <svg {...common}>
        <path d="M5 4.5h14v15H5z" {...stroke} />
        <path d="M8.5 9h7M8.5 12.5h7M8.5 16h4" {...stroke} />
      </svg>
    )
  if (name === 'arrow')
    return (
      <svg {...common} viewBox="0 0 24 24">
        <path d="M4 12h15M13.5 6.5 20 12l-6.5 5.5" {...stroke} />
      </svg>
    )
  if (name === 'check')
    return (
      <svg {...common}>
        <path d="M5 12.5 10 17.5 19 7" {...stroke} strokeWidth="2.2" />
      </svg>
    )
  return null
}
