import { useStore } from '../store'
import { fmt, fmtSigned } from '../lib/money'
import { nets, potTotal } from '../lib/settle'
import { Avatar, Empty } from '../components/UI'

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

export function Ledger() {
  const { state, player } = useStore()

  if (state.history.length === 0) {
    return (
      <div className="screen">
        <Empty title="No games yet.">Finish a night and it lands here.</Empty>
      </div>
    )
  }

  // Lifetime standing across every saved night.
  const totals = {}
  for (const game of state.history) {
    for (const n of nets(game)) {
      const t = (totals[n.playerId] ??= { net: 0, nights: 0, up: 0 })
      t.net += n.net
      t.nights += 1
      if (n.net > 0) t.up += 1
    }
  }
  const standings = Object.entries(totals).sort((a, b) => b[1].net - a[1].net)

  return (
    <div className="screen">
      <div className="section-label">
        <span>All time</span>
        <span className="count num">{plural(state.history.length, 'night')}</span>
      </div>
      <div className="card">
        {standings.map(([id, t], i) => (
          <div key={id} className="net-row">
            <span className="rank num" data-top={i === 0}>
              {i + 1}
            </span>
            <Avatar player={player(id)} size={30} />
            <div className="info">
              <div className="name">{player(id).name}</div>
              <div className="meta num">
                {plural(t.nights, 'night')} · {t.up} up
              </div>
            </div>
            <div className={`val num ${t.net > 0 ? 'up' : t.net < 0 ? 'down' : 'flat'}`}>
              {fmtSigned(t.net)}
            </div>
          </div>
        ))}
      </div>

      <div className="section-label">Past games</div>
      {state.history.map((game) => {
        const winner = nets(game).sort((a, b) => b.net - a.net)[0]
        const outstanding = game.payments.filter((p) => !p.paid).length
        return (
          <div key={game.id} className="game-row">
            <div className="info">
              <div className="name">
                {new Date(game.endedAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </div>
              <div className="meta num">
                {plural(game.seats.length, 'player')} · {fmt(potTotal(game))} pot
                {outstanding > 0 && ` · ${outstanding} unpaid`}
              </div>
            </div>
            {winner && winner.net > 0 && (
              <>
                <Avatar player={player(winner.playerId)} size={26} />
                <span className="val num up">{fmtSigned(winner.net)}</span>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
