# CLAUDE.md

Guidance for Claude Code working in this repo.

## What this is

A phone-first workout tracker. You build plans (one per day of your split, e.g. a
6-day PPL), tap **Start**, and the app walks you through the exercises one screen at
a time, showing what you lifted last time so you know what to beat. Everything is
per-user and lives in Firestore.

Vite + React 19 + TypeScript, Firebase Auth (Google) + Firestore, deployed on
Firebase Hosting. No UI library — plain CSS with custom properties in
`src/index.css`.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on :5173. `-- --host` to reach it from your phone. |
| `npm run build` | Typecheck (`tsc -b`) then build to `dist/`. |
| `npm run preview` | Serve the production build locally. |
| `npm run lint` | oxlint. |
| `firebase deploy` | Hosting + Firestore rules. Run `npm run build` first. |
| `firebase deploy --only hosting` | Ship the app without touching rules. |

## Setup

Config comes from `.env.local` (gitignored) — see `.env.example` for the keys.
Values are in Firebase console → Project settings → Your apps → Web app.
Without them the app renders `src/pages/Setup.tsx` instead of crashing, so
`npm run dev` still boots on a fresh clone.

## Layout

```
src/
  firebase.ts    Firebase init; exports `isConfigured` so a missing .env.local degrades gracefully
  auth.tsx       AuthProvider + useAuth (Google popup sign-in)
  db.ts          All Firestore reads/writes + derived helpers. Nothing else talks to Firestore.
  types.ts       Plan / PlanExercise / Session / LoggedExercise / LoggedSet
  draft.ts       In-progress workout persisted to localStorage
  units.ts       kg/lb preference + date formatting
  presets.ts     The starter 6-day PPL split
  components/    NavBar, LineChart
  pages/         Login, Setup, Home, PlanEditor, Workout, Progress, History
```

## Data model

```
users/{uid}/plans/{planId}      { name, exercises: [{ id, name, sets: [{ reps }] }], createdAt, updatedAt }
users/{uid}/sessions/{sessionId} { planId, planName, startedAt, finishedAt,
                                   entries: [{ exerciseId, name, sets: [{ weight, reps }] }] }
```

**Rep targets are per set** — `sets: [{reps:5},{reps:5},{reps:8},{reps:12}]` — so ladders and
drop sets are expressible. Older plans stored `targetSets`/`targetReps`; `normalizeExercise`
in `db.ts` expands those into `sets` on read, and the legacy fields are dropped the next
time the plan is saved. Read paths must go through `listPlans`/`getPlan` so nothing else
ever sees the old shape.

A **plan** is a template (one day of the split). A **session** is one performance of
it, denormalised — it stores the exercise names and the sets actually done, so editing
a plan never rewrites past sessions.

**Deleting a plan is a cascade**: `deletePlanWithSessions` removes the plan *and* every
session with that `planId`, so the workouts leave History and Progress too. Both delete
paths (the trash button on a plan card, and Delete plan in the editor) go through it,
and both confirm with the exact session count from `countSessionsForPlan`. There is no
undo — if you add a "keep the history" variant later, it needs its own function rather
than a flag, so the destructive one stays obvious at the call site.

## Conventions worth keeping

- **All Firestore access goes through `src/db.ts`.** Pages call those functions; they
  never import `firebase/firestore` directly.
- **Queries use a single `orderBy` on purpose.** `listSessions` pulls recent sessions
  newest-first and everything else — "what did I lift last time", the progress charts —
  is derived client-side. That keeps the app on Firestore's automatic single-field
  indexes, so `firestore.indexes.json` stays empty and deploys need no index wait. If
  you add a `where` + `orderBy` query, you have signed up for a composite index.
- **Exercises match by normalised name (`normName`), not id.** Each plan generates its
  own uuid for an exercise, so "Barbell Row" in Pull A and Pull B must still share a
  history. Anything comparing exercises across sessions uses the name key.
- **Sessions are append-only from the workout screen.** The in-progress workout lives in
  localStorage (`draft.ts`) and is written to Firestore once, on Finish. Phones lock
  mid-set; don't move this to per-set writes without a reason.
- **Weight unit is display-only.** Numbers are stored unitless; `units.ts` decides how
  they're shown. Don't convert on write.

## Mobile rules (this app is used on a phone, in a gym)

- Tap targets ≥ 44px (`--tap`), primary actions ≥ 52px and within thumb reach.
- Inputs are `font-size: 16px` — anything smaller makes iOS Safari zoom on focus.
- Layout respects `env(safe-area-inset-*)`; `index.html` sets `viewport-fit=cover`.
- Use `100dvh`, never `100vh` (mobile browser chrome).
- Light and dark are both hand-picked token sets in `:root` — don't invert one to get
  the other.

## Charts

`components/LineChart.tsx` plots **one line per set** — set 1's weight over time, set 2's,
and so on — so you can see whether your later sets are catching up to your first.

Rules it follows, which any change should preserve:

- **Colors are `--series-1` … `--series-8`, assigned by set number, in fixed order.**
  Both light and dark steps are validated (adjacent CVD ΔE 9.1 light / 8.4 dark;
  normal-vision 19.6 / 19.3). Never cycle past 8 — `MAX_SERIES` caps the chart and the
  rest of the sets stay in the table. Don't add a hue by eye; re-run the palette
  validator.
- **The legend is always present** and doubles as the hover readout: it names every set
  and fills in that set's value for the highlighted session. Text uses text tokens — the
  swatch carries identity, never colored type.
- Three light-mode slots sit under 3:1 contrast, so the **table view behind "Show all
  sessions" is required relief**, not optional. Don't remove it.
- 2px lines, ≥8px markers with a 2px surface ring, hairline gridlines at the extremes
  only. Missing sets **break the line** rather than bridging the gap (`buildPath`).

## Security

`firestore.rules` scopes every document to `users/{uid}` and allows access only to that
signed-in user. Any new collection must live under that path, or the rules need updating
deliberately.
