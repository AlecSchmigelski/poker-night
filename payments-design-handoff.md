# Poker Night — Settling up

Design handoff. Self-contained: everything needed to design this is in this file.
Written for a designer who has not seen the app.

**Status:** problem defined, design open. Three things are broken or missing and
they interact; solving them separately will produce three unrelated answers.

---

## 1. The app in a paragraph

A phone-first app for running a home poker cash game. **One person — the host —
holds the phone all night.** Everyone else is a name on a list; nobody else
installs anything. The host tracks buy-ins, counts everyone down at the end, and
the app produces the fewest payments that settle the night. All data is local to
the host's device. There are no accounts.

The settle screen is the payoff. It gets read aloud to the table at 1am.

## 2. What exists today

After counting down, the host sees **Settle Up**: a list of payment cards, then
everyone's net for the night.

Each card reads `Alec pays Jo — $55`, with two avatars, and a row of actions:
`Venmo` · `Cash App` · `Mark paid`. Direction is carried by the word *pays*, not
an arrow, because reversing payer and payee is the worst failure this screen has.

If the recipient has no payment handle saved, that card shows `Add a handle for
Devon` in place of the missing buttons.

## 3. The three problems

### 3.1 The buttons assume the host is the payer

The Venmo link is built as *pay this person*. Tapped on the host's phone it opens
the host's Venmo, prefilled to pay the recipient. **That is only correct on rows
where the host is the payer.** On every other row it would have the host paying
somebody else's debt.

So most buttons on the screen currently do the wrong thing, and the screen gives
no signal about which ones are safe.

### 3.2 Most rows are not actionable by the person holding the phone

Minimising transactions produces a list where the host is often a bystander:
"Sam pays Priya" involves neither the host's money nor the host's accounts. The
host cannot move it, cannot request it, and can only nag.

### 3.3 A settled night cannot leave the phone as a list

The app can encode a table into a shareable URL that opens a read-only view with
no install. But the only entry point to generate one sits on the live-game
screen, so a link can never be made *after* settling — which is exactly when the
payment list would be worth sending. The capability exists and is unreachable.

## 4. Hard constraints

These are facts about the world, not preferences. Design cannot route around them.

- **There is no peer-to-peer payments API.** Not for Venmo, not for Zelle. The app
  can only open those apps with fields prefilled; the human taps the final button.
- **You cannot request money on someone else's behalf.** A request is inherently
  *from your own account*. "Alec, pay Jo" is not expressible. The host can only
  ask people to pay **the host**.
- **A request link exists for your own account.** The same undocumented deep-link
  family supports a *charge* variant alongside *pay*, so "request $30 from Sam"
  can be prefilled — but only when the requester is the one owed.
- **Cash App has no request link at all.** Pay only.
- **Nothing reports back.** No payment ever confirms. `Mark paid` is a manual
  record the host keeps, and must exist on every card regardless of which
  buttons are shown, because half the table pays in cash.
- **Never show a payment as sent, processing, or confirmed.**

## 5. Data available

```
Payment { from: playerId, to: playerId, amount: cents, paid: bool }
Player  { id, name, color, venmo?, cashapp? }
```

Money is integer cents. There is currently **no concept of which player is the
host.** Introducing one is in scope; see §6.1.

Unpaid payments from past nights already surface elsewhere in the app, on a Home
screen section headed *Still owed*, with a one-tap `Paid` per row.

## 6. What to decide

### 6.1 How the host identifies themselves

Nothing today knows which player is holding the phone. Once it does, each card
can show the honest action:

| The row | The action |
|---|---|
| Host owes someone | Pay them |
| Someone owes the host | Request from them |
| Neither party is the host | Neither is possible |

**Design question:** where and when does someone say "I'm Alec"? Options include
the roster, first run, or the first time it matters. It should not feel like
account setup — there are no accounts and there should be no sense of one.

### 6.2 What the third case looks like

A card the host cannot action is the hard one. It is not broken, and it must not
read as broken or disabled-looking. The debt is real and the two people involved
still need to settle it.

**Design question:** what does that card offer instead? Candidates: a share
action, a copy-the-text action, nothing at all. Whatever it is, it must not
imply the host can move that money.

### 6.3 Whether to offer settling through the host

An alternative to minimising transactions: route everything through the host.
Losers pay the host, the host pays the winners. Every transaction then involves
the host, so **every row becomes actionable from the phone that is already out.**

The trade-off is real and worth showing honestly:

|  | Minimised | Through the host |
|---|---|---|
| Six-player night | ~3 payments | ~5 payments |
| Who can start them | Five different people | The host, all of them |

Many home games already work this way, with the host as banker.

**Design questions:** Is this a toggle, and if so where does it live and which is
the default? How is the trade-off explained in one line, at the moment of
choosing, without a paragraph of explanation? Does the choice persist between
nights or is it per-night?

### 6.4 Where sharing the settled list lives

The read-only link needs an entry point once the night is settled. There is
already a **Night Report** screen — the record of a finished night, reached from
the Ledger — whose single dock button is `Share this night` and currently opens
an image card for the group chat.

**Design question:** do sharing a picture and sharing a live list of who owes
whom belong in the same action, and if not, where does the second one go?

## 7. Visual language

Dark, warm. "One lamp over a dark table."

```
--table:    #141110   page background        --chalk:  #F3ECE3   text
--felt:     #1D1917   cards                  --smoke:  #A69890   muted
--rail:     #292320   inputs, secondary      --brass:  #E9A13B   action
--hairline: #38302B   borders                --up:     #5DBE8C   positive money
                                             --down:   #E4695A   negative money
```

**The split is load-bearing.** Brass means "you can touch this." Green and red
only ever describe money. A green button would read as a positive amount; an
amount in brass would read as tappable.

Player identity is a coloured circle with initials, drawn from eight clay-chip
hues, assigned in roster order and permanent per player.

Radii 16px cards, 12px controls, 999px chips. System sans. **Every figure uses
tabular numerals.** Money is written `$20`, never `$20.00`; cents only when
non-zero. Nets always carry a sign.

## 8. States to cover

1. Host is the payer on some rows, the payee on others, absent from the rest
2. Host is not in the game at all (they dealt, they did not play)
3. A player with no Venmo and no Cash App handle
4. Every payment already marked paid
5. Nobody owes anybody — the night broke even, so there are no cards
6. A single payment settles the whole night
7. Eight or more payments — the list scrolls
8. The same night reopened days later, when some payments have been cleared and
   others have not

## 9. Copy

Direct and dry. Never the word "user." Never "successfully." Numbers over
adjectives. Existing lines that work and should survive:

| Slot | Copy |
|---|---|
| Direction | `Alec pays Jo` |
| Missing handle | `Add a handle for Devon` |
| Cleared | `Paid` |
| Nobody owes anything | `Everyone broke even.` / `Rare and beautiful.` |

Anything describing the payment apps must not overpromise. The app opens Venmo;
it does not send money.

## 10. Out of scope

- Changing how the settlement maths works, beyond the routing choice in §6.3
- Accounts, logins, or anything that syncs between devices
- Editing amounts from this screen
- Any flow implying the app moves money itself
- The image share card, which is a separate spec

## 11. Deliverable

Frames at 390×844, dark. States over screens: the same list with the host as
payer, as payee, and as bystander is three frames and is the centre of this.

Include whichever of §6.1–6.4 you resolve, and say plainly where you have
diverged from what is described here and why. The current shape is not precious.
