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

  // A player's first buy-in is expected to be unsigned — it is taken with
  // everyone at the table. Only reloads are meant to carry a mark, so only a
  // reload without one counts as a gap in the record.
  const entries = game.seats
    .flatMap((seat) =>
      seat.buyIns.map((b, i) => ({ ...b, playerId: seat.playerId, rebuy: i > 0 })),
    )
    .sort((a, b) => a.at - b.at)

  const unsigned = entries.filter((e) => e.rebuy && !e.signature).length
  const rebuys = entries.filter((e) => e.rebuy).length

  return (
    <Sheet
      title="Buy-in log"
      hint={
        entries.length === 0
          ? undefined
          : `${entries.length} entr${entries.length === 1 ? 'y' : 'ies'} · ${rebuys} add-on${
              rebuys === 1 ? '' : 's'
            }${rebuys === 0 ? '' : unsigned ? ` · ${unsigned} unsigned` : ' · all signed'}`
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
                  {/* Every row states what it is. An add-on used to be implied
                      only by the presence of a signature, which left the type
                      unreadable on any row that was never signed. */}
                  <div className="meta">{e.rebuy ? 'add-on' : 'buy-in'}</div>
                </div>
                {e.signature ? (
                  <SignatureMark strokes={e.signature} />
                ) : e.rebuy ? (
                  <span className="unsigned">unsigned</span>
                ) : null}
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
