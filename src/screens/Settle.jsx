import { useStore } from '../store'
import { fmt, fmtSigned } from '../lib/money'
import { nets } from '../lib/settle'
import { cashAppLink, venmoLink } from '../lib/payments'
import { Avatar, Dock, Empty, Icon } from '../components/UI'

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

export function Settle() {
  const { state, dispatch, player } = useStore()
  const game = state.game
  const results = nets(game).sort((a, b) => b.net - a.net)
  const payments = game.payments
  const paidCount = payments.filter((p) => p.paid).length
  const allPaid = payments.length > 0 && paidCount === payments.length

  return (
    <>
      <div className="screen">
        <h2 className="settle-head">
          {payments.length === 0 ? (
            'Nothing to settle'
          ) : (
            <>
              <span className="n num">{plural(payments.length, 'payment')}</span> to settle{' '}
              {plural(game.seats.length, 'player')}
            </>
          )}
        </h2>

        {payments.length === 0 && (
          <Empty title="Everyone broke even.">Rare and beautiful.</Empty>
        )}

        {payments.map((pay) => {
          const from = player(pay.from)
          const to = player(pay.to)
          const venmo = venmoLink(to.venmo, pay.amount, 'Poker night')
          const cash = cashAppLink(to.cashapp, pay.amount)
          return (
            <div key={pay.id} className="pay" data-paid={pay.paid}>
              <div className="line">
                <span className="who">
                  <Avatar player={from} size={28} />
                  <span className="n">{from.name}</span>
                </span>
                <span className="arrow">
                  <Icon name="arrow" size={18} />
                </span>
                <span className="who">
                  <Avatar player={to} size={28} />
                  <span className="n">{to.name}</span>
                </span>
                <span className="amount num">{fmt(pay.amount)}</span>
              </div>

              {/* Getting payer and payee backwards is the worst failure this
                  screen can have, so it also says it in words — that is the
                  line the host reads to the table. */}
              <p className="dir">
                {from.name} pays {to.name}
              </p>

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
                  className={pay.paid ? 'done' : ''}
                  aria-pressed={pay.paid}
                  onClick={() => dispatch({ type: 'TOGGLE_PAID', id: pay.id })}
                >
                  {pay.paid && <Icon name="check" size={15} />}
                  {pay.paid ? 'Paid' : 'Mark paid'}
                </button>
              </div>
            </div>
          )
        })}

        <div className="section-label">
          <span>Night's results</span>
          {payments.length > 0 && (
            <span className="count num">
              {paidCount} of {payments.length} paid
            </span>
          )}
        </div>

        <div className="card">
          {results.map((r) => {
            const p = player(r.playerId)
            return (
              <div key={r.playerId} className="net-row">
                <Avatar player={p} size={30} />
                <div className="info">
                  <div className="name">{p.name}</div>
                  <div className="meta num">
                    in {fmt(r.buyIn)} · out {fmt(r.cashOut)}
                  </div>
                </div>
                <div className={`val num ${r.net > 0 ? 'up' : r.net < 0 ? 'down' : 'flat'}`}>
                  {fmtSigned(r.net)}
                </div>
              </div>
            )
          })}
        </div>

        <p className="hint">
          Venmo and Cash App can only open with the amount filled in — you still tap pay
          over there, and nothing tells this app what happened. Mark paid is your record.
        </p>
      </div>

      <Dock>
        <div className="footer">
          <button
            className="btn btn-primary btn-block"
            onClick={() => dispatch({ type: 'FINISH_GAME', label: 'Night saved to the ledger' })}
          >
            {allPaid || payments.length === 0 ? 'Save and finish' : 'Save to history'}
          </button>
          <button
            className="btn btn-quiet btn-block"
            onClick={() => dispatch({ type: 'SET_PHASE', phase: 'cashout' })}
          >
            Back to the stacks
          </button>
        </div>
      </Dock>
    </>
  )
}
