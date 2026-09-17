import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
    const gateAccess = event.cookies.get('gate_access');
    const playerNickname = event.cookies.get('player_nickname');
    const playerId = event.cookies.get('player_id');

    event.locals.isAuthorized = gateAccess === 'granted';
    event.locals.player = playerNickname
        ? {
            id: playerId || '',
            nickname: playerNickname
        }
        : null;

    return resolve(event);
};