import type { Timestamp } from 'firebase/firestore'

/** One exercise as it appears in a saved plan (the template, not a logged result). */
export interface PlanExercise {
  id: string
  name: string
  targetSets: number
  targetReps: number
}

/** A named day of a split, e.g. "Push A". Stored at users/{uid}/plans/{planId}. */
export interface Plan {
  id: string
  name: string
  exercises: PlanExercise[]
  createdAt?: Timestamp
  updatedAt?: Timestamp
}

/** One set actually performed. Weight is in whatever unit the user picked. */
export interface LoggedSet {
  reps: number
  weight: number
}

/** All sets performed for one exercise during one session. */
export interface LoggedExercise {
  exerciseId: string
  name: string
  sets: LoggedSet[]
}

/** A completed workout. Stored at users/{uid}/sessions/{sessionId}. */
export interface Session {
  id: string
  planId: string
  planName: string
  startedAt: Timestamp
  finishedAt?: Timestamp
  entries: LoggedExercise[]
}

export type WeightUnit = 'kg' | 'lb'
