import { json, type RequestHandler } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';
import { RIDDLES } from '$lib/server/riddle';
import type { SubmissionInsert } from '$lib/types/database';

function normalizeText(text: string): string {
    return text
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ');
}

export const POST: RequestHandler = async ({ request, cookies, locals }) => {
    try {
        const body = await request.json();
        const { riddleId, answer, nickname, hints_used, playerId: bodyPlayerId } = body;

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

        const parsedHintsUsed = typeof hints_used === 'number' ? hints_used : 0;

        const supabaseUrl = env.SUPABASE_URL;
        const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

        if (supabaseUrl && supabaseKey) {
            const supabase = createClient(supabaseUrl, supabaseKey);

            let playerId = (typeof bodyPlayerId === 'string' && bodyPlayerId.trim())
                ? bodyPlayerId.trim()
                : (locals.player?.id || cookies.get('player_id') || null);

            const cookiePlayerNickname = cookies.get('player_nickname');
            let finalNickname = (typeof nickname === 'string' && nickname.trim())
                ? nickname.trim()
                : (locals.player?.nickname || cookiePlayerNickname || null);

            if (!playerId && finalNickname && finalNickname !== 'Anonim' && finalNickname !== 'Gość') {
                const { data: player } = await supabase
                    .from('players')
                    .select('id, nickname')
                    .ilike('nickname', finalNickname)
                    .maybeSingle();

                if (player?.id) {
                    playerId = player.id;
                    if (!finalNickname) finalNickname = player.nickname;
                }
            } else if (playerId && !finalNickname) {
                const { data: player } = await supabase
                    .from('players')
                    .select('nickname')
                    .eq('id', playerId)
                    .maybeSingle();

                if (player?.nickname) {
                    finalNickname = player.nickname;
                }
            }

            if (playerId) {
                const submissionPayload: SubmissionInsert = {
                    player_id: playerId,
                    nickname: finalNickname || 'Gracz',
                    riddle_id: riddleId,
                    hints_used: parsedHintsUsed,
                    is_correct: isCorrect
                };

                const { error: dbError } = await supabase.from('submissions').insert(submissionPayload);

                if (dbError) {
                    console.error('Błąd zapisu do Supabase:', dbError);
                }
            } else {
                console.warn('Pominięto zapis do Supabase: brak powiązanego zarejestrowanego gracza (player_id)');
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
