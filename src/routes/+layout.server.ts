import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals }) => ({
    isAuthenticated: locals.isAuthorized && Boolean(locals.player?.id)
});
