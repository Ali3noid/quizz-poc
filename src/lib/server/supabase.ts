import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';

export function getServerSupabase() {
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error('Supabase is not configured');
    }

    return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
            persistSession: false,
            autoRefreshToken: false
        }
    });
}
