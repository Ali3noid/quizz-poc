begin;

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

  return query select
    v_progress.started_at,
    coalesce(v_progress.solved_at, v_progress.exhausted_at),
    v_now;
end;
$$;

revoke all on function public.start_riddle(uuid, text) from public, anon, authenticated;
grant execute on function public.start_riddle(uuid, text) to service_role;

commit;
