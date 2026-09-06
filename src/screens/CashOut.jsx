import { useStore } from '../store'
import { fmt, fmtSigned } from '../lib/money'
import { countedTotal, potTotal } from '../lib/settle'
import { Avatar, Dock, MoneyInput } from '../components/UI'

export function CashOut() {
  const { state, dispatch, player } = useStore()
  const game = state.game
  const pot = potTotal(game)
  const counted = countedTotal(game)
  const diff = counted - pot
  const toCount = game.seats.filter((s) => !s.leftEarly)
  const entered = toCount.filter((s) => s.cashOut != null).length
  const allEntered = entered === toCount.length
  const remaining = toCount.length - entered

  // Red is reserved for "you say you are done and you are not." While stacks
  // are still outstanding the bar stays quiet.
  const tone = !allEntered ? null : diff === 0 ? 'ok' : 'bad'

  return (
    <>
      <div className="scroll">
        <div className="tally" data-tone={tone || undefined}>
          <div>
            <div className="t1 num">
              Counted {fmt(counted)} of {fmt(pot)}
            </div>
            <div className="t2">
              {!allEntered
                ? `${remaining} stack${remaining === 1 ? '' : 's'} left`
                : diff === 0
                  ? 'The chips match the money'
                  : diff < 0
                    ? 'A stack is under-counted, or a rebuy is missing'
                    : 'A stack is over-counted, or a buy-in was never logged'}
            </div>
          </div>
          <div className="badge num">
            {!allEntered
              ? `${entered} of ${toCount.length}`
              : diff === 0
                ? 'balanced'
                : `${diff > 0 ? 'over' : 'short'} ${fmt(Math.abs(diff))}`}
          </div>
        </div>

        <div className="list">
          {game.seats.map((seat) => {
            const p = player(seat.playerId)
            const total = seat.buyIns.reduce((s, b) => s + b.amount, 0)
            // Someone who left mid-game is already counted; showing an input
            // would invite the host to re-count chips that walked out the door.
            if (seat.leftEarly) {
              const net = seat.cashOut - total
              return (
                <div key={seat.playerId} className="row compact" data-out="true">
                  <Avatar player={p} size={30} />
                  <div className="who">
                    <div className="nm sm">{p.name}</div>
                    <div className="meta num">in {fmt(total)} · out {fmt(seat.cashOut)}</div>
                  </div>
                  <div className={`amt num ${net > 0 ? 'up' : net < 0 ? 'down' : 'flat'}`}>
                    {fmtSigned(net)}
                  </div>
                  <span className="out-tag">Left early</span>
                </div>
              )
            }
            return (
              <div key={seat.playerId} className="row compact">
                <Avatar player={p} size={30} />
                <div className="who">
                  <div className="nm sm">{p.name}</div>
                  <div className="meta num">in {fmt(total)}</div>
                </div>
                <MoneyInput
                  cents={seat.cashOut}
                  onCents={(amount) =>
                    dispatch({ type: 'SET_CASH_OUT', playerId: seat.playerId, amount })
                  }
                />
              </div>
            )
          })}
        </div>

        <div className="subrow">
          <button className="lnk" onClick={() => dispatch({ type: 'SET_PHASE', phase: 'playing' })}>
            Back to the game
          </button>
        </div>
      </div>

      <Dock>
        <button
          className={`btn${!allEntered ? ' off' : diff !== 0 ? ' bad' : ''}`}
          disabled={!allEntered || diff !== 0}
          onClick={() => dispatch({ type: 'SET_PHASE', phase: 'settle' })}
        >
          {!allEntered
            ? 'Enter every stack'
            : diff !== 0
              ? `Off by ${fmt(Math.abs(diff))}`
              : 'Settle up'}
        </button>
      </Dock>
    </>
  )
}
