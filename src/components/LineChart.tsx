import { useRef, useState } from 'react'

export interface Series {
  label: string
  /** one entry per date; null where that set wasn't performed */
  values: (number | null)[]
}

const W = 320
const H = 132
const PAD = { top: 14, right: 12, bottom: 34, left: 34 }
const PLOT_W = W - PAD.left - PAD.right
const PLOT_H = H - PAD.top - PAD.bottom

/** Categorical slots 1-8, validated for both surfaces. Never cycle past 8. */
export const MAX_SERIES = 8

const shortDate = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
const round = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))

/** Breaks the path wherever a set is missing rather than bridging the gap. */
function buildPath(values: (number | null)[], x: (i: number) => number, y: (v: number) => number) {
  let d = ''
  let drawing = false
  values.forEach((v, i) => {
    if (v == null) {
      drawing = false
      return
    }
    d += `${drawing ? 'L' : 'M'}${x(i)} ${y(v)}`
    drawing = true
  })
  return d
}

/**
 * One line per set across sessions. Legend is always present (it doubles as the
 * hover readout, showing each set's value for the highlighted session); values
 * also live in the "Show all sessions" table, which is the relief the light-mode
 * contrast warning requires.
 */
export default function LineChart({
  dates,
  series,
  suffix = '',
}: {
  dates: Date[]
  series: Series[]
  suffix?: string
}) {
  const [hover, setHover] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  if (dates.length === 0 || series.length === 0) return null

  const all = series.flatMap((s) => s.values).filter((v): v is number => v != null)
  if (all.length === 0) return null

  const rawMin = Math.min(...all)
  const rawMax = Math.max(...all)
  const pad = rawMax === rawMin ? Math.max(rawMax * 0.1, 1) : (rawMax - rawMin) * 0.15
  const min = Math.max(0, rawMin - pad)
  const max = rawMax + pad

  const x = (i: number) =>
    dates.length === 1 ? PAD.left + PLOT_W / 2 : PAD.left + (i / (dates.length - 1)) * PLOT_W
  const y = (v: number) => PAD.top + PLOT_H - ((v - min) / (max - min || 1)) * PLOT_H

  const last = dates.length - 1
  const active = hover ?? last

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const svgX = ((e.clientX - rect.left) / rect.width) * W
    let nearest = 0
    let best = Infinity
    for (let i = 0; i < dates.length; i++) {
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
        aria-label={`${series.length} sets across ${dates.length} sessions`}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        {[rawMax, rawMin].map((v, i) => (
          <g key={i}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} className="grid" />
            <text x={PAD.left - 6} y={y(v) + 3.5} className="axis-text" textAnchor="end">
              {round(v)}
            </text>
          </g>
        ))}

        {hover !== null && (
          <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + PLOT_H} className="crosshair" />
        )}

        {series.map((s, si) => (
          <path
            key={s.label}
            d={buildPath(s.values, x, y)}
            className="series-line"
            style={{ stroke: `var(--series-${si + 1})` }}
          />
        ))}

        {series.map((s, si) =>
          s.values.map((v, i) =>
            v == null ? null : (
              <circle
                key={`${s.label}-${i}`}
                cx={x(i)}
                cy={y(v)}
                r={i === active ? 5 : 4}
                className="series-dot"
                style={{ fill: `var(--series-${si + 1})` }}
              />
            ),
          ),
        )}

        <text x={PAD.left} y={H - 12} className="axis-text" textAnchor="start">
          {shortDate(dates[0])}
        </text>
        {dates.length > 1 && (
          <text x={W - PAD.right} y={H - 12} className="axis-text" textAnchor="end">
            {shortDate(dates[last])}
          </text>
        )}
      </svg>

      <div className="legend">
        <span className="legend-date">{shortDate(dates[active])}</span>
        {series.map((s, si) => {
          const v = s.values[active]
          return (
            <span key={s.label} className="legend-item">
              <span className="dot-key" style={{ background: `var(--series-${si + 1})` }} aria-hidden />
              {s.label}
              <strong>{v == null ? '—' : `${round(v)}${suffix}`}</strong>
            </span>
          )
        })}
      </div>
    </div>
  )
}
