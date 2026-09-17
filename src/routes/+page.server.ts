import type { PageServerLoad } from './$types';
import { RIDDLES } from '$lib/server/riddle';

export const load: PageServerLoad = async ({ locals, cookies }) => {
    console.log('=== [SERVER] LOADER STARTED ===');
    const isAuthorized = locals.isAuthorized ?? (cookies.get('gate_access') === 'granted');
    const player = locals.player ?? (cookies.get('player_nickname') ? {
        id: cookies.get('player_id') || '',
        nickname: cookies.get('player_nickname') || ''
    } : null);
    const activeRiddle = RIDDLES['1'];

    return {
        isAuthorized,
        player,
        riddle: isAuthorized && activeRiddle
            ? {
                id: activeRiddle.id,
                question: activeRiddle.question,
                images: activeRiddle.images
            }
            : null
    };
};