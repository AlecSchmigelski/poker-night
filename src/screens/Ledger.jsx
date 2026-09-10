import { useState } from 'react'
import { useStore } from '../store'
import { fmt, fmtSigned } from '../lib/money'
import { nets, potTotal } from '../lib/settle'
import { Avatar, Dock, Empty } from '../components/UI'
import { Backup } from './Backup'

export function Ledger({ onOpen, onOpenPlayer }) {
  const { state, player } = useStore()
  const [view, setView] = useState('standings')
  const [backup, setBackup] = useState(false)

  if (state.history.length === 0) {
    return (
      <>
        <div className="scroll">
          <Empty ring title="No games yet.">
            Finish a night and it lands here, with everyone's running total.
          </Empty>

          {/* A roster is worth keeping before the first night is played, which
              is also the case where someone is moving between devices. */}
          {state.players.length > 0 && (
            <div className="subrow">
              <button className="lnk" onClick={() => setBackup(true)}>Back up or restore</button>
            </div>
          )}
        </div>
        <Dock>
          <div className="btn ghost" style={{ opacity: 0.6 }}>Start a game from the Game tab</div>
        </Dock>

        {backup && <Backup onClose={() => setBackup(false)} />}
      </>
    )
  }

  // Lifetime standing across every saved night.
  const totals = {}
  for (const game of state.history) {
    for (const n of nets(game)) {
      const t = (totals[n.playerId] ??= { net: 0, nights: 0, inTotal: 0 })
      t.net += n.net
      t.nights += 1
      t.inTotal += n.buyIn
    }
  }
  const standings = Object.entries(totals).sort((a, b) => b[1].net - a[1].net)

  return (
    <>
      <div className="scroll">
        {/* Rank numerals were what made this a podium. Sorted rows with signed
            money carry the same order without the ceremony. */}
        <div className="segwrap" role="tablist">
          {[['standings', 'Standings'], ['nights', 'Nights']].map(([id, label]) => (
            <button
              key={id}
              className="seg"
              role="tab"
              aria-selected={view === id}
              data-on={view === id}
              onClick={() => setView(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {view === 'standings' ? (
          <div className="list">
            {standings.map(([id, t]) => (
              <button key={id} className="row" onClick={() => onOpenPlayer(id)}>
                <Avatar player={player(id)} size={30} />
                <div className="who">
                  <div className="nm">{player(id).name}</div>
                  <div className="meta num">
                    {t.nights} night{t.nights === 1 ? '' : 's'} · {fmt(t.inTotal)} in
                  </div>
                </div>
                <div className={`amt num ${t.net > 0 ? 'up' : t.net < 0 ? 'down' : 'zero'}`}>
                  {fmtSigned(t.net)}
                </div>
                <span className="chev" aria-hidden="true">›</span>
              </button>
            ))}
          </div>
        ) : (
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
                  <span className="chev" aria-hidden="true">›</span>
                </button>
              )
            })}
          </div>
        )}

        <div className="subrow">
          <button className="lnk" onClick={() => setBackup(true)}>Back up or restore</button>
        </div>
      </div>

      {backup && <Backup onClose={() => setBackup(false)} />}
    </>
  )
}
