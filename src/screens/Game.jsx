import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store'
import { fmt, toCents } from '../lib/money'
import { potTotal } from '../lib/settle'
import { uid } from '../lib/id'
import { Avatar, Dock, Sheet } from '../components/UI'

function buzz(ms = 8) {
  if (navigator.vibrate) navigator.vibrate(ms)
}

function elapsed(since) {
  const mins = Math.max(0, Math.floor((Date.now() - since) / 60000))
  if (mins < 60) return `${mins} min`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

// The clock in the footer hint would otherwise freeze until the next rebuy.
function useMinuteTick() {
  const [, force] = useState(0)
  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 30000)
    return () => clearInterval(t)
  }, [])
}

// The most-tapped element in the app. Tap adds the default buy-in with no
// confirmation; a 450ms hold opens the custom sheet instead and suppresses the
// tap that would otherwise follow it.
function BuyButton({ label, onTap, onHold }) {
  const timer = useRef(null)
  const held = useRef(false)
  const [pressing, setPressing] = useState(false)

  const start = () => {
    held.current = false
    setPressing(true)
    timer.current = setTimeout(() => {
      held.current = true
      setPressing(false)
      buzz(14)
      onHold()
    }, 450)
  }
  const stop = () => {
    clearTimeout(timer.current)
    setPressing(false)
  }

  useEffect(() => () => clearTimeout(timer.current), [])

  return (
    <button
      className={`buy-btn num${pressing ? ' pressing' : ''}`}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onContextMenu={(e) => e.preventDefault()}
      onClick={() => {
        if (held.current) {
          held.current = false
          return
        }
        onTap()
      }}
    >
      {label}
    </button>
  )
}

export function Game() {
  const { state, dispatch, player } = useStore()
  const game = state.game
  const [sheet, setSheet] = useState(null) // 'add' | 'menu' | { custom: playerId }
  const [customAmount, setCustomAmount] = useState('')
  const [newName, setNewName] = useState('')
  useMinuteTick()

  const seated = new Set(game.seats.map((s) => s.playerId))
  const bench = state.players.filter((p) => !seated.has(p.id))
  const pot = potTotal(game)

  const buyIn = (playerId, amount) => {
    dispatch({
      type: 'BUY_IN',
      playerId,
      amount,
      label: `${player(playerId).name} +${fmt(amount)}`,
    })
    buzz()
  }

  // Someone who showed up unannounced, two hours in: roster + seat in one go.
  const addNewPlayer = (e) => {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    const id = uid()
    dispatch({ type: 'ADD_PLAYER', id, name })
    dispatch({ type: 'ADD_SEAT', playerId: id })
    setNewName('')
    setSheet(null)
  }

  const customFor = sheet && sheet.custom

  return (
    <>
      <div className="screen">
        {game.seats.map((seat) => {
          const p = player(seat.playerId)
          const total = seat.buyIns.reduce((s, b) => s + b.amount, 0)
          // Rebuys of an odd size make "3 × $20" a lie, so only claim it when
          // every buy-in really was the default.
          const uniform = seat.buyIns.every((b) => b.amount === game.defaultBuyIn)
          return (
            <div key={seat.playerId} className="seat">
              <Avatar player={p} />
              <div className="info">
                <div className="name">{p.name}</div>
                <div className="meta">
                  {seat.buyIns.length === 0
                    ? 'No buy-in yet'
                    : uniform
                      ? `${seat.buyIns.length} × ${fmt(game.defaultBuyIn)}`
                      : `${seat.buyIns.length} buy-ins`}
                </div>
              </div>
              <div className="in num" data-zero={total === 0}>
                {fmt(total)}
              </div>
              <BuyButton
                label={`+${fmt(game.defaultBuyIn)}`}
                onTap={() => buyIn(seat.playerId, game.defaultBuyIn)}
                onHold={() => {
                  setCustomAmount('')
                  setSheet({ custom: seat.playerId })
                }}
              />
              <span className="sr">
                {p.name} is in for {fmt(total)}
              </span>
            </div>
          )
        })}

        <div className="row" style={{ gap: 8, marginTop: 14 }}>
          <button className="btn btn-sm" style={{ flex: 1 }} onClick={() => setSheet('add')}>
            Add player
          </button>
          <button className="btn btn-sm" style={{ flex: 1 }} onClick={() => setSheet('menu')}>
            Game options
          </button>
        </div>

        <p className="hint" style={{ textAlign: 'center' }}>
          Running {elapsed(game.startedAt)} · hold + for a custom amount
        </p>
      </div>

      <Dock>
        <div className="footer">
          <button
            className="btn btn-primary btn-block"
            disabled={pot === 0}
            onClick={() => dispatch({ type: 'SET_PHASE', phase: 'cashout' })}
          >
            Cash out
          </button>
        </div>
      </Dock>

      {sheet === 'add' && (
        <Sheet title="Add a player" onClose={() => setSheet(null)}>
          {bench.map((p) => (
            <button
              key={p.id}
              className="seat flat"
              onClick={() => {
                dispatch({ type: 'ADD_SEAT', playerId: p.id })
                setSheet(null)
              }}
            >
              <Avatar player={p} size={30} />
              <div className="info">
                <div className="name">{p.name}</div>
              </div>
            </button>
          ))}
          <form onSubmit={addNewPlayer} className="row" style={{ marginTop: 10 }}>
            <input
              className="chip"
              style={{ flex: 1 }}
              placeholder="Someone new"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <button className="btn btn-sm" type="submit" disabled={!newName.trim()}>
              Add
            </button>
          </form>
        </Sheet>
      )}

      {customFor && (
        <Sheet title={`Buy-in for ${player(customFor).name}`} onClose={() => setSheet(null)}>
          <label className="field">
            <span>Amount</span>
            <input
              autoFocus
              inputMode="decimal"
              placeholder="0"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
            />
          </label>
          <button
            className="btn btn-primary btn-block"
            disabled={toCents(customAmount) <= 0}
            onClick={() => {
              buyIn(customFor, toCents(customAmount))
              setSheet(null)
            }}
          >
            {toCents(customAmount) > 0 ? `Add ${fmt(toCents(customAmount))}` : 'Add'}
          </button>
          <button
            className="btn btn-block btn-danger"
            style={{ marginTop: 8 }}
            disabled={game.seats.find((s) => s.playerId === customFor).buyIns.length === 0}
            onClick={() => {
              dispatch({
                type: 'REMOVE_LAST_BUY_IN',
                playerId: customFor,
                label: `${player(customFor).name} · buy-in removed`,
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
          <div className="section-label" style={{ marginTop: 0 }}>
            Remove from the table
          </div>
          <div className="card">
            {game.seats.map((seat) => {
              const p = player(seat.playerId)
              const total = seat.buyIns.reduce((s, b) => s + b.amount, 0)
              return (
                <div key={seat.playerId} className="net-row">
                  <Avatar player={p} size={30} />
                  <div className="info">
                    <div className="name">{p.name}</div>
                    <div className="meta">in {fmt(total)}</div>
                  </div>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() =>
                      dispatch({
                        type: 'REMOVE_SEAT',
                        playerId: seat.playerId,
                        label: `${p.name} left · ${fmt(total)} off the table`,
                      })
                    }
                  >
                    Remove
                  </button>
                </div>
              )
            })}
          </div>
          <p className="hint">
            Removing a player takes their buy-ins off the table too. Undo is on the toast.
          </p>
          <button
            className="btn btn-block btn-danger"
            style={{ marginTop: 14 }}
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
