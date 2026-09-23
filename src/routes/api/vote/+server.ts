import { json, type RequestHandler } from '@sveltejs/kit';
import { z } from 'zod';
import { RIDDLE_CATEGORIES } from '$lib/categories';
import { getCategoryPollForPlayer } from '$lib/server/category-poll';
import { getServerSupabase } from '$lib/server/supabase';

const voteSchema = z.object({
    riddleId: z.string().trim().min(1),
    category: z.enum(RIDDLE_CATEGORIES)
}).strict();

interface CastVoteResult {
    weight: number;
}

export const POST: RequestHandler = async ({ request, locals }) => {
    if (!locals.player?.id) {
        return json({ error: 'Wymagane logowanie' }, { status: 401 });
    }

    const parsed = voteSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
        return json({ error: 'Nieprawidłowe dane głosu' }, { status: 400 });
    }

    try {
        const supabase = getServerSupabase();
        const { data, error } = await supabase
            .rpc('cast_category_vote', {
                p_player_id: locals.player.id,
                p_riddle_id: parsed.data.riddleId,
                p_category: parsed.data.category
            })
            .single();

        if (error?.code === '23505') {
            return json({ error: 'Głos w tej ankiecie został już oddany' }, { status: 409 });
        }
        if (error?.code === 'P0001') {
            return json({ error: 'Nie można oddać tego głosu' }, { status: 400 });
        }
        if (error || !data) {
            console.error('cast_category_vote RPC failed', error);
            return json({ error: 'Nie udało się zapisać głosu' }, { status: 500 });
        }

        const result = data as CastVoteResult;
        return json({ poll: await getCategoryPollForPlayer(parsed.data.riddleId, locals.player.id, result.weight) });
    } catch (error) {
        console.error('Category vote failed', error);
        return json({ error: 'Nie udało się zapisać głosu' }, { status: 500 });
    }
};
