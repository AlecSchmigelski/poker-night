import { fromCents } from './money.js'

// Venmo and Cash App have no peer-to-peer API. These are deep links that
// prefill their compose screen; the payer still confirms in their own app and
// nothing reports back, which is why every payment has a manual paid toggle.
// txn is the whole safety question here. A Venmo link always acts as whoever
// opens it, so 'pay' is only ever correct on a row where the phone's owner is
// the one who owes. Sending money is not reversible, so the caller has to say
// which direction it is rather than get a default.
function link(handle, amountCents, note, txn) {
  const user = String(handle || '').replace(/^@/, '').trim()
  if (!user) return null
  const params = new URLSearchParams({
    txn,
    audience: 'private',
    recipients: user,
    amount: fromCents(amountCents),
    note: note || 'Poker night',
  })
  return `https://venmo.com/?${params.toString()}`
}

// You owe them: opens Venmo composing a payment to `handle`.
export function venmoLink(handle, amountCents, note) {
  return link(handle, amountCents, note, 'pay')
}

// They owe you: opens Venmo composing a request to `handle`. Cash App has no
// deep-link equivalent, which is why requests are Venmo-only.
export function venmoRequestLink(handle, amountCents, note) {
  return link(handle, amountCents, note, 'charge')
}

export function cashAppLink(tag, amountCents) {
  const user = String(tag || '').replace(/^\$/, '').trim()
  if (!user) return null
  return `https://cash.app/$${user}/${fromCents(amountCents)}`
}
