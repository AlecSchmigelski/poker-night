// Geometry for the cumulative-net line. Session index on x, never calendar
// date: a skipped fortnight would otherwise open a gap that reads as a drought.
export const CHART = { w: 354, h: 152, left: 4, right: 288, top: 29.8, bottom: 114.2 }

export function chartGeometry(series) {
  if (!series.length) return null

  // Zero is always in range, so the baseline is always meaningful.
  const lo = Math.min(0, ...series)
  const hi = Math.max(0, ...series)
  const span = hi - lo || 1

  const y = (v) => CHART.top + ((hi - v) / span) * (CHART.bottom - CHART.top)
  const step = series.length > 1 ? (CHART.right - CHART.left) / (series.length - 1) : 0
  const points = series.map((v, i) => [CHART.left + step * i, y(v)])

  return {
    points,
    zeroY: y(0),
    last: points[points.length - 1],
    // Closed under the line, down to the baseline.
    area: [
      [CHART.left, y(0)],
      ...points,
      [points[points.length - 1][0], y(0)],
    ],
  }
}

export const path = (pts) => pts.map(([x, yy]) => `${round(x)},${round(yy)}`).join(' ')

const round = (n) => Math.round(n * 10) / 10
