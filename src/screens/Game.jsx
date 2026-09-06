import { useState } from 'react'
import { useStore } from '../store'
import { fmt } from '../lib/money'
import { potTotal } from '../lib/settle'
import { Avatar, Dock, MoneyInput, Sheet } from '../components/UI'
import { ChipSheet } from '../components/ChipSheet'
import { SignBuyIn } from './SignBuyIn'
import { BuyInLog } from './BuyInLog'
import { ShareTable } from './ShareTable'
import { BombPot } from '../components/BombPot'

export function Game() {
  const { state, dispatch, player } = useStore()
  const game = state.game
  const [sheet, setSheet] = useState(null)
  const [custom, setCustom] = useState(null)
  // The buy-in waiting on a signature.
  const [pending, setPending] = useState(null)

  const seated = new Set(game.seats.map((s) => s.playerId))
  const bench = state.players.filter((p) => !seated.has(p.id))

  const isRebuy = (playerId) =>
    (game.seats.find((s) => s.playerId === playerId)?.buyIns.length ?? 0) > 0

  // The opening buy-in happens with everyone at the table paying up front, so
  // it stays a single tap. A reload is the credit event worth signing for.
  const request = (playerId, amount) => {
    if (isRebuy(playerId)) setPending({ playerId, amount })
    else commit(playerId, amount, null)
  }

  const commit = (playerId, amount, signature) => {
    dispatch({
      type: 'BUY_IN',
      playerId,
      amount,
      signature,
      label: { text: player(playerId).name, amount: `+${fmt(amount)}` },
    })
    if (navigator.vibrate) navigator.vibrate(8)
    setPending(null)
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
        <BombPot
          settingsOpen={sheet === 'bomb'}
          openSettings={() => setSheet('bomb')}
          onCloseSettings={() => setSheet(null)}
        />

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
                  aria-label={`${seat.buyIns.length ? 'Rebuy' : 'Buy in'} ${fmt(game.defaultBuyIn)} for ${p.name}`}
                  onClick={() => request(seat.playerId, game.defaultBuyIn)}
                  {...holdProps(seat.playerId)}
                >
                  +
                </button>
              </div>
            )
          })}
        </div>

        <div className="subrow">
          <button className="lnk" onClick={() => setSheet('share')}>Share the table</button>
          <button className="lnk" onClick={() => setSheet('log')}>Buy-in log</button>
        </div>
        <div className="subrow" style={{ marginTop: 0 }}>
          <button className="lnk" onClick={() => setSheet('add')}>Add player</button>
          <button className="lnk" onClick={() => setSheet('menu')}>Options</button>
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

      {pending && (
        <SignBuyIn
          player={player(pending.playerId)}
          amount={pending.amount}
          onClose={() => setPending(null)}
          onConfirm={(signature) => commit(pending.playerId, pending.amount, signature)}
        />
      )}

      {sheet === 'log' && <BuyInLog game={game} onClose={() => setSheet(null)} />}

      {sheet === 'share' && <ShareTable game={game} onClose={() => setSheet(null)} />}

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
          onNext={(amount) => {
            const playerId = sheet.slice(7)
            setSheet(null)
            request(playerId, amount)
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
          <button className="btn ghost" style={{ marginTop: 16 }} onClick={() => setSheet('bomb')}>
            {game.bombPot?.on ? 'Bomb pot timer' : 'Start a bomb pot timer'}
          </button>
          <button className="btn ghost" onClick={() => setSheet('chips')}>
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

function CustomBuyIn({ playerId, cents, onCents, onClose, onNext }) {
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
      <button
        className={`btn${amount > 0 ? '' : ' off'}`}
        style={{ marginTop: 8 }}
        disabled={amount <= 0}
        onClick={() => onNext(amount)}
      >
        {amount > 0 ? `Continue with ${fmt(amount)}` : 'Enter an amount'}
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
