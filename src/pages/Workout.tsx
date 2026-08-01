import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth'
import { getPlan, lastPerformanceByExercise, listSessions, normName, saveSession } from '../db'
import { clearDraft, loadDraft, saveDraft } from '../draft'
import type { LoggedExercise, LoggedSet, Plan, Session } from '../types'
import { daysAgo, fmtWeight, useUnit } from '../units'

/** Sets to show for an exercise the user has done before: repeat last time's numbers. */
function prefill(targetSets: number, targetReps: number, last?: LoggedExercise): LoggedSet[] {
  const count = Math.max(targetSets, last?.sets.length ?? 0)
  return Array.from({ length: count }, (_, i) => {
    const source = last?.sets[i] ?? last?.sets[last.sets.length - 1]
    return { weight: source?.weight ?? 0, reps: source?.reps ?? targetReps }
  })
}

export default function Workout() {
  const { planId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [unit] = useUnit()

  const [plan, setPlan] = useState<Plan | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [entries, setEntries] = useState<LoggedExercise[]>([])
  const [index, setIndex] = useState(0)
  const [startedAt, setStartedAt] = useState(() => new Date())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user || !planId) return
    let cancelled = false
    void (async () => {
      const [p, s] = await Promise.all([getPlan(user.uid, planId), listSessions(user.uid, 120)])
      if (cancelled || !p) {
        if (!p) navigate('/')
        return
      }
      const lastMap = lastPerformanceByExercise(s)
      const draft = loadDraft(planId)
      setPlan(p)
      setSessions(s)
      if (draft) {
        setEntries(draft.entries)
        setIndex(Math.min(draft.index, p.exercises.length - 1))
        setStartedAt(new Date(draft.startedAt))
      } else {
        setEntries(
          p.exercises.map((x) => ({
            exerciseId: x.id,
            name: x.name,
            sets: prefill(x.targetSets, x.targetReps, lastMap.get(normName(x.name))?.entry),
          })),
        )
      }
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [user, planId, navigate])

  // keep the draft warm on every edit so a locked phone loses nothing
  useEffect(() => {
    if (loading || !planId || entries.length === 0) return
    saveDraft({ planId, startedAt: startedAt.toISOString(), index, entries })
  }, [loading, planId, startedAt, index, entries])

  const lastMap = useMemo(() => lastPerformanceByExercise(sessions), [sessions])

  const updateSet = useCallback(
    (setIdx: number, patch: Partial<LoggedSet>) => {
      setEntries((es) =>
        es.map((e, i) =>
          i === index
            ? { ...e, sets: e.sets.map((s, j) => (j === setIdx ? { ...s, ...patch } : s)) }
            : e,
        ),
      )
    },
    [index],
  )

  function addSet() {
    setEntries((es) =>
      es.map((e, i) =>
        i === index ? { ...e, sets: [...e.sets, { ...(e.sets.at(-1) ?? { weight: 0, reps: 8 }) }] } : e,
      ),
    )
  }

  function removeSet(setIdx: number) {
    setEntries((es) =>
      es.map((e, i) => (i === index ? { ...e, sets: e.sets.filter((_, j) => j !== setIdx) } : e)),
    )
  }

  async function finish() {
    if (!user || !plan || !planId) return
    setSaving(true)
    const kept = entries
      .map((e) => ({ ...e, sets: e.sets.filter((s) => s.reps > 0) }))
      .filter((e) => e.sets.length > 0)
    if (kept.length === 0) {
      clearDraft(planId)
      navigate('/')
      return
    }
    await saveSession(user.uid, {
      planId,
      planName: plan.name,
      startedAt,
      entries: kept,
    })
    clearDraft(planId)
    navigate('/history')
  }

  function quit() {
    if (!planId) return
    if (confirm('Leave this workout? Your entries are saved on this device and you can resume.'))
      navigate('/')
  }

  if (loading || !plan) {
    return (
      <div className="centered">
        <div className="spinner" />
      </div>
    )
  }

  const planExercise = plan.exercises[index]
  const entry = entries[index]
  const last = lastMap.get(normName(planExercise.name))
  const isLast = index === plan.exercises.length - 1
  const pct = ((index + 1) / plan.exercises.length) * 100

  return (
    <div className="workout">
      <header className="workout-head">
        <div className="workout-head-top">
          <button className="chip" onClick={quit}>
            ✕ Exit
          </button>
          <span className="muted small">
            {plan.name} · {index + 1} of {plan.exercises.length}
          </span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </header>

      <div className="workout-body">
        <h1 className="exercise-name">{planExercise.name}</h1>
        <p className="target">
          Target {planExercise.targetSets} × {planExercise.targetReps}
        </p>

        {last ? (
          <div className="last-time">
            <p className="last-time-label">Last time · {daysAgo(last.date)}</p>
            <div className="pill-row">
              {last.entry.sets.map((s, i) => (
                <span key={i} className="pill">
                  {fmtWeight(s.weight, unit)} × {s.reps}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="last-time">
            <p className="last-time-label">First time logging this one 💪</p>
          </div>
        )}

        <ul className="set-list">
          {entry.sets.map((s, i) => (
            <li key={i} className="set-row">
              <span className="set-num">{i + 1}</span>
              <label className="set-input">
                <span>weight ({unit})</span>
                <input
                  className="input input-num"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.5"
                  value={s.weight}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => updateSet(i, { weight: Math.max(0, +e.target.value || 0) })}
                />
              </label>
              <span className="times">×</span>
              <label className="set-input">
                <span>reps</span>
                <input
                  className="input input-num"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={s.reps}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => updateSet(i, { reps: Math.max(0, +e.target.value || 0) })}
                />
              </label>
              <button className="icon-btn" aria-label={`Remove set ${i + 1}`} onClick={() => removeSet(i)}>
                ✕
              </button>
            </li>
          ))}
        </ul>

        <button className="btn btn-ghost btn-block" onClick={addSet}>
          + Add set
        </button>
      </div>

      <footer className="workout-foot">
        <button
          className="btn btn-ghost btn-lg"
          onClick={() => setIndex((i) => i - 1)}
          disabled={index === 0}
        >
          Back
        </button>
        {isLast ? (
          <button className="btn btn-primary btn-lg grow" onClick={() => void finish()} disabled={saving}>
            {saving ? 'Saving…' : 'Finish workout'}
          </button>
        ) : (
          <button className="btn btn-primary btn-lg grow" onClick={() => setIndex((i) => i + 1)}>
            Next
          </button>
        )}
      </footer>
    </div>
  )
}
