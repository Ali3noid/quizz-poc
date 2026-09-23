import type { RiddleCategory } from '$lib/categories';
import type { CategoryPoll } from '$lib/types/database';
import { getServerSupabase } from '$lib/server/supabase';

interface PollRow {
    option_one: RiddleCategory;
    option_two: RiddleCategory;
    option_three: RiddleCategory;
}

interface VoteRow {
    category: RiddleCategory;
    weight: number;
}

export interface WeightedCategoryPollResult {
    category: RiddleCategory;
    weightedScore: number;
    percentage: number;
}

export function aggregateCategoryVotes(
    options: [RiddleCategory, RiddleCategory, RiddleCategory],
    votes: VoteRow[]
): WeightedCategoryPollResult[] {
    const scores = new Map<RiddleCategory, number>(options.map((category) => [category, 0]));
    for (const vote of votes) {
        scores.set(vote.category, (scores.get(vote.category) ?? 0) + vote.weight);
    }

    const totalScore = [...scores.values()].reduce((sum, score) => sum + score, 0);
    if (totalScore === 0) {
        return options.map((category) => ({ category, weightedScore: 0, percentage: 0 }));
    }

    const exact = options.map((category) => (scores.get(category) ?? 0) / totalScore * 100);
    const percentages = exact.map(Math.floor);
    const remainder = 100 - percentages.reduce((sum, percentage) => sum + percentage, 0);
    const order = exact
        .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
        .sort((a, b) => b.fraction - a.fraction);

    for (let index = 0; index < remainder; index += 1) {
        percentages[order[index].index] += 1;
    }

    return options.map((category, index) => ({
        category,
        weightedScore: scores.get(category) ?? 0,
        percentage: percentages[index]
    }));
}

export async function getCategoryPollForPlayer(
    riddleId: string,
    playerId: string,
    voteWeight: number
): Promise<CategoryPoll> {
    const supabase = getServerSupabase();
    const { data: poll, error: pollError } = await supabase
        .from('riddle_category_polls')
        .select('option_one, option_two, option_three')
        .eq('riddle_id', riddleId)
        .single();

    if (pollError || !poll) throw pollError ?? new Error('Category poll not found');
    const typedPoll = poll as PollRow;
    const options: [RiddleCategory, RiddleCategory, RiddleCategory] = [
        typedPoll.option_one,
        typedPoll.option_two,
        typedPoll.option_three
    ];
    const { data: playerVote, error: playerVoteError } = await supabase
        .from('riddle_category_votes')
        .select('category, weight')
        .eq('riddle_id', riddleId)
        .eq('player_id', playerId)
        .maybeSingle();

    if (playerVoteError) throw playerVoteError;
    if (!playerVote) {
        return {
            options,
            voteWeight,
            selectedCategory: null,
            results: null,
            totalVoters: null
        };
    }

    const { data: votes, error: votesError } = await supabase
        .from('riddle_category_votes')
        .select('category, weight')
        .eq('riddle_id', riddleId);

    if (votesError) throw votesError;
    const typedVote = playerVote as VoteRow;
    const typedVotes = (votes ?? []) as VoteRow[];
    return {
        options,
        voteWeight: typedVote.weight,
        selectedCategory: typedVote.category,
        results: aggregateCategoryVotes(options, typedVotes).map(({ category, percentage }) => ({ category, percentage })),
        totalVoters: typedVotes.length
    };
}
