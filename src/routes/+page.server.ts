import type { PageServerLoad } from './$types';
import { getServerSupabase } from '$lib/server/supabase';
import { listRiddlesForPlayer } from '$lib/server/quiz';

export const load: PageServerLoad = async ({ locals, cookies }) => {
    const isAuthorized = locals.isAuthorized ?? (cookies.get('gate_access') === 'granted');
    const player = locals.player ?? (cookies.get('player_nickname') ? {
        id: cookies.get('player_id') || '',
        nickname: cookies.get('player_nickname') || ''
    } : null);
    if (!isAuthorized || !player?.id) {
        return { isAuthorized, player, riddles: [], error: null };
    }

    try {
        const { data: playerRow, error } = await getServerSupabase()
            .from('players')
            .select('created_at')
            .eq('id', player.id)
            .maybeSingle();

        if (error) {
            throw error;
        }

        // A stale browser session can outlive a player removed from the database.
        // Clear it so the normal login view is rendered instead of treating it as a server failure.
        if (!playerRow?.created_at) {
            cookies.delete('player_nickname', { path: '/' });
            cookies.delete('player_id', { path: '/' });
            return { isAuthorized, player: null, riddles: [], error: null };
        }

        return {
            isAuthorized,
            player,
            riddles: await listRiddlesForPlayer(player.id, playerRow.created_at),
            error: null
        };
    } catch (error) {
        console.error('Could not load riddle list', error);
        return { isAuthorized, player, riddles: [], error: 'Nie udało się pobrać listy zagadek.' };
    }
};
