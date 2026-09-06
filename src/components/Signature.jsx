import { useEffect, useRef, useState } from 'react'

// Strokes are stored as normalised 0–1 points rather than a PNG data URL: a
// night can hold thirty signatures and localStorage is small, so a few hundred
// rounded numbers beats a few hundred kilobytes of base64. It also stays sharp
// at any size.
const round = (n) => Math.round(n * 1000) / 1000

export function SignaturePad({ onChange }) {
  const canvasRef = useRef(null)
  const strokes = useRef([])
  const drawing = useRef(false)
  const [empty, setEmpty] = useState(true)

  // Size the backing store to the device pixel ratio so the line is not furry.
  useEffect(() => {
    const canvas = canvasRef.current
    const fit = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      const g = canvas.getContext('2d')
      g.scale(dpr, dpr)
      g.lineWidth = 2.4
      g.lineCap = 'round'
      g.lineJoin = 'round'
      g.strokeStyle = '#F3ECE3'
      redraw()
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const redraw = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const g = canvas.getContext('2d')
    g.clearRect(0, 0, rect.width, rect.height)
    for (const stroke of strokes.current) {
      g.beginPath()
      stroke.forEach(([x, y], i) => {
        const px = x * rect.width
        const py = y * rect.height
        if (i === 0) g.moveTo(px, py)
        else g.lineTo(px, py)
      })
      g.stroke()
    }
  }

  const pointFrom = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    return [
      round(Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))),
      round(Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height))),
    ]
  }

  const start = (e) => {
    e.preventDefault()
    // Not every pointer can be captured (detached element, synthetic event);
    // losing capture only costs us strokes that leave the pad.
    try {
      canvasRef.current.setPointerCapture(e.pointerId)
    } catch {
      /* keep drawing */
    }
    drawing.current = true
    strokes.current.push([pointFrom(e)])
    redraw()
  }

  const move = (e) => {
    if (!drawing.current) return
    const stroke = strokes.current[strokes.current.length - 1]
    const p = pointFrom(e)
    const last = stroke[stroke.length - 1]
    // Drop points that barely moved; the line looks the same and the record is
    // a fraction of the size.
    if (Math.abs(p[0] - last[0]) + Math.abs(p[1] - last[1]) < 0.004) return
    stroke.push(p)
    redraw()
  }

  const end = () => {
    if (!drawing.current) return
    drawing.current = false
    // A single tap is not a signature.
    strokes.current = strokes.current.filter((s) => s.length > 1)
    const has = strokes.current.length > 0
    setEmpty(!has)
    onChange(has ? strokes.current.map((s) => s.map(([x, y]) => [x, y])) : null)
    redraw()
  }

  const clear = () => {
    strokes.current = []
    setEmpty(true)
    onChange(null)
    redraw()
  }

  return (
    <>
      <div className="pad">
        <canvas
          ref={canvasRef}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
          aria-label="Signature pad"
        />
        <div className="rule" />
        {empty && <div className="ghost">Sign above the line</div>}
      </div>
      <div className="pad-bar">
        <span className="lbl">Their signature, not yours.</span>
        <button onClick={clear} disabled={empty}>Clear</button>
      </div>
    </>
  )
}

// Replay stored strokes as an SVG. non-scaling-stroke keeps the line weight
// constant however small the mark is rendered.
export function SignatureMark({ strokes, large }) {
  if (!strokes?.length) return null
  return (
    <svg
      className={`mark${large ? ' lg' : ''}`}
      viewBox="0 0 1 1"
      preserveAspectRatio="xMidYMid meet"
      aria-label="Signature"
    >
      {strokes.map((stroke, i) => (
        <polyline
          key={i}
          points={stroke.map(([x, y]) => `${x},${y}`).join(' ')}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  )
}
