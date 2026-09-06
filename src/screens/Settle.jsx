import { useStore } from '../store'
import { fmt, fmtSigned } from '../lib/money'
import { nets } from '../lib/settle'
import { cashAppLink, venmoLink } from '../lib/payments'
import { Avatar } from '../components/UI'

export function Settle() {
  const { state, dispatch, player } = useStore()
  const game = state.game
  const netList = nets(game).sort((a, b) => b.net - a.net)
  const allPaid = game.payments.every((p) => p.paid)

  return (
    <div className="screen">
      <div className="section-label">
        {game.payments.length} payment{game.payments.length === 1 ? '' : 's'} to settle
        {' '}{game.seats.length} players
      </div>

      {game.payments.length === 0 && (
        <div className="empty">Everyone broke even. Rare and beautiful.</div>
      )}

      {game.payments.map((p) => {
        const from = player(p.from)
        const to = player(p.to)
        const note = 'Poker night'
        const venmo = venmoLink(to.venmo, p.amount, note)
        const cash = cashAppLink(to.cashapp, p.amount)
        return (
          <div key={p.id} className="pay" data-paid={p.paid}>
            <div className="line">
              <Avatar player={from} size={28} />
              <span>{from.name}</span>
              <span className="arrow">→</span>
              <Avatar player={to} size={28} />
              <span>{to.name}</span>
              <span className="amount num">{fmt(p.amount)}</span>
            </div>
            <div className="actions">
              {venmo && (
                <a href={venmo} target="_blank" rel="noreferrer">
                  Venmo
                </a>
              )}
              {cash && (
                <a href={cash} target="_blank" rel="noreferrer">
                  Cash App
                </a>
              )}
              <button
                className={p.paid ? 'done' : ''}
                onClick={() => dispatch({ type: 'TOGGLE_PAID', id: p.id })}
              >
                {p.paid ? 'Paid ✓' : 'Mark paid'}
              </button>
            </div>
          </div>
        )
      })}

      <div className="section-label">Night's results</div>
      <div className="card">
        {netList.map((n) => {
          const p = player(n.playerId)
          return (
            <div key={n.playerId} className="net-row">
              <Avatar player={p} size={30} />
              <div className="info">
                <div className="name">{p.name}</div>
                <div className="meta">
                  in {fmt(n.buyIn)} · out {fmt(n.cashOut)}
                </div>
              </div>
              <div className={`val num ${n.net > 0 ? 'up' : n.net < 0 ? 'down' : ''}`}>
                {fmtSigned(n.net)}
              </div>
            </div>
          )
        })}
      </div>

      <button
        className="btn btn-primary btn-block"
        style={{ marginTop: 22 }}
        onClick={() => dispatch({ type: 'FINISH_GAME', label: 'Game saved' })}
      >
        {allPaid ? 'Save and finish' : 'Save to history'}
      </button>

      <button
        className="btn btn-block"
        style={{ marginTop: 8 }}
        onClick={() => dispatch({ type: 'SET_PHASE', phase: 'cashout' })}
      >
        Back to stacks
      </button>
    </div>
  )
}
