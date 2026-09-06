import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store'
import { fmt } from '../lib/money'
import { INTERVALS, advance, clock, makeBombPot, status } from '../lib/bombpot'
import { MoneyInput, Sheet } from './UI'

// A short two-tone chime, synthesised rather than shipped as an asset. The
// AudioContext is created on the tap that arms the timer, which is what keeps
// autoplay policy happy when it later fires on its own.
function useChime() {
  const ctx = useRef(null)
  const arm = () => {
    if (!ctx.current) {
      const AC = window.AudioContext || window.webkitAudioContext
      if (AC) ctx.current = new AC()
    }
    ctx.current?.resume?.()
  }
  const play = () => {
    const c = ctx.current
    if (!c) return
    const at = c.currentTime
    for (const [i, freq] of [880, 1320].entries()) {
      const osc = c.createOscillator()
      const gain = c.createGain()
      osc.type = 'triangle'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, at + i * 0.18)
      gain.gain.exponentialRampToValueAtTime(0.35, at + i * 0.18 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, at + i * 0.18 + 0.32)
      osc.connect(gain).connect(c.destination)
      osc.start(at + i * 0.18)
      osc.stop(at + i * 0.18 + 0.34)
    }
  }
  return { arm, play }
}

export function BombPot({ openSettings, onCloseSettings, settingsOpen }) {
  const { state, dispatch } = useStore()
  const game = state.game
  const bomb = game.bombPot
  const [now, setNow] = useState(() => Date.now())
  const [firing, setFiring] = useState(false)
  const chime = useChime()

  const { active, remaining, due } = status(bomb, now)

  // One second tick is enough; the countdown is derived from a timestamp, so
  // accuracy does not depend on the interval firing reliably.
  useEffect(() => {
    if (!active) return
    // Sync immediately: while the timer was off no ticks ran, so `now` is stale
    // and the first render would show a countdown a few seconds too long.
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [active])

  useEffect(() => {
    if (!due || firing) return
    setFiring(true)
    chime.play()
    if (navigator.vibrate) navigator.vibrate([90, 60, 90, 60, 180])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [due, firing])

  // Keep the screen awake while a timer is armed — the host puts the phone down
  // between hands and a countdown nobody can see is useless.
  useEffect(() => {
    if (!active) return
    let lock
    let cancelled = false
    navigator.wakeLock
      ?.request('screen')
      .then((l) => {
        if (cancelled) l.release()
        else lock = l
      })
      .catch(() => {})
    return () => {
      cancelled = true
      lock?.release?.().catch(() => {})
    }
  }, [active])

  const dismiss = () => {
    dispatch({ type: 'SET_BOMB_POT', bombPot: advance(bomb, Date.now()) })
    setFiring(false)
    setNow(Date.now())
  }

  return (
    <>
      {active && !firing && (
        <button className="bomb-bar" data-soon={remaining < 60000} onClick={openSettings}>
          <span className="fuse" aria-hidden="true">💣</span>
          <div className="who">
            <div className="k">
              Next bomb pot{bomb.count > 0 ? ` · ${bomb.count} so far` : ''}
            </div>
            <div className="v">{clock(remaining)}</div>
          </div>
          <div className="amt num">{fmt(bomb.ante)}</div>
        </button>
      )}

      {firing && (
        <Sheet onClose={dismiss}>
          <div className="bomb-alert">
            <div className="boom">BOMB POT</div>
            <div className="title">Everybody in</div>
            <div className="ante num">{fmt(bomb.ante)}</div>
            <div className="sub">
              Ante up and deal the flop. No preflop betting.
              <br />
              Chips already on the table — nothing to record.
            </div>
          </div>
          <button className="btn" onClick={dismiss}>
            Dealt · restart the clock
          </button>
        </Sheet>
      )}

      {settingsOpen && (
        <Settings
          bomb={bomb}
          onArm={chime.arm}
          onClose={onCloseSettings}
          onSave={(next) => {
            dispatch({ type: 'SET_BOMB_POT', bombPot: next })
            onCloseSettings()
          }}
        />
      )}
    </>
  )
}

function Settings({ bomb, onArm, onClose, onSave }) {
  const [minutes, setMinutes] = useState(bomb?.minutes ?? 20)
  const [ante, setAnte] = useState(bomb?.ante ?? 500)

  return (
    <Sheet
      title="Bomb pot timer"
      hint="Everyone antes and the flop is dealt. The ante comes off stacks already on the table, so it never changes the pot or the cash-out."
      onClose={onClose}
    >
      <div className="sec"><span>Every</span></div>
      <div className="chips">
        {INTERVALS.map((m) => (
          <button
            key={m}
            className="chip num"
            data-on={minutes === m}
            onClick={() => setMinutes(m)}
          >
            {m} min
          </button>
        ))}
      </div>

      <div className="sec"><span>Ante each</span></div>
      <div className="denom" style={{ justifyContent: 'space-between' }}>
        <div className="who"><div className="nm sm">Per player</div></div>
        <MoneyInput cents={ante} onCents={(v) => setAnte(v ?? 0)} />
      </div>

      <button
        className={`btn${ante > 0 ? '' : ' off'}`}
        style={{ marginTop: 14 }}
        disabled={ante <= 0}
        onClick={() => {
          onArm()
          onSave(makeBombPot(minutes, ante, Date.now()))
        }}
      >
        {bomb?.on ? `Restart · every ${minutes} min` : `Start · every ${minutes} min`}
      </button>

      {bomb?.on && (
        <button
          className="btn ghost"
          onClick={() => onSave({ ...bomb, on: false })}
        >
          Turn the timer off
        </button>
      )}
    </Sheet>
  )
}
