-- Explicit ISO timestamptz values are required. Windows are [starts_at, ends_at).
begin;
insert into public.riddles (id, question, category, images, hints, answers, starts_at, ends_at) values (
  'riddle-2026-10', 'Jakie dzielo laczy te kadry?',
  'art_culture',
  '["https://example.com/frame-1.jpg"]'::jsonb,
  '["Pierwsza wskazowka", {"text":"Druga wskazowka", "image":"https://example.com/hint.jpg"}]'::jsonb,
  array['prawidlowa odpowiedz', 'wariant odpowiedzi'],
  '2026-10-01T18:00:00+02:00'::timestamptz, '2026-10-08T18:00:00+02:00'::timestamptz
);
commit;
