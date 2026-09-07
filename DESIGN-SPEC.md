# Poker Night — Design Specification

A brief for designing the UI. There is a working reference implementation in this
repo (`src/`), but it is scaffolding, not the design. Treat this document as the
source of truth for intent and the code as a description of behavior that already
works.

---

## 1. What this is

A phone-first web app for running a home poker cash game: track who bought in for
how much, count everyone down at the end, and tell the table the fewest possible
payments that settle the night.

It replaces the notes app, the napkin, and the twenty minutes of arguing at 1am.

**One line:** *The scorekeeper for your home game.*

## 2. Who is using it, and under what conditions

There is exactly one operator: **the host**. Everyone else is a name on a list.
Designing for the host's context is the whole job.

The host is:

- **Standing up, holding chips, or dealing.** One hand on the phone at most.
- **Interrupted constantly.** Every interaction must survive being abandoned halfway.
- **In a dim room.** Dark UI is the default, not a preference.
- **Two beers in, at midnight, four hours into the night.** By the time the app
  matters most (settling up), the operator is at their least careful.
- **Under social pressure.** Six people are waiting to leave. The settle screen is
  read aloud to the table.

Design consequence: **the app is used in short, high-stakes bursts, not sessions.**
Optimize for glanceability and tap accuracy over density or elegance.

## 3. Non-goals

Explicitly out of scope. Do not design for these.

| Not building | Why |
|---|---|
| Tournaments, blinds, payout structures | Cash game only for v1 |
| Bomb pots as a *money* event | Antes move chips already on the table; see §13a |
| Side games, prop bets, high-hand pots | Cut from scope |
| Hand history, odds, or anything about *playing* poker | This is bookkeeping, not gameplay |
| Multi-device *sync*, accounts, login | Host's phone is the only writer |
| Real money movement | See §11 |
| Desktop layout | Phone portrait only |

## 4. Design principles

1. **The pot total is the anchor.** It is always visible during a game, always the
   largest number on screen. It is how the host knows the app matches reality.
2. **One tap is the unit of work.** Adding a rebuy is the most frequent action of
   the night, by an order of magnitude. It gets the biggest, most reachable target
   on the screen and nothing stands between intent and effect — no confirm, no modal.
3. **Everything is reversible, nothing is confirmed.** Never interrupt with "are you
   sure?" Perform the action, then offer undo. Confirmation dialogs are a tax paid
   by every correct action to protect against a rare wrong one; undo inverts that.
4. **Refuse to be wrong about money.** The app should make an unbalanced night
   impossible to save, and it should say exactly how far off it is. Vagueness here
   destroys trust in the whole tool.
5. **Say the number, not the concept.** "Off by $15" beats "Validation error."
   "3 payments" beats "Optimized settlement."
6. **Boring is correct.** No celebration animations, no confetti on a big win, no
   gamification. The host wants to close the app and go to bed.

## 5. Platform and constraints

- **Web app (PWA)**, installed to home screen. Runs standalone, no browser chrome.
- **Portrait phone only.** Design at 390×844. Must hold up from 375 to 430 wide.
- **Dark theme is the product.** A light theme is optional and lower priority.
- **Safe areas matter** — the app runs fullscreen, so respect the home indicator
  inset on the bottom nav and any bottom-anchored button.
- **Offline, local-only.** All state is in `localStorage` on the host's phone.
  There is no network, no loading state, and no sync spinner anywhere in this app.
  Do not design empty-vs-loading distinctions; there is no loading.
- **Thumb zone.** Primary actions belong in the bottom third. The top of the screen
  is for information, not controls.

## 6. Information architecture

Four tabs, persistent bottom navigation. **Home is the landing tab.**

```
┌─ Home ──────── the state of things, and the only view of unpaid debts
├─ Game ──────── the active night, or setup if none
│    ├─ New Game        (no game running)
│    ├─ Live Game       (phase: playing)
│    ├─ Cash Out        (phase: cashout)
│    └─ Settle Up       (phase: settle)
├─ Players ───── roster and saved groups
└─ Ledger ────── lifetime standings and past games
```

The Game tab is stateful: it shows whichever step of the night you are on. The
host never navigates *to* Cash Out — they finish buying in and move forward. The
three phases are a linear flow with a back door at each step.

**Navigation model:** tabs are for switching context; the game flow is a forward
progression with explicit "back" affordances. Never trap the host in a phase.

## 7. The core flow

The whole product, end to end:

```
New Game                Live Game                Cash Out              Settle Up
─────────               ─────────                ────────              ─────────
pick buy-in        →    tap + for rebuys    →   type each final   →   read out the
pick players            watch pot grow           stack; must            payments;
(or load a group)       add latecomers           balance to the         tap Venmo;
                                                 pot exactly            mark paid
                                                                            ↓
                                                                        Ledger
```

Three moments carry the product:

1. **The rebuy tap.** Happens 30+ times a night. Must feel instant and certain.
2. **The balance check.** The host counts chips and the app either agrees or tells
   them precisely how far off they are. This is where trust is won or lost.
3. **The settle list.** The payoff. Read aloud to the room. Must be legible from
   across a table.

---

## 8. Screen specifications

### 8.1 New Game

*Shown in the Game tab when no game is running.*

**Purpose:** get from cold start to a running game in under 15 seconds.

**Contents, top to bottom:**

- **Buy-in selector.** Preset chips: $10, $20, $25, $50, plus a custom field.
  $20 is preselected. This is the amount the `+` button will add all night.
- **Load a group.** Horizontal chips of saved groups ("College Group · 6"). Tapping
  one adds all its members to the selection. Hidden entirely if no groups exist.
- **Player list.** Every person in the roster, tappable to toggle in/out of tonight's
  game. Selected state must be unmistakable at a glance — the host is scanning for
  who is missing, not reading names.
- **Inline "add a player" field.** For the person who showed up unannounced. Adds to
  the permanent roster.
- **Primary action, bottom:** `Start game · 5 players at $20`. Disabled below two
  players. The label restates the two decisions so the host can confirm without
  scrolling back up.

**States to design:**
- Cold start, empty roster (first-ever launch) — needs to teach without a tutorial
- Roster exists, nobody selected
- Selection in progress
- Long roster (15+ players) — scrolling with the primary action still reachable

---

### 8.2 Live Game

*The screen that is open for four hours.*

**Purpose:** add rebuys with one tap; make the pot total unmissable.

**Header (persistent):** the pot total, right-aligned, largest number on screen,
labeled "On the table." Left side: "Tonight" and a quiet hint line.

**Player row** — the most important component in the app:

| Element | Detail |
|---|---|
| Avatar | Colored circle, initials. Color is the player's identity everywhere in the app. |
| Name | Truncates gracefully; never wraps to two lines. |
| Sub-line | `3 × $20` — rebuy count at a glance. Reads "No buy-in yet" before the first. |
| Total in | Right-aligned, tabular figures. |
| `+` button | 56×46pt, brass. Opens the amount chooser. Carries an aria-label naming the player and whether it is a buy-in or a rebuy. |

**Interactions:**
- Tap **+** → amount chooser (1× / 2× / 3× / custom), then straight to the
  signature screen if it is a rebuy, or committed immediately if it is the seat's
  first buy-in. An undo toast appears either way: *"Sam +$20 · Undo"*.
- The chooser also holds "Remove last buy-in", so fixing a mis-tap is a visible
  action rather than a hidden gesture.
- The row itself is not a link. Nothing to accidentally navigate into.

**Secondary actions:** a quiet 2×2 of Share the table, Buy-in log, Add player, Options.
**Primary action:** "End the game," bottom, full width. Disabled until the pot is
non-zero. It is deliberately *not* called Cash out — cashing out is now a
per-player action and the two must not read as the same thing.

**States to design:**
- Fresh game, nobody has bought in yet (all rows at $0)
- Mid-game, mixed rebuy counts
- 10+ players (scrolling with the header pinned)
- Undo toast visible over the bottom action

**Superseded.** The bare `+` shipped first, then lost to an explicit **Rebuy**
button that opens an amount chooser.

The `+` optimised for the wrong thing. It was one tap, but it never said what it
was adding, and a non-default amount was hidden behind a long-press — an
undiscoverable gesture holding the only route to a short buy-in or a mis-tap fix.
Rebuys are not uniformly the table stake often enough for that trade to hold.

Now: the button is a **`+`** that opens a sheet with 1× / 2× / 3× the table
buy-in preselected at 1×, a custom field, and "Remove last buy-in" for that
player. The common case is two taps — *+ → Rebuy $20* — and every other case is
visible rather than hidden.

A "Rebuy" text label was tried in between and reverted: it read clearly but cost
~28pt of name width on every row, and the glyph carries the meaning well enough
once tapping it opens something that names the player and the amount. The word
still appears where there is room for it — in the chooser's title and primary
button, and in the player actions sheet.

---

### 8.3 Cash Out

**Purpose:** collect every player's final stack and refuse to proceed until the
money balances.

**The tally bar** is the hero of this screen. Pinned above the list:

> `Counted $340 of $400` — `short $60`

Three visual states:
- **Neutral** — not every stack entered yet
- **Error** — entered but off by an amount; states the delta in dollars, signed as
  "short" or "over"
- **Balanced** — exact match; this is a small moment of relief, treat it as such

**Player rows:** avatar, name, "in $60" as a sub-line, and a right-aligned numeric
input. Numeric keypad. Select-on-focus so the host can overwrite without backspacing.

**Primary action** is a live status, not a static label:
- `Enter every stack` (disabled)
- `Off by $15` (disabled)
- `Settle up` (enabled)

The button *is* the error message. There is no separate error text.

**Secondary:** "Back to the game" — someone always wants one more rebuy after you
have started counting.

**States to design:** empty, partially entered, over, short, balanced.

---

### 8.4 Settle Up

**Purpose:** tell the table who pays whom, in the fewest transactions, and track
what has actually been paid.

This screen gets read out loud. **Legibility from arm's length is the design
constraint.**

**Header line:** `3 payments to settle 5 players`. The compression is the value
proposition — say it.

**Payment card:**

> [avatar] Jo → [avatar] Alec — **$30**
> `[ Venmo ] [ Cash App ] [ Mark paid ]`

- Direction must be unmistakable. Getting payer and payee backwards is the worst
  possible failure of this screen.
- Venmo / Cash App buttons only appear if that player has a handle saved.
- "Mark paid" is a toggle. Paid cards visibly recede (dim) but stay in place —
  they should not reorder or disappear, because the host is tracking a list.

**Night's results:** below the payments, every player's net for the evening, sorted
best to worst, with buy-in and cash-out as a sub-line. Green up, red down.

**Primary action:** "Save and finish" (or "Save to history" if payments are
outstanding). Saving archives the night to the Ledger.

**States to design:**
- Typical (2-4 payments)
- Nobody has payment handles saved (buttons absent — do not leave dead space)
- All payments marked paid
- Everyone broke even (zero payments — needs a real empty state, not a blank area)

---

### 8.5 Players

Roster management. Two sections:

- **Groups** as chips: `College Group · 6`, plus a `+ New group`. Tapping opens an
  editor sheet (name + member checklist).
- **Roster** as rows: avatar, name, and a sub-line showing payment handles or
  "No payment handle" — this is the nudge that makes the Settle screen useful later.

Tapping a player opens an edit sheet: name, Venmo username, Cash App $cashtag, and
delete.

**Design note:** the payment-handle prompt is the highest-leverage thing on this
screen. A roster with handles turns Settle Up from a list into a set of buttons.
Consider how to make the missing-handle state feel like an unfinished task.

---

### 8.6 Ledger

Lifetime standings plus a log of past nights.

- **All time:** every player who has ever played, sorted by net. Sub-line: nights
  played, nights up. This is the trash-talk screen — it should feel a little like
  a leaderboard without being loud about it.
- **Past games:** date, player count, pot size, and the night's winner with their net.

**States:** no games yet (dominant empty state, since this tab is useless until the
first night is finished), one game, many games.

---

### 8.7 Sheets

All secondary actions use a bottom sheet, never a full-screen push or a centered
dialog. Sheets: add player to game, custom buy-in amount, edit player, edit group,
game options (remove a player, discard the game).

Bottom sheets because they are thumb-reachable and dismissible with a downward
gesture — both matter for one-handed use.

---

## 9. Component inventory

Design these as a system; they repeat across screens.

| Component | Notes |
|---|---|
| Player avatar | Colored circle, initials, sizes 26/30/36. Color = identity. |
| Player row (game) | Avatar, name, meta, amount, `+` button |
| Player row (selectable) | Avatar, name, checkmark state |
| Player row (input) | Avatar, name, meta, numeric field |
| Net row | Avatar, name, buy-in/cash-out meta, signed amount |
| Payment card | Two avatars, direction, amount, action row, paid state |
| Tally bar | Neutral / error / balanced |
| Chip | Toggle (buy-in presets, group members) and action (load group) variants |
| Primary button | Full-width, bottom-anchored, label carries state |
| Bottom sheet | Title, content, primary action, optional destructive action |
| Undo toast | Message + Undo, floats above the tab bar, auto-dismisses ~4s |
| Tab bar | Three items, icon + label |
| Empty state | Short, warm, one line of instruction |

## 10. Visual language

**Resolved.** The direction below was proposed in answer to §16 and is now what
is built: *one lamp over a dark table*. The blacks warm up (brown cast, not cyan)
and the action colour moved from mint to brass.

The reason is worth keeping: the original palette gave green three jobs at once —
primary action, positive net, and balanced state — so on Settle Up the button, the
winner, and the tally all read as the same thing. **Brass now means "touch this."
Green and red only ever describe money.**

```
Table      #141110   app background      Brass   #E9A13B   action, and only action
Felt       #1D1917   cards and rows      Up      #5DBE8C   positive money
Rail       #292320   inputs, secondary   Down    #E4695A   negative money
Hairline   #38302B   borders             Chalk   #F3ECE3   text
Smoke      #A69890   muted text, 5.9:1 on Felt
```

Player identity uses eight clay chip denominations rather than a generic wheel:
`#D6473F #4A7FD1 #3F9E62 #8A5FCB #D9BC4A #4FAEB8 #DB6E9E #E8E0D2`, assigned in
roster order and permanent.

The one bold move is the lamp: a warm radial glow bleeding down from the top of
the header, behind the pot total.

<details>
<summary>Superseded starting point</summary>

```
Background      #0D1011      near-black, slight cool cast
Surface         #16191C      cards, header, tab bar
Surface raised  #1E2327      inputs, chips, secondary buttons
Border          #282F34
Text            #EAEEF0
Muted text      #8A959C
Accent (green)  #37C98D      buy-in button, positive net, balanced state
Loss (red)      #EF5F5F      negative net, off-balance state
Radius          14px cards, 11px controls, 999px chips
```

Player colors are drawn from an 8-color palette and assigned in roster order:
`#E5544B #F0A04B #E8CF4B #5BC47A #4BB8C4 #5A8CE8 #9B6BE8 #E56BB0`

</details>

**Typography rules that are not negotiable:**
- **All money uses tabular figures.** Columns of dollar amounts must align.
- Money is written `$20`, not `$20.00`. Cents appear only when non-zero: `$47.50`.
- Net amounts are always signed: `+$40`, `-$30`, `$0`.

**Tone reference:** a well-made utility. Closer to a good timer app than to a
casino. Felt green is the only nod to poker, and it earns its place by being the
accent on the action you take most.

## 11. Payments: what is actually possible

Design must not overpromise here.

Venmo has **no peer-to-peer API**. Neither does Zelle. The app cannot send money,
and it cannot detect whether a payment happened. What it can do is open Venmo or
Cash App with the recipient, amount, and memo prefilled — the payer taps "Pay"
themselves in that app, and nothing reports back.

**Design consequences:**
- Never show a payment as "sent," "processing," or "confirmed."
- The "Mark paid" toggle is a manual, host-controlled record. It must be present
  even when a Venmo button exists, because half the table will pay in cash.
- These deep links are undocumented and can break. A broken link should degrade to
  "the button did nothing," never to a crash or an error screen.

## 12. Motion and feedback

- **Restrained.** Nothing that delays a tap.
- Rebuy tap: button scales down ~0.93 on press, springs back. Light haptic.
- Undo toast: rises from below with a short fade, ~180ms.
- Sheets: slide up ~200ms with a backdrop fade.
- Balanced state on Cash Out: a small, quiet transition. Earned, not celebratory.
- **No** page transitions between game phases. The content swaps; the header persists.

## 13. Copy and voice

Direct, dry, a little wry. Never cute about money.

| Context | Copy |
|---|---|
| Header hints | "Tap + for a rebuy" / "Count every stack" / "Fewest possible payments" |
| Empty roster | "Add the people you actually play with." |
| Empty ledger | "No games yet. Finish a night and it lands here." |
| Zero payments | "Everyone broke even. Rare and beautiful." |
| Off balance | "Off by $15" |
| Missing handle | "No payment handle" |

Rules: never use the word "user." Never say "successfully." Numbers over adjectives.

## 14. Edge cases to design for

1. A player is removed mid-game after buying in
2. A player joins two hours late
3. The count is off and the host cannot find the discrepancy (they need to be able
   to leave the screen and come back)
4. A player has no payment handle
5. Everyone breaks even
6. Two players have the same first name (avatar color is the disambiguator)
7. A game is abandoned and never settled
8. Very long player names
9. 12+ players at the table
10. Odd cash-out amounts with cents

## 15. Accessibility

- Minimum 44×44pt touch targets; the `+` button should exceed it.
- Never encode meaning in color alone — net direction needs its sign, paid state
  needs its label.
- Dark theme must clear 4.5:1 for body text. Muted text on surface currently sits
  near the line and should be checked.
- Support Dynamic Type at least one step up; the player row must not break.

## 16. What I want from Claude Design

In priority order:

1. **The Live Game screen.** It is the four-hour screen and the rebuy row is the
   product. If only one screen gets designed properly, this is it.
2. **Settle Up.** The payoff moment, and the one that gets read aloud.
3. **Cash Out**, specifically the tally bar across its three states.
4. **A component sheet** covering §9, so the rest can be assembled consistently.
5. New Game, Players, Ledger.

**Deliverable shape:** high-fidelity mobile frames at 390×844, dark theme, plus the
component sheet. States matter more than screens — an empty Ledger and a balanced
Cash Out are separate frames.

**Where I most want you to disagree with me:** the visual language in §10 is
functional but unremarkable. The app is used at a table with friends at midnight;
there may be a warmer or more distinctive direction that does not cost legibility.
Show me one.

## 10a. Night report

The record of one finished night, built to `night-report-handoff.md`. Reached by
tapping a past game in the Ledger or on Home, and shown straight after a game is
saved from Settle Up.

It answers three questions in order: who won and by how much, what each person
put in, and what the night was in aggregate. **It is not Settle Up** — it never
says who pays whom, and nothing on it is tappable except the dock button.

- **Diverging bars** around a centre zero line, scaled to the night rather than
  an absolute axis, so the biggest winner and biggest loser both reach full
  length. Buy-in amounts vary through a night, so a per-buy-in axis would be
  meaningless — do not reintroduce one, and never show a rebuy *count* where a
  dollar amount belongs.
- Bar width is a CSS percentage of half the track with a `max(3px, …)` floor, so
  it scales with the column at any width and a $1 net still draws.
- Sorted by net descending; ties to whoever risked more, then by name.
- Everyone flat gets its own card rather than an empty area. An unbalanced game
  renders anyway with a muted `Off by $15` line — it should be impossible, and
  it is still not worth an error dialog.

**Known gap:** the handoff asks the 10.5px sub-line to scale with Dynamic Type.
The app is px-based throughout, so nothing scales with the system setting. The
row survives ~15% larger type (49px → 54px, inside the 62px limit), but honouring
that item properly means moving the whole app to relative units.

## 11a. Home

The landing tab. It exists because of one gap, not to be a dashboard: **once a
night is saved, its unpaid payments become invisible.** The Ledger shows net
position over time, which is a different question from "who still has to hand me
cash." Nothing else in the app could answer that.

- **The hero** carries whichever state you are in. Mid-game: chips in play,
  total bought in, how many are still playing, elapsed time, buy-in, and the bomb
  pot countdown, with one button back to the table. Between games: a short
  prompt and "Start a night."
- **Still owed** lists every unpaid payment across saved nights, newest first,
  with the total in the section header and a one-tap **Paid** on each row. This
  is the reason the tab exists.
- **All time** shows the top five, linking through to the full Ledger.
- **Last night** opens that night's recap card.

Everything below the hero is conditional. A first-time user with no history sees
the hero and nothing else — the hub must not present a wall of empty sections
pretending to be data.

## 12a. Leaving early

Anyone can be cashed out on their own, mid-game, without ending the night.

Tap a player's row for their actions: Rebuy, Cash out, or Remove from the table.
Cashing out asks for their final stack, shows what they walk away with, and marks
the seat done. Their row dims to their net with a **Cashed out** tag, and
**Sit back down** reverses it if they buy back in.

Two consequences the design has to carry honestly:

- **"On the table" now means chips actually in front of people** — total buy-ins
  minus anything already walked out the door. When someone has left, the header
  sub-line spells out both numbers (`$140 bought in · $50 cashed out`), because
  the pot the host must eventually account for is still the larger one.
- **The end-of-night count skips them.** A seat marked `leftEarly` shows as a
  locked row reading **Left early** with its result, not an input. Asking the
  host to count a stack that is no longer in the room is how you get a phantom
  discrepancy at 1am.

The settle maths needs no special case: their number was recorded the same way
everyone else's is, so nets still sum to zero and they appear in the payment list
like anyone else.

**Why the row became tappable**, reversing "the row is not a link" in §8.2: a
seat now has two actions, and two buttons do not fit at 390pt. Burying the second
one in a long-press is exactly what the Rebuy change removed. The Rebuy button
stays on the row as the fast path and stops propagation.

## 13a. Bomb pot timer

A recurring timer that tells the table when to run a bomb pot: everyone antes a
fixed amount and the flop is dealt with no preflop betting.

**It never touches the money.** The ante comes off stacks that are already on the
table, so the pot total and the cash-out balance are unchanged by definition. The
timer writes nothing to `buyIns` and nothing to `cashOut`. Treating a bomb pot as
a money event would corrupt the one invariant the app exists to protect.

- **Countdown bar** above the seats on the Game screen: next time, ante, and how
  many have run tonight. Turns brass under a minute. Tap for settings.
- **When it fires:** a full sheet with the ante at 58px, a chime, and a haptic
  pattern. Dismissing restarts the clock.
- **Presets** of 10 / 15 / 20 / 30 minutes, with a settable ante.
- Off by default; armed from Game options.

Two details that matter more than they look:

- **Remaining time is derived from an absolute `nextAt`, never counted down.** A
  phone that sleeps suspends timers; recomputing from a timestamp means the
  countdown is still right when the screen wakes.
- **After firing it reschedules from now, not from the missed deadline.** A phone
  asleep through two intervals should prompt once, not queue a burst.

A screen wake lock is held while the timer is armed — a countdown nobody can see
is useless, and the host puts the phone down between hands.

## 14a. The spectator link

The host can share a read-only view of the table to the group chat. **The whole
table travels inside the URL fragment**, base64url-encoded, so there is no server,
no account, and nothing to host beyond the static app.

The consequence has to be stated plainly everywhere it appears: **it is a
snapshot, not a live feed.** The numbers are frozen at the moment the link was
generated, because there is nowhere for a viewer to poll. The share sheet says
so, and the spectator screen carries a `Read-only · as of 11:47 PM` ribbon under
the header plus a closing line telling the viewer to ask for a fresh link.

- Opening the link renders `Spectator`, never the app. No tabs, no dock, no
  controls, and the host's own stored game is never read on that path.
- **Signatures are never included** in the payload — they are the private half of
  the record, and they would dominate the size.
- A settled game carries the payment list too, so "who pays who" can go straight
  into the chat.
- A mangled or truncated link shows a plain explanation, never a crash.
- Payload is ~230 characters for three players, so it survives any chat client.

**If a genuinely live view is ever wanted**, that is the point where this app
grows a backend: a tiny store the host pushes to and viewers poll or subscribe.
That is a real change in shape — hosting, an identifier per game, and a privacy
question about who can read a table — not an increment on this.

## 15a. Signed buy-ins and the log

**Rebuys only.** A player's first buy-in of the night commits on a single tap,
because everyone is standing at the table paying up front — there is nothing to
dispute. Every buy-in after that opens a confirmation screen they sign.

**The rebuy case is a deliberate exception to §4.2 and §4.3** — it puts a
confirmation in front of a frequent action. It earns that because reloads are
where a home game runs on credit: people buy in again for hours and settle at the
end, and a signature is the record that stops "I only rebought twice" at 1am.
Scoping it to rebuys keeps the opening round at one tap per player.

- **Sign screen.** Name at 30px and amount at 58px — the two things the person
  signing reads from across the table — then a short pad and a Verify button.
  Verify stays disabled until there is a mark.
- **Add without signing** is always offered. Someone stepping outside must not
  block their own rebuy, and a log that forces a signature just gets fake ones.
- **The log** lists every entry of the night in order: time, player, what kind
  of entry it is, the signature or an `unsigned` chip, and the amount, totalling
  to the pot.
- **Every row names its type** — `buy-in` for a player's first, `add-on` for
  everything after. Type used to be implied only by whether a signature was
  present, which left it unreadable on any row that was never signed.
- Opening buy-ins are not counted as gaps in the unsigned tally: they are not
  meant to carry a mark, so including them would make the count meaningless. Reachable from the
  Game screen during play and from any past game in the Ledger.

Signatures are stored as normalised stroke coordinates, not images — see the note
in `CLAUDE.md`. They render as SVG, so a mark is legible at 34px in the log and
sharp if it is ever shown larger.

**Still to design:** the sign screen and log were built to the existing component
language rather than drawn. Worth a proper pass, particularly the pad — it is the
only place in the app a guest, rather than the host, touches the phone.

## 16a. Built beyond the frames

Two features from the roadmap ship in this design language but were not drawn:

- **Chip denominations** — a sheet reached from New Game and Game options.
  Define what each colour is worth and how many you own, and get a suggested
  starting stack. Purely a counting aid; it never touches the money.

  The distribution follows standard home-game practice, which the first version
  got exactly backwards:

  - **Value goes in the big chips, count goes in the small ones.** Weighting by
    even value share puts a mountain of the smallest denomination in every
    stack.
  - **The small blind sets the smallest chip in play.** A .25/.50 game needs
    sub-dollar chips; a 1/1 game does not, and quarters in it are clutter. The
    blinds are picked in the sheet.
  - **Nobody gets more than 15 of any one colour.** Twenty each across eight
    players is 160 chips of a single colour before a single rebuy.
  - **Three denominations** is the norm; two is clunky and four is fiddly.
  - **No single chip worth more than a quarter of the stack** — a $100 chip in a
    $200 stack cannot be bet with.
  - **Never deal out the whole rack.** Inventory caps the suggestion, and if
    nothing fits, the sheet names the shortfall rather than staying silent.

  The benchmark is the canonical $1/$2 stack: 20 × $1, 16 × $5, 4 × $25.
- **Recap card** — a shareable PNG drawn on a canvas, reached from Settle Up and
  from any past game in the Ledger. Self-contained: no library, no fonts to load,
  no network.

  **It is sized for a chat thumbnail, not for full-screen viewing.** At 1080
  wide scaled into a message thread it renders around 400px, so everything is
  roughly a third of its nominal size — type that looks generous at full size
  vanishes there. The card is **1080 wide with a height that grows with the
  field** (900 heads-up, ~1580 for six) rather than a fixed frame that squeezes
  rows. A squeezed row is illegible at thumbnail size; a taller image just
  scrolls.

  Restraint is deliberate: one accent colour, one soft wash at the top, plain
  footer lines instead of a boxed list of superlatives, and no emoji. The
  hierarchy is date → totals → standings, and nothing competes with it.

Deliberately **not** built: a blind timer (tournament-only, and this is a cash-game
app) and the live guest view (needs a backend, ruled out by §3).

## 17. Data model, for reference

```
Player  { id, name, color, venmo, cashapp }
Chip    { color, value }
Signature  [[[x, y], ...], ...]   normalised 0–1 strokes, or null
Group   { id, name, playerIds[] }
Game    { id, startedAt, defaultBuyIn, phase, seats[], payments[] }
Seat    { playerId, buyIns[{ id, amount, at, signature }], cashOut }
Payment { id, from, to, amount, paid }
```

All money is stored as integer cents. `phase` is one of `playing | cashout | settle`.
Finished games move to `history[]` with an `endedAt` stamp.
