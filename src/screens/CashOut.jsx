import { useStore } from '../store'
import { fmt, toCents, fromCents } from '../lib/money'
import { countedTotal, potTotal } from '../lib/settle'
import { Avatar } from '../components/UI'

export function CashOut() {
  const { state, dispatch, player } = useStore()
  const game = state.game
  const pot = potTotal(game)
  const counted = countedTotal(game)
  const diff = counted - pot
  const allEntered = game.seats.every((s) => s.cashOut != null)

  return (
    <div className="screen">
      <div className={`tally ${diff === 0 && allEntered ? 'ok' : diff !== 0 ? 'off' : ''}`}>
        <span>
          Counted <strong className="num">{fmt(counted)}</strong> of{' '}
          <strong className="num">{fmt(pot)}</strong>
        </span>
        <strong className="num">
          {diff === 0 ? (allEntered ? 'Balanced' : '—') : `${diff > 0 ? 'over' : 'short'} ${fmt(Math.abs(diff))}`}
        </strong>
      </div>

      <div className="card">
        {game.seats.map((seat) => {
          const p = player(seat.playerId)
          const total = seat.buyIns.reduce((s, b) => s + b.amount, 0)
          return (
            <div key={seat.playerId} className="cashout-row">
              <Avatar player={p} size={32} />
              <div className="info">
                <div className="name">{p.name}</div>
                <div className="meta">in {fmt(total)}</div>
              </div>
              <input
                className="num"
                inputMode="decimal"
                placeholder="0.00"
                value={seat.cashOut == null ? '' : fromCents(seat.cashOut)}
                onFocus={(e) => e.target.select()}
                onChange={(e) =>
                  dispatch({
                    type: 'SET_CASH_OUT',
                    playerId: seat.playerId,
                    amount: e.target.value === '' ? null : toCents(e.target.value),
                  })
                }
              />
            </div>
          )
        })}
      </div>

      <p className="empty" style={{ paddingTop: 18, paddingBottom: 10 }}>
        Enter what each player is holding when they leave the table. The total has to
        match the pot before you can settle.
      </p>

      <button
        className="btn btn-primary btn-block"
        disabled={!allEntered || diff !== 0}
        onClick={() => dispatch({ type: 'SET_PHASE', phase: 'settle' })}
      >
        {!allEntered
          ? 'Enter every stack'
          : diff !== 0
            ? `Off by ${fmt(Math.abs(diff))}`
            : 'Settle up'}
      </button>

      <button
        className="btn btn-block"
        style={{ marginTop: 8 }}
        onClick={() => dispatch({ type: 'SET_PHASE', phase: 'playing' })}
      >
        Back to the game
      </button>
    </div>
  )
}
