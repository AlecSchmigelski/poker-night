import { useStore } from '../store'
import { fmt, fmtSigned } from '../lib/money'
import { nets, potTotal } from '../lib/settle'
import { useState } from 'react'
import { Avatar, Dock, Empty } from '../components/UI'
import { Backup } from './Backup'

export function Ledger({ onOpen }) {
  const { state, player } = useStore()
  const [backup, setBackup] = useState(false)

  if (state.history.length === 0) {
    return (
      <>
        <div className="scroll">
          <Empty ring title="No games yet." >
            Finish a night and it lands here, with everyone's running total.
          </Empty>
        </div>
        <Dock>
          <div className="btn ghost" style={{ opacity: 0.6 }}>Start a game from the Game tab</div>
        </Dock>
      </>
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
    <>
      <div className="scroll">
        <div className="sec"><span>All time</span></div>
        {/* Rank numbers earn their place here because this content genuinely
            is an ordering. */}
        {standings.map(([id, t], i) => (
          <div key={id} className="net">
            <span className="rank num">{i + 1}</span>
            <Avatar player={player(id)} size={26} />
            <div className="who">
              <div className="nm sm">{player(id).name}</div>
              <div className="meta">{t.nights} night{t.nights === 1 ? '' : 's'} · up {t.up}</div>
            </div>
            <div className={`amt sm num ${t.net > 0 ? 'up' : t.net < 0 ? 'down' : 'flat'}`}>
              {fmtSigned(t.net)}
            </div>
          </div>
        ))}

        <div className="sec"><span>Past games</span></div>
        <div className="list">
          {state.history.map((game) => {
            const ranked = nets(game).sort((a, b) => b.net - a.net)
            const winner = ranked[0]
            return (
              <button key={game.id} className="row compact" onClick={() => onOpen(game)}>
                <div className="who">
                  <div className="nm sm">
                    {new Date(game.endedAt).toLocaleDateString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                  <div className="meta num">
                    {game.seats.length} players · {fmt(potTotal(game))} pot
                  </div>
                </div>
                {winner && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 14, fontWeight: 580 }}>{player(winner.playerId).name}</div>
                    <div className={`amt num ${winner.net > 0 ? 'up' : 'flat'}`}
                      style={{ fontSize: 13.5, marginTop: 2 }}>
                      {fmtSigned(winner.net)}
                    </div>
                  </div>
                )}
              </button>
            )
          })}
        </div>

        <div className="subrow">
          <button className="lnk" onClick={() => setBackup(true)}>Back up or restore</button>
        </div>
      </div>

      {backup && <Backup onClose={() => setBackup(false)} />}

    </>
  )
}
