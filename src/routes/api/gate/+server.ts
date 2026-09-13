import { json, type RequestHandler } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { dev } from '$app/environment';

export const POST: RequestHandler = async ({ request, cookies }) => {
    try {
        const body = await request.json();
        const { password } = body;

        const expectedPassword = env.GATE_PASSWORD;

        if (!expectedPassword) {
            return json({ ok: false, message: 'Błąd konfiguracji serwera' }, { status: 500 });
        }

        if (!password || password.trim().toLowerCase() !== expectedPassword.trim().toLowerCase()) {
            return json({ ok: false, message: 'Niepoprawne hasło' }, { status: 401 });
        }

        cookies.set('gate_access', 'granted', {
            path: '/',
            httpOnly: true,
            sameSite: 'strict',
            secure: !dev,
            maxAge: 60 * 60 * 24 * 30
        });

        return json({ ok: true });
    } catch (err) {
        return json({ ok: false, message: 'Nieprawidłowe dane żądania' }, { status: 400 });
    }
};

