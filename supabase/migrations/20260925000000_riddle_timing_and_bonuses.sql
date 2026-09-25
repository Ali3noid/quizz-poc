begin;

alter table public.player_riddle_progress
  add column started_at timestamptz;

-- Existing progress predates explicit timing. created_at is the earliest persisted
-- activity available and is therefore the safest deterministic backfill.
update public.player_riddle_progress
set started_at = created_at
where started_at is null;

alter table public.player_riddle_progress
  alter column started_at set default now(),
  alter column started_at set not null;

create or replace function public.start_riddle(p_player_id uuid, p_riddle_id text)
returns table(started_at timestamptz, completed_at timestamptz, server_now timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  v_riddle public.riddles%rowtype;
  v_progress public.player_riddle_progress%rowtype;
  v_now timestamptz := clock_timestamp();
begin
  select * into v_riddle
  from public.riddles
  where id = p_riddle_id and starts_at <= v_now;

  if not found then
    raise exception 'riddle is not available' using errcode = 'P0001';
  end if;

  if v_riddle.ends_at > v_now then
    insert into public.player_riddle_progress (player_id, riddle_id, started_at)
    values (p_player_id, p_riddle_id, v_now)
    on conflict (player_id, riddle_id) do nothing;
  end if;

  select * into v_progress
  from public.player_riddle_progress
  where player_id = p_player_id and riddle_id = p_riddle_id;

  if not found then
    raise exception 'riddle is not available' using errcode = 'P0001';
  end if;

  return query select v_progress.started_at, v_progress.solved_at, v_now;
end;
$$;

drop function public.record_riddle_attempt(uuid, text, boolean);

create function public.record_riddle_attempt(p_player_id uuid, p_riddle_id text, p_is_correct boolean)
returns table(
  is_correct boolean,
  hints_revealed integer,
  attempts_count integer,
  solved_at timestamptz,
  exhausted_at timestamptz,
  started_at timestamptz,
  completion_seconds bigint
)
language plpgsql security definer set search_path = public as $$
declare
  v_riddle public.riddles%rowtype;
  v_progress public.player_riddle_progress%rowtype;
  v_nickname text;
  v_now timestamptz := clock_timestamp();
begin
  select * into v_riddle
  from public.riddles
  where id = p_riddle_id and starts_at <= v_now and ends_at > v_now;

  if not found then raise exception 'riddle is not active' using errcode = 'P0001'; end if;

  insert into public.player_riddle_progress (player_id, riddle_id, started_at)
  values (p_player_id, p_riddle_id, v_now)
  on conflict (player_id, riddle_id) do nothing;

  select * into v_progress
  from public.player_riddle_progress
  where player_id = p_player_id and riddle_id = p_riddle_id
  for update;

  -- Retrying the same successful completion returns the first result unchanged.
  if v_progress.solved_at is not null and p_is_correct then
    return query select
      true,
      v_progress.hints_revealed,
      v_progress.attempts_count,
      v_progress.solved_at,
      v_progress.exhausted_at,
      v_progress.started_at,
      floor(extract(epoch from (v_progress.solved_at - v_progress.started_at)))::bigint;
    return;
  end if;

  if v_progress.solved_at is not null
    or v_progress.exhausted_at is not null
    or v_progress.last_attempt_hint_index = v_progress.hints_revealed then
    raise exception 'attempt unavailable' using errcode = 'P0001';
  end if;

  select nickname into v_nickname from public.players where id = p_player_id;

  insert into public.submissions (player_id, nickname, riddle_id, hints_used, is_correct, created_at)
  values (p_player_id, coalesce(v_nickname, 'Gracz'), p_riddle_id, v_progress.hints_revealed, p_is_correct, v_now);

  update public.player_riddle_progress as progress
  set attempts_count = progress.attempts_count + 1,
      last_attempt_hint_index = progress.hints_revealed,
      solved_at = case when p_is_correct then v_now else null end,
      exhausted_at = case
        when not p_is_correct and progress.hints_revealed = jsonb_array_length(v_riddle.hints) then v_now
        else null
      end,
      updated_at = v_now
  where progress.player_id = p_player_id and progress.riddle_id = p_riddle_id
  returning * into v_progress;

  return query select
    p_is_correct,
    v_progress.hints_revealed,
    v_progress.attempts_count,
    v_progress.solved_at,
    v_progress.exhausted_at,
    v_progress.started_at,
    case when v_progress.solved_at is not null
      then floor(extract(epoch from (v_progress.solved_at - v_progress.started_at)))::bigint
      else null
    end;
end;
$$;

drop view public.ranking_entries;

create view public.ranking_entries
with (security_invoker = true)
as
with latest_submissions as (
  select distinct on (submission.player_id, submission.riddle_id)
    submission.player_id,
    submission.riddle_id,
    submission.hints_used,
    submission.is_correct,
    submission.created_at
  from public.submissions as submission
  order by
    submission.player_id,
    submission.riddle_id,
    submission.created_at desc,
    submission.id desc
),
player_stats as (
  select
    latest.player_id,
    count(*) filter (where latest.is_correct)::integer as solved_count,
    sum(latest.hints_used)::integer as hints_used,
    max(latest.created_at) as last_activity_at
  from latest_submissions as latest
  group by latest.player_id
),
ranked_solutions as (
  select
    progress.player_id,
    progress.riddle_id,
    row_number() over (
      partition by progress.riddle_id
      order by
        progress.solved_at - progress.started_at,
        progress.solved_at,
        progress.player_id
    ) as speed_rank
  from public.player_riddle_progress as progress
  where progress.solved_at is not null
),
time_bonuses as (
  select
    ranked.player_id,
    sum(case ranked.speed_rank
      when 1 then 0.5::numeric
      when 2 then 0.3::numeric
      when 3 then 0.2::numeric
      else 0::numeric
    end)::numeric(10, 1) as time_bonus_points
  from ranked_solutions as ranked
  group by ranked.player_id
),
current_riddle as (
  select riddle.id
  from public.riddles as riddle
  where riddle.starts_at <= now() and riddle.ends_at > now()
  order by riddle.starts_at desc, riddle.id
  limit 1
)
select
  stats.player_id,
  player.nickname,
  stats.solved_count as base_points,
  coalesce(bonus.time_bonus_points, 0::numeric)::numeric(10, 1) as time_bonus_points,
  (stats.solved_count::numeric + coalesce(bonus.time_bonus_points, 0::numeric))::numeric(10, 1) as total_points,
  stats.solved_count,
  stats.hints_used,
  stats.last_activity_at,
  case when current_progress.solved_at is not null
    then floor(extract(epoch from (current_progress.solved_at - current_progress.started_at)))::bigint
    else null
  end as current_riddle_seconds
from player_stats as stats
join public.players as player on player.id = stats.player_id
left join time_bonuses as bonus on bonus.player_id = stats.player_id
left join current_riddle on true
left join public.player_riddle_progress as current_progress
  on current_progress.player_id = stats.player_id
  and current_progress.riddle_id = current_riddle.id;

revoke all on public.ranking_entries from public, anon, authenticated;
grant select on public.ranking_entries to service_role;

revoke all on function public.start_riddle(uuid, text), public.record_riddle_attempt(uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.start_riddle(uuid, text), public.record_riddle_attempt(uuid, text, boolean) to service_role;

commit;
