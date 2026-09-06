import { useState } from 'react'
import { useStore } from '../store'
import { fmt } from '../lib/money'
import { suggestStack } from '../lib/chips'
import { Sheet, MoneyInput } from './UI'

const CHIP_COLORS = [
  '#E8E0D2', '#D6473F', '#4A7FD1', '#3F9E62',
  '#14100E', '#8A5FCB', '#D9BC4A', '#4FAEB8',
]

export function ChipSheet({ amount, onClose }) {
  const { state, dispatch } = useStore()
  const [chips, setChips] = useState(state.chips)
  const [editing, setEditing] = useState(false)

  const stack = suggestStack(chips, amount)

  const setValue = (i, value) =>
    setChips((c) => c.map((chip, j) => (j === i ? { ...chip, value: value ?? 0 } : chip)))

  const cycleColor = (i) =>
    setChips((c) =>
      c.map((chip, j) =>
        j === i
          ? { ...chip, color: CHIP_COLORS[(CHIP_COLORS.indexOf(chip.color) + 1) % CHIP_COLORS.length] }
          : chip,
      ),
    )

  return (
    <Sheet
      title={editing ? 'Your chip set' : `Starting stack · ${fmt(amount)}`}
      hint={
        editing
          ? 'Set what each colour is worth. This is only for counting help — it never changes the money.'
          : 'A suggested spread, weighted small so people can actually bet.'
      }
      onClose={onClose}
    >
      {editing ? (
        <>
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
              <MoneyInput cents={chip.value} onCents={(v) => setValue(i, v)} />
            </div>
          ))}
          <div className="subrow">
            <button
              className="lnk"
              onClick={() => setChips((c) => [...c, { color: CHIP_COLORS[c.length % CHIP_COLORS.length], value: 0 }])}
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
        </>
      ) : (
        <>
          {stack.denoms.length === 0 ? (
            <div className="meta">No denominations set yet.</div>
          ) : (
            stack.denoms.map((d, i) => (
              <div className="denom" key={i}>
                <div className="swatch" style={{ background: d.color }} aria-hidden="true" />
                <div className="who">
                  <div className="nm sm num">{fmt(d.value)} chips</div>
                  <div className="meta num">{fmt(d.value * stack.counts[i])} of the stack</div>
                </div>
                <div className="amt num">×{stack.counts[i]}</div>
              </div>
            ))
          )}

          <div className="tally" data-tone={stack.exact ? 'ok' : 'bad'} style={{ marginTop: 14 }}>
            <div>
              <div className="t1 num">{fmt(stack.total)} per stack</div>
              <div className="t2">
                {stack.exact
                  ? 'Matches the buy-in exactly'
                  : `Your chips cannot make ${fmt(amount)} exactly`}
              </div>
            </div>
            <div className="badge num">{stack.counts.reduce((a, b) => a + b, 0)} chips</div>
          </div>

          <button className="btn ghost" style={{ marginTop: 14 }} onClick={() => setEditing(true)}>
            Edit chip values
          </button>
        </>
      )}
    </Sheet>
  )
}
