import { useState } from 'react'
import { useStore } from '../store'
import { fmt, fmtSigned } from '../lib/money'
import { nets } from '../lib/settle'
import { cashAppLink, venmoLink } from '../lib/payments'
import { Avatar, Dock, Sheet } from '../components/UI'
import { Recap } from './Recap'

export function Settle() {
  const { state, dispatch, player } = useStore()
  const game = state.game
  const ranked = nets(game).sort((a, b) => b.net - a.net)
  const allPaid = game.payments.length > 0 && game.payments.every((p) => p.paid)
  const [handleFor, setHandleFor] = useState(null)
  const [recap, setRecap] = useState(false)

  return (
    <>
      <div className="scroll">
        {game.payments.length === 0 ? (
          <div className="pay" style={{ textAlign: 'center', padding: '30px 20px' }}>
            <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-.015em' }}>
              Everyone broke even.
            </div>
            <div style={{ fontSize: 14.5, color: 'var(--smoke)', marginTop: 7 }}>
              Rare and beautiful.
            </div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 14, color: 'var(--smoke)', margin: '0 2px 12px' }}>
              {game.payments.length} payment{game.payments.length === 1 ? '' : 's'} settle all{' '}
              {game.seats.length} players.
            </div>
            {game.payments.map((p) => {
              const from = player(p.from)
              const to = player(p.to)
              const venmo = venmoLink(to.venmo, p.amount, 'Poker night')
              const cash = cashAppLink(to.cashapp, p.amount)
              const hasHandle = venmo || cash
              return (
                <div key={p.id} className="pay" data-paid={p.paid}>
                  <div className="line">
                    <Avatar player={from} size={30} />
                    {/* Direction is a verb, not an arrow. "Alec pays Jo" survives
                        being read aloud across a table at 1am. */}
                    <div className="names">
                      <b>{from.name}</b> <em>pays</em> <b>{to.name}</b>
                    </div>
                    <Avatar player={to} size={30} />
                    <div className="big num">{fmt(p.amount)}</div>
                  </div>
                  <div className="acts">
                    {venmo && (
                      <a className="act" href={venmo} target="_blank" rel="noreferrer">Venmo</a>
                    )}
                    {cash && (
                      <a className="act" href={cash} target="_blank" rel="noreferrer">Cash App</a>
                    )}
                    <button
                      className="act mark"
                      onClick={() => dispatch({ type: 'TOGGLE_PAID', id: p.id })}
                    >
                      {p.paid ? 'Paid' : 'Mark paid'}
                    </button>
                    {/* The gap becomes a prompt, not dead space. */}
                    {!hasHandle && (
                      <button
                        className="act"
                        style={{ flex: '0 0 auto', color: 'var(--smoke)' }}
                        onClick={() => setHandleFor(to.id)}
                      >
                        Add a handle for {to.name}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </>
        )}

        <div className="sec"><span>Tonight</span></div>
        {ranked.map((n) => {
          const p = player(n.playerId)
          return (
            <div key={n.playerId} className="net">
              <Avatar player={p} size={26} />
              <div className="who">
                <div className="nm sm">{p.name}</div>
                <div className="meta num">in {fmt(n.buyIn)} · out {fmt(n.cashOut)}</div>
              </div>
              <div className={`amt sm num ${n.net > 0 ? 'up' : n.net < 0 ? 'down' : 'flat'}`}>
                {fmtSigned(n.net)}
              </div>
            </div>
          )
        })}

        <div className="subrow">
          <button className="lnk" onClick={() => setRecap(true)}>Share a recap</button>
          <button className="lnk" onClick={() => dispatch({ type: 'SET_PHASE', phase: 'cashout' })}>
            Back to stacks
          </button>
        </div>
      </div>

      <Dock>
        <button
          className="btn"
          onClick={() => dispatch({ type: 'FINISH_GAME', label: { text: 'Night saved' } })}
        >
          {allPaid || game.payments.length === 0 ? 'Save and finish' : 'Save to history'}
        </button>
      </Dock>

      {handleFor && <HandleSheet id={handleFor} onClose={() => setHandleFor(null)} />}
      {recap && <Recap game={game} onClose={() => setRecap(false)} />}
    </>
  )
}

function HandleSheet({ id, onClose }) {
  const { dispatch, player } = useStore()
  const p = player(id)
  const [venmo, setVenmo] = useState(p.venmo || '')
  const [cashapp, setCashapp] = useState(p.cashapp || '')
  return (
    <Sheet
      title={`Pay ${p.name}`}
      hint="Saved to their profile, so next time this is one tap."
      onClose={onClose}
    >
      <label className="field">
        <span>Venmo username</span>
        <input autoCapitalize="none" placeholder="jane-doe" value={venmo}
          onChange={(e) => setVenmo(e.target.value)} />
      </label>
      <label className="field">
        <span>Cash App $cashtag</span>
        <input autoCapitalize="none" placeholder="janedoe" value={cashapp}
          onChange={(e) => setCashapp(e.target.value)} />
      </label>
      <button
        className="btn"
        onClick={() => {
          dispatch({ type: 'UPDATE_PLAYER', id, patch: { venmo, cashapp } })
          onClose()
        }}
      >
        Save
      </button>
    </Sheet>
  )
}
