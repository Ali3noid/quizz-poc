import { json, type RequestHandler } from '@sveltejs/kit';
import { z } from 'zod';
import { normalizeText, type RiddleRecord } from '$lib/server/riddle';
import { getServerSupabase } from '$lib/server/supabase';
import type { SubmitRpcResult } from '$lib/types/database';
import { consumeSubmitAttempt } from '$lib/server/submit-rate-limit';
const submitPayloadSchema = z.object({
    riddleId: z.string().trim().min(1),
    answer: z.string().trim().min(1)
}).strict();

export const POST: RequestHandler = async ({ request, locals }) => {
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

        if (!locals.player?.id) return json({ error: 'Wymagane logowanie' }, { status: 401 });
        const { riddleId, answer } = parseResult.data;

        const rateLimit = consumeSubmitAttempt(`${locals.player.id}:${riddleId}`);

        if (!rateLimit.allowed) {
            return json({
                error: 'Zbyt wiele prób. Poczekaj chwilę przed kolejną odpowiedzią.',
                retryAfterSeconds: rateLimit.retryAfterSeconds
            }, {
                status: 429,
                headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) }
            });
        }

        const supabase = getServerSupabase();
        const { data: riddle, error: riddleError } = await supabase.from('riddles').select('*').eq('id', riddleId).maybeSingle();
        if (riddleError) throw riddleError;
        if (!riddle) return json({ error: 'Nie znaleziono zagadki' }, { status: 404 });
        const isCorrect = (riddle as RiddleRecord).answers.some((candidate) => normalizeText(candidate) === normalizeText(answer));
        const { data, error } = await supabase.rpc('record_riddle_attempt', { p_player_id: locals.player.id, p_riddle_id: riddleId, p_is_correct: isCorrect }).single();

        if (error) {
            // The RPC uses P0001 only for expected game-state conflicts.
            // Do not present missing migrations or database failures as an exhausted attempt.
            if (error.code === 'P0001') {
                return json({ error: 'Ta próba została już wykorzystana. Odświeżono stan zagadki.' }, { status: 409 });
            }

            console.error('record_riddle_attempt RPC failed', error);
            return json({ error: 'Nie udało się zapisać odpowiedzi. Spróbuj ponownie później.' }, { status: 500 });
        }

        if (!data) {
            console.error('record_riddle_attempt RPC returned no data');
            return json({ error: 'Nie udało się zapisać odpowiedzi. Spróbuj ponownie później.' }, { status: 500 });
        }
        const result = data as SubmitRpcResult;
        return json({
            isCorrect: result.is_correct,
            hintsRevealed: result.hints_revealed,
            attemptsCount: result.attempts_count,
            exhausted: Boolean(result.exhausted_at),
            startedAt: result.started_at,
            completedAt: result.solved_at,
            completionSeconds: result.completion_seconds,
            message: result.is_correct ? 'Gratulacje! To poprawna odpowiedź!' : result.exhausted_at ? 'Wykorzystano wszystkie próby i podpowiedzi.' : 'To nie jest poprawna odpowiedź. Odkryj podpowiedź, aby spróbować ponownie.'
        });
    } catch (err) {
        console.error('Błąd podczas przetwarzania zgłoszenia:', err);
        return json({ error: 'Nieprawidłowe żądanie' }, { status: 400 });
    }
};
