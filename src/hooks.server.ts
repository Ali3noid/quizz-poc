import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
    const gateAccess = event.cookies.get('gate_access');
    event.locals.isAuthorized = gateAccess === 'granted';

    return resolve(event);
};