import { useState } from 'react'
import { useStore } from '../store'
import { fmt, toCents, toInput } from '../lib/money'
import { countedTotal, potTotal } from '../lib/settle'
import { Avatar, Dock } from '../components/UI'

export function CashOut() {
  const { state, dispatch, player } = useStore()
  const game = state.game

  // The field holds the raw string while it is being typed. Round-tripping
  // through cents on every keystroke rewrites "20." to "20.00" under the
  // cursor; the draft is dropped on blur so the store stays the source of truth.
  const [draft, setDraft] = useState({})

  const pot = potTotal(game)
  const counted = countedTotal(game)
  const diff = counted - pot
  const allEntered = game.seats.every((s) => s.cashOut != null)
  const remaining = game.seats.filter((s) => s.cashOut == null).length
  const tone = allEntered ? (diff === 0 ? 'balanced' : 'off') : 'neutral'

  // Neutral counts stacks, not dollars: a delta mid-entry always reads as an
  // error the host has not made yet.
  const verdict =
    tone === 'neutral'
      ? `${remaining} left to count`
      : tone === 'balanced'
        ? 'Balanced'
        : `${diff > 0 ? 'over' : 'short'} ${fmt(Math.abs(diff))}`

  const label = !allEntered ? 'Enter every stack' : diff !== 0 ? `Off by ${fmt(Math.abs(diff))}` : 'Settle up'

  return (
    <>
      <div className="screen">
        <div className="tally" data-state={tone} role="status" aria-live="polite">
          <span>
            Counted <span className="counted num">{fmt(counted)}</span> of{' '}
            <span className="counted num">{fmt(pot)}</span>
          </span>
          <span className="verdict num">{verdict}</span>
        </div>

        <div className="card">
          {game.seats.map((seat) => {
            const p = player(seat.playerId)
            const inFor = seat.buyIns.reduce((s, b) => s + b.amount, 0)
            const value = draft[seat.playerId] ?? toInput(seat.cashOut)
            return (
              <div key={seat.playerId} className="stack-row">
                <Avatar player={p} size={32} />
                <div className="info">
                  <div className="name">{p.name}</div>
                  <div className="meta">in {fmt(inFor)}</div>
                </div>
                <div className="money-input">
                  <span aria-hidden="true">$</span>
                  <input
                    className="num"
                    inputMode="decimal"
                    placeholder="0"
                    aria-label={`${p.name} final stack`}
                    value={value}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const raw = e.target.value
                      setDraft((d) => ({ ...d, [seat.playerId]: raw }))
                      dispatch({
                        type: 'SET_CASH_OUT',
                        playerId: seat.playerId,
                        amount: raw.trim() === '' ? null : toCents(raw),
                      })
                    }}
                    onBlur={() =>
                      setDraft((d) => {
                        const { [seat.playerId]: _drop, ...rest } = d
                        return rest
                      })
                    }
                  />
                </div>
              </div>
            )
          })}
        </div>

        <p className="hint">
          What each player is holding when they leave the table. It has to match the pot
          before you can settle — nobody is short a chip, so the difference is always a
          counting mistake.
        </p>
      </div>

      <Dock>
        <div className="footer">
          <button
            className="btn btn-primary btn-block"
            data-tone={allEntered && diff !== 0 ? 'error' : undefined}
            disabled={!allEntered || diff !== 0}
            onClick={() => dispatch({ type: 'SET_PHASE', phase: 'settle' })}
          >
            {label}
          </button>
          <button
            className="btn btn-quiet btn-block"
            onClick={() => dispatch({ type: 'SET_PHASE', phase: 'playing' })}
          >
            Back to the game
          </button>
        </div>
      </Dock>
    </>
  )
}
