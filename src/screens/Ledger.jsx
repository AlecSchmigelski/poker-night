import { useStore } from '../store'
import { fmt, fmtSigned } from '../lib/money'
import { nets, potTotal } from '../lib/settle'
import { Avatar, Empty } from '../components/UI'

export function Ledger() {
  const { state, player } = useStore()

  // Lifetime standing across every saved game.
  const totals = {}
  for (const game of state.history) {
    for (const n of nets(game)) {
      const t = (totals[n.playerId] ??= { net: 0, sessions: 0, wins: 0 })
      t.net += n.net
      t.sessions += 1
      if (n.net > 0) t.wins += 1
    }
  }
  const standings = Object.entries(totals).sort((a, b) => b[1].net - a[1].net)

  if (state.history.length === 0) {
    return (
      <div className="screen">
        <Empty>
          No games yet.
          <br />
          Finish a night and it lands here.
        </Empty>
      </div>
    )
  }

  return (
    <div className="screen">
      <div className="section-label">All time</div>
      <div className="card">
        {standings.map(([id, t]) => (
          <div key={id} className="net-row">
            <Avatar player={player(id)} size={30} />
            <div className="info">
              <div className="name">{player(id).name}</div>
              <div className="meta">
                {t.sessions} night{t.sessions === 1 ? '' : 's'} · {t.wins} up
              </div>
            </div>
            <div className={`val num ${t.net > 0 ? 'up' : t.net < 0 ? 'down' : ''}`}>
              {fmtSigned(t.net)}
            </div>
          </div>
        ))}
      </div>

      <div className="section-label">Past games</div>
      {state.history.map((game) => {
        const ranked = nets(game).sort((a, b) => b.net - a.net)
        const winner = ranked[0]
        return (
          <div key={game.id} className="card" style={{ marginBottom: 8 }}>
            <div className="row">
              <div className="info">
                <div className="name">
                  {new Date(game.endedAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>
                <div className="meta">
                  {game.seats.length} players · {fmt(potTotal(game))} pot
                </div>
              </div>
              {winner && (
                <div className="row" style={{ gap: 8 }}>
                  <Avatar player={player(winner.playerId)} size={26} />
                  <span className="val num up">{fmtSigned(winner.net)}</span>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
