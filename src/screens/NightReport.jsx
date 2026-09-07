import { useState } from 'react'
import { useStore } from '../store'
import { fmt, fmtSigned } from '../lib/money'
import { barWidth, length, nightReport } from '../lib/report'
import { Avatar, Dock } from '../components/UI'
import { Recap } from './Recap'

// The record of one finished night. Not the settle screen: it never says who
// pays whom, and nothing here is tappable except the dock button.
export function NightReport({ game }) {
  const { player } = useStore()
  const [share, setShare] = useState(false)
  const r = nightReport(game, player)

  return (
    <>
      <div className="scroll">
        <div className="strip">
          <div className="card">
            <div className="v num">{r.players}</div>
            <div className="k">Players</div>
          </div>
          <div className="card">
            <div className="v num">{r.buyInCount}</div>
            <div className="k">Buy-ins</div>
          </div>
          <div className="card">
            <div className="v num">{length(r.minutes)}</div>
            <div className="k">Length</div>
          </div>
        </div>

        <div className="report-label">Net for the night</div>

        {r.maxAbsNet === 0 ? (
          <div className="broke-even">
            <div className="t">Everyone broke even.</div>
            <div className="s">Rare and beautiful.</div>
          </div>
        ) : (
          r.rows.map((row) => {
            const tone = row.net > 0 ? 'pos' : row.net < 0 ? 'neg' : 'flat'
            const width = barWidth(row.net, r.maxAbsNet)
            return (
              <div
                className="nrow"
                key={row.playerId}
                aria-label={`${row.name}, ${fmt(row.buyIn)} in, ${
                  row.net > 0 ? 'up' : row.net < 0 ? 'down' : 'even at'
                } ${fmt(Math.abs(row.net))}`}
              >
                <Avatar player={{ name: row.name, color: row.color }} size={26} />
                <div className="who">
                  <div className="name">{row.name}</div>
                  <div className="sub num">{fmt(row.buyIn)} in</div>
                </div>
                <div className="track">
                  <div className="zero" />
                  {width && <div className={`bar ${tone}`} style={{ width }} />}
                </div>
                <div className={`figure num ${tone}`}>{fmtSigned(row.net)}</div>
              </div>
            )
          })
        )}

        {r.off !== 0 && (
          <div className="report-note">Off by {fmt(Math.abs(r.off))}</div>
        )}
      </div>

      <Dock>
        <button className="btn" onClick={() => setShare(true)}>
          Share this night
        </button>
      </Dock>

      {share && <Recap game={game} onClose={() => setShare(false)} />}
    </>
  )
}
