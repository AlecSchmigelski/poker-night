import { useState } from 'react'
import { useStore } from '../store'
import { fmt, fmtSigned } from '../lib/money'
import { nets } from '../lib/settle'
import { cashAppLink, venmoLink, venmoRequestLink } from '../lib/payments'
import { Avatar, Dock, Sheet } from '../components/UI'
import { Recap } from './Recap'
import { ShareTable } from './ShareTable'

export function Settle({ onFinished }) {
  const { state, dispatch, player } = useStore()
  const game = state.game
  const ranked = nets(game).sort((a, b) => b.net - a.net)
  const allPaid = game.payments.length > 0 && game.payments.every((p) => p.paid)
  const [handleFor, setHandleFor] = useState(null)
  const [recap, setRecap] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [pickingMe, setPickingMe] = useState(false)
  const me = state.meId

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

            {/* Asked once, and only here, because this is the only screen whose
                behaviour depends on the answer. */}
            {(me == null || pickingMe) && (
              <div className="mepick">
                <div className="nm sm">Which one is you?</div>
                <div className="meta">
                  Venmo opens as whoever taps it, so the buttons only appear on your
                  own two rows.
                </div>
                <div className="list" style={{ marginTop: 10 }}>
                  {ranked.map((n) => {
                    const p = player(n.playerId)
                    return (
                      <button
                        key={n.playerId}
                        className="pick"
                        data-on={me === n.playerId}
                        onClick={() => {
                          dispatch({ type: 'SET_ME', id: n.playerId })
                          setPickingMe(false)
                        }}
                      >
                        <Avatar player={p} size={30} />
                        <div className="who"><div className="nm sm">{p.name}</div></div>
                        <span className="tick" aria-hidden="true" />
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {me != null && !pickingMe && (
              <div className="meta" style={{ margin: '0 2px 12px' }}>
                Paying as <b>{player(me).name}</b>{' '}
                <button className="lnk" onClick={() => setPickingMe(true)}>Not you?</button>
              </div>
            )}
            {game.payments.map((p) => {
              const from = player(p.from)
              const to = player(p.to)
              // A deep link acts as whoever taps it, so the only safe rows to
              // offer one on are the two this phone's owner is part of. On
              // everyone else's row the buttons used to be live and pointed
              // the wrong way: tapping Venmo on "Sam pays Jo" opened YOUR
              // Venmo paying Jo, settling Sam's debt out of your pocket.
              const iPay = me != null && p.from === me
              const iCollect = me != null && p.to === me
              const venmo = iPay ? venmoLink(to.venmo, p.amount, 'Poker night') : null
              const cash = iPay ? cashAppLink(to.cashapp, p.amount) : null
              const request = iCollect
                ? venmoRequestLink(from.venmo, p.amount, 'Poker night')
                : null
              const counterpart = iPay ? to : from
              const needsHandle = (iPay || iCollect) && !venmo && !cash && !request
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
                      <a className="act" href={venmo} target="_blank" rel="noreferrer">
                        Pay {to.name}
                      </a>
                    )}
                    {cash && (
                      <a className="act" href={cash} target="_blank" rel="noreferrer">Cash App</a>
                    )}
                    {request && (
                      <a className="act" href={request} target="_blank" rel="noreferrer">
                        Request from {from.name}
                      </a>
                    )}
                    <button
                      className="act mark"
                      onClick={() => dispatch({ type: 'TOGGLE_PAID', id: p.id })}
                    >
                      {p.paid ? 'Paid' : 'Mark paid'}
                    </button>
                    {/* The gap becomes a prompt, not dead space. */}
                    {needsHandle && (
                      <button
                        className="act"
                        style={{ flex: '0 0 auto', color: 'var(--smoke)' }}
                        onClick={() => setHandleFor(counterpart.id)}
                      >
                        Add a handle for {counterpart.name}
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
          {/* The snapshot encoder has always carried the settlement, but nothing
              could reach it: the only way to generate a link lived on the Game
              screen, which stops rendering once the night ends. */}
          <button className="lnk" onClick={() => setSharing(true)}>Send the result</button>
          <button className="lnk" onClick={() => dispatch({ type: 'SET_PHASE', phase: 'cashout' })}>
            Back to stacks
          </button>
        </div>
      </div>

      <Dock>
        <button
          className="btn"
          onClick={() => {
            dispatch({ type: 'FINISH_GAME', label: { text: 'Night saved' } })
            onFinished?.()
          }}
        >
          {allPaid || game.payments.length === 0 ? 'Save and finish' : 'Save to history'}
        </button>
      </Dock>

      {handleFor && <HandleSheet id={handleFor} onClose={() => setHandleFor(null)} />}
      {recap && <Recap game={game} onClose={() => setRecap(false)} />}
      {sharing && <ShareTable game={game} onClose={() => setSharing(false)} />}
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
