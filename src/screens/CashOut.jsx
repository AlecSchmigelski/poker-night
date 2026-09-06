import { useStore } from '../store'
import { fmt } from '../lib/money'
import { countedTotal, potTotal } from '../lib/settle'
import { Avatar, Dock, MoneyInput } from '../components/UI'

export function CashOut() {
  const { state, dispatch, player } = useStore()
  const game = state.game
  const pot = potTotal(game)
  const counted = countedTotal(game)
  const diff = counted - pot
  const entered = game.seats.filter((s) => s.cashOut != null).length
  const allEntered = entered === game.seats.length
  const remaining = game.seats.length - entered

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
              ? `${entered} of ${game.seats.length}`
              : diff === 0
                ? 'balanced'
                : `${diff > 0 ? 'over' : 'short'} ${fmt(Math.abs(diff))}`}
          </div>
        </div>

        <div className="list">
          {game.seats.map((seat) => {
            const p = player(seat.playerId)
            const total = seat.buyIns.reduce((s, b) => s + b.amount, 0)
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
