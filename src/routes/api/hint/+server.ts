import { json, type RequestHandler } from '@sveltejs/kit';
import { RIDDLES } from '$lib/server/riddle';

export const POST: RequestHandler = async ({ request }) => {
    try {
        const { riddleId, hintIndex } = await request.json();
        console.log("riddle and hintIndex", riddleId, hintIndex);
        const riddle = RIDDLES[riddleId];
        if (!riddle) {
            return json({ error: 'Nie znaleziono zagadki' }, { status: 404 });
        }

        if (typeof hintIndex !== 'number' || hintIndex < 0 || hintIndex >= riddle.hints.length) {
            return json({ error: 'Brak podpowiedzi o tym indeksie' }, { status: 400 });
        }

        return json({ hint: riddle.hints[hintIndex] });
    } catch (err) {
        return json({ error: 'Nieprawidłowe żądanie' }, { status: 400 });
    }
};