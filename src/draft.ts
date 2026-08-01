import type { LoggedExercise } from './types'

export interface WorkoutDraft {
  planId: string
  startedAt: string // ISO
  index: number
  entries: LoggedExercise[]
}

const key = (planId: string) => `pkalxi.draft.${planId}`

/**
 * A workout in progress is kept in localStorage, not Firestore: phones lock and
 * browsers get killed mid-session, and only the finished workout is worth syncing.
 */
export function loadDraft(planId: string): WorkoutDraft | null {
  try {
    const raw = localStorage.getItem(key(planId))
    return raw ? (JSON.parse(raw) as WorkoutDraft) : null
  } catch {
    return null
  }
}

export function saveDraft(draft: WorkoutDraft) {
  localStorage.setItem(key(draft.planId), JSON.stringify(draft))
}

export function clearDraft(planId: string) {
  localStorage.removeItem(key(planId))
}

export function hasDraft(planId: string) {
  return localStorage.getItem(key(planId)) !== null
}
