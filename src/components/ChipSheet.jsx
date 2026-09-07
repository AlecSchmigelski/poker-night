import { useState } from 'react'
import { useStore } from '../store'
import { fmt } from '../lib/money'
import { suggestStack } from '../lib/chips'
import { Sheet, MoneyInput } from './UI'

const CHIP_COLORS = [
  '#E8E0D2', '#D6473F', '#4A7FD1', '#3F9E62',
  '#14100E', '#8A5FCB', '#D9BC4A', '#4FAEB8',
]

export function ChipSheet({ amount, players = 1, onClose }) {
  const { state, dispatch } = useStore()
  const [chips, setChips] = useState(state.chips)
  const [editing, setEditing] = useState(false)

  const stack = suggestStack(chips, amount, players)

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
      hint={`For ${players} player${players === 1 ? '' : 's'}. Most of the value in big chips, most of the count in small ones.`}
      onClose={onClose}
    >
      {stack.impossible ? (
        <div className="warn" style={{ marginTop: 0 }}>
          Your chips can't make {fmt(amount)} cleanly. Add a smaller denomination,
          or pick a buy-in that divides into the chips you have.
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
