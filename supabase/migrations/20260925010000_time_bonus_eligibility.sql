begin;

alter table public.riddles
  add column time_bonus_enabled boolean not null default true;

-- Persist eligibility at deployment time. Past and already-active riddles never
-- gain bonuses later, while scheduled and newly inserted riddles remain eligible.
update public.riddles
set time_bonus_enabled = starts_at >= clock_timestamp();

create or replace view public.ranking_entries
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
  join public.riddles as riddle
    on riddle.id = progress.riddle_id
    and riddle.time_bonus_enabled
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

commit;
