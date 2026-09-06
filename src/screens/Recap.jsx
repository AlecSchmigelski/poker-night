import { useEffect, useState } from 'react'
import { useStore } from '../store'
import { fmt } from '../lib/money'
import { canvasToBlob, duration, recapStats, renderRecapCanvas } from '../lib/recap'
import { Sheet } from '../components/UI'
import { BuyInLog } from './BuyInLog'

export function Recap({ game, onClose }) {
  const { player } = useStore()
  const [url, setUrl] = useState(null)
  const [status, setStatus] = useState(null)
  const [log, setLog] = useState(false)
  const s = recapStats(game, player)

  useEffect(() => {
    const canvas = renderRecapCanvas(game, player)
    let live = true
    let objectUrl
    canvasToBlob(canvas).then((blob) => {
      if (!live || !blob) return
      objectUrl = URL.createObjectURL(blob)
      setUrl(objectUrl)
    })
    return () => {
      live = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [game, player])

  const filename = `poker-night-${s.date.toISOString().slice(0, 10)}.png`

  const share = async () => {
    if (!url) return
    const blob = await fetch(url).then((r) => r.blob())
    const file = new File([blob], filename, { type: 'image/png' })
    // Web Share with files is the good path on a phone; the download link below
    // is the fallback everywhere else.
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file] })
        return
      } catch {
        setStatus('Share cancelled.')
        return
      }
    }
    setStatus('Sharing images is not supported here — use Save image.')
  }

  return (
    <Sheet title="The night, in one card" hint="Drop it in the group chat." onClose={onClose}>
      {url ? (
        <img className="recap-card" src={url} alt="Recap card for the night" />
      ) : (
        <div className="empty"><div className="ring" /></div>
      )}

      <div className="stat-grid">
        <div className="stat">
          <div className="k">On the table</div>
          <div className="v num">{fmt(s.pot)}</div>
        </div>
        <div className="stat">
          <div className="k">Ran for</div>
          <div className="v num">{s.minutes ? duration(s.minutes) : '—'}</div>
        </div>
        <div className="stat">
          <div className="k">Took the night</div>
          <div className="v">{s.winner ? player(s.winner.playerId).name : '—'}</div>
        </div>
        <div className="stat">
          <div className="k">Most reloads</div>
          <div className="v">
            {s.mostRebuys ? `${player(s.mostRebuys.playerId).name} · ${s.mostRebuyCount}` : 'None'}
          </div>
        </div>
      </div>

      {status && <div className="meta" style={{ marginTop: 12 }}>{status}</div>}

      <button className="btn" style={{ marginTop: 16 }} disabled={!url} onClick={share}>
        Share
      </button>
      <a className="btn ghost" href={url || undefined} download={filename} style={{ marginTop: 8 }}>
        Save image
      </a>
      <button className="btn ghost" onClick={() => setLog(true)}>
        Buy-in log
      </button>

      {log && <BuyInLog game={game} onClose={() => setLog(false)} />}
    </Sheet>
  )
}
