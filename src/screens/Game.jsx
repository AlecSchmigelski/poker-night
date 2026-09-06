import { useState } from 'react'
import { useStore } from '../store'
import { fmt, toCents } from '../lib/money'
import { potTotal } from '../lib/settle'
import { Avatar, Sheet } from '../components/UI'

function elapsed(since) {
  const mins = Math.floor((Date.now() - since) / 60000)
  if (mins < 60) return `${mins}m`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

export function Game() {
  const { state, dispatch, player } = useStore()
  const game = state.game
  const [sheet, setSheet] = useState(null) // 'add' | 'custom:<playerId>' | 'menu'
  const [customAmount, setCustomAmount] = useState('')

  const seated = new Set(game.seats.map((s) => s.playerId))
  const bench = state.players.filter((p) => !seated.has(p.id))

  const buyIn = (playerId, amount) => {
    dispatch({ type: 'BUY_IN', playerId, amount, label: `${player(playerId).name} +${fmt(amount)}` })
    if (navigator.vibrate) navigator.vibrate(8)
  }

  return (
    <>
      <div className="screen">
        {game.seats.map((seat) => {
          const p = player(seat.playerId)
          const total = seat.buyIns.reduce((s, b) => s + b.amount, 0)
          return (
            <div key={seat.playerId} className="seat">
              <Avatar player={p} />
              <div className="info">
                <div className="name">{p.name}</div>
                <div className="meta">
                  {seat.buyIns.length === 0
                    ? 'No buy-in yet'
                    : `${seat.buyIns.length} × ${fmt(game.defaultBuyIn)}`}
                </div>
              </div>
              <div className="in num">{fmt(total)}</div>
              <button
                className="buy-btn"
                onClick={() => buyIn(seat.playerId, game.defaultBuyIn)}
                onContextMenu={(e) => {
                  e.preventDefault()
                  setCustomAmount('')
                  setSheet(`custom:${seat.playerId}`)
                }}
              >
                +
              </button>
            </div>
          )
        })}

        <div className="row" style={{ gap: 8, marginTop: 16 }}>
          <button className="btn btn-sm" style={{ flex: 1 }} onClick={() => setSheet('add')}>
            + Add player
          </button>
          <button className="btn btn-sm" style={{ flex: 1 }} onClick={() => setSheet('menu')}>
            Game options
          </button>
        </div>

        <button
          className="btn btn-primary btn-block"
          style={{ marginTop: 20 }}
          disabled={potTotal(game) === 0}
          onClick={() => dispatch({ type: 'SET_PHASE', phase: 'cashout' })}
        >
          Cash out
        </button>

        <div className="empty" style={{ paddingBottom: 8 }}>
          Running {elapsed(game.startedAt)} · long-press + for a custom amount
        </div>
      </div>

      {sheet === 'add' && (
        <Sheet title="Add a player" onClose={() => setSheet(null)}>
          {bench.length === 0 && (
            <div className="empty">Everyone in your roster is already seated.</div>
          )}
          {bench.map((p) => (
            <button
              key={p.id}
              className="seat"
              style={{ width: '100%', textAlign: 'left' }}
              onClick={() => {
                dispatch({ type: 'ADD_SEAT', playerId: p.id })
                setSheet(null)
              }}
            >
              <Avatar player={p} />
              <div className="info">
                <div className="name">{p.name}</div>
              </div>
            </button>
          ))}
        </Sheet>
      )}

      {sheet?.startsWith('custom:') && (
        <Sheet title="Custom amount" onClose={() => setSheet(null)}>
          <label className="field">
            <span>Buy-in for {player(sheet.slice(7)).name}</span>
            <input
              autoFocus
              inputMode="decimal"
              placeholder="0.00"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
            />
          </label>
          <button
            className="btn btn-primary btn-block"
            disabled={toCents(customAmount) <= 0}
            onClick={() => {
              buyIn(sheet.slice(7), toCents(customAmount))
              setSheet(null)
            }}
          >
            Add {fmt(toCents(customAmount))}
          </button>
          <button
            className="btn btn-block btn-danger"
            style={{ marginTop: 8 }}
            onClick={() => {
              dispatch({
                type: 'REMOVE_LAST_BUY_IN',
                playerId: sheet.slice(7),
                label: 'Removed last buy-in',
              })
              setSheet(null)
            }}
          >
            Remove last buy-in
          </button>
        </Sheet>
      )}

      {sheet === 'menu' && (
        <Sheet title="Game options" onClose={() => setSheet(null)}>
          {game.seats.map((seat) => (
            <div key={seat.playerId} className="cashout-row">
              <Avatar player={player(seat.playerId)} size={30} />
              <div className="info">
                <div className="name">{player(seat.playerId).name}</div>
              </div>
              <button
                className="btn btn-sm btn-danger"
                onClick={() =>
                  dispatch({
                    type: 'REMOVE_SEAT',
                    playerId: seat.playerId,
                    label: `Removed ${player(seat.playerId).name}`,
                  })
                }
              >
                Remove
              </button>
            </div>
          ))}
          <button
            className="btn btn-block btn-danger"
            style={{ marginTop: 16 }}
            onClick={() => {
              dispatch({ type: 'CANCEL_GAME', label: 'Game discarded' })
              setSheet(null)
            }}
          >
            Discard this game
          </button>
        </Sheet>
      )}
    </>
  )
}
