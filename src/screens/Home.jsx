import { useEffect, useState } from 'react'
import { useStore } from '../store'
import { fmt, fmtSigned } from '../lib/money'
import { inPlay, nets, potTotal } from '../lib/settle'
import { outstanding, standings, totalOutstanding } from '../lib/debts'
import { status, clock } from '../lib/bombpot'
import { Avatar } from '../components/UI'

function elapsed(since, now) {
  const mins = Math.floor((now - since) / 60000)
  if (mins < 60) return `${mins}m`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

export function Home({ onGo, onOpenNight }) {
  const { state, dispatch, player } = useStore()
  const game = state.game
  const owed = outstanding(state.history)
  const table = standings(state.history, nets)
  const lastNight = state.history[0]

  return (
    <>
      <div className="scroll">
        {game ? <Tonight game={game} onGo={onGo} /> : <NoGame onGo={onGo} groups={state.groups} />}

        {/* The one thing no other tab knows: who still has to hand over cash. */}
        {owed.length > 0 && (
          <>
            <div className="sec">
              <span>Still owed</span>
              <span className="num">{fmt(totalOutstanding(state.history))}</span>
            </div>
            <div className="card">
              {owed.map((row) => (
                <div className="owed" key={row.paymentId}>
                  <Avatar player={player(row.from)} size={26} />
                  <div className="names">
                    <div>
                      <b>{player(row.from).name}</b> <em>owes</em>{' '}
                      <b>{player(row.to).name}</b> <b className="num">{fmt(row.amount)}</b>
                    </div>
                    <div className="when">
                      {new Date(row.endedAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                  </div>
                  <button
                    className="settle"
                    onClick={() =>
                      dispatch({
                        type: 'TOGGLE_HISTORY_PAID',
                        gameId: row.gameId,
                        paymentId: row.paymentId,
                      })
                    }
                  >
                    Paid
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {table.length > 0 && (
          <>
            <div className="sec">
              <span>All time</span>
              <button className="settle" onClick={() => onGo('ledger')}>
                Full ledger
              </button>
            </div>
            <div className="card">
              {table.slice(0, 5).map(([id, t], i) => (
                <div key={id} className="net">
                  <span className="rank num">{i + 1}</span>
                  <Avatar player={player(id)} size={26} />
                  <div className="who">
                    <div className="nm sm">{player(id).name}</div>
                    <div className="meta">
                      {t.nights} night{t.nights === 1 ? '' : 's'} · up {t.up}
                    </div>
                  </div>
                  <div className={`amt sm num ${t.net > 0 ? 'up' : t.net < 0 ? 'down' : 'flat'}`}>
                    {fmtSigned(t.net)}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {lastNight && (
          <>
            <div className="sec"><span>Last night</span></div>
            <button className="row compact" onClick={() => onOpenNight(lastNight)}>
              <div className="who">
                <div className="nm sm">
                  {new Date(lastNight.endedAt).toLocaleDateString(undefined, {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>
                <div className="meta num">
                  {lastNight.seats.length} players · {fmt(potTotal(lastNight))} pot
                </div>
              </div>
              <span className="settle">Recap</span>
            </button>
          </>
        )}

        <div className="subrow">
          <button className="lnk" onClick={() => onGo('players')}>
            Roster · {state.players.length}
          </button>
          <button className="lnk" onClick={() => onGo('ledger')}>
            {state.history.length} night{state.history.length === 1 ? '' : 's'} played
          </button>
        </div>
      </div>

    </>
  )
}

function Tonight({ game, onGo }) {
  // Computed during render alone, the countdown and the elapsed time would sit
  // frozen for as long as the hub is open. Tick them.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const bomb = status(game.bombPot, now)
  const left = game.seats.filter((s) => s.cashOut != null).length

  return (
    <div className="hub-hero">
      <div className="glow" />
      <div className="inner">
        <div className="eyebrow">Game in progress</div>
        <div className="big">{fmt(inPlay(game))}</div>
        <div className="line">
          {fmt(potTotal(game))} bought in · {game.seats.length - left} still playing
          {left > 0 && ` · ${left} cashed out`}
        </div>

        <div className="hub-stats">
          <div className="cell">
            <div className="k">Running</div>
            <div className="v">{elapsed(game.startedAt, now)}</div>
          </div>
          <div className="cell">
            <div className="k">Buy-in</div>
            <div className="v">{fmt(game.defaultBuyIn)}</div>
          </div>
          <div className="cell">
            <div className="k">{bomb.active ? 'Bomb pot' : 'Phase'}</div>
            <div className="v">
              {bomb.active
                ? clock(bomb.remaining)
                : game.phase === 'playing'
                  ? 'Playing'
                  : game.phase === 'cashout'
                    ? 'Counting'
                    : 'Settling'}
            </div>
          </div>
        </div>

        <button className="btn" onClick={() => onGo('game')}>
          Back to the table
        </button>
      </div>
    </div>
  )
}

function NoGame({ onGo, groups }) {
  return (
    <div className="hub-hero">
      <div className="glow" />
      <div className="inner">
        <div className="eyebrow">No game running</div>
        <div className="big" style={{ fontSize: 28 }}>Deal a night in</div>
        <div className="line">
          {groups.length > 0
            ? `${groups.length} saved group${groups.length === 1 ? '' : 's'} ready to load.`
            : 'Pick a buy-in, pick who is playing.'}
        </div>
        <button className="btn" onClick={() => onGo('game')}>
          Start a night
        </button>
      </div>
    </div>
  )
}
