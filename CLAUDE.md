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

## Visual language

"One lamp over a dark table" — warm blacks, brass as the action colour, clay-chip
player identities. **Brass means "touch this." Green and red only ever describe
money**, so never use the accent for a positive number or the up-colour for a
button. Tokens live at the top of `src/index.css`; the frames they came from are
`DESIGN-SPEC.md` §10.

## Signatures

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
