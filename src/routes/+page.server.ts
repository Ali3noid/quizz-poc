import type { PageServerLoad } from './$types';
import { RIDDLES } from '$lib/server/riddle';

export const load: PageServerLoad = async ({ cookies }) => {
    console.log('=== [SERVER] LOADER STARTED ===');
    const isAuthorized = cookies.get('gate_access') === 'granted';
    const activeRiddle = RIDDLES['1'];

    return {
        isAuthorized,
        riddle: isAuthorized && activeRiddle
            ? {
                id: activeRiddle.id,
                question: activeRiddle.question,
                images: activeRiddle.images
            }
            : null
    };
};