import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth'
import { countSessionsForPlan, deletePlanWithSessions, getPlan, savePlan } from '../db'
import { clearDraft } from '../draft'
import NumberField from '../components/NumberField'
import type { PlanExercise } from '../types'

const blankExercise = (): PlanExercise => ({
  id: crypto.randomUUID(),
  name: '',
  targetSets: 3,
  targetReps: 10,
})

export default function PlanEditor() {
  const { planId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const isNew = !planId

  const [name, setName] = useState('')
  const [exercises, setExercises] = useState<PlanExercise[]>([blankExercise()])
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user || !planId) return
    void getPlan(user.uid, planId).then((plan) => {
      if (plan) {
        setName(plan.name)
        setExercises(plan.exercises.length ? plan.exercises : [blankExercise()])
      }
      setLoading(false)
    })
  }, [user, planId])

  function update(id: string, patch: Partial<PlanExercise>) {
    setExercises((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x)))
  }

  function move(index: number, delta: number) {
    setExercises((xs) => {
      const next = [...xs]
      const target = index + delta
      if (target < 0 || target >= next.length) return xs
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  async function handleSave() {
    if (!user) return
    const cleaned = exercises
      .map((x) => ({ ...x, name: x.name.trim() }))
      .filter((x) => x.name.length > 0)
    if (!name.trim() || cleaned.length === 0) return
    setSaving(true)
    await savePlan(user.uid, { id: planId, name: name.trim(), exercises: cleaned })
    navigate('/')
  }

  async function handleDelete() {
    if (!user || !planId) return
    const logged = await countSessionsForPlan(user.uid, planId)
    const tail = logged
      ? `\n\nThis also deletes ${logged} logged workout${logged === 1 ? '' : 's'} — they disappear from History and Progress. This can't be undone.`
      : ''
    if (!confirm(`Delete "${name}"?${tail}`)) return
    clearDraft(planId)
    await deletePlanWithSessions(user.uid, planId)
    navigate('/')
  }

  if (loading) {
    return (
      <div className="centered">
        <div className="spinner" />
      </div>
    )
  }

  const valid = name.trim().length > 0 && exercises.some((x) => x.name.trim().length > 0)

  return (
    <div className="page">
      <header className="page-head">
        <button className="chip" onClick={() => navigate('/')}>
          ← Back
        </button>
        <h1 className="head-title">{isNew ? 'New plan' : 'Edit plan'}</h1>
      </header>

      <label className="field">
        <span className="field-label">Plan name</span>
        <input
          className="input"
          value={name}
          placeholder="Push A"
          autoFocus={isNew}
          onChange={(e) => setName(e.target.value)}
        />
      </label>

      <h2 className="section-title">Exercises</h2>

      <ul className="exercise-list">
        {exercises.map((x, i) => (
          <li key={x.id} className="exercise-row">
            <div className="exercise-row-top">
              <input
                className="input"
                value={x.name}
                placeholder={`Exercise ${i + 1}`}
                onChange={(e) => update(x.id, { name: e.target.value })}
              />
              <button
                className="icon-btn"
                aria-label="Remove exercise"
                onClick={() => setExercises((xs) => xs.filter((e) => e.id !== x.id))}
              >
                ✕
              </button>
            </div>
            <div className="exercise-row-bottom">
              <NumberField
                label="Sets"
                value={x.targetSets}
                onChange={(n) => update(x.id, { targetSets: n })}
                min={1}
                max={20}
                steppers
              />
              <NumberField
                label="Reps"
                value={x.targetReps}
                onChange={(n) => update(x.id, { targetReps: n })}
                min={1}
                max={100}
                steppers
              />
              <div className="reorder">
                <button className="icon-btn" aria-label="Move up" onClick={() => move(i, -1)}>
                  ↑
                </button>
                <button className="icon-btn" aria-label="Move down" onClick={() => move(i, 1)}>
                  ↓
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <button
        className="btn btn-ghost btn-block"
        onClick={() => setExercises((xs) => [...xs, blankExercise()])}
      >
        + Add exercise
      </button>

      <div className="stack">
        <button
          className="btn btn-primary btn-lg btn-block"
          onClick={() => void handleSave()}
          disabled={!valid || saving}
        >
          {saving ? 'Saving…' : 'Save plan'}
        </button>
        {!isNew && (
          <button className="btn btn-danger btn-block" onClick={() => void handleDelete()}>
            Delete plan
          </button>
        )}
      </div>
    </div>
  )
}
