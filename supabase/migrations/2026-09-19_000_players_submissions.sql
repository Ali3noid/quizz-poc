begin;

create extension if not exists pgcrypto;

create table public.players (
  id uuid primary key default gen_random_uuid(),
  nickname text not null check (char_length(trim(nickname)) between 3 and 30),
  password_hash text not null check (char_length(password_hash) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Login uses a case-insensitive lookup, so the database must prevent variants
-- such as "Player" and "player" from being registered separately.
create unique index players_nickname_lower_key on public.players (lower(nickname));

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  nickname text not null,
  riddle_id text not null,
  hints_used integer not null default 0 check (hints_used >= 0),
  is_correct boolean not null,
  created_at timestamptz not null default now()
);

create index submissions_player_riddle_created_at_idx
  on public.submissions (player_id, riddle_id, created_at);

alter table public.players enable row level security;
alter table public.submissions enable row level security;
revoke all on public.players, public.submissions from anon, authenticated;

commit;
