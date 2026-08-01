# Workout Tracker

Phone-first workout logger. Build the days of your split, hit **Start**, and the app
walks you through it one exercise at a time — showing what you lifted last time so you
know what to beat. Firebase Auth (Google) + Firestore, deployed on Firebase Hosting.

## Features

- **Google sign-in** — your data, your account.
- **Plans** — one per day of your split. Create your own or start from a built-in 6-day
  Push/Pull/Legs template.
- **Guided workouts** — one exercise per screen with your last session's sets shown and
  pre-filled, so logging is usually just tapping *Next*. An interrupted workout resumes.
- **Progress** — per-exercise charts of top set, estimated 1RM, or total volume, plus a
  full table of every session.
- **History** — every logged workout, expandable set by set.

## Running it

```bash
npm install
cp .env.example .env.local   # fill in from Firebase console → Project settings → Your apps
npm run dev -- --host        # --host lets you open it on your phone
```

## Deploying

```bash
npm run build
npx firebase deploy
```

See [CLAUDE.md](./CLAUDE.md) for architecture and conventions.
