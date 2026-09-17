import { json, type RequestHandler } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';
import { dev } from '$app/environment';
import { hashPassword } from '$lib/server/auth';

export const POST: RequestHandler = async ({ request, cookies }) => {
    try {
        const body = await request.json();
        const { nickname, password } = body;

        if (typeof nickname !== 'string' || nickname.trim().length < 3) {
            return json({ ok: false, message: 'Nick musi mieć co najmniej 3 znaki' }, { status: 400 });
        }

        if (nickname.trim().length > 30) {
            return json({ ok: false, message: 'Nick może mieć maksymalnie 30 znaków' }, { status: 400 });
        }

        if (typeof password !== 'string' || password.length < 4) {
            return json({ ok: false, message: 'Hasło musi mieć co najmniej 4 znaki' }, { status: 400 });
        }

        const trimmedNickname = nickname.trim();
        const supabaseUrl = env.SUPABASE_URL;
        const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseKey) {
            return json({ ok: false, message: 'Błąd konfiguracji bazy danych serwera' }, { status: 500 });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data: existingPlayers, error: checkError } = await supabase
            .from('players')
            .select('id, nickname')
            .ilike('nickname', trimmedNickname)
            .limit(1);

        if (checkError) {
            console.error('Błąd sprawdzania gracza w Supabase:', checkError);
            return json({ ok: false, message: 'Błąd połączenia z bazą danych' }, { status: 500 });
        }

        if (existingPlayers && existingPlayers.length > 0) {
            return json({ ok: false, message: 'Gracz o podanym nicku już istnieje' }, { status: 409 });
        }

        const hashedPassword = await hashPassword(password);

        const { data: insertedPlayer, error: insertError } = await supabase
            .from('players')
            .insert({
                nickname: trimmedNickname,
                password_hash: hashedPassword
            })
            .select('id, nickname')
            .single();

        if (insertError) {
            console.error('Błąd zapisu gracza do Supabase:', insertError);
            return json({ ok: false, message: 'Nie udało się zarejestrować gracza' }, { status: 500 });
        }

        const playerId = insertedPlayer?.id ? String(insertedPlayer.id) : '';

        // Ustawienie ciasteczek sesji gracza
        cookies.set('player_nickname', trimmedNickname, {
            path: '/',
            httpOnly: true,
            sameSite: 'strict',
            secure: !dev,
            maxAge: 60 * 60 * 24 * 30
        });

        if (playerId) {
            cookies.set('player_id', playerId, {
                path: '/',
                httpOnly: true,
                sameSite: 'strict',
                secure: !dev,
                maxAge: 60 * 60 * 24 * 30
            });
        }

        return json({
            ok: true,
            player: {
                id: playerId,
                nickname: trimmedNickname
            }
        });
    } catch (err) {
        console.error('Błąd rejestracji:', err);
        return json({ ok: false, message: 'Nieprawidłowe dane rejestracji' }, { status: 400 });
    }
};
