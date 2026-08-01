import { useRef, useState } from 'react'

export interface ChartPoint {
  date: Date
  value: number
  label: string
}

const W = 320
const H = 132
const PAD = { top: 14, right: 12, bottom: 34, left: 34 }
const PLOT_W = W - PAD.left - PAD.right
const PLOT_H = H - PAD.top - PAD.bottom

const shortDate = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
const round = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))

/**
 * One measure over time — single series, so no legend (the card title names it).
 * Only the end point is directly labelled; the rest live in the crosshair tooltip
 * and the session table below the card.
 */
export default function LineChart({ points, suffix = '' }: { points: ChartPoint[]; suffix?: string }) {
  const [hover, setHover] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  if (points.length === 0) return null

  const values = points.map((p) => p.value)
  const rawMin = Math.min(...values)
  const rawMax = Math.max(...values)
  // a flat series should sit mid-plot, not on an edge
  const pad = rawMax === rawMin ? Math.max(rawMax * 0.1, 1) : (rawMax - rawMin) * 0.15
  const min = Math.max(0, rawMin - pad)
  const max = rawMax + pad

  const x = (i: number) =>
    points.length === 1 ? PAD.left + PLOT_W / 2 : PAD.left + (i / (points.length - 1)) * PLOT_W
  const y = (v: number) => PAD.top + PLOT_H - ((v - min) / (max - min || 1)) * PLOT_H

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)} ${y(p.value)}`).join(' ')
  const area = `${path} L${x(points.length - 1)} ${PAD.top + PLOT_H} L${x(0)} ${PAD.top + PLOT_H} Z`

  const last = points.length - 1
  const active = hover ?? last

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const ratio = (e.clientX - rect.left) / rect.width
    const svgX = ratio * W
    let nearest = 0
    let best = Infinity
    for (let i = 0; i < points.length; i++) {
      const d = Math.abs(x(i) - svgX)
      if (d < best) {
        best = d
        nearest = i
      }
    }
    setHover(nearest)
  }

  return (
    <div className="chart">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="chart-svg"
        role="img"
        aria-label={`Trend over ${points.length} sessions, latest ${round(points[last].value)}${suffix}`}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        {/* recessive hairline gridlines at the extremes only */}
        {[rawMax, rawMin].map((v, i) => (
          <g key={i}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} className="grid" />
            <text x={PAD.left - 6} y={y(v) + 3.5} className="axis-text" textAnchor="end">
              {round(v)}
            </text>
          </g>
        ))}

        <path d={area} className="series-area" />
        {points.length > 1 && <path d={path} className="series-line" />}

        {hover !== null && (
          <line
            x1={x(hover)}
            x2={x(hover)}
            y1={PAD.top}
            y2={PAD.top + PLOT_H}
            className="crosshair"
          />
        )}

        {points.map((p, i) => (
          <circle
            key={i}
            cx={x(i)}
            cy={y(p.value)}
            r={i === active ? 5 : 4}
            className="series-dot"
          />
        ))}

        <text x={PAD.left} y={H - 12} className="axis-text" textAnchor="start">
          {shortDate(points[0].date)}
        </text>
        {points.length > 1 && (
          <text x={W - PAD.right} y={H - 12} className="axis-text" textAnchor="end">
            {shortDate(points[last].date)}
          </text>
        )}
      </svg>

      <p className="chart-readout">
        <span className="dot-key" aria-hidden />
        {shortDate(points[active].date)} · <strong>{round(points[active].value)}{suffix}</strong>
        <span className="muted"> · {points[active].label}</span>
      </p>
    </div>
  )
}
