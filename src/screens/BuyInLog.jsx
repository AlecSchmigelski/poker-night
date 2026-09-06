import { useStore } from '../store'
import { fmt } from '../lib/money'
import { potTotal } from '../lib/settle'
import { Avatar, Empty, Sheet } from '../components/UI'
import { SignatureMark } from '../components/Signature'

const time = (at) =>
  new Date(at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })

// Every buy-in of the night in the order it happened, so a disputed total can
// be walked back entry by entry.
export function BuyInLog({ game, onClose }) {
  const { player } = useStore()

  const entries = game.seats
    .flatMap((seat) => seat.buyIns.map((b) => ({ ...b, playerId: seat.playerId })))
    .sort((a, b) => a.at - b.at)

  const unsigned = entries.filter((e) => !e.signature).length

  return (
    <Sheet
      title="Buy-in log"
      hint={
        entries.length === 0
          ? undefined
          : `${entries.length} buy-in${entries.length === 1 ? '' : 's'}${
              unsigned ? ` · ${unsigned} unsigned` : ' · all signed'
            }`
      }
      onClose={onClose}
    >
      {entries.length === 0 ? (
        <Empty boxed title="Nothing yet.">The first buy-in of the night lands here.</Empty>
      ) : (
        <>
          {entries.map((e) => {
            const p = player(e.playerId)
            return (
              <div className="log-row" key={e.id}>
                <span className="when">{time(e.at)}</span>
                <Avatar player={p} size={26} />
                <div className="who">
                  <div className="nm sm">{p.name}</div>
                </div>
                {e.signature ? (
                  <SignatureMark strokes={e.signature} />
                ) : (
                  <span className="unsigned">unsigned</span>
                )}
                <div className="amt sm num">{fmt(e.amount)}</div>
              </div>
            )
          })}
          <div className="log-total">
            <span>On the table</span>
            <span className="num">{fmt(potTotal(game))}</span>
          </div>
        </>
      )}
    </Sheet>
  )
}
