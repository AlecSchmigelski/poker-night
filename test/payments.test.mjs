import { cashAppLink, venmoLink, venmoRequestLink } from '../src/lib/payments.js'
import { sanitise, EMPTY } from '../src/lib/persist.js'

let fail = 0
const check = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  if (!ok) fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : `\n   got  ${JSON.stringify(got)}\n   want ${JSON.stringify(want)}`}`)
}

const q = (url, key) => new URL(url).searchParams.get(key)

// --- direction -------------------------------------------------------------
//
// The bug these guard: every settlement row used to render a txn=pay link to
// the person being paid, whoever was holding the phone. On a row the owner was
// not part of, tapping it opened their own Venmo paying someone else's debt.
// Direction is now the caller's decision, and these two must never converge.

const pay = venmoLink('jane-doe', 4250, 'Poker night')
const req = venmoRequestLink('jane-doe', 4250, 'Poker night')

check('a payment is txn=pay', q(pay, 'txn'), 'pay')
check('a request is txn=charge', q(req, 'txn'), 'charge')
check('the two directions differ', pay === req, false)
check('both name the same counterparty', q(pay, 'recipients'), q(req, 'recipients'))

// --- amount and note -------------------------------------------------------

check('cents become dollars', q(pay, 'amount'), '42.50')
check('a request carries the amount too', q(req, 'amount'), '42.50')
check('the note rides along', q(pay, 'note'), 'Poker night')
check('private by default', q(pay, 'audience'), 'private')
check('a whole amount keeps its cents', q(venmoLink('x', 2000), 'amount'), '20.00')

// --- handles ---------------------------------------------------------------

check('a leading @ is stripped', q(venmoLink('@jane-doe', 100), 'recipients'), 'jane-doe')
check('surrounding space is stripped', q(venmoRequestLink('  jane  ', 100), 'recipients'), 'jane')
check('no handle, no pay link', venmoLink('', 500), null)
check('no handle, no request link', venmoRequestLink('', 500), null)
check('no handle, no cash app link', cashAppLink('   ', 500), null)
check('cash app strips the $', cashAppLink('$jane', 1500), 'https://cash.app/$jane/15.00')

// A name with regex-special or non-ASCII characters must survive encoding.
check(
  'an awkward handle is encoded, not mangled',
  q(venmoLink('a+b/c d', 100), 'recipients'),
  'a+b/c d',
)

// --- meId persistence ------------------------------------------------------
//
// meId decides which rows get a link at all, so a corrupt value must not
// survive a reload and quietly re-point the buttons at the wrong person.

check('a fresh install has no owner', EMPTY.meId, null)
check('a saved owner is kept', sanitise({ meId: 'p1' }).meId, 'p1')
check('a non-string owner is dropped', sanitise({ meId: 42 }).meId, null)
check('an object owner is dropped', sanitise({ meId: { id: 'p1' } }).meId, null)
check('a missing owner is null, not undefined', sanitise({}).meId, null)

console.log(fail ? `\n${fail} failed` : '\nAll passed')
process.exit(fail ? 1 : 0)
