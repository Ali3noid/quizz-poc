import { json, type RequestHandler } from '@sveltejs/kit';
import { z } from 'zod';
import { getServerSupabase } from '$lib/server/supabase';
import type { HintRpcResult } from '$lib/types/database';
const schema = z.object({ riddleId: z.string().trim().min(1) }).strict();

export const POST: RequestHandler = async ({ request, locals }) => {
    if (!locals.player?.id) {
        return json({ error: 'Wymagane logowanie' }, { status: 401 });
    }

    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
        return json({ error: 'Nieprawidłowe dane podpowiedzi' }, { status: 400 });
    }

    try {
        const { data, error } = await getServerSupabase()
            .rpc('reveal_riddle_hint', {
                p_player_id: locals.player.id,
                p_riddle_id: parsed.data.riddleId
            })
            .single();

        if (error || !data) {
            return json({ error: 'Podpowiedź jest niedostępna' }, { status: 409 });
        }

        const result = data as HintRpcResult;
        return json({
            hint: result.hint,
            hintsRevealed: result.hints_revealed,
            canAttempt: true
        });
    } catch (error) {
        console.error('Hint RPC failed', error);
        return json({ error: 'Nie udało się pobrać podpowiedzi' }, { status: 500 });
    }
};
