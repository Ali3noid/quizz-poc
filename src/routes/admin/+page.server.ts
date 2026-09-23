import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { RiddleCategory } from '$lib/categories';
import { aggregateCategoryVotes } from '$lib/server/category-poll';
import { getServerSupabase } from '$lib/server/supabase';

interface AdminRiddleRow {
    id: string;
    question: string;
    category: RiddleCategory;
    starts_at: string;
}

interface AdminPollRow {
    riddle_id: string;
    option_one: RiddleCategory;
    option_two: RiddleCategory;
    option_three: RiddleCategory;
}

interface AdminVoteRow {
    riddle_id: string;
    category: RiddleCategory;
    weight: number;
}

export interface AdminPollOption {
    category: RiddleCategory;
    playerCount: number;
    weightedScore: number;
    percentage: number;
}

export interface AdminRiddlePoll {
    id: string;
    question: string;
    category: RiddleCategory;
    options: AdminPollOption[];
    totalVoters: number;
}

export const load = (async ({ locals, cookies }) => {
    if (!(locals.isAuthorized ?? cookies.get('gate_access') === 'granted') || !locals.player?.id) {
        redirect(303, '/');
    }

    const supabase = getServerSupabase();
    const { data: admin, error: adminError } = await supabase
        .from('admins')
        .select('player_id')
        .eq('player_id', locals.player.id)
        .maybeSingle();

    if (adminError) {
        console.error('Could not verify admin access', adminError);
        error(500, 'Nie udało się zweryfikować dostępu administratora.');
    }
    if (!admin) error(403, 'Brak uprawnień administratora.');

    const [riddlesResponse, pollsResponse, votesResponse] = await Promise.all([
        supabase.from('riddles').select('id, question, category, starts_at').order('starts_at', { ascending: false }),
        supabase.from('riddle_category_polls').select('riddle_id, option_one, option_two, option_three'),
        supabase.from('riddle_category_votes').select('riddle_id, category, weight')
    ]);

    if (riddlesResponse.error || pollsResponse.error || votesResponse.error) {
        console.error('Could not load admin polls', riddlesResponse.error ?? pollsResponse.error ?? votesResponse.error);
        error(500, 'Nie udało się pobrać wyników głosowania.');
    }

    const pollsByRiddle = new Map(
        ((pollsResponse.data ?? []) as AdminPollRow[]).map((poll) => [poll.riddle_id, poll])
    );
    const votes = (votesResponse.data ?? []) as AdminVoteRow[];
    const riddles: AdminRiddlePoll[] = ((riddlesResponse.data ?? []) as AdminRiddleRow[]).flatMap((riddle) => {
        const poll = pollsByRiddle.get(riddle.id);
        if (!poll) return [];

        const options: [RiddleCategory, RiddleCategory, RiddleCategory] = [poll.option_one, poll.option_two, poll.option_three];
        const riddleVotes = votes.filter((vote) => vote.riddle_id === riddle.id);
        const results = aggregateCategoryVotes(options, riddleVotes);

        return [{
            id: riddle.id,
            question: riddle.question,
            category: riddle.category,
            totalVoters: riddleVotes.length,
            options: results.map((result) => ({
                ...result,
                playerCount: riddleVotes.filter((vote) => vote.category === result.category).length
            }))
        }];
    });

    return { riddles };
}) satisfies PageServerLoad<{ riddles: AdminRiddlePoll[] }>;
