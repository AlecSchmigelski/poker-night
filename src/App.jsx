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

const TITLES = {
  playing: ['Tonight', 'Tap + for a rebuy'],
  cashout: ['Cash out', 'Count every stack'],
  settle: ['Settle up', 'Fewest possible payments'],
}

export default function App() {
  const { state } = useStore()
  const [tab, setTab] = useState('game')
  const game = state.game

  let body
  let title = ['New game', 'Pick a buy-in and who is playing']
  let pot = null

  if (tab === 'players') {
    body = <Players />
    title = ['Players', 'Roster and groups']
  } else if (tab === 'ledger') {
    body = <Ledger />
    title = ['Ledger', 'Lifetime standings']
  } else if (!game) {
    body = <NewGame />
  } else {
    title = TITLES[game.phase]
    pot = potTotal(game)
    body = game.phase === 'playing' ? <Game /> : game.phase === 'cashout' ? <CashOut /> : <Settle />
  }

  return (
    <div className="app">
      <header className="topbar">
        <div>
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

      <nav className="tabbar">
        <button data-active={tab === 'game'} onClick={() => setTab('game')}>
          <span className="glyph">♠</span>
          Game
        </button>
        <button data-active={tab === 'players'} onClick={() => setTab('players')}>
          <span className="glyph">♣</span>
          Players
        </button>
        <button data-active={tab === 'ledger'} onClick={() => setTab('ledger')}>
          <span className="glyph">♦</span>
          Ledger
        </button>
      </nav>

      <Toast />
    </div>
  )
}
