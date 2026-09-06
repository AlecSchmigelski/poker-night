import { useState } from 'react'
import { useStore } from '../store'
import { fmt, fmtSigned } from '../lib/money'
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
  // The seat whose amount is being chosen, then the buy-in waiting on a signature.
  const [choosing, setChoosing] = useState(null)
  const [pending, setPending] = useState(null)
  const [acting, setActing] = useState(null)
  const [cashingOut, setCashingOut] = useState(null)

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
            const out = seat.cashOut != null
            return (
              <button
                key={seat.playerId}
                className="row"
                data-out={out}
                onClick={() => setActing(seat.playerId)}
              >
                <Avatar player={p} />
                <div className="who">
                  <div className="nm">{p.name}</div>
                  <div className="meta">
                    {out
                      ? `in ${fmt(total)} · out ${fmt(seat.cashOut)}`
                      : seat.buyIns.length === 0
                        ? 'No buy-in yet'
                        : `${seat.buyIns.length} × ${fmt(game.defaultBuyIn)}`}
                  </div>
                </div>
                {out ? (
                  <>
                    <div
                      className={`amt num ${
                        seat.cashOut - total > 0 ? 'up' : seat.cashOut - total < 0 ? 'down' : 'flat'
                      }`}
                    >
                      {fmtSigned(seat.cashOut - total)}
                    </div>
                    <span className="out-tag">Cashed out</span>
                  </>
                ) : (
                  <>
                    <div className={`amt num${total === 0 ? ' zero' : ''}`}>{fmt(total)}</div>
                    <button
                      className={`rebuy${seat.buyIns.length ? '' : ' first'}`}
                      aria-label={`${seat.buyIns.length ? 'Rebuy' : 'Buy in'} for ${p.name}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        setChoosing(seat.playerId)
                      }}
                    >
                      {seat.buyIns.length ? 'Rebuy' : 'Buy in'}
                    </button>
                  </>
                )}
              </button>
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
          {potTotal(game) === 0 ? 'Nobody has bought in' : 'End the game'}
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

      {acting && (
        <PlayerActions
          playerId={acting}
          onClose={() => setActing(null)}
          onRebuy={() => {
            setChoosing(acting)
            setActing(null)
          }}
          onCashOut={() => {
            setCashingOut(acting)
            setActing(null)
          }}
        />
      )}

      {cashingOut && (
        <CashOutOne playerId={cashingOut} onClose={() => setCashingOut(null)} />
      )}

      {choosing && (
        <ChooseAmount
          playerId={choosing}
          defaultBuyIn={game.defaultBuyIn}
          isRebuy={isRebuy(choosing)}
          onClose={() => setChoosing(null)}
          onPick={(amount) => {
            setChoosing(null)
            request(choosing, amount)
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

// Two taps instead of one, which is the cost of making the amount explicit.
// The default is preselected so the common case stays "Rebuy → Rebuy $20".
function ChooseAmount({ playerId, defaultBuyIn, isRebuy, onClose, onPick }) {
  const { state, dispatch, player } = useStore()
  const [amount, setAmount] = useState(defaultBuyIn)
  const [custom, setCustom] = useState(null)

  const presets = [defaultBuyIn, defaultBuyIn * 2, defaultBuyIn * 3]
  const chosen = custom != null ? custom : amount
  const seat = state.game.seats.find((s) => s.playerId === playerId)
  const spent = seat.buyIns.reduce((sum, b) => sum + b.amount, 0)

  return (
    <Sheet
      title={`${isRebuy ? 'Rebuy' : 'Buy in'} · ${player(playerId).name}`}
      hint={
        isRebuy
          ? `In for ${fmt(spent)} so far. They sign for this on the next screen.`
          : 'First buy-in of the night — no signature needed.'
      }
      onClose={onClose}
    >
      <div className="chips">
        {presets.map((p) => (
          <button
            key={p}
            className="chip num"
            data-on={custom == null && amount === p}
            onClick={() => {
              setAmount(p)
              setCustom(null)
            }}
          >
            {fmt(p)}
          </button>
        ))}
      </div>

      <div className="sec"><span>Or another amount</span></div>
      <div className="denom" style={{ justifyContent: 'space-between' }}>
        <div className="who"><div className="nm sm">Custom</div></div>
        <MoneyInput cents={custom} onCents={setCustom} />
      </div>

      <button
        className={`btn${chosen > 0 ? '' : ' off'}`}
        style={{ marginTop: 14 }}
        disabled={chosen <= 0}
        onClick={() => onPick(chosen)}
      >
        {chosen > 0
          ? `${isRebuy ? 'Rebuy' : 'Buy in'} ${fmt(chosen)}`
          : 'Pick an amount'}
      </button>

      {seat.buyIns.length > 0 && (
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
      )}
    </Sheet>
  )
}

// Per-player actions. The row became tappable when cashing one person out
// arrived: two actions per seat will not fit side by side at 390pt, and burying
// the second one in a gesture is what the Rebuy change just undid.
function PlayerActions({ playerId, onClose, onRebuy, onCashOut }) {
  const { state, dispatch, player } = useStore()
  const seat = state.game.seats.find((s) => s.playerId === playerId)
  const p = player(playerId)
  const total = seat.buyIns.reduce((sum, b) => sum + b.amount, 0)
  const out = seat.cashOut != null
  const net = out ? seat.cashOut - total : 0

  return (
    <Sheet
      title={p.name}
      hint={out ? 'Already cashed out and away from the table.' : `In for ${fmt(total)}.`}
      onClose={onClose}
    >
      {out ? (
        <>
          <div className="result-line">
            <span>in {fmt(total)} · out {fmt(seat.cashOut)}</span>
            <span className={`big num ${net > 0 ? 'up' : net < 0 ? 'down' : 'flat'}`}>
              {fmtSigned(net)}
            </span>
          </div>
          <button
            className="btn ghost"
            onClick={() => {
              // Sitting back down reopens the seat; their stack goes back into
              // the count and they can buy in again.
              dispatch({ type: 'SET_CASH_OUT', playerId, amount: null })
              onClose()
            }}
          >
            Sit back down
          </button>
        </>
      ) : (
        <>
          <button className="btn" onClick={onRebuy}>
            {seat.buyIns.length ? 'Rebuy' : 'Buy in'}
          </button>
          <button className="btn ghost" disabled={total === 0} onClick={onCashOut}>
            Cash out {p.name}
          </button>
          <button
            className="btn ghost danger"
            onClick={() => {
              dispatch({
                type: 'REMOVE_SEAT',
                playerId,
                label: { text: `Removed ${p.name}` },
              })
              onClose()
            }}
          >
            Remove from the table
          </button>
        </>
      )}
    </Sheet>
  )
}

// Cashing one player out mid-game. Their chips leave the table, so the pot the
// host still has to count shrinks — but the settle maths needs no special case,
// because their number is recorded the same way as everyone else's at the end.
function CashOutOne({ playerId, onClose }) {
  const { state, dispatch, player } = useStore()
  const seat = state.game.seats.find((s) => s.playerId === playerId)
  const p = player(playerId)
  const total = seat.buyIns.reduce((sum, b) => sum + b.amount, 0)
  const [stack, setStack] = useState(null)
  const net = (stack ?? 0) - total

  return (
    <Sheet
      title={`Cash out ${p.name}`}
      hint="Count their stack. Everyone else keeps playing."
      onClose={onClose}
    >
      <div className="denom" style={{ justifyContent: 'space-between' }}>
        <div className="who">
          <div className="nm sm">Final stack</div>
          <div className="meta num">in {fmt(total)}</div>
        </div>
        <MoneyInput autoFocus cents={stack} onCents={setStack} />
      </div>

      {stack != null && (
        <div className="result-line" style={{ marginTop: 4 }}>
          <span>Walks away</span>
          <span className={`big num ${net > 0 ? 'up' : net < 0 ? 'down' : 'flat'}`}>
            {fmtSigned(net)}
          </span>
        </div>
      )}

      <button
        className={`btn${stack == null ? ' off' : ''}`}
        disabled={stack == null}
        onClick={() => {
          dispatch({
            type: 'SET_CASH_OUT',
            playerId,
            amount: stack,
            leftEarly: true,
            label: { text: `${p.name} cashed out`, amount: fmtSigned(net) },
          })
          onClose()
        }}
      >
        {stack == null ? 'Enter their stack' : `Cash out ${fmt(stack)}`}
      </button>
    </Sheet>
  )
}
