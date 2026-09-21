-- Development data loaded by `supabase db reset` after schema migrations.
-- Demo credentials: Ania / haslo-ania, Bartek / haslo-bartek, Celina / haslo-celina.
begin;

insert into public.players (id, nickname, password_hash, created_at, updated_at) values
  ('11111111-1111-4111-8111-111111111111', 'Ania', '00112233445566778899aabbccddeeff:5c0547bdb963794b996e6a5a51864d82a66ebbd5717234f5de307a341cfc96ee86430610462aad96b20460478a55a90ebcf0601a98fc26e3ca655b2b1aad87f5', '2026-09-10T09:00:00Z', '2026-09-10T09:00:00Z'),
  ('22222222-2222-4222-8222-222222222222', 'Bartek', '102132435465768798a9babcbddceeff:275b4d8ddb2f4d535f2bebec982e0bf5ebe34e9ec0f03b2612ce4a55c298f179510a53b290f8384f22b29829fd99e2cd5fadc5d6d31c44d60286e92c61f4b42f', '2026-09-11T10:00:00Z', '2026-09-11T10:00:00Z'),
  ('33333333-3333-4333-8333-333333333333', 'Celina', 'ffeeddccbbaa99887766554433221100:676433c5fafb309b9c2c79b3bb214785d0f758c84084c9821e2221fb4d4d8202da8f3566ae5538d3d93deb209e4a37a5d163b2345fc220ecdbd7607e631003c3', '2026-09-12T11:00:00Z', '2026-09-12T11:00:00Z');

-- These consecutive windows comply with the no-overlap constraint on riddles.
insert into public.riddles (id, question, images, hints, answers, starts_at, ends_at, created_at, updated_at) values
  ('riddle-2026-09-19', 'Która firma zajmuje drugie miejsce pod względem przychodu na pracownika (Revenue per FTE), skoro liderem w tym sektorze (IT, technologie) jest marka widoczna poniżej?', '["https://xdisrxwpwbglsinkuldu.supabase.co/storage/v1/object/public/quizz-assets/001/Screenshot_20260919-005357.png"]'::jsonb, '[{"image":"https://xdisrxwpwbglsinkuldu.supabase.co/storage/v1/object/public/quizz-assets/001/Screenshot_20260919-005410.png"}, {"image":"https://xdisrxwpwbglsinkuldu.supabase.co/storage/v1/object/public/quizz-assets/001/IMG_20190331_0551222.jpg"}, {"image":"https://xdisrxwpwbglsinkuldu.supabase.co/storage/v1/object/public/quizz-assets/001/7369.png"}, "Zaskakujący fakt: masowe zloty amerykańskiej prawicy nierzadko prowadziły do przeciążenia serwerów flagowej aplikacji tej firmy.", {"text":"Pewnym dwóm samotnym kowbojom taka aplikacja sporo by ułatwiła.","image":"https://xdisrxwpwbglsinkuldu.supabase.co/storage/v1/object/public/quizz-assets/001/PrimeBrokeback2-800x500.jpg"}]'::jsonb, array['grindr', 'Grindr', 'GRINDR', 'grinder', 'Grinder', 'GRINDER'], '2026-09-19T00:00:00Z', '2026-09-26T00:00:00Z', '2026-09-19T00:00:00Z', '2026-09-19T00:00:00Z'),
  ('film-interstellar', 'Jaki film opowiada o wyprawie przez tunel czasoprzestrzenny?', '["https://picsum.photos/seed/interstellar-1/800/600"]'::jsonb, '["Rezyser znany z Memento.", {"text":"W filmie pojawia sie planeta z ogromnymi falami.","image":"https://picsum.photos/seed/interstellar-hint/600/400"}, "Glowny bohater jest bylym pilotem NASA.", "W obsadzie jest Matthew McConaughey.", "Tytul nawiazuje do przestrzeni miedzygwiezdnej."]'::jsonb, array['interstellar'], '2026-09-26T00:00:00Z', '2026-10-03T00:00:00Z', '2026-09-19T08:00:00Z', '2026-09-19T08:00:00Z'),
  ('film-amelie', 'Jaki francuski film opowiada o dziewczynie poprawiajacej zycie innym?', '["https://picsum.photos/seed/amelie-1/800/600"]'::jsonb, '["Akcja rozgrywa sie glownie na Montmartrze.", "Bohaterka pracuje w kawiarni.", "Rezyserem jest Jean-Pierre Jeunet.", "W roli glownej Audrey Tautou.", "Tytul jest imieniem glownej bohaterki."]'::jsonb, array['amelia', 'amelie', 'fabuleux destin d amelie poulain'], '2026-10-03T00:00:00Z', '2026-10-10T00:00:00Z', '2026-09-19T08:00:00Z', '2026-09-19T08:00:00Z'),
  ('film-arrival', 'Jaki film science fiction opowiada o lingwistce kontaktujacej sie z obcymi?', '["https://picsum.photos/seed/arrival-1/800/600"]'::jsonb, '["Film jest adaptacja opowiadania Teda Chianga.", "Obcy komunikuja sie kolistymi symbolami.", "W roli glownej Amy Adams.", "Rezyserowal Denis Villeneuve.", "Polski tytul brzmi Nowy poczatek."]'::jsonb, array['arrival', 'nowy poczatek'], '2026-10-10T00:00:00Z', '2026-10-17T00:00:00Z', '2026-09-19T08:00:00Z', '2026-09-19T08:00:00Z');

insert into public.player_riddle_progress (
  player_id, riddle_id, hints_revealed, attempts_count, last_attempt_hint_index, solved_at, exhausted_at, created_at, updated_at
) values
  ('11111111-1111-4111-8111-111111111111', 'riddle-2026-09-19', 0, 1, 0, '2026-09-21T09:05:00Z', null, '2026-09-21T09:00:00Z', '2026-09-21T09:05:00Z'),
  ('22222222-2222-4222-8222-222222222222', 'riddle-2026-09-19', 5, 6, 5, null, '2026-09-21T21:00:00Z', '2026-09-21T19:00:00Z', '2026-09-21T21:00:00Z'),
  ('33333333-3333-4333-8333-333333333333', 'riddle-2026-09-19', 1, 1, 1, null, null, '2026-09-21T12:00:00Z', '2026-09-21T12:05:00Z');

insert into public.submissions (id, player_id, nickname, riddle_id, hints_used, is_correct, created_at) values
  ('a1111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', 'Ania', 'riddle-2026-09-19', 0, true, '2026-09-21T09:05:00Z'),
  ('b2222222-2222-4222-8222-222222222221', '22222222-2222-4222-8222-222222222222', 'Bartek', 'riddle-2026-09-19', 0, false, '2026-09-21T19:05:00Z'),
  ('b2222222-2222-4222-8222-222222222222', '22222222-2222-4222-8222-222222222222', 'Bartek', 'riddle-2026-09-19', 1, false, '2026-09-21T19:25:00Z'),
  ('b2222222-2222-4222-8222-222222222223', '22222222-2222-4222-8222-222222222222', 'Bartek', 'riddle-2026-09-19', 2, false, '2026-09-21T19:45:00Z'),
  ('b2222222-2222-4222-8222-222222222224', '22222222-2222-4222-8222-222222222222', 'Bartek', 'riddle-2026-09-19', 3, false, '2026-09-21T20:05:00Z'),
  ('b2222222-2222-4222-8222-222222222225', '22222222-2222-4222-8222-222222222222', 'Bartek', 'riddle-2026-09-19', 4, false, '2026-09-21T20:25:00Z'),
  ('b2222222-2222-4222-8222-222222222226', '22222222-2222-4222-8222-222222222222', 'Bartek', 'riddle-2026-09-19', 5, false, '2026-09-21T21:00:00Z'),
  ('c3333333-3333-4333-8333-333333333333', '33333333-3333-4333-8333-333333333333', 'Celina', 'riddle-2026-09-19', 1, false, '2026-09-21T12:05:00Z');

commit;
