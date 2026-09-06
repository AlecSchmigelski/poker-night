# Poker Night

Phone-first PWA for running a home poker **cash game**: track buy-ins and rebuys,
count everyone down, and settle the night in the fewest possible payments.

`DESIGN-SPEC.md` is the design and product source of truth. Read it before changing
UI or scope.

## Commands

```
npm run dev      # vite dev server on :5173
npm run build
npm test         # settle math + money parsing (node, no framework)
```

## Architecture

- **React + Vite, no router, no backend.** Tab state and game phase live in `App.jsx`.
- **All state in one reducer** (`src/store.jsx`), persisted to `localStorage` under
  `poker-night/v1`. There is no network layer anywhere in this app.
- **Money is integer cents everywhere.** Convert at the UI boundary with
  `toCents` / `fmt` in `src/lib/money.js`. Never do arithmetic on dollar floats.
- **Settlement logic is in `src/lib/settle.js`** and is the part worth testing.
  `minimizePayments` is greedy largest-debtor to largest-creditor.
- **Undo, not confirmation.** Money-changing actions are listed in `UNDOABLE` in
  the store; they snapshot the previous state and surface an undo toast. Do not add
  confirmation dialogs.

## Scope

Cash games only. Tournaments, blinds, side games, prop bets, multi-device sync, and
accounts are all explicitly out of scope — see `DESIGN-SPEC.md` §3.

## Hosting

Live at <https://alecschmigelski.github.io/poker-night/>, deployed by GitHub
Actions on every push to `main`. Static build, no backend — see `DEPLOY.md`.
This project is kept entirely separate from the Arkin work; do not deploy it
into a shared workspace. `base` is `'./'` and every asset
reference in `index.html` and the manifest is relative, so one build works at a
domain root or on a project subpath. Keep it that way: an absolute `/asset` path
silently breaks GitHub Pages project sites.

HTTPS is required in practice — Add to Home Screen, `navigator.share`, clipboard
copy, and haptics are all secure-origin gated.

## Failure handling

`Boundary` wraps the whole tree in `main.jsx`. Any render error shows an
explanation plus Reload and "clear saved data" rather than a black screen — a
blank page is indistinguishable from "the app didn't load", which is the worst
possible bug report to receive.

`load()` in the store treats **valid JSON of the wrong shape** as the dangerous
case: it parses fine, then throws on the first `.map()` during render. Every
list is coerced with `Array.isArray` before it reaches a component. Keep that
when adding fields to the persisted state.

## Visual language

"One lamp over a dark table" — warm blacks, brass as the action colour, clay-chip
player identities. **Brass means "touch this." Green and red only ever describe
money**, so never use the accent for a positive number or the up-colour for a
button. Tokens live at the top of `src/index.css`; the frames they came from are
`DESIGN-SPEC.md` §10.

## Home

The landing tab exists for one reason: unpaid payments vanish into `history` when
a night is saved, and nothing else surfaces them. `lib/debts.js` reads them back
out; `TOGGLE_HISTORY_PAID` settles one after the fact. Keep every section below
the hero conditional — an empty hub should show the hero alone, not a grid of
zeroes.

## Leaving early

A seat with `cashOut` set during the `playing` phase is someone who left early;
`leftEarly` marks it. The end-of-night count **must** skip those seats — they are
already counted, and showing an input invites the host to re-count chips that are
no longer in the room.

`inPlay()` (buy-ins minus everything cashed out) is what the header shows during
play; `potTotal()` is still the figure the whole night must reconcile to. Do not
conflate them. The settle maths needs no special case for early leavers.

## Bomb pots

`game.bombPot` is a timer and nothing else. **It must never write to `buyIns` or
`cashOut`** — the ante moves chips already on the table, so the pot total and the
cash-out balance are unchanged by definition. Timer state persists with the game;
remaining time is always derived from the absolute `nextAt` in `lib/bombpot.js`,
never decremented, so a sleeping phone cannot drift it.

## The spectator link

`src/lib/share.js` encodes the table into the URL fragment; `#g=<payload>` boots
`Spectator` instead of `App` (see `main.jsx`), and that path never reads the
host's localStorage. It is a **snapshot, not a live feed** — say so in any UI
that surfaces it, and never imply the viewer's numbers update. Signatures are
deliberately excluded from the payload. Bump `VERSION` in `share.js` if the
shape changes; `decodeSnapshot` returns null on an unknown version rather than
guessing, and callers must render an explanation, not crash.

## Signatures

Only **rebuys** are signed. A player's first buy-in commits on one tap; every
buy-in after it opens the sign screen. Keep that split — it is what stops the
opening round from becoming four modal screens in a row.

Buy-ins carry an optional signature, stored as **normalised 0–1 stroke
coordinates** (`[[[x,y], ...], ...]`), never a PNG data URL. A night can hold
thirty signatures and localStorage is small: strokes cost a few hundred bytes
where base64 costs tens of kilobytes, and they stay sharp at any size because
they render as SVG. Points closer than 0.004 apart are dropped on capture.

`signature: null` means the buy-in was added without one, which the log surfaces
rather than hides. Keep the "Add without signing" path — a log that forces a
signature only collects fake ones.

## Payments

Venmo and Cash App have no peer-to-peer API. `src/lib/payments.js` builds deep links
that prefill their compose screens; nothing reports back, so every payment carries a
manual "mark paid" toggle. Never present a payment as sent or confirmed.
