import { useState } from 'react'
import { useStore } from '../store'
import { fmt } from '../lib/money'
import { potTotal } from '../lib/settle'
import { Avatar, Dock, MoneyInput, Sheet } from '../components/UI'
import { ChipSheet } from '../components/ChipSheet'

export function Game() {
  const { state, dispatch, player } = useStore()
  const game = state.game
  const [sheet, setSheet] = useState(null)
  const [custom, setCustom] = useState(null)

  const seated = new Set(game.seats.map((s) => s.playerId))
  const bench = state.players.filter((p) => !seated.has(p.id))

  const buyIn = (playerId, amount) => {
    dispatch({
      type: 'BUY_IN',
      playerId,
      amount,
      label: { text: player(playerId).name, amount: `+${fmt(amount)}` },
    })
    if (navigator.vibrate) navigator.vibrate(8)
  }

  // Long-press opens the custom amount sheet without stealing the plain tap.
  const holdProps = (playerId) => {
    let timer
    const start = () => {
      timer = setTimeout(() => {
        setCustom(null)
        setSheet(`custom:${playerId}`)
        timer = null
      }, 500)
    }
    const cancel = () => timer && clearTimeout(timer)
    return {
      onPointerDown: start,
      onPointerUp: cancel,
      onPointerLeave: cancel,
      onContextMenu: (e) => e.preventDefault(),
    }
  }

  return (
    <>
      <div className="scroll">
        <div className="list">
          {game.seats.map((seat) => {
            const p = player(seat.playerId)
            const total = seat.buyIns.reduce((s, b) => s + b.amount, 0)
            return (
              <div key={seat.playerId} className="row">
                <Avatar player={p} />
                <div className="who">
                  <div className="nm">{p.name}</div>
                  <div className="meta">
                    {seat.buyIns.length === 0
                      ? 'No buy-in yet'
                      : `${seat.buyIns.length} × ${fmt(game.defaultBuyIn)}`}
                  </div>
                </div>
                <div className={`amt num${total === 0 ? ' zero' : ''}`}>{fmt(total)}</div>
                <button
                  className="plus"
                  aria-label={`Add a ${fmt(game.defaultBuyIn)} buy-in for ${p.name}`}
                  onClick={() => buyIn(seat.playerId, game.defaultBuyIn)}
                  {...holdProps(seat.playerId)}
                >
                  +
                </button>
              </div>
            )
          })}
        </div>

        <div className="subrow">
          <button className="lnk" onClick={() => setSheet('add')}>Add player</button>
          <button className="lnk" onClick={() => setSheet('menu')}>Game options</button>
        </div>
      </div>

      <Dock>
        <button
          className={`btn${potTotal(game) === 0 ? ' off' : ''}`}
          disabled={potTotal(game) === 0}
          onClick={() => dispatch({ type: 'SET_PHASE', phase: 'cashout' })}
        >
          {potTotal(game) === 0 ? 'Nobody has bought in' : 'Cash out'}
        </button>
      </Dock>

      {sheet === 'add' && (
        <Sheet title="Add a player" hint="They join with no buy-in yet." onClose={() => setSheet(null)}>
          {bench.length === 0 ? (
            <div className="meta">Everyone in your roster is already at the table.</div>
          ) : (
            <div className="list">
              {bench.map((p) => (
                <button
                  key={p.id}
                  className="pick"
                  onClick={() => {
                    dispatch({ type: 'ADD_SEAT', playerId: p.id })
                    setSheet(null)
                  }}
                >
                  <Avatar player={p} size={30} />
                  <div className="who"><div className="nm sm">{p.name}</div></div>
                </button>
              ))}
            </div>
          )}
        </Sheet>
      )}

      {sheet?.startsWith('custom:') && (
        <CustomBuyIn
          playerId={sheet.slice(7)}
          cents={custom}
          onCents={setCustom}
          onClose={() => setSheet(null)}
          onAdd={(amount) => {
            buyIn(sheet.slice(7), amount)
            setSheet(null)
          }}
        />
      )}

      {sheet === 'menu' && (
        <Sheet title="Game options" onClose={() => setSheet(null)}>
          <div className="list">
            {game.seats.map((seat) => (
              <div key={seat.playerId} className="row compact">
                <Avatar player={player(seat.playerId)} size={30} />
                <div className="who"><div className="nm sm">{player(seat.playerId).name}</div></div>
                <button
                  className="chip sm"
                  onClick={() =>
                    dispatch({
                      type: 'REMOVE_SEAT',
                      playerId: seat.playerId,
                      label: { text: `Removed ${player(seat.playerId).name}` },
                    })
                  }
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <button className="btn ghost" style={{ marginTop: 16 }} onClick={() => setSheet('chips')}>
            Chip breakdown
          </button>
          <button
            className="btn ghost danger"
            onClick={() => {
              dispatch({ type: 'CANCEL_GAME', label: { text: 'Game discarded' } })
              setSheet(null)
            }}
          >
            Discard this game
          </button>
        </Sheet>
      )}

      {sheet === 'chips' && (
        <ChipSheet amount={game.defaultBuyIn} onClose={() => setSheet('menu')} />
      )}
    </>
  )
}

function CustomBuyIn({ playerId, cents, onCents, onClose, onAdd }) {
  const { dispatch, player } = useStore()
  const amount = cents ?? 0
  return (
    <Sheet
      title={`Custom amount for ${player(playerId).name}`}
      hint="For the short buy-in, the odd top-up, or fixing a mis-tap."
      onClose={onClose}
    >
      <div className="denom" style={{ justifyContent: 'space-between' }}>
        <div className="who"><div className="nm sm">Buy-in</div></div>
        <MoneyInput autoFocus cents={cents} onCents={onCents} />
      </div>
      <button className="btn" style={{ marginTop: 8 }} disabled={amount <= 0} onClick={() => onAdd(amount)}>
        {amount > 0 ? `Add ${fmt(amount)}` : 'Enter an amount'}
      </button>
      <button
        className="btn ghost danger"
        onClick={() => {
          dispatch({
            type: 'REMOVE_LAST_BUY_IN',
            playerId,
            label: { text: `Removed a buy-in for ${player(playerId).name}` },
          })
          onClose()
        }}
      >
        Remove last buy-in
      </button>
    </Sheet>
  )
}
