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

## Payments

Venmo and Cash App have no peer-to-peer API. `src/lib/payments.js` builds deep links
that prefill their compose screens; nothing reports back, so every payment carries a
manual "mark paid" toggle. Never present a payment as sent or confirmed.
