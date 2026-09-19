-- `RETURNS TABLE` creates PL/pgSQL output variables. Qualify progress columns
-- so their names cannot conflict with those output variables.
create or replace function public.record_riddle_attempt(p_player_id uuid, p_riddle_id text, p_is_correct boolean)
returns table(is_correct boolean, hints_revealed integer, attempts_count integer, solved_at timestamptz, exhausted_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare v_riddle public.riddles%rowtype; v_progress public.player_riddle_progress%rowtype; v_nickname text;
begin
  select * into v_riddle from riddles where id = p_riddle_id and starts_at <= now() and ends_at > now();
  if not found then raise exception 'riddle is not active' using errcode = 'P0001'; end if;
  insert into player_riddle_progress (player_id, riddle_id) values (p_player_id, p_riddle_id) on conflict do nothing;
  select * into v_progress from player_riddle_progress where player_id = p_player_id and riddle_id = p_riddle_id for update;
  if v_progress.solved_at is not null or v_progress.exhausted_at is not null or v_progress.last_attempt_hint_index = v_progress.hints_revealed then raise exception 'attempt unavailable' using errcode = 'P0001'; end if;
  select nickname into v_nickname from players where id = p_player_id;
  insert into submissions (player_id, nickname, riddle_id, hints_used, is_correct) values (p_player_id, coalesce(v_nickname, 'Gracz'), p_riddle_id, v_progress.hints_revealed, p_is_correct);
  update player_riddle_progress as progress set attempts_count = progress.attempts_count + 1, last_attempt_hint_index = progress.hints_revealed,
    solved_at = case when p_is_correct then now() else null end,
    exhausted_at = case when not p_is_correct and progress.hints_revealed = jsonb_array_length(v_riddle.hints) then now() else null end,
    updated_at = now()
  where progress.player_id = p_player_id and progress.riddle_id = p_riddle_id returning * into v_progress;
  return query select p_is_correct, v_progress.hints_revealed, v_progress.attempts_count, v_progress.solved_at, v_progress.exhausted_at;
end;
$$;
