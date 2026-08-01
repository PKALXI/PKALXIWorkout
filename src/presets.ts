import type { PlanExercise } from './types'

const ex = (name: string, targetSets: number, targetReps: number): PlanExercise => ({
  id: crypto.randomUUID(),
  name,
  targetSets,
  targetReps,
})

/** Six-day Push/Pull/Legs, offered as a one-tap starting point on an empty account. */
export const PPL_SPLIT: { name: string; exercises: () => PlanExercise[] }[] = [
  {
    name: 'Push A',
    exercises: () => [
      ex('Barbell Bench Press', 4, 6),
      ex('Overhead Press', 3, 8),
      ex('Incline Dumbbell Press', 3, 10),
      ex('Cable Lateral Raise', 3, 15),
      ex('Triceps Pushdown', 3, 12),
    ],
  },
  {
    name: 'Pull A',
    exercises: () => [
      ex('Deadlift', 3, 5),
      ex('Pull Up', 4, 8),
      ex('Barbell Row', 3, 8),
      ex('Face Pull', 3, 15),
      ex('Barbell Curl', 3, 10),
    ],
  },
  {
    name: 'Legs A',
    exercises: () => [
      ex('Back Squat', 4, 6),
      ex('Romanian Deadlift', 3, 8),
      ex('Leg Press', 3, 12),
      ex('Leg Curl', 3, 12),
      ex('Standing Calf Raise', 4, 15),
    ],
  },
  {
    name: 'Push B',
    exercises: () => [
      ex('Overhead Press', 4, 6),
      ex('Incline Barbell Press', 3, 8),
      ex('Dumbbell Bench Press', 3, 10),
      ex('Lateral Raise', 4, 15),
      ex('Overhead Triceps Extension', 3, 12),
    ],
  },
  {
    name: 'Pull B',
    exercises: () => [
      ex('Barbell Row', 4, 6),
      ex('Lat Pulldown', 3, 10),
      ex('Chest Supported Row', 3, 10),
      ex('Rear Delt Fly', 3, 15),
      ex('Hammer Curl', 3, 12),
    ],
  },
  {
    name: 'Legs B',
    exercises: () => [
      ex('Front Squat', 4, 6),
      ex('Hip Thrust', 3, 10),
      ex('Bulgarian Split Squat', 3, 10),
      ex('Leg Extension', 3, 15),
      ex('Seated Calf Raise', 4, 15),
    ],
  },
]
