import type { PageServerLoad } from './$types';
import { getServerSupabase } from '$lib/server/supabase';
import { listRiddlesForPlayer } from '$lib/server/quiz';

export const load: PageServerLoad = async ({ locals, cookies }) => {
    const isAuthorized = locals.isAuthorized ?? (cookies.get('gate_access') === 'granted');
    const player = locals.player ?? (cookies.get('player_nickname') ? {
        id: cookies.get('player_id') || '',
        nickname: cookies.get('player_nickname') || ''
    } : null);
    if (!isAuthorized || !player?.id) return { isAuthorized, player, riddles: [], error: null };
    try {
        const { data: playerRow, error } = await getServerSupabase().from('players').select('created_at').eq('id', player.id).maybeSingle();
        if (error || !playerRow?.created_at) throw error ?? new Error('Player missing');
        return { isAuthorized, player, riddles: await listRiddlesForPlayer(player.id, playerRow.created_at), error: null };
    } catch (error) {
        console.error('Could not load riddle list', error);
        return { isAuthorized, player, riddles: [], error: 'Nie udało się pobrać listy zagadek.' };
    }
};
