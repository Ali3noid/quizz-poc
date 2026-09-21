begin;

create extension if not exists pgcrypto;
create extension if not exists btree_gist;

create table public.players (
  id uuid primary key default gen_random_uuid(),
  nickname text not null check (char_length(trim(nickname)) between 3 and 30),
  password_hash text not null check (char_length(password_hash) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Login uses a case-insensitive lookup, so variants such as "Player" and
-- "player" cannot be registered separately.
create unique index players_nickname_lower_key on public.players (lower(nickname));

create table public.riddles (
  id text primary key,
  question text not null check (length(trim(question)) > 0),
  images jsonb not null default '[]'::jsonb check (jsonb_typeof(images) = 'array'),
  hints jsonb not null default '[]'::jsonb check (jsonb_typeof(hints) = 'array' and jsonb_array_length(hints) between 0 and 5),
  answers text[] not null check (cardinality(answers) > 0),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (starts_at < ends_at),
  exclude using gist (tstzrange(starts_at, ends_at, '[)') with &&)
);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  nickname text not null,
  riddle_id text not null references public.riddles(id) on delete cascade,
  hints_used integer not null default 0 check (hints_used >= 0),
  is_correct boolean not null,
  created_at timestamptz not null default now()
);

create index submissions_player_riddle_created_at_idx
  on public.submissions (player_id, riddle_id, created_at);

create table public.player_riddle_progress (
  player_id uuid not null references public.players(id) on delete cascade,
  riddle_id text not null references public.riddles(id) on delete cascade,
  hints_revealed integer not null default 0 check (hints_revealed between 0 and 5),
  attempts_count integer not null default 0 check (attempts_count >= 0),
  last_attempt_hint_index integer,
  solved_at timestamptz,
  exhausted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (player_id, riddle_id),
  check (solved_at is null or exhausted_at is null),
  check (last_attempt_hint_index is null or last_attempt_hint_index between 0 and 5)
);

create index player_riddle_progress_riddle_id_idx on public.player_riddle_progress (riddle_id);
create index player_riddle_progress_solved_at_idx on public.player_riddle_progress (solved_at) where solved_at is not null;

create or replace function public.reveal_riddle_hint(p_player_id uuid, p_riddle_id text)
returns table(hints_revealed integer, hint jsonb)
language plpgsql security definer set search_path = public as $$
declare
  v_riddle public.riddles%rowtype;
  v_progress public.player_riddle_progress%rowtype;
begin
  select * into v_riddle
  from riddles
  where id = p_riddle_id and starts_at <= now() and ends_at > now();

  if not found then raise exception 'riddle is not active' using errcode = 'P0001'; end if;

  insert into player_riddle_progress (player_id, riddle_id)
  values (p_player_id, p_riddle_id)
  on conflict do nothing;

  select * into v_progress
  from player_riddle_progress
  where player_id = p_player_id and riddle_id = p_riddle_id
  for update;

  if v_progress.solved_at is not null or v_progress.exhausted_at is not null then
    raise exception 'riddle is finished' using errcode = 'P0001';
  end if;

  if v_progress.hints_revealed >= jsonb_array_length(v_riddle.hints) then
    raise exception 'no hints remain' using errcode = 'P0001';
  end if;

  update player_riddle_progress as progress
  set hints_revealed = progress.hints_revealed + 1, updated_at = now()
  where progress.player_id = p_player_id and progress.riddle_id = p_riddle_id
  returning * into v_progress;

  return query select v_progress.hints_revealed, v_riddle.hints -> (v_progress.hints_revealed - 1);
end;
$$;

create or replace function public.record_riddle_attempt(p_player_id uuid, p_riddle_id text, p_is_correct boolean)
returns table(is_correct boolean, hints_revealed integer, attempts_count integer, solved_at timestamptz, exhausted_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  v_riddle public.riddles%rowtype;
  v_progress public.player_riddle_progress%rowtype;
  v_nickname text;
begin
  select * into v_riddle
  from riddles
  where id = p_riddle_id and starts_at <= now() and ends_at > now();

  if not found then raise exception 'riddle is not active' using errcode = 'P0001'; end if;

  insert into player_riddle_progress (player_id, riddle_id)
  values (p_player_id, p_riddle_id)
  on conflict do nothing;

  select * into v_progress
  from player_riddle_progress
  where player_id = p_player_id and riddle_id = p_riddle_id
  for update;

  if v_progress.solved_at is not null
    or v_progress.exhausted_at is not null
    or v_progress.last_attempt_hint_index = v_progress.hints_revealed then
    raise exception 'attempt unavailable' using errcode = 'P0001';
  end if;

  select nickname into v_nickname from players where id = p_player_id;

  insert into submissions (player_id, nickname, riddle_id, hints_used, is_correct)
  values (p_player_id, coalesce(v_nickname, 'Gracz'), p_riddle_id, v_progress.hints_revealed, p_is_correct);

  update player_riddle_progress as progress
  set attempts_count = progress.attempts_count + 1,
      last_attempt_hint_index = progress.hints_revealed,
      solved_at = case when p_is_correct then now() else null end,
      exhausted_at = case
        when not p_is_correct and progress.hints_revealed = jsonb_array_length(v_riddle.hints) then now()
        else null
      end,
      updated_at = now()
  where progress.player_id = p_player_id and progress.riddle_id = p_riddle_id
  returning * into v_progress;

  return query select p_is_correct, v_progress.hints_revealed, v_progress.attempts_count, v_progress.solved_at, v_progress.exhausted_at;
end;
$$;

alter table public.players enable row level security;
alter table public.riddles enable row level security;
alter table public.submissions enable row level security;
alter table public.player_riddle_progress enable row level security;

revoke all on public.players, public.riddles, public.submissions, public.player_riddle_progress from anon, authenticated;
revoke all on function public.reveal_riddle_hint(uuid, text), public.record_riddle_attempt(uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.reveal_riddle_hint(uuid, text), public.record_riddle_attempt(uuid, text, boolean) to service_role;

commit;
