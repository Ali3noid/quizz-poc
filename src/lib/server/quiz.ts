import type { PlayerRiddleProgress, RiddleAnswerResult, RiddleListItem, RiddleStatus, StartRiddleRpcResult } from '$lib/types/database';
import { getServerSupabase } from '$lib/server/supabase';
import { getCategoryPollForPlayer } from '$lib/server/category-poll';
import { mapHints, toSafeRiddle, type Hint, type RiddleRecord, type SafeRiddle } from '$lib/server/riddle';

export interface PlayableRiddle extends SafeRiddle {
    revealedHints: Hint[];
    canAttempt: boolean;
    completion: { solved: boolean; hintsUsed: number } | null;
    timing: { startedAt: string; completedAt: string | null; serverNow: string };
    poll: import('$lib/types/database').CategoryPoll | null;
}

function toProgress(value: unknown): PlayerRiddleProgress | null {
    return value && typeof value === 'object' ? value as PlayerRiddleProgress : null;
}

function statusFor(riddle: Pick<RiddleRecord, 'ends_at'>, progress: PlayerRiddleProgress | null, playerCreatedAt: string, now: Date): RiddleStatus {
    if (progress?.solved_at) return 'solved';
    if (progress?.exhausted_at) return 'unsolved';
    if (new Date(riddle.ends_at) <= now) {
        return new Date(riddle.ends_at) <= new Date(playerCreatedAt)
            ? 'archived'
            : progress?.attempts_count
                ? 'unsolved'
                : 'missed';
    }

    return 'current';
}

function lastAnswerResultFor(progress: PlayerRiddleProgress | null): RiddleAnswerResult {
    if (progress?.solved_at) return 'correct';
    if (progress && progress.attempts_count > 0 && progress.last_attempt_hint_index === progress.hints_revealed) return 'incorrect';
    return null;
}

export async function listRiddlesForPlayer(playerId: string, playerCreatedAt: string): Promise<RiddleListItem[]> {
    const supabase = getServerSupabase();
    const { data, error } = await supabase
        .from('riddles')
        .select('id, ends_at, created_at')
        .lte('starts_at', new Date().toISOString())
        .order('starts_at', { ascending: false });

    if (error) throw error;
    const { data: progress, error: progressError } = await supabase
        .from('player_riddle_progress')
        .select('*')
        .eq('player_id', playerId);

    if (progressError) throw progressError;
    const byRiddle = new Map((progress ?? []).map((item) => [item.riddle_id, item as PlayerRiddleProgress]));
    const now = new Date();

    return ((data ?? []) as Pick<RiddleRecord, 'id' | 'ends_at' | 'created_at'>[]).map((riddle) => {
        const item = byRiddle.get(riddle.id) ?? null;
        const status = statusFor(riddle, item, playerCreatedAt, now);

        return {
            id: riddle.id,
            createdAt: riddle.created_at,
            endsAt: riddle.ends_at,
            status,
            isOpen: Boolean(item?.solved_at || item?.exhausted_at) || (status === 'current' && !item?.solved_at && !item?.exhausted_at),
            hintsUsed: item?.hints_revealed ?? 0,
            lastAnswerResult: lastAnswerResultFor(item)
        };
    });
}

export async function getCurrentPlayableRiddle(playerId: string, riddleId: string): Promise<PlayableRiddle | null> {
    const supabase = getServerSupabase();
    const now = new Date().toISOString();
    const { data: riddle, error } = await supabase
        .from('riddles')
        .select('*')
        .eq('id', riddleId)
        .lte('starts_at', now)
        .maybeSingle();

    if (error) throw error;
    if (!riddle) return null;

    const { data: timingData, error: timingError } = await supabase
        .rpc('start_riddle', { p_player_id: playerId, p_riddle_id: riddleId })
        .single();

    if (timingError) {
        if (timingError.code === 'P0001') return null;
        throw timingError;
    }
    if (!timingData) throw new Error('start_riddle RPC returned no data');
    const timing = timingData as StartRiddleRpcResult;

    const { data: progress, error: progressError } = await supabase
        .from('player_riddle_progress')
        .select('*')
        .eq('player_id', playerId)
        .eq('riddle_id', riddleId)
        .maybeSingle();

    if (progressError) throw progressError;
    const item = toProgress(progress);

    const typed = riddle as RiddleRecord;
    const isFinished = Boolean(item?.solved_at || item?.exhausted_at);
    if (!isFinished && new Date(typed.ends_at) <= new Date(now)) return null;

    const hints = mapHints(typed.hints);
    const revealed = item?.hints_revealed ?? 0;

    return {
        ...toSafeRiddle(typed),
        revealedHints: hints.slice(0, revealed),
        canAttempt: !isFinished && item?.last_attempt_hint_index !== revealed,
        completion: isFinished ? { solved: Boolean(item?.solved_at), hintsUsed: revealed } : null,
        timing: {
            startedAt: timing.started_at,
            completedAt: timing.completed_at,
            serverNow: timing.server_now
        },
        poll: isFinished ? await getCategoryPollForPlayer(riddleId, playerId, item?.exhausted_at ? 6 : Math.min(revealed + 1, 6)) : null
    };
}
