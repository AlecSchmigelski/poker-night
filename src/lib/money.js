// All money is stored as integer cents to avoid float drift.

export function toCents(input) {
  if (input === '' || input == null) return 0
  const n = Number(String(input).replace(/[^0-9.-]/g, ''))
  if (Number.isNaN(n)) return 0
  return Math.round(n * 100)
}

export function fromCents(cents) {
  return (cents / 100).toFixed(2)
}

// What goes in a text field: "20", not "20.00". Cents only when they exist.
export function toInput(cents) {
  if (cents == null) return ''
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2)
}

// $20 not $20.00; $47.50 keeps its cents.
export function fmt(cents) {
  const neg = cents < 0
  const abs = Math.abs(cents)
  const whole = Math.floor(abs / 100)
  const grouped = whole.toLocaleString('en-US')
  const s = abs % 100 === 0 ? grouped : `${grouped}.${String(abs % 100).padStart(2, '0')}`
  return `${neg ? '-' : ''}$${s}`
}

// Always signed, for net results.
export function fmtSigned(cents) {
  if (cents === 0) return '$0'
  return `${cents > 0 ? '+' : '-'}${fmt(Math.abs(cents))}`
}
