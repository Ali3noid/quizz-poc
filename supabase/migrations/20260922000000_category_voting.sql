begin;

create type public.riddle_category as enum (
  'history',
  'geography',
  'science',
  'technology',
  'business_economics',
  'nature',
  'sport',
  'movies_tv',
  'music',
  'games',
  'literature_language',
  'art_culture',
  'food_drink',
  'world_society'
);

alter table public.riddles add column category public.riddle_category;

update public.riddles
set category = 'business_economics'
where id = 'riddle-2026-09-19'
   or question ilike '%Revenue per FTE%'
   or question ilike '%przychodu na pracownika%';

update public.riddles
set category = 'geography'
where category is null
  and (question ilike '%wysp%' or question ilike '%island%');

update public.riddles
set category = 'movies_tv'
where category is null
  and id in ('film-interstellar', 'film-amelie', 'film-arrival');

do $$
begin
  if exists (select 1 from public.riddles where category is null) then
    raise exception 'Every existing riddle must be assigned a category before applying this migration';
  end if;
end;
$$;

alter table public.riddles alter column category set not null;

create table public.riddle_category_polls (
  riddle_id text primary key references public.riddles(id) on delete cascade,
  option_one public.riddle_category not null,
  option_two public.riddle_category not null,
  option_three public.riddle_category not null,
  created_at timestamptz not null default now(),
  check (option_one <> option_two and option_one <> option_three and option_two <> option_three)
);

create or replace function public.create_riddle_category_poll()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_options public.riddle_category[];
begin
  select array_agg(candidate.category)
  into v_options
  from (
    select category
    from unnest(enum_range(null::public.riddle_category)) as categories(category)
    where category <> new.category
    order by random()
    limit 3
  ) as candidate;

  insert into public.riddle_category_polls (riddle_id, option_one, option_two, option_three)
  values (new.id, v_options[1], v_options[2], v_options[3]);

  return new;
end;
$$;

create trigger create_riddle_category_poll_after_insert
after insert on public.riddles
for each row execute function public.create_riddle_category_poll();

insert into public.riddle_category_polls (riddle_id, option_one, option_two, option_three)
select riddle.id, poll_options.categories[1], poll_options.categories[2], poll_options.categories[3]
from public.riddles as riddle
cross join lateral (
  select array_agg(candidate.category) as categories
  from (
    select category
    from unnest(enum_range(null::public.riddle_category)) as categories(category)
    where category <> riddle.category
    order by random()
    limit 3
  ) as candidate
) as poll_options;

create table public.riddle_category_votes (
  riddle_id text not null references public.riddles(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  category public.riddle_category not null,
  weight integer not null check (weight between 1 and 6),
  created_at timestamptz not null default now(),
  primary key (riddle_id, player_id)
);

create index riddle_category_votes_riddle_id_idx on public.riddle_category_votes (riddle_id);

create table public.admins (
  player_id uuid primary key references public.players(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.cast_category_vote(
  p_player_id uuid,
  p_riddle_id text,
  p_category public.riddle_category
)
returns table(category public.riddle_category, weight integer)
language plpgsql security definer set search_path = public as $$
declare
  v_progress public.player_riddle_progress%rowtype;
  v_poll public.riddle_category_polls%rowtype;
  v_weight integer;
begin
  select * into v_progress
  from public.player_riddle_progress
  where player_id = p_player_id and riddle_id = p_riddle_id
  for update;

  if not found or (v_progress.solved_at is null and v_progress.exhausted_at is null) then
    raise exception 'riddle is not finished' using errcode = 'P0001';
  end if;

  select * into v_poll
  from public.riddle_category_polls
  where riddle_id = p_riddle_id;

  if not found then
    raise exception 'poll not found' using errcode = 'P0001';
  end if;

  if p_category not in (v_poll.option_one, v_poll.option_two, v_poll.option_three) then
    raise exception 'category is not a poll option' using errcode = 'P0001';
  end if;

  v_weight := case
    when v_progress.exhausted_at is not null then 6
    else least(v_progress.hints_revealed + 1, 6)
  end;

  insert into public.riddle_category_votes (riddle_id, player_id, category, weight)
  values (p_riddle_id, p_player_id, p_category, v_weight);

  return query select p_category, v_weight;
end;
$$;

alter table public.riddle_category_polls enable row level security;
alter table public.riddle_category_votes enable row level security;
alter table public.admins enable row level security;

revoke all on public.riddle_category_polls, public.riddle_category_votes, public.admins from anon, authenticated;
revoke all on function public.create_riddle_category_poll(), public.cast_category_vote(uuid, text, public.riddle_category) from public, anon, authenticated;
grant execute on function public.cast_category_vote(uuid, text, public.riddle_category) to service_role;

commit;
