import { useState } from 'react'
import { useStore } from '../store'
import { shareUrl } from '../lib/share'
import { Sheet } from '../components/UI'

export function ShareTable({ game, onClose }) {
  const { player } = useStore()
  const [status, setStatus] = useState(null)
  // Built once per open, so the timestamp on the card matches what is shared.
  const [url] = useState(() => shareUrl(game, player))

  const local = ['localhost', '127.0.0.1'].includes(window.location.hostname)
  const canShare = typeof navigator.share === 'function'

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setStatus('Link copied.')
    } catch {
      setStatus('Could not copy — select the link above instead.')
    }
  }

  const share = async () => {
    if (!navigator.share) return copy()
    try {
      await navigator.share({ title: 'Poker Night', text: 'Tonight’s table', url })
    } catch {
      setStatus('Share cancelled.')
    }
  }

  return (
    <Sheet
      title="Share the table"
      hint="Anyone with this link sees the numbers as they are right now. No app, no account."
      onClose={onClose}
    >
      <div className="linkbox">{url}</div>

      {local && (
        <div className="warn">
          This is a <b>localhost</b> link — it will only open on this machine. Deploy
          the app somewhere public before sharing it with the table.
        </div>
      )}

      <div className="sec" style={{ marginTop: 18 }}>
        <span>It is a snapshot, not a live feed</span>
      </div>
      <div className="meta" style={{ lineHeight: 1.6 }}>
        The whole table travels inside the link itself, which is why it needs no
        server. Nothing updates after you send it — add a rebuy and share a fresh
        link when people ask. Signatures are never included.
      </div>

      {status && <div className="meta" style={{ marginTop: 12 }}>{status}</div>}

      {/* Without the share sheet, copy IS the primary action — don't offer it twice. */}
      {canShare ? (
        <>
          <button className="btn" style={{ marginTop: 18 }} onClick={share}>Share link</button>
          <button className="btn ghost" onClick={copy}>Copy link</button>
        </>
      ) : (
        <button className="btn" style={{ marginTop: 18 }} onClick={copy}>Copy link</button>
      )}
    </Sheet>
  )
}
