import { useState } from 'react'
import { useStore } from '../store'
import { fmt, fmtSigned } from '../lib/money'
import { potTotal } from '../lib/settle'
import { Avatar, MoneyInput, Sheet } from '../components/UI'

// Correcting a night after the fact. Only cash-outs are editable: buy-ins
// carry signatures, and changing the amount behind one would leave a signature
// standing for something that never happened.
export function EditNight({ game, onClose }) {
  const { dispatch, player } = useStore()
  const pot = potTotal(game)

  const [cashOuts, setCashOuts] = useState(() =>
    Object.fromEntries(game.seats.map((s) => [s.playerId, s.cashOut ?? 0])),
  )

  const counted = Object.values(cashOuts).reduce((sum, v) => sum + (v ?? 0), 0)
  const diff = counted - pot
  const blank = Object.values(cashOuts).some((v) => v == null)
  const balanced = !blank && diff === 0
  const changed = game.seats.some((s) => cashOuts[s.playerId] !== s.cashOut)

  return (
    <Sheet
      title="Edit cash-outs"
      hint="Buy-ins can't change — they're signed. The totals still have to match, and the settlement is recalculated from whatever you save."
      onClose={onClose}
    >
      <div className="tally" data-tone={balanced ? 'ok' : 'bad'}>
        <div>
          <div className="t1 num">
            Counted {fmt(counted)} of {fmt(pot)}
          </div>
          <div className="t2">
            {balanced
              ? 'Matches what was bought in'
              : blank
                ? 'Every stack needs a number'
                : 'The night has to balance before it can be saved'}
          </div>
        </div>
        <div className="badge num">
          {balanced ? 'balanced' : blank ? '—' : `${diff > 0 ? 'over' : 'short'} ${fmt(Math.abs(diff))}`}
        </div>
      </div>

      <div className="list">
        {game.seats.map((seat) => {
          const p = player(seat.playerId)
          const inTotal = seat.buyIns.reduce((sum, b) => sum + b.amount, 0)
          const net = (cashOuts[seat.playerId] ?? 0) - inTotal
          return (
            <div key={seat.playerId} className="row compact">
              <Avatar player={p} size={30} />
              <div className="who">
                <div className="nm sm">{p.name}</div>
                <div className="meta num">
                  in {fmt(inTotal)} ·{' '}
                  <span className={net > 0 ? 'up' : net < 0 ? 'down' : ''}>{fmtSigned(net)}</span>
                </div>
              </div>
              <MoneyInput
                cents={cashOuts[seat.playerId]}
                onCents={(v) => setCashOuts((c) => ({ ...c, [seat.playerId]: v }))}
              />
            </div>
          )
        })}
      </div>

      <button
        className={`btn${balanced && changed ? '' : ' off'}`}
        style={{ marginTop: 16 }}
        disabled={!balanced || !changed}
        onClick={() => {
          dispatch({
            type: 'EDIT_NIGHT',
            gameId: game.id,
            cashOuts,
            label: { text: 'Night edited' },
          })
          onClose()
        }}
      >
        {!changed
          ? 'Nothing changed'
          : balanced
            ? 'Save corrections'
            : blank
              ? 'Enter every stack'
              : `Off by ${fmt(Math.abs(diff))}`}
      </button>
    </Sheet>
  )
}

export function DeleteNight({ game, onClose, onDeleted }) {
  const { dispatch } = useStore()
  const when = new Date(game.endedAt ?? game.startedAt).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
  return (
    <Sheet
      title="Delete this night?"
      hint={`${when}. It comes out of everyone's lifetime totals, and any debts still outstanding from it go with it.`}
      onClose={onClose}
    >
      <button
        className="btn ghost danger"
        onClick={() => {
          dispatch({ type: 'DELETE_HISTORY', id: game.id, label: { text: 'Night deleted' } })
          onClose()
          onDeleted()
        }}
      >
        Delete {fmt(potTotal(game))} night
      </button>
      <button className="btn ghost" onClick={onClose}>
        Keep it
      </button>
    </Sheet>
  )
}
