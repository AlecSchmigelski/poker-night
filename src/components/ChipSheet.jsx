import { useState } from 'react'
import { useStore } from '../store'
import { fmt } from '../lib/money'
import { suggestStack, MAX_PER_COLOUR } from '../lib/chips'
import { Sheet, MoneyInput } from './UI'

const BLIND_PRESETS = [
  [25, 50],
  [50, 100],
  [100, 100],
  [100, 200],
  [200, 500],
  [500, 500],
]

const CHIP_COLORS = [
  '#E8E0D2', '#D6473F', '#4A7FD1', '#3F9E62',
  '#14100E', '#8A5FCB', '#D9BC4A', '#4FAEB8',
]

export function ChipSheet({ amount, players = 1, onClose }) {
  const { state, dispatch } = useStore()
  const [chips, setChips] = useState(state.chips)
  const [editing, setEditing] = useState(false)
  const blinds = state.blinds

  const stack = suggestStack(chips, amount, players, blinds)

  const patch = (i, changes) =>
    setChips((c) => c.map((chip, j) => (j === i ? { ...chip, ...changes } : chip)))

  const cycleColor = (i) =>
    patch(i, {
      color:
        CHIP_COLORS[(CHIP_COLORS.indexOf(chips[i].color) + 1) % CHIP_COLORS.length],
    })

  if (editing) {
    return (
      <Sheet
        title="Your chip set"
        hint="What each colour is worth, and how many you own. The count caps what can be dealt out — it never changes the money."
        onClose={onClose}
      >
        {chips.map((chip, i) => (
          <div className="denom" key={i}>
            <button
              className="swatch"
              style={{ background: chip.color }}
              aria-label="Change colour"
              onClick={() => cycleColor(i)}
            />
            <div className="who">
              <div className="nm sm">Chip {i + 1}</div>
              <div className="meta">tap the circle to recolour</div>
            </div>
            <label className="owned">
              <span>own</span>
              <input
                className="num"
                inputMode="numeric"
                value={chip.count ?? ''}
                onChange={(e) => patch(i, { count: Number(e.target.value.replace(/\D/g, '')) || 0 })}
              />
            </label>
            <MoneyInput cents={chip.value} onCents={(v) => patch(i, { value: v ?? 0 })} />
          </div>
        ))}
        <div className="subrow">
          <button
            className="lnk"
            onClick={() =>
              setChips((c) => [...c, { color: CHIP_COLORS[c.length % CHIP_COLORS.length], value: 0, count: 50 }])
            }
          >
            Add a colour
          </button>
          {chips.length > 1 && (
            <button className="lnk" onClick={() => setChips((c) => c.slice(0, -1))}>
              Remove last
            </button>
          )}
        </div>
        <button
          className="btn"
          style={{ marginTop: 16 }}
          onClick={() => {
            dispatch({ type: 'SET_CHIPS', chips })
            setEditing(false)
          }}
        >
          Save chip set
        </button>
      </Sheet>
    )
  }

  return (
    <Sheet
      title={`Starting stack · ${fmt(amount)}`}
      hint={`${players} player${players === 1 ? '' : 's'}. The small blind sets the smallest chip in play, and nobody gets more than ${MAX_PER_COLOUR} of one colour.`}
      onClose={onClose}
    >
      <div className="sec" style={{ marginTop: 0 }}><span>Blinds</span></div>
      <div className="chips" style={{ marginBottom: 4 }}>
        {BLIND_PRESETS.map(([small, big]) => (
          <button
            key={`${small}-${big}`}
            className="chip num"
            data-on={blinds.small === small && blinds.big === big}
            onClick={() => dispatch({ type: 'SET_BLINDS', blinds: { small, big } })}
          >
            {fmt(small)}/{fmt(big)}
          </button>
        ))}
      </div>
      <div className="sec"><span>Each player gets</span></div>
      {stack.impossible ? (
        <div className="warn" style={{ marginTop: 0 }}>
          Your chips can't make {fmt(amount)} cleanly at {fmt(blinds.small)}/
          {fmt(blinds.big)} blinds, with no more than {MAX_PER_COLOUR} of any colour.
          Add a denomination, or change the blinds or the buy-in.
        </div>
      ) : (
        <>
          {stack.rows.map((r, i) => (
            <div className="denom" key={i}>
              <div className="swatch" style={{ background: r.color }} aria-hidden="true" />
              <div className="who">
                <div className="nm sm num">{fmt(r.value)} chips</div>
                <div className="meta num">
                  {fmt(r.value * r.count)} of the stack · {r.count * players} from the rack
                </div>
              </div>
              <div className="amt num">×{r.count}</div>
            </div>
          ))}

          <div className="tally" data-tone={stack.short.length ? 'bad' : 'ok'} style={{ marginTop: 14 }}>
            <div>
              <div className="t1 num">{stack.chipCount} chips each</div>
              <div className="t2">
                {stack.short.length
                  ? stack.short
                      .map((x) => `Needs ${x.need} × ${fmt(x.value)} — you own ${x.owned}`)
                      .join('. ')
                  : `${stack.chipCount * players} chips dealt, the rest stays in the rack for rebuys`}
              </div>
            </div>
            <div className="badge num">{fmt(stack.total)}</div>
          </div>

          <button className="btn ghost" style={{ marginTop: 14 }} onClick={() => setEditing(true)}>
            Edit chip set
          </button>
        </>
      )}
    </Sheet>
  )
}
