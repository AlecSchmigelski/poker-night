import { useState } from 'react'
import { useStore } from './store'
import { fmt } from './lib/money'
import { potTotal } from './lib/settle'
import { NewGame } from './screens/NewGame'
import { Game } from './screens/Game'
import { CashOut } from './screens/CashOut'
import { Settle } from './screens/Settle'
import { Players } from './screens/Players'
import { Ledger } from './screens/Ledger'
import { Toast } from './components/Toast'
import { Icon } from './components/UI'

// The header is the one persistent thing across the three game phases — the
// content swaps underneath it, there is no page transition (§12).
const PHASES = {
  playing: ['Tonight', 'Tap + for a rebuy'],
  cashout: ['Cash out', 'Count every stack'],
  settle: ['Settle up', 'Fewest possible payments'],
}

const TABS = [
  ['game', 'Game'],
  ['players', 'Players'],
  ['ledger', 'Ledger'],
]

export default function App() {
  const { state } = useStore()
  const [tab, setTab] = useState('game')
  const game = state.game

  let body
  let title = ['New game', 'Pick a buy-in and who is playing']
  let pot = null

  if (tab === 'players') {
    title = ['Players', 'Roster and groups']
    body = <Players />
  } else if (tab === 'ledger') {
    title = ['Ledger', 'Lifetime standings']
    body = <Ledger />
  } else if (!game) {
    body = <NewGame />
  } else {
    title = PHASES[game.phase]
    pot = potTotal(game)
    body =
      game.phase === 'playing' ? <Game /> : game.phase === 'cashout' ? <CashOut /> : <Settle />
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="info">
          <h1>{title[0]}</h1>
          <div className="sub">{title[1]}</div>
        </div>
        {pot != null && (
          <div className="pot">
            <div className="label">On the table</div>
            <div className="value num">{fmt(pot)}</div>
          </div>
        )}
      </header>

      {body}

      <div className="dock">
        {/* Screens portal their primary action here, above the tab bar. */}
        <div id="dock-slot" />
        <Toast />
        <nav className="tabbar">
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
    </div>
  )
}
