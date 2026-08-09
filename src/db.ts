import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from './firebase'
import type { LoggedExercise, Plan, PlanExercise, Session } from './types'

const plansCol = (uid: string) => collection(db, 'users', uid, 'plans')
const sessionsCol = (uid: string) => collection(db, 'users', uid, 'sessions')

/* ---------- plans ---------- */

/**
 * Plans written before per-set rep targets stored `targetSets`/`targetReps`.
 * Expand those into a `sets` array on read so the rest of the app only ever
 * deals with one shape; the legacy fields disappear the next time it's saved.
 */
function normalizeExercise(x: PlanExercise): PlanExercise {
  if (Array.isArray(x.sets) && x.sets.length > 0) {
    return { id: x.id, name: x.name, sets: x.sets }
  }
  const count = Math.max(1, x.targetSets ?? 3)
  const reps = x.targetReps ?? 10
  return { id: x.id, name: x.name, sets: Array.from({ length: count }, () => ({ reps })) }
}

const normalizePlan = (plan: Plan): Plan => ({
  ...plan,
  exercises: (plan.exercises ?? []).map(normalizeExercise),
})

export async function listPlans(uid: string): Promise<Plan[]> {
  const snap = await getDocs(query(plansCol(uid), orderBy('createdAt', 'asc')))
  return snap.docs.map((d) => normalizePlan({ id: d.id, ...d.data() } as Plan))
}

export async function getPlan(uid: string, planId: string): Promise<Plan | null> {
  const snap = await getDoc(doc(plansCol(uid), planId))
  return snap.exists() ? normalizePlan({ id: snap.id, ...snap.data() } as Plan) : null
}

export async function savePlan(
  uid: string,
  plan: Pick<Plan, 'name' | 'exercises'> & { id?: string },
): Promise<string> {
  if (plan.id) {
    await setDoc(
      doc(plansCol(uid), plan.id),
      { name: plan.name, exercises: plan.exercises, updatedAt: serverTimestamp() },
      { merge: true },
    )
    return plan.id
  }
  const ref = await addDoc(plansCol(uid), {
    name: plan.name,
    exercises: plan.exercises,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

/** Exact number of logged workouts for a plan — server-side count, not a document read. */
export async function countSessionsForPlan(uid: string, planId: string) {
  const snap = await getCountFromServer(query(sessionsCol(uid), where('planId', '==', planId)))
  return snap.data().count
}

/**
 * Delete a plan and every workout logged with it. The sessions query is a lone
 * `where`, so it stays on an automatic single-field index.
 */
export async function deletePlanWithSessions(uid: string, planId: string) {
  const snap = await getDocs(query(sessionsCol(uid), where('planId', '==', planId)))
  // batches cap at 500 writes
  for (let i = 0; i < snap.docs.length; i += 400) {
    const batch = writeBatch(db)
    for (const d of snap.docs.slice(i, i + 400)) batch.delete(d.ref)
    await batch.commit()
  }
  await deleteDoc(doc(plansCol(uid), planId))
  return snap.size
}

/* ---------- sessions ---------- */

/**
 * Sessions ordered newest first. A single orderBy keeps this on the automatic
 * single-field index — no composite index deploy needed. "What did I lift last
 * time?" and the progress page are both computed from this list client-side,
 * which is plenty for one person's training history.
 */
export async function listSessions(uid: string, max = 300): Promise<Session[]> {
  const snap = await getDocs(query(sessionsCol(uid), orderBy('startedAt', 'desc'), limit(max)))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Session)
}

export async function saveSession(
  uid: string,
  session: { planId: string; planName: string; startedAt: Date; entries: LoggedExercise[] },
): Promise<string> {
  const ref = await addDoc(sessionsCol(uid), {
    planId: session.planId,
    planName: session.planName,
    startedAt: Timestamp.fromDate(session.startedAt),
    finishedAt: serverTimestamp(),
    entries: session.entries,
  })
  return ref.id
}

export async function deleteSession(uid: string, sessionId: string) {
  await deleteDoc(doc(sessionsCol(uid), sessionId))
}

/* ---------- derived ---------- */

/**
 * Exercises are matched by name, not id: the same lift gets a fresh id in every
 * plan it appears in, and "what did I bench last time?" shouldn't care whether
 * that was Push A or Push B.
 */
export const normName = (name: string) => name.trim().toLowerCase()

/** Most recent logged sets for each exercise name, across every session. */
export function lastPerformanceByExercise(sessions: Session[]) {
  const map = new Map<string, { date: Date; entry: LoggedExercise }>()
  // sessions arrive newest-first, so the first hit for a name is the latest one
  for (const s of sessions) {
    for (const entry of s.entries ?? []) {
      const key = normName(entry.name)
      if (!map.has(key) && entry.sets.length > 0) {
        map.set(key, { date: s.startedAt.toDate(), entry })
      }
    }
  }
  return map
}
