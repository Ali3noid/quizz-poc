import { json, type RequestHandler } from '@sveltejs/kit';
import { z } from 'zod';
import { dev } from '$app/environment';
import { hashPassword } from '$lib/server/auth';
import { getServerSupabase } from '$lib/server/supabase';

const registerPayloadSchema = z.object({
    nickname: z.string()
        .trim()
        .min(3, 'Nick musi mieć co najmniej 3 znaki')
        .max(30, 'Nick może mieć maksymalnie 30 znaków'),
    password: z.string().min(4, 'Hasło musi mieć co najmniej 4 znaki')
}).strict();

export const POST: RequestHandler = async ({ request, cookies }) => {
    try {
        const parseResult = registerPayloadSchema.safeParse(await request.json());

        if (!parseResult.success) {
            const validationErrors = parseResult.error.flatten();
            return json({
                ok: false,
                message: 'Nieprawidłowe dane rejestracji',
                fieldErrors: validationErrors.fieldErrors,
                formErrors: validationErrors.formErrors
            }, { status: 400 });
        }

        const { nickname: trimmedNickname, password } = parseResult.data;
        let supabase;
        try {
            supabase = getServerSupabase();
        } catch {
            return json({ ok: false, message: 'Błąd konfiguracji bazy danych serwera' }, { status: 500 });
        }

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
