import { useState } from 'react'
import { useStore } from './store'
import { fmt } from './lib/money'
import { countedTotal, inPlay, potTotal } from './lib/settle'
import { Home } from './screens/Home'
import { NightReport } from './screens/NightReport'
import { nightReport } from './lib/report'
import { NewGame } from './screens/NewGame'
import { Game } from './screens/Game'
import { CashOut } from './screens/CashOut'
import { Settle } from './screens/Settle'
import { Players } from './screens/Players'
import { Ledger } from './screens/Ledger'
import { Toast } from './components/Toast'
import { Icon } from './components/UI'

const TABS = [
  ['home', 'Home'],
  ['game', 'Game'],
  ['players', 'Players'],
  ['ledger', 'Ledger'],
]

export default function App() {
  const { state, player } = useStore()
  const [tab, setTab] = useState('home')
  // A finished night being read. 'latest' resolves to the game just saved.
  const [report, setReport] = useState(null)
  const game = state.game

  const reportGame = report === 'latest' ? state.history[0] : report
  const openTab = (id) => {
    setReport(null)
    setTab(id)
  }

  // The header is the one persistent thing across the three game phases. The
  // content swaps underneath it; there is no page transition.
  let title = ['New game', 'Pick a buy-in and who is playing']
  let right = null
  let tone = null
  let body

  if (reportGame) {
    const r = nightReport(reportGame, player)
    title = [
      r.date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
      `Biggest swing ${fmt(r.maxAbsNet)}`,
    ]
    right = ['On the table', fmt(r.pot)]
    body = <NightReport game={reportGame} />
  } else if (tab === 'home') {
    title = ['Poker Night', game ? 'A game is running' : homeHint(state)]
    body = <Home onGo={openTab} onOpenNight={setReport} />
  } else if (tab === 'players') {
    const missing = state.players.filter((p) => !p.venmo && !p.cashapp).length
    title = ['Players', missing ? 'Handles make settling one tap' : 'Roster and groups']
    body = <Players />
  } else if (tab === 'ledger') {
    title = ['Ledger', ledgerHint(state.history)]
    body = <Ledger onOpen={setReport} />
  } else if (!game) {
    body = <NewGame />
  } else if (game.phase === 'playing') {
    const gone = potTotal(game) - inPlay(game)
    title = [
      'Tonight',
      gone > 0
        ? `${fmt(potTotal(game))} bought in · ${fmt(gone)} cashed out`
        : `${fmt(game.defaultBuyIn)} buy-in · tap + to add chips`,
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
            <div className={`pot num${reportGame ? ' report' : ''}`} data-tone={tone || undefined}>
            {right[1]}
          </div>
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
              onClick={() => openTab(id)}
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

function homeHint(state) {
  if (state.history.length === 0) return 'Your table, start to finish'
  return `${state.history.length} night${state.history.length === 1 ? '' : 's'} on the books`
}

function ledgerHint(history) {
  if (!history.length) return 'Standings and past nights'
  const first = new Date(history[history.length - 1].endedAt)
  const month = first.toLocaleDateString(undefined, { month: 'long' })
  return `${history.length} night${history.length === 1 ? '' : 's'} since ${month}`
}
