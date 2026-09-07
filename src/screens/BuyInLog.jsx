import { useStore } from '../store'
import { fmt } from '../lib/money'
import { Avatar, Empty, Sheet } from '../components/UI'
import { SignatureMark } from '../components/Signature'
import { EntryIcon } from '../components/EntryIcon'

// Swap for 'chips' or 'badge' to try the other sets in src/components/EntryIcon.jsx.
const ICON_SET = 'flow'

const LABEL = { buyin: 'buy-in', addon: 'add-on', cashout: 'cash-out' }

const time = (at) =>
  Number.isFinite(at)
    ? new Date(at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    : '—'

// Every money event of the night in the order it happened, so a disputed total
// can be walked back entry by entry.
export function BuyInLog({ game, onClose }) {
  const { player } = useStore()

  // A player's first buy-in is expected to be unsigned — it is taken with
  // everyone at the table. Only add-ons are meant to carry a mark.
  const ins = game.seats.flatMap((seat) =>
    seat.buyIns.map((b, i) => ({
      ...b,
      playerId: seat.playerId,
      kind: i === 0 ? 'buyin' : 'addon',
    })),
  )
  const outs = game.seats
    .filter((seat) => seat.cashOut != null)
    .map((seat) => ({
      id: `out-${seat.playerId}`,
      playerId: seat.playerId,
      kind: 'cashout',
      amount: seat.cashOut,
      // Games recorded before cash-out times were kept sort to the end.
      at: seat.cashedOutAt ?? Number.POSITIVE_INFINITY,
      signature: null,
    }))

  const entries = [...ins, ...outs].sort((a, b) => a.at - b.at)
  const addons = ins.filter((e) => e.kind === 'addon')
  const unsigned = addons.filter((e) => !e.signature).length

  const totalIn = ins.reduce((sum, e) => sum + e.amount, 0)
  const totalOut = outs.reduce((sum, e) => sum + e.amount, 0)

  return (
    <Sheet
      title="Buy-in log"
      hint={
        entries.length === 0
          ? undefined
          : `${entries.length} entr${entries.length === 1 ? 'y' : 'ies'} · ${addons.length} add-on${
              addons.length === 1 ? '' : 's'
            }${addons.length === 0 ? '' : unsigned ? ` · ${unsigned} unsigned` : ' · all signed'}`
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
              <div className="log-row" key={e.id} data-kind={e.kind}>
                <span className="when">{time(e.at)}</span>
                <Avatar player={p} size={26} />
                <div className="who">
                  <div className="nm sm">{p.name}</div>
                  <div className="type">
                    <EntryIcon kind={e.kind} set={ICON_SET} title={LABEL[e.kind]} />
                    {LABEL[e.kind]}
                  </div>
                </div>
                {e.signature ? (
                  <SignatureMark strokes={e.signature} />
                ) : e.kind === 'addon' ? (
                  <span className="unsigned">unsigned</span>
                ) : null}
                <div className="amt sm num">
                  {e.kind === 'cashout' ? `−${fmt(e.amount)}` : fmt(e.amount)}
                </div>
              </div>
            )
          })}

          {totalOut > 0 && (
            <>
              <div className="log-total" style={{ paddingBottom: 0 }}>
                <span style={{ fontWeight: 500, color: 'var(--smoke)' }}>Bought in</span>
                <span className="num" style={{ fontWeight: 500, color: 'var(--smoke)' }}>
                  {fmt(totalIn)}
                </span>
              </div>
              <div className="log-total" style={{ paddingTop: 4, paddingBottom: 0 }}>
                <span style={{ fontWeight: 500, color: 'var(--smoke)' }}>Cashed out</span>
                <span className="num" style={{ fontWeight: 500, color: 'var(--smoke)' }}>
                  −{fmt(totalOut)}
                </span>
              </div>
            </>
          )}
          <div className="log-total">
            <span>On the table</span>
            <span className="num">{fmt(totalIn - totalOut)}</span>
          </div>
        </>
      )}
    </Sheet>
  )
}
