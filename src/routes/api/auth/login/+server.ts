import { json, type RequestHandler } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';
import { dev } from '$app/environment';
import { verifyPassword } from '$lib/server/auth';

export const POST: RequestHandler = async ({ request, cookies }) => {
    try {
        const body = await request.json();
        const { nickname, password } = body;

        if (typeof nickname !== 'string' || !nickname.trim()) {
            return json({ ok: false, message: 'Podaj nick' }, { status: 400 });
        }

        if (typeof password !== 'string' || !password) {
            return json({ ok: false, message: 'Podaj hasło' }, { status: 400 });
        }

        const trimmedNickname = nickname.trim();
        const supabaseUrl = env.SUPABASE_URL;
        const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseKey) {
            return json({ ok: false, message: 'Błąd konfiguracji bazy danych serwera' }, { status: 500 });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data: players, error: dbError } = await supabase
            .from('players')
            .select('id, nickname, password_hash')
            .ilike('nickname', trimmedNickname)
            .limit(1);

        if (dbError) {
            console.error('Błąd pobierania gracza z Supabase:', dbError);
            return json({ ok: false, message: 'Błąd połączenia z bazą danych' }, { status: 500 });
        }

        if (!players || players.length === 0) {
            return json({ ok: false, message: 'Niepoprawny nick lub hasło' }, { status: 401 });
        }

        const player = players[0];
        const isPasswordValid = await verifyPassword(password, player.password_hash);

        if (!isPasswordValid) {
            return json({ ok: false, message: 'Niepoprawny nick lub hasło' }, { status: 401 });
        }

        const playerId = player.id ? String(player.id) : '';

        // Ustawienie ciasteczek sesji gracza
        cookies.set('player_nickname', player.nickname, {
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
                nickname: player.nickname
            }
        });
    } catch (err) {
        console.error('Błąd logowania:', err);
        return json({ ok: false, message: 'Nieprawidłowe dane logowania' }, { status: 400 });
    }
};
