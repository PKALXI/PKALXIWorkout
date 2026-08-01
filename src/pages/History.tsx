import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth'
import { deleteSession, listSessions } from '../db'
import type { Session } from '../types'
import { daysAgo, fmtDateFull, fmtWeight, useUnit } from '../units'

export default function History() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState<string | null>(null)
  const [unit] = useUnit()

  const load = useCallback(async () => {
    if (!user) return
    setSessions(await listSessions(user.uid))
    setLoading(false)
  }, [user])

  useEffect(() => {
    void load()
  }, [load])

  async function remove(id: string) {
    if (!user) return
    if (!confirm('Delete this logged workout? This cannot be undone.')) return
    await deleteSession(user.uid, id)
    await load()
  }

  if (loading) {
    return (
      <div className="centered">
        <div className="spinner" />
      </div>
    )
  }

  return (
    <div className="page">
      <header className="page-head">
        <h1>History</h1>
      </header>

      {sessions.length === 0 ? (
        <div className="empty">
          <p className="empty-icon" aria-hidden>
            🗓️
          </p>
          <h2>No workouts logged</h2>
          <p className="muted">Tap Start on a plan to log your first one.</p>
        </div>
      ) : (
        <ul className="card-list">
          {sessions.map((s) => {
            const date = s.startedAt.toDate()
            const sets = s.entries.reduce((n, e) => n + e.sets.length, 0)
            const isOpen = open === s.id
            return (
              <li key={s.id} className="card card-stack">
                <button className="session-head" onClick={() => setOpen(isOpen ? null : s.id)}>
                  <div>
                    <h2 className="card-title">{s.planName}</h2>
                    <p className="muted small">
                      {fmtDateFull(date)} · {daysAgo(date)} · {s.entries.length} exercises · {sets}{' '}
                      sets
                    </p>
                  </div>
                  <span className="chevron" aria-hidden>
                    {isOpen ? '▲' : '▼'}
                  </span>
                </button>

                {isOpen && (
                  <>
                    <ul className="session-detail">
                      {s.entries.map((e) => (
                        <li key={e.exerciseId}>
                          <p className="detail-name">{e.name}</p>
                          <div className="pill-row">
                            {e.sets.map((set, i) => (
                              <span key={i} className="pill pill-sm">
                                {fmtWeight(set.weight, unit)} × {set.reps}
                              </span>
                            ))}
                          </div>
                        </li>
                      ))}
                    </ul>
                    <button className="btn btn-danger btn-sm btn-block" onClick={() => void remove(s.id)}>
                      Delete workout
                    </button>
                  </>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
