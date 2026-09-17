import { json, type RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ cookies }) => {
    cookies.delete('player_nickname', { path: '/' });
    cookies.delete('player_id', { path: '/' });
    return json({ ok: true });
};
