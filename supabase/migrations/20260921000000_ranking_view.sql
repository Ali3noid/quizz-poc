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
)
select
  latest.player_id,
  player.nickname,
  count(*) filter (where latest.is_correct)::integer as solved_count,
  sum(latest.hints_used)::integer as hints_used,
  max(latest.created_at) as last_activity_at
from latest_submissions as latest
join public.players as player on player.id = latest.player_id
group by latest.player_id, player.nickname;

revoke all on public.ranking_entries from public, anon, authenticated;
grant select on public.ranking_entries to service_role;
