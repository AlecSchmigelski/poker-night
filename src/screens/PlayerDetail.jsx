import { useState } from 'react'
import { useStore } from '../store'
import { fmt, fmtSigned } from '../lib/money'
import { chartNote, playerStats } from '../lib/playerStats'
import { CHART, chartGeometry, path } from '../lib/chart'
import { Sheet } from '../components/UI'
import { EditPlayer } from './Players'

const day = (d) => d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })

// One player across every night they have played. The group's record of them,
// not private analytics — which is why the closing action is to quote it.
export function PlayerDetail({ playerId, from, onBack, onOpenNight }) {
  const { state, player } = useStore()
  const p = player(playerId)
  const s = playerStats(state.history, playerId)
  const [quote, setQuote] = useState(null)
  const [draft, setDraft] = useState(null)

  const tone = s.total > 0 ? 'up' : s.total < 0 ? 'down' : 'flat'
  const note = chartNote(s)

  return (
    <>
      <div className="scroll">
        <div className="nav">
          <button className="back" onClick={onBack}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1">
              <path d="M15 5l-7 7 7 7" />
            </svg>
            {from}
          </button>
          <button className="navact" aria-label={`Edit ${p.name}`} onClick={() => setDraft({ ...p })}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </button>
        </div>

        <div className="ident">
          <div className="av48" style={{ '--chip': p.color }} aria-hidden="true">
            {initials(p.name)}
          </div>
          <div className="idtext">
            <div className="idname">{p.name}</div>
            <div className="idsub">{s.subtitle}</div>
          </div>
        </div>

        <div className="headline">
          <div className={`bignum ${tone}`}>{fmtSigned(s.total)}</div>
          <div className="denom">
            {s.nights === 0
              ? 'no finished nights'
              : `over ${s.nights} night${s.nights === 1 ? '' : 's'}`}
          </div>
        </div>

        {s.nights === 0 ? (
          <RosterOnly player={p} inGame={isSeated(state.game, playerId)} />
        ) : (
          <>
            <Chart series={s.series} total={s.total} tone={tone} />
            {note && <div className="chart-note">{note}</div>}

            <div className="statgrid">
              {s.nights === 1 ? (
                <>
                  <Stat value={fmtSigned(s.total)} label="The night" tone={tone} />
                  <Stat value={String(s.sessions[0].entries)} label="Buy-ins" />
                  <Stat value={fmt(s.totalIn)} label="Bought in" />
                </>
              ) : (
                <>
                  <Stat value={fmtSigned(s.best.net)} label="Best night" tone={s.best.net > 0 ? 'up' : 'down'} />
                  <Stat value={fmtSigned(s.worst.net)} label="Worst night" tone={s.worst.net < 0 ? 'down' : 'up'} />
                  <Stat value={s.buyInsPerNight.toFixed(1)} label="Buy-ins a night" />
                </>
              )}
            </div>

            <div className="summary">
              Bought in <b>{fmt(s.totalIn)}</b>{' '}
              {s.nights === 1 ? 'on their first night.' : `across ${s.nights} nights.`}{' '}
              {attendance(s)}
            </div>

            <div className="report-label">Recent nights</div>
            <div className="nightlist">
              {[...s.sessions].reverse().slice(0, 3).map((n) => (
                <button
                  className="nightrow"
                  key={n.gameId}
                  onClick={() => onOpenNight(state.history.find((g) => g.id === n.gameId))}
                >
                  <span className="d">{day(n.date)}</span>
                  <span className="m">in {fmt(n.buyIn)} · out {fmt(n.cashOut)}</span>
                  <span className={`n ${n.net > 0 ? 'up' : n.net < 0 ? 'down' : ''}`}>
                    {fmtSigned(n.net)}
                  </span>
                </button>
              ))}
            </div>

            <button className="ghostbtn" onClick={() => setQuote(quoteFor(p, s))}>
              Copy for the chat
            </button>
          </>
        )}
      </div>

      {quote !== null && (
        <CopySheet text={quote} onChange={setQuote} onClose={() => setQuote(null)} />
      )}

      {draft && (
        <EditPlayer
          draft={draft}
          setDraft={setDraft}
          onClose={() => {
            setDraft(null)
            // Deleting from here leaves nothing to show.
            if (!state.players.some((x) => x.id === playerId)) onBack()
          }}
        />
      )}
    </>
  )
}

function Chart({ series, total, tone }) {
  const colour = tone === 'up' ? 'var(--up)' : tone === 'down' ? 'var(--down)' : 'var(--smoke)'
  const g = chartGeometry(series)

  // A single point is a dot, not a line. Drawing a line through one night would
  // invent a shape that does not exist.
  if (series.length === 1) {
    return (
      <svg className="chart one" viewBox="0 0 354 84" role="img"
        aria-label={`One night, net ${fmtSigned(total)}`}>
        <line x1="4" y1="26" x2="288" y2="26" stroke="var(--hairline)" strokeWidth="1" />
        <text x="4" y="17" className="zlab">$0</text>
        <circle cx="10" cy={total >= 0 ? 12 : 58} r="4.5" fill={colour} />
        <text x="22" y={total >= 0 ? 16.5 : 62.5} className="endlab" fill={colour}>
          {fmtSigned(total)}
        </text>
      </svg>
    )
  }

  const id = `fade-${series.length}-${tone}`
  return (
    <svg className="chart" viewBox={`0 0 ${CHART.w} ${CHART.h}`} role="img"
      aria-label={`Running total across ${series.length} nights, ending at ${fmtSigned(total)}`}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={colour} stopOpacity="0.2" />
          <stop offset="1" stopColor={colour} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={path(g.area)} fill={`url(#${id})`} />
      <line x1={CHART.left} y1={g.zeroY} x2={CHART.right} y2={g.zeroY}
        stroke="var(--hairline)" strokeWidth="1" />
      <text x={CHART.left} y={g.zeroY + 13} className="zlab">$0</text>
      <polyline points={path(g.points)} fill="none" stroke={colour} strokeWidth="2"
        strokeLinejoin="round" strokeLinecap="round" />
      {g.points.slice(0, -1).map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.7" fill={colour} opacity="0.55" />
      ))}
      <circle cx={g.last[0]} cy={g.last[1]} r="3.6" fill={colour} />
      <text x={g.last[0] + 9} y={g.last[1] + 4.5} className="endlab" fill={colour}>
        {fmtSigned(total)}
      </text>
    </svg>
  )
}

function Stat({ value, label, tone }) {
  return (
    <div className="stat">
      <div className={`sv${tone ? ` ${tone}` : ''}`}>{value}</div>
      <div className="sl">{label}</div>
    </div>
  )
}

function RosterOnly({ player, inGame }) {
  const handles = [player.venmo && `@${player.venmo}`, player.cashapp && `$${player.cashapp}`]
    .filter(Boolean)
    .join(' · ')
  return (
    <>
      <div className="emptychart">
        <div className="rule" />
        <div className="txt">Nothing here until they finish a night.</div>
      </div>
      <div className="rosterinfo">
        <div className="rrow">
          <span>Handle</span>
          <b>{handles || 'None saved'}</b>
        </div>
        <div className="rrow">
          <span>Chip colour</span>
          <b className="swatch" style={{ background: player.color }} />
        </div>
        <div className="rrow">
          <span>In tonight's game</span>
          <b>{inGame ? 'Yes' : 'No'}</b>
        </div>
      </div>
    </>
  )
}

function CopySheet({ text, onChange, onClose }) {
  const [status, setStatus] = useState(null)
  return (
    <Sheet title="Copy for the chat" onClose={onClose}>
      <textarea className="quote" rows={3} value={text} onChange={(e) => onChange(e.target.value)} />
      {status && <div className="meta" style={{ marginTop: 10 }}>{status}</div>}
      <button
        className="btn"
        style={{ marginTop: 14 }}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text)
            setStatus('Copied.')
          } catch {
            setStatus('Could not copy — select the text above instead.')
          }
        }}
      >
        Copy
      </button>
    </Sheet>
  )
}

// The line is written with its denominator already attached, so it cannot be
// requoted as a rate.
function quoteFor(p, s) {
  const dir = s.total > 0 ? `is up ${fmt(s.total)}` : s.total < 0 ? `is down ${fmt(-s.total)}` : 'is dead even'
  return `${p.name} ${dir} over ${s.nights} night${s.nights === 1 ? '' : 's'}. ${s.buyInsPerNight.toFixed(1)} buy-ins a night.`
}

function attendance(s) {
  if (s.nights >= s.held) return `Came to every night since ${s.first.toLocaleDateString(undefined, { month: 'long' })}.`
  return `Came to ${s.nights} of the last ${s.held}.`
}

function isSeated(game, playerId) {
  return !!game?.seats?.some((seat) => seat.playerId === playerId)
}

function initials(name) {
  return name.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}
