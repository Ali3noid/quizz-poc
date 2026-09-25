begin;

select plan(5);

truncate table public.players, public.riddles cascade;

insert into public.players (id, nickname, password_hash) values
  ('10000000-0000-4000-8000-000000000001', 'Anna', 'test'),
  ('10000000-0000-4000-8000-000000000002', 'Bartek', 'test'),
  ('10000000-0000-4000-8000-000000000003', 'Celina', 'test'),
  ('10000000-0000-4000-8000-000000000004', 'Daniel', 'test'),
  ('10000000-0000-4000-8000-000000000005', 'Ewa', 'test'),
  ('10000000-0000-4000-8000-000000000006', 'Filip', 'test');

insert into public.riddles (id, question, category, hints, answers, starts_at, ends_at) values
  ('previous', 'Previous?', 'history', '[]'::jsonb, array['yes'], now() - interval '3 hours', now() - interval '2 hours'),
  ('current', 'Current?', 'history', '[]'::jsonb, array['yes'], now() - interval '1 hour', now() + interval '1 hour');

update public.riddles
set time_bonus_enabled = false
where id = 'previous';

do $$
declare
  v_first_started_at timestamptz;
  v_second_started_at timestamptz;
begin
  select started_at into v_first_started_at
  from public.start_riddle('10000000-0000-4000-8000-000000000001', 'current');

  select started_at into v_second_started_at
  from public.start_riddle('10000000-0000-4000-8000-000000000001', 'current');

  if v_first_started_at is distinct from v_second_started_at then
    raise exception 'Repeated start reset started_at';
  end if;
end;
$$;

select pass('start is idempotent and preserves the first started_at');

update public.player_riddle_progress
set started_at = clock_timestamp() - interval '120 seconds'
where player_id = '10000000-0000-4000-8000-000000000001' and riddle_id = 'current';

do $$
declare
  v_first record;
  v_retry record;
  v_submission_count integer;
begin
  select * into v_first
  from public.record_riddle_attempt('10000000-0000-4000-8000-000000000001', 'current', true);

  select * into v_retry
  from public.record_riddle_attempt('10000000-0000-4000-8000-000000000001', 'current', true);

  select count(*) into v_submission_count
  from public.submissions
  where player_id = '10000000-0000-4000-8000-000000000001' and riddle_id = 'current';

  if v_first.solved_at is distinct from v_retry.solved_at
    or v_first.attempts_count <> 1
    or v_retry.attempts_count <> 1
    or v_submission_count <> 1 then
    raise exception 'Successful completion is not idempotent';
  end if;

  if v_first.completion_seconds not between 120 and 121 then
    raise exception 'Backend duration was not calculated from timestamps: %', v_first.completion_seconds;
  end if;
end;
$$;

select pass('completion is idempotent and duration is calculated by the backend');

insert into public.player_riddle_progress
  (player_id, riddle_id, started_at, exhausted_at, attempts_count, last_attempt_hint_index)
values
  ('10000000-0000-4000-8000-000000000005', 'current', now() - interval '60 seconds', now(), 1, 0);

do $$
declare
  v_timing record;
begin
  select * into v_timing
  from public.start_riddle('10000000-0000-4000-8000-000000000005', 'current');

  if v_timing.completed_at is distinct from v_timing.started_at + interval '60 seconds' then
    raise exception 'Exhausted riddle did not expose its completion time';
  end if;
end;
$$;

select pass('exhausted riddle stops the timer');

insert into public.player_riddle_progress
  (player_id, riddle_id, started_at, solved_at, attempts_count, last_attempt_hint_index)
values
  ('10000000-0000-4000-8000-000000000002', 'current', now() - interval '5 minutes', now() - interval '2 minutes', 1, 0),
  ('10000000-0000-4000-8000-000000000003', 'current', now() - interval '4 minutes', now() - interval '1 minute', 1, 0),
  ('10000000-0000-4000-8000-000000000004', 'current', now() - interval '90 seconds', null, 1, 0),
  ('10000000-0000-4000-8000-000000000001', 'previous', now() - interval '170 minutes', now() - interval '169 minutes', 1, 0),
  ('10000000-0000-4000-8000-000000000002', 'previous', now() - interval '168 minutes', now() - interval '166 minutes', 1, 0);

insert into public.submissions (player_id, nickname, riddle_id, hints_used, is_correct, created_at) values
  ('10000000-0000-4000-8000-000000000002', 'Bartek', 'current', 0, true, now() - interval '2 minutes'),
  ('10000000-0000-4000-8000-000000000003', 'Celina', 'current', 0, true, now() - interval '1 minute'),
  ('10000000-0000-4000-8000-000000000004', 'Daniel', 'current', 0, false, now() - interval '30 seconds'),
  ('10000000-0000-4000-8000-000000000001', 'Anna', 'previous', 0, true, now() - interval '169 minutes'),
  ('10000000-0000-4000-8000-000000000002', 'Bartek', 'previous', 0, true, now() - interval '166 minutes'),
  ('10000000-0000-4000-8000-000000000005', 'Ewa', 'previous', 1, false, now() - interval '165 minutes'),
  ('10000000-0000-4000-8000-000000000006', 'Filip', 'previous', 2, false, now() - interval '164 minutes');

do $$
begin
  if (select time_bonus_points from public.ranking_entries where nickname = 'Anna') <> 0.5
    or (select time_bonus_points from public.ranking_entries where nickname = 'Bartek') <> 0.3
    or (select time_bonus_points from public.ranking_entries where nickname = 'Celina') <> 0.2 then
    raise exception 'Initial bonuses or exclusion of the historical riddle are incorrect';
  end if;

  if (select total_points from public.ranking_entries where nickname = 'Anna') <> 2.5 then
    raise exception 'total_points is not base_points + time_bonus_points';
  end if;

  if (select current_riddle_seconds from public.ranking_entries where nickname = 'Daniel') is not null then
    raise exception 'Running current-riddle time was exposed';
  end if;

  if (select current_riddle_seconds from public.ranking_entries where nickname = 'Anna') not between 120 and 121 then
    raise exception 'Completed current-riddle time is incorrect';
  end if;
end;
$$;

select pass('historical riddles are excluded while totals and current-riddle visibility remain correct');

update public.player_riddle_progress
set solved_at = started_at + interval '90 seconds'
where player_id = '10000000-0000-4000-8000-000000000004' and riddle_id = 'current';

insert into public.submissions (player_id, nickname, riddle_id, hints_used, is_correct)
values ('10000000-0000-4000-8000-000000000004', 'Daniel', 'current', 0, true);

do $$
declare
  v_tied_order text[];
begin
  if (select time_bonus_points from public.ranking_entries where nickname = 'Daniel') <> 0.5
    or (select time_bonus_points from public.ranking_entries where nickname = 'Anna') <> 0.3
    or (select time_bonus_points from public.ranking_entries where nickname = 'Bartek') <> 0.2
    or (select time_bonus_points from public.ranking_entries where nickname = 'Celina') <> 0.0 then
    raise exception 'Bonuses were not dynamically reassigned after a faster solution';
  end if;

  select array_agg(nickname order by total_points desc, hints_used asc, last_activity_at asc, player_id asc)
  into v_tied_order
  from public.ranking_entries
  where nickname in ('Ewa', 'Filip');

  if v_tied_order <> array['Ewa', 'Filip'] then
    raise exception 'Hint-count tie-breaker is incorrect: %', v_tied_order;
  end if;
end;
$$;

select pass('a later faster result dynamically reassigns bonuses and ties use hints');
select * from finish();

rollback;
