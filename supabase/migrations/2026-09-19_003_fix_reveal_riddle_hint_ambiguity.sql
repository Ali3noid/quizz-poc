-- `RETURNS TABLE` creates PL/pgSQL output variables. Qualify progress columns
-- so their names cannot conflict with those output variables.
create or replace function public.reveal_riddle_hint(p_player_id uuid, p_riddle_id text)
returns table(hints_revealed integer, hint jsonb)
language plpgsql security definer set search_path = public as $$
declare v_riddle public.riddles%rowtype; v_progress public.player_riddle_progress%rowtype;
begin
  select * into v_riddle from riddles where id = p_riddle_id and starts_at <= now() and ends_at > now();
  if not found then raise exception 'riddle is not active' using errcode = 'P0001'; end if;
  insert into player_riddle_progress (player_id, riddle_id) values (p_player_id, p_riddle_id) on conflict do nothing;
  select * into v_progress from player_riddle_progress where player_id = p_player_id and riddle_id = p_riddle_id for update;
  if v_progress.solved_at is not null or v_progress.exhausted_at is not null then raise exception 'riddle is finished' using errcode = 'P0001'; end if;
  if v_progress.hints_revealed >= jsonb_array_length(v_riddle.hints) then raise exception 'no hints remain' using errcode = 'P0001'; end if;
  update player_riddle_progress as progress set hints_revealed = progress.hints_revealed + 1, updated_at = now()
  where progress.player_id = p_player_id and progress.riddle_id = p_riddle_id returning * into v_progress;
  return query select v_progress.hints_revealed, v_riddle.hints -> (v_progress.hints_revealed - 1);
end;
$$;
