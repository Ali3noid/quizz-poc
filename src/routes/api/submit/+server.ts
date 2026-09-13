import { json, type RequestHandler } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';
import { RIDDLES } from '$lib/server/riddle';

function normalizeText(text: string): string {
    return text
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ');
}

export const POST: RequestHandler = async ({ request }) => {
    try {
        const body = await request.json();
        const { riddleId, answer, nickname, hints_used } = body;

        if (!riddleId || typeof riddleId !== 'string') {
            return json({ error: 'Brak identyfikatora zagadki' }, { status: 400 });
        }

        if (typeof answer !== 'string' || answer.trim() === '') {
            return json({ error: 'Odpowiedź nie może być pusta' }, { status: 400 });
        }

        const riddle = RIDDLES[riddleId];
        if (!riddle) {
            return json({ error: 'Nie znaleziono zagadki' }, { status: 404 });
        }

        const normalizedUserAnswer = normalizeText(answer);
        const isCorrect = riddle.answers.some((ans) => normalizeText(ans) === normalizedUserAnswer);

        const parsedHintsUsed = typeof hints_used === 'number'
            ? Math.max(0, Math.floor(hints_used))
            : 0;

        const supabaseUrl = env.SUPABASE_URL;
        const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

        if (supabaseUrl && supabaseKey) {
            const supabase = createClient(supabaseUrl, supabaseKey);
            const { error: dbError } = await supabase.from('submissions').insert({
                nickname: typeof nickname === 'string' && nickname.trim() ? nickname.trim() : 'Anonim',
                riddle_id: riddleId,
                hints_used: parsedHintsUsed,
                is_correct: isCorrect
            });

            if (dbError) {
                console.error('Błąd zapisu do Supabase:', dbError);
            }
        } else {
            console.warn('Brak konfiguracji SUPABASE_URL lub SUPABASE_SERVICE_ROLE_KEY w zmiennych środowiskowych');
        }

        return json({
            isCorrect,
            message: isCorrect
                ? 'Gratulacje! To poprawna odpowiedź!'
                : 'Niestety, to nie jest poprawna odpowiedź. Spróbuj ponownie.'
        });
    } catch (err) {
        console.error('Błąd podczas przetwarzania zgłoszenia:', err);
        return json({ error: 'Nieprawidłowe żądanie' }, { status: 400 });
    }
};
