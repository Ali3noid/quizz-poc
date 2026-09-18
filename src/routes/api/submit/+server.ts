import { json, type RequestHandler } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { env } from '$env/dynamic/private';
import { RIDDLES } from '$lib/server/riddle';
import { consumeSubmitAttempt } from '$lib/server/submit-rate-limit';
import type { SubmissionInsert } from '$lib/types/database';

const optionalTrimmedString = z.preprocess((value) => {
    if (typeof value !== 'string') return value;

    const trimmedValue = value.trim();
    return trimmedValue === '' ? undefined : trimmedValue;
}, z.string().min(1).optional());

const submitPayloadSchema = z.object({
    riddleId: z.string().trim().min(1),
    answer: z.string().trim().min(1),
    nickname: optionalTrimmedString,
    playerId: optionalTrimmedString,
    hints_used: z.number().int().min(0).default(0)
}).strict();

function normalizeText(text: string): string {
    return text
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ');
}

export const POST: RequestHandler = async ({ request, cookies, locals, getClientAddress }) => {
    try {
        const parseResult = submitPayloadSchema.safeParse(await request.json());

        if (!parseResult.success) {
            const validationErrors = parseResult.error.flatten();
            return json({
                error: 'Nieprawidłowe dane odpowiedzi',
                fieldErrors: validationErrors.fieldErrors,
                formErrors: validationErrors.formErrors
            }, { status: 400 });
        }

        const { riddleId, answer, nickname, hints_used, playerId: bodyPlayerId } = parseResult.data;

        const riddle = RIDDLES[riddleId];
        if (!riddle) {
            return json({ error: 'Nie znaleziono zagadki' }, { status: 404 });
        }

        // Do not use playerId from the request body: it can be forged by a client.
        const actor = locals.player?.id || getClientAddress();
        const rateLimit = consumeSubmitAttempt(`${actor}:${riddleId}`);

        if (!rateLimit.allowed) {
            return json({
                error: 'Zbyt wiele prób. Poczekaj chwilę przed kolejną odpowiedzią.',
                retryAfterSeconds: rateLimit.retryAfterSeconds
            }, {
                status: 429,
                headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) }
            });
        }

        const normalizedUserAnswer = normalizeText(answer);
        const isCorrect = riddle.answers.some((ans) => normalizeText(ans) === normalizedUserAnswer);

        const supabaseUrl = env.SUPABASE_URL;
        const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

        if (supabaseUrl && supabaseKey) {
            const supabase = createClient(supabaseUrl, supabaseKey);

            let playerId = bodyPlayerId ?? locals.player?.id ?? cookies.get('player_id') ?? null;

            const cookiePlayerNickname = cookies.get('player_nickname');
            let finalNickname = nickname ?? locals.player?.nickname ?? cookiePlayerNickname ?? null;

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
                    hints_used,
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
                : 'Niestety, to nie jest poprawna odpowiedź. Odkryj podpowiedź, aby odnowić limit prób.'
        });
    } catch (err) {
        console.error('Błąd podczas przetwarzania zgłoszenia:', err);
        return json({ error: 'Nieprawidłowe żądanie' }, { status: 400 });
    }
};
