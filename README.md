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

Run the migrations once in the Supabase SQL Editor, in filename order:

1. `supabase/migrations/20260919000000_quiz_schema.sql` creates players, riddles, submissions, persistent progress, and the atomic hint/attempt functions.
2. `supabase/migrations/20260921000000_ranking_view.sql` creates the ranking view.
3. `supabase/migrations/20260922000000_category_voting.sql` adds fixed riddle categories, persisted three-option polls, weighted votes, and admin authorization.
4. `supabase/migrations/20260925000000_riddle_timing_and_bonuses.sql` adds idempotent start/completion timing and derives dynamic time bonuses and total points in the ranking view.
5. `supabase/migrations/20260925010000_time_bonus_eligibility.sql` excludes past and already-active riddles from time bonuses while enabling bonuses for scheduled and newly added riddles.

The category-voting migration backfills the known company and island riddles. It stops if another existing riddle has no explicit category mapping, so assign that row in the migration before applying it rather than accepting an incorrect default.

Run `npm test` for duration-format unit tests and `supabase test db --local` for the transactional database regression suite. The database test always rolls its fixture data back.

Add a new riddle using `supabase/examples/add-riddle.sql`, including one of the fixed category values and explicit ISO `timestamptz` values. Activity windows are half-open, `[starts_at, ends_at)`; overlapping schedules are rejected by the database. Its three poll options are generated once by a database trigger.

Grant admin access to an existing player manually:

```sql
insert into public.admins (player_id)
select id from public.players where lower(nickname) = lower('PLAYER_NICKNAME');
```
