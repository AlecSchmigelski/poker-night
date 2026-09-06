import { fmt, fmtSigned } from '../lib/money'
import { decodeSnapshot, snapshotTotals } from '../lib/share'
import { Avatar, Empty } from '../components/UI'

const when = (t) =>
  new Date(t).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })

// The read-only view a shared link opens. It renders entirely from the payload
// in the URL — no store, no network, nothing to load.
export function Spectator({ encoded }) {
  const snap = decodeSnapshot(encoded)

  if (!snap) {
    return (
      <div className="app">
        <header className="hdr">
          <div className="lamp" />
          <div className="left">
            <div className="title">Poker Night</div>
            <div className="hint">Shared table</div>
          </div>
        </header>
        <div className="scroll">
          <Empty ring title="This link didn't open.">
            It may have been truncated on the way into the chat. Ask the host to
            send a fresh one.
          </Empty>
        </div>
      </div>
    )
  }

  const { pot, allCounted } = snapshotTotals(snap)
  const settled = snap.ph === 'settle'
  const players = snap.p.map(([name, color, inCents, count, outCents]) => ({
    player: { name, color },
    inCents,
    count,
    outCents,
    net: outCents == null ? null : outCents - inCents,
  }))
  const ranked = settled && allCounted ? [...players].sort((a, b) => b.net - a.net) : players

  return (
    <div className="app">
      <header className="hdr">
        <div className="lamp" />
        <div className="left">
          <div className="title">{settled ? 'The night' : 'Tonight'}</div>
          <div className="hint">{settled ? 'Final numbers' : `${fmt(snap.b)} buy-in`}</div>
        </div>
        <div className="right">
          <div className="potlabel">On the table</div>
          <div className="pot num">{fmt(pot)}</div>
        </div>
      </header>

      <div className="ribbon">
        <span className="dot" aria-hidden="true" />
        Read-only · as of {when(snap.t)}
      </div>

      <div className="scroll">
        {settled && snap.pay?.length > 0 && (
          <>
            <div className="sec"><span>Who pays who</span></div>
            {snap.pay.map(([from, to, amount], i) => (
              <div className="pay" key={i}>
                <div className="line">
                  <Avatar player={players[from].player} size={30} />
                  <div className="names">
                    <b>{players[from].player.name}</b> <em>pays</em>{' '}
                    <b>{players[to].player.name}</b>
                  </div>
                  <Avatar player={players[to].player} size={30} />
                  <div className="big num">{fmt(amount)}</div>
                </div>
              </div>
            ))}
          </>
        )}

        <div className="sec">
          <span>{settled ? 'Results' : 'At the table'}</span>
          <span className="num">{players.length} players</span>
        </div>

        <div className="list">
          {ranked.map((row, i) => (
            <div className="row compact" key={i}>
              <Avatar player={row.player} size={30} />
              <div className="who">
                <div className="nm sm">{row.player.name}</div>
                <div className="meta num">
                  {row.outCents == null
                    ? row.count === 0
                      ? 'No buy-in yet'
                      : `${row.count} × ${fmt(snap.b)}`
                    : `in ${fmt(row.inCents)} · out ${fmt(row.outCents)}`}
                </div>
              </div>
              {row.net == null ? (
                <div className={`amt num${row.inCents === 0 ? ' zero' : ''}`}>{fmt(row.inCents)}</div>
              ) : (
                <div className={`amt num ${row.net > 0 ? 'up' : row.net < 0 ? 'down' : 'flat'}`}>
                  {fmtSigned(row.net)}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="spectator-foot">
          A snapshot the host shared, not a live feed.
          <br />
          Ask them to send a new link to see the current numbers.
        </div>
      </div>
    </div>
  )
}
