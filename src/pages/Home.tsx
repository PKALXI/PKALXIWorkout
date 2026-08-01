import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import { deletePlan, listPlans, listSessions, savePlan } from '../db'
import { PPL_SPLIT } from '../presets'
import type { Plan, Session } from '../types'
import { daysAgo, useUnit } from '../units'
import { clearDraft, hasDraft } from '../draft'

export default function Home() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [plans, setPlans] = useState<Plan[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [unit, setUnit] = useUnit()

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const [p, s] = await Promise.all([listPlans(user.uid), listSessions(user.uid, 60)])
    setPlans(p)
    setSessions(s)
    setLoading(false)
  }, [user])

  useEffect(() => {
    void load()
  }, [load])

  async function seedPPL() {
    if (!user) return
    setSeeding(true)
    // sequential so createdAt ordering matches the split order
    for (const day of PPL_SPLIT) {
      await savePlan(user.uid, { name: day.name, exercises: day.exercises() })
    }
    await load()
    setSeeding(false)
  }

  async function removePlan(plan: Plan) {
    if (!user) return
    if (!confirm(`Delete "${plan.name}"? Workouts you already logged with it are kept.`)) return
    setPlans((ps) => ps.filter((p) => p.id !== plan.id))
    clearDraft(plan.id)
    await deletePlan(user.uid, plan.id)
  }

  const lastDone = (planId: string) => sessions.find((s) => s.planId === planId)

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
        <div>
          <p className="eyebrow">{user?.displayName?.split(' ')[0] ?? 'Welcome'}</p>
          <h1>Your plans</h1>
        </div>
        <div className="head-actions">
          <button
            className="chip"
            onClick={() => setUnit(unit === 'kg' ? 'lb' : 'kg')}
            title="Toggle weight unit"
          >
            {unit}
          </button>
          <button className="chip" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      </header>

      {plans.length === 0 ? (
        <div className="empty">
          <p className="empty-icon" aria-hidden>
            📋
          </p>
          <h2>No plans yet</h2>
          <p className="muted">
            A plan is one day of your split — a list of exercises with target sets and reps.
          </p>
          <button className="btn btn-primary btn-lg" onClick={() => void seedPPL()} disabled={seeding}>
            {seeding ? 'Creating…' : 'Start with a 6-day PPL split'}
          </button>
          <Link className="btn btn-ghost" to="/plan/new">
            Build my own
          </Link>
        </div>
      ) : (
        <>
          <ul className="card-list">
            {plans.map((plan) => {
              const last = lastDone(plan.id)
              const resumable = hasDraft(plan.id)
              return (
                <li key={plan.id} className="card">
                  <div className="card-main">
                    <h2 className="card-title">{plan.name}</h2>
                    <p className="muted small">
                      {plan.exercises.length} exercise{plan.exercises.length === 1 ? '' : 's'}
                      {last ? ` · last done ${daysAgo(last.startedAt.toDate())}` : ' · never done'}
                    </p>
                  </div>
                  <div className="card-actions">
                    <Link
                      className="icon-btn"
                      to={`/plan/${plan.id}`}
                      aria-label={`Edit ${plan.name}`}
                      title="Edit"
                    >
                      ✏️
                    </Link>
                    <button
                      className="icon-btn icon-btn-danger"
                      onClick={() => void removePlan(plan)}
                      aria-label={`Delete ${plan.name}`}
                      title="Delete"
                    >
                      🗑
                    </button>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => navigate(`/workout/${plan.id}`)}
                    >
                      {resumable ? 'Resume' : 'Start'}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
          <Link className="btn btn-ghost btn-block" to="/plan/new">
            + New plan
          </Link>
        </>
      )}
    </div>
  )
}
