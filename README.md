# Quiz PoC

A multi-riddle SvelteKit quiz with persistent player progress stored in Supabase.

## Running locally

Install dependencies with `npm install` (or `pnpm install` or `yarn`), then start the development server:

```sh
npm run dev

# start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

Create a production build with:

```sh
npm run build
```

Copy `empty.env` to `.env.local`, then set `GATE_PASSWORD`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY`. Do not commit `.env.local`.

## Migrations and new riddles

Run `supabase/migrations/202609190001_multi_riddle_progress.sql` once in the Supabase SQL Editor. It assumes the existing `players` and `submissions` tables are empty, so it does not backfill historical results. The migration creates riddles, persistent progress, and atomic functions for hints and attempts.

Add a new riddle using `supabase/examples/add-riddle.sql`, with explicit ISO `timestamptz` values. Activity windows are half-open, `[starts_at, ends_at)`; overlapping schedules are rejected by the database.
