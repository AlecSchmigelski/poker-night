import { useState } from 'react'
import { useStore } from './store'
import { fmt } from './lib/money'
import { countedTotal, inPlay, potTotal } from './lib/settle'
import { NewGame } from './screens/NewGame'
import { Game } from './screens/Game'
import { CashOut } from './screens/CashOut'
import { Settle } from './screens/Settle'
import { Players } from './screens/Players'
import { Ledger } from './screens/Ledger'
import { Toast } from './components/Toast'
import { Icon } from './components/UI'

const TABS = [
  ['game', 'Game'],
  ['players', 'Players'],
  ['ledger', 'Ledger'],
]

export default function App() {
  const { state } = useStore()
  const [tab, setTab] = useState('game')
  const game = state.game

  // The header is the one persistent thing across the three game phases. The
  // content swaps underneath it; there is no page transition.
  let title = ['New game', 'Pick a buy-in and who is playing']
  let right = null
  let tone = null
  let body

  if (tab === 'players') {
    const missing = state.players.filter((p) => !p.venmo && !p.cashapp).length
    title = ['Players', missing ? 'Handles make settling one tap' : 'Roster and groups']
    body = <Players />
  } else if (tab === 'ledger') {
    title = ['Ledger', ledgerHint(state.history)]
    body = <Ledger />
  } else if (!game) {
    body = <NewGame />
  } else if (game.phase === 'playing') {
    const gone = potTotal(game) - inPlay(game)
    title = [
      'Tonight',
      gone > 0
        ? `${fmt(potTotal(game))} bought in · ${fmt(gone)} cashed out`
        : `${fmt(game.defaultBuyIn)} buy-in · tap Rebuy to top up`,
    ]
    right = ['On the table', fmt(inPlay(game))]
    body = <Game />
  } else if (game.phase === 'cashout') {
    const balanced =
      game.seats.every((s) => s.cashOut != null) && countedTotal(game) === potTotal(game)
    tone = balanced ? 'ok' : null
    title = ['Cash out', balanced ? 'Every stack accounted for' : 'Count every stack']
    right = ['On the table', fmt(potTotal(game))]
    body = <CashOut />
  } else {
    title = ['Settle up', game.payments.length ? 'Fewest possible payments' : 'Nothing to move']
    right = ['Payments', String(game.payments.length)]
    body = <Settle />
  }

  return (
    <div className="app">
      <header className="hdr">
        <div className="lamp" data-tone={tone || undefined} />
        <div className="left">
          <div className="title">{title[0]}</div>
          <div className="hint">{title[1]}</div>
        </div>
        {right && (
          <div className="right">
            <div className="potlabel">{right[0]}</div>
            <div className="pot num" data-tone={tone || undefined}>{right[1]}</div>
          </div>
        )}
      </header>

      {body}

      <div className="dock">
        <Toast />
        {/* Screens portal their primary action here, above the tab bar. */}
        <div id="dock-slot" />
        <nav className="tabs">
          {TABS.map(([id, label]) => (
            <button
              key={id}
              aria-current={tab === id ? 'page' : undefined}
              onClick={() => setTab(id)}
            >
              <Icon name={id} />
              {label}
            </button>
          ))}
        </nav>
      </div>

      <div id="sheet-slot" />
    </div>
  )
}

function ledgerHint(history) {
  if (!history.length) return 'Standings and past nights'
  const first = new Date(history[history.length - 1].endedAt)
  const month = first.toLocaleDateString(undefined, { month: 'long' })
  return `${history.length} night${history.length === 1 ? '' : 's'} since ${month}`
}
