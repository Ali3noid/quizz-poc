import type { PageServerLoad } from './$types';
import { getServerSupabase } from '$lib/server/supabase';

export interface RankingEntry {
    id: string;
    nickname: string;
    basePoints: number;
    timeBonusPoints: number;
    totalPoints: number;
    currentRiddleSeconds: number | null;
    hintsUsed: number;
    solvedCount: number;
    lastActivityAt: string;
}

interface RankingRow {
    player_id: string;
    nickname: string;
    base_points: number;
    time_bonus_points: number;
    total_points: number;
    current_riddle_seconds: number | null;
    hints_used: number;
    solved_count: number;
    last_activity_at: string;
}

export const load: PageServerLoad = async () => {
    try {
        const supabase = getServerSupabase();

        const { data, error } = await supabase
            .from('ranking_entries')
            .select('player_id, nickname, base_points, time_bonus_points, total_points, current_riddle_seconds, hints_used, solved_count, last_activity_at')
            .order('total_points', { ascending: false })
            .order('hints_used', { ascending: true })
            .order('last_activity_at', { ascending: true })
            .order('player_id', { ascending: true });

        if (error) {
            console.error('Błąd pobierania rankingu z Supabase:', error);
            return {
                rankings: [] as RankingEntry[],
                error: 'Nie udało się pobrać wyników z bazy danych'
            };
        }

        const rankings: RankingEntry[] = ((data ?? []) as RankingRow[]).map((row) => ({
            id: row.player_id,
            nickname: row.nickname,
            basePoints: Number(row.base_points),
            timeBonusPoints: Number(row.time_bonus_points),
            totalPoints: Number(row.total_points),
            currentRiddleSeconds: row.current_riddle_seconds === null ? null : Number(row.current_riddle_seconds),
            hintsUsed: row.hints_used,
            solvedCount: row.solved_count,
            lastActivityAt: row.last_activity_at
        }));

        return {
            rankings,
            error: null
        };
    } catch (err) {
        console.error('Nieoczekiwany błąd podczas ładowania rankingu:', err);
        return {
            rankings: [] as RankingEntry[],
            error: 'Wystąpił nieoczekiwany błąd serwera'
        };
    }
};
