import { useStore } from '../store'
import { fmt, fmtSigned } from '../lib/money'
import { nets } from '../lib/settle'
import { Avatar } from '../components/UI'

// The right panel on a landscape tablet: what the rest of the table wants to
// look at, while the left stays the surface the host operates.
//
// It deliberately does not show tonight's win/loss during play. There isn't
// one — the pot is communal and nobody's net exists until they count down.
export function TableSide() {
  const { state, player } = useStore()
  const game = state.game
  if (!game) return null

  if (game.phase === 'settle') return <Settling game={game} player={player} />
  if (game.phase === 'cashout') return <Counting game={game} player={player} />
  return <AllTime game={game} history={state.history} player={player} />
}

// While playing: lifetime standings for whoever is at the table tonight. Known,
// real, and the thing worth arguing about between hands.
function AllTime({ game, history, player }) {
  const totals = {}
  for (const past of history) {
    for (const n of nets(past)) {
      const t = (totals[n.playerId] ??= { net: 0, nights: 0 })
      t.net += n.net
      t.nights += 1
    }
  }

  const rows = game.seats
    .map((seat) => ({
      id: seat.playerId,
      ...(totals[seat.playerId] ?? { net: 0, nights: 0 }),
    }))
    .sort((a, b) => b.net - a.net || b.nights - a.nights)

  return (
    <Panel title="All time" hint={`${history.length} night${history.length === 1 ? '' : 's'} on the books`}>
      {rows.map((r) => (
        <div className="siderow" key={r.id}>
          <Avatar player={player(r.id)} size={26} />
          <div className="who">
            <div className="nm sm">{player(r.id).name}</div>
            <div className="meta">
              {r.nights === 0 ? 'First night' : `${r.nights} night${r.nights === 1 ? '' : 's'}`}
            </div>
          </div>
          <div className={`amt sm num ${r.nights === 0 ? 'flat' : r.net > 0 ? 'up' : r.net < 0 ? 'down' : 'flat'}`}>
            {r.nights === 0 ? '—' : fmtSigned(r.net)}
          </div>
        </div>
      ))}
    </Panel>
  )
}

// Counting down: tonight's net appears as each stack is entered, and not before.
function Counting({ game, player }) {
  const rows = game.seats.map((seat) => {
    const inTotal = seat.buyIns.reduce((s, b) => s + b.amount, 0)
    return {
      id: seat.playerId,
      counted: seat.cashOut != null,
      net: seat.cashOut == null ? null : seat.cashOut - inTotal,
      inTotal,
    }
  })
  const done = rows.filter((r) => r.counted).length

  return (
    <Panel title="Tonight" hint={`${done} of ${rows.length} counted`}>
      {rows.map((r) => (
        <div className="siderow" key={r.id}>
          <Avatar player={player(r.id)} size={26} />
          <div className="who">
            <div className="nm sm">{player(r.id).name}</div>
            <div className="meta num">in {fmt(r.inTotal)}</div>
          </div>
          <div className={`amt sm num ${!r.counted ? 'flat' : r.net > 0 ? 'up' : r.net < 0 ? 'down' : 'flat'}`}>
            {r.counted ? fmtSigned(r.net) : '—'}
          </div>
        </div>
      ))}
    </Panel>
  )
}

function Settling({ game, player }) {
  const ranked = nets(game).sort((a, b) => b.net - a.net)
  return (
    <Panel title="Tonight" hint={`${game.payments.length} payment${game.payments.length === 1 ? '' : 's'}`}>
      {ranked.map((n) => (
        <div className="siderow" key={n.playerId}>
          <Avatar player={player(n.playerId)} size={26} />
          <div className="who">
            <div className="nm sm">{player(n.playerId).name}</div>
            <div className="meta num">in {fmt(n.buyIn)} · out {fmt(n.cashOut)}</div>
          </div>
          <div className={`amt sm num ${n.net > 0 ? 'up' : n.net < 0 ? 'down' : 'flat'}`}>
            {fmtSigned(n.net)}
          </div>
        </div>
      ))}
    </Panel>
  )
}

function Panel({ title, hint, children }) {
  return (
    <aside className="side" aria-label={title}>
      <div className="side-head">
        <div className="side-title">{title}</div>
        <div className="side-hint">{hint}</div>
      </div>
      <div className="side-list">{children}</div>
    </aside>
  )
}
