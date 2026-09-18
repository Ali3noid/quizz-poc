import { redirect } from '@sveltejs/kit';
import { getCurrentPlayableRiddle } from '$lib/server/quiz';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, cookies, params }) => {
    if (!(locals.isAuthorized ?? cookies.get('gate_access') === 'granted') || !locals.player?.id) {
        redirect(303, '/');
    }

    try {
        const riddle = await getCurrentPlayableRiddle(locals.player.id, params.riddleId);
        if (!riddle) redirect(303, '/');

        return { riddle };
    } catch (error) {
        console.error('Could not load riddle', error);
        redirect(303, '/');
    }
};
