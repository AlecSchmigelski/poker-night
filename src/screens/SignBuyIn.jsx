import { useState } from 'react'
import { fmt } from '../lib/money'
import { Sheet } from '../components/UI'
import { SignaturePad } from '../components/Signature'

// Only ever shown for a rebuy — the opening buy-in is a single tap. Name and
// amount are what the person signing reads from across the table, so they get
// the biggest type in the app.
export function SignBuyIn({ player, amount, onConfirm, onClose }) {
  const [strokes, setStrokes] = useState(null)

  return (
    <Sheet onClose={onClose}>
      <div className="sign-head">
        <div className="who-name">{player.name}</div>
        <div className="who-amount num">{fmt(amount)}</div>
        <div className="who-note">Rebuying for {fmt(amount)}. Sign to confirm.</div>
      </div>

      <SignaturePad onChange={setStrokes} />

      <button
        className={`btn${strokes ? '' : ' off'}`}
        style={{ marginTop: 18 }}
        disabled={!strokes}
        onClick={() => onConfirm(strokes)}
      >
        {strokes ? `Verify ${fmt(amount)}` : 'Sign to verify'}
      </button>

      {/* Someone stepping away from the table should not block the buy-in. The
          log marks these so the record stays honest. */}
      <button className="btn ghost" onClick={() => onConfirm(null)}>
        Add without signing
      </button>
    </Sheet>
  )
}
