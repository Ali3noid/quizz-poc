import type { PageServerLoad } from './$types';
import { getServerSupabase } from '$lib/server/supabase';

export interface RankingEntry {
    id: string;
    nickname: string;
    hintsUsed: number;
    solvedCount: number;
    lastActivityAt: string;
}

interface RankingRow {
    player_id: string;
    nickname: string;
    hints_used: number;
    solved_count: number;
    last_activity_at: string;
}

export const load: PageServerLoad = async () => {
    try {
        const supabase = getServerSupabase();

        const { data, error } = await supabase
            .from('ranking_entries')
            .select('player_id, nickname, hints_used, solved_count, last_activity_at')
            .order('solved_count', { ascending: false })
            .order('hints_used', { ascending: true })
            .order('last_activity_at', { ascending: true });

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
