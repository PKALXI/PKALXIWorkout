import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth'
import { listSessions, normName } from '../db'
import type { LoggedSet, Session } from '../types'
import { fmtDate, fmtWeight, useUnit } from '../units'
import LineChart, { MAX_SERIES, type Series } from '../components/LineChart'

type Metric = 'top' | 'e1rm' | 'volume'

const METRICS: { id: Metric; label: string; help: string }[] = [
  { id: 'top', label: 'Weight', help: 'One line per set — the weight you used on that set' },
  { id: 'e1rm', label: 'Est. 1RM', help: 'Per set, Epley estimate: weight × (1 + reps ÷ 30)' },
  { id: 'volume', label: 'Volume', help: 'Per set, weight × reps. The stat is the session total.' },
]

const topSet = (sets: LoggedSet[]) =>
  sets.reduce((best, s) => (s.weight > best.weight ? s : best), sets[0])

const e1rm = (sets: LoggedSet[]) =>
  Math.max(...sets.map((s) => s.weight * (1 + s.reps / 30)))

const volume = (sets: LoggedSet[]) => sets.reduce((sum, s) => sum + s.weight * s.reps, 0)

/** Session-level number for the headline stat and the table. */
function measure(metric: Metric, sets: LoggedSet[]) {
  if (metric === 'top') return topSet(sets).weight
  if (metric === 'e1rm') return e1rm(sets)
  return volume(sets)
}

/** Same metric for a single set — this is what each line in the chart plots. */
function measureSet(metric: Metric, set: LoggedSet) {
  if (metric === 'top') return set.weight
  if (metric === 'e1rm') return set.weight * (1 + set.reps / 30)
  return set.weight * set.reps
}

interface ExerciseHistory {
  key: string
  name: string
  /** oldest first, so the chart reads left to right */
  points: { date: Date; sets: LoggedSet[] }[]
}

function buildHistories(sessions: Session[]): ExerciseHistory[] {
  const map = new Map<string, ExerciseHistory>()
  // sessions are newest-first; unshift to end up oldest-first
  for (const s of sessions) {
    for (const entry of s.entries ?? []) {
      if (!entry.sets?.length) continue
      const key = normName(entry.name)
      const hist = map.get(key) ?? { key, name: entry.name, points: [] }
      hist.points.unshift({ date: s.startedAt.toDate(), sets: entry.sets })
      map.set(key, hist)
    }
  }
  return [...map.values()].sort(
    (a, b) => b.points[b.points.length - 1].date.getTime() - a.points[a.points.length - 1].date.getTime(),
  )
}

export default function Progress() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [metric, setMetric] = useState<Metric>('top')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [unit] = useUnit()

  useEffect(() => {
    if (!user) return
    void listSessions(user.uid).then((s) => {
      setSessions(s)
      setLoading(false)
    })
  }, [user])

  const histories = useMemo(() => buildHistories(sessions), [sessions])
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? histories.filter((h) => h.name.toLowerCase().includes(q)) : histories
  }, [histories, search])

  if (loading) {
    return (
      <div className="centered">
        <div className="spinner" />
      </div>
    )
  }

  if (histories.length === 0) {
    return (
      <div className="page">
        <header className="page-head">
          <h1>Progress</h1>
        </header>
        <div className="empty">
          <p className="empty-icon" aria-hidden>
            📈
          </p>
          <h2>Nothing logged yet</h2>
          <p className="muted">Finish a workout and your numbers will show up here.</p>
        </div>
      </div>
    )
  }

  const suffix = unit
  const activeMetric = METRICS.find((m) => m.id === metric)!

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Progress</h1>
          <p className="muted small">
            {sessions.length} workout{sessions.length === 1 ? '' : 's'} · {histories.length}{' '}
            exercises tracked
          </p>
        </div>
      </header>

      <div className="segmented" role="tablist" aria-label="Metric">
        {METRICS.map((m) => (
          <button
            key={m.id}
            role="tab"
            aria-selected={metric === m.id}
            className={`segment ${metric === m.id ? 'is-active' : ''}`}
            onClick={() => setMetric(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>
      <p className="muted small metric-help">{activeMetric.help}</p>

      <input
        className="input"
        placeholder="Search exercises"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <ul className="card-list">
        {filtered.map((h) => {
          const dates = h.points.map((p) => p.date)
          const sessionValues = h.points.map((p) => Math.round(measure(metric, p.sets) * 10) / 10)
          const setCount = Math.min(
            MAX_SERIES,
            h.points.reduce((n, p) => Math.max(n, p.sets.length), 0),
          )
          const series: Series[] = Array.from({ length: setCount }, (_, k) => ({
            label: `Set ${k + 1}`,
            values: h.points.map((p) =>
              p.sets[k] ? Math.round(measureSet(metric, p.sets[k]) * 10) / 10 : null,
            ),
          }))
          const first = sessionValues[0]
          const latest = sessionValues[sessionValues.length - 1]
          const delta = latest - first
          const pct = first > 0 ? (delta / first) * 100 : 0
          const isOpen = expanded === h.key

          return (
            <li key={h.key} className="card card-stack">
              <div className="progress-head">
                <div>
                  <h2 className="card-title">{h.name}</h2>
                  <p className="muted small">
                    {dates.length} session{dates.length === 1 ? '' : 's'} · {fmtDate(dates[0])} →{' '}
                    {fmtDate(dates[dates.length - 1])}
                  </p>
                </div>
                <div className="stat">
                  <span className="stat-value">
                    {metric === 'volume' ? Math.round(latest).toLocaleString() : latest}
                    <span className="stat-unit">{suffix}</span>
                  </span>
                  {dates.length > 1 && (
                    <span className={`delta ${delta > 0 ? 'up' : delta < 0 ? 'down' : ''}`}>
                      {delta > 0 ? '▲' : delta < 0 ? '▼' : '–'} {Math.abs(Math.round(pct))}%
                    </span>
                  )}
                </div>
              </div>

              <LineChart dates={dates} series={series} suffix={suffix} />

              <button
                className="btn btn-ghost btn-sm btn-block"
                onClick={() => setExpanded(isOpen ? null : h.key)}
                aria-expanded={isOpen}
              >
                {isOpen ? 'Hide sessions' : 'Show all sessions'}
              </button>

              {isOpen && (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Sets</th>
                      <th className="num">{activeMetric.label}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...h.points].reverse().map((p, i) => (
                      <tr key={i}>
                        <td>{fmtDate(p.date)}</td>
                        <td className="sets-cell">
                          {p.sets.map((s, j) => (
                            <span key={j} className="pill pill-sm">
                              {fmtWeight(s.weight, unit)} × {s.reps}
                            </span>
                          ))}
                        </td>
                        <td className="num">
                          {Math.round(measure(metric, p.sets) * 10) / 10}
                          {suffix}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
