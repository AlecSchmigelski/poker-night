import { fromCents } from './money.js'

// Venmo and Cash App have no peer-to-peer API. These are deep links that
// prefill their compose screen; the payer still confirms in their own app and
// nothing reports back, which is why every payment has a manual paid toggle.
export function venmoLink(handle, amountCents, note) {
  const user = String(handle || '').replace(/^@/, '').trim()
  if (!user) return null
  const params = new URLSearchParams({
    txn: 'pay',
    audience: 'private',
    recipients: user,
    amount: fromCents(amountCents),
    note: note || 'Poker night',
  })
  return `https://venmo.com/?${params.toString()}`
}

export function cashAppLink(tag, amountCents) {
  const user = String(tag || '').replace(/^\$/, '').trim()
  if (!user) return null
  return `https://cash.app/$${user}/${fromCents(amountCents)}`
}
