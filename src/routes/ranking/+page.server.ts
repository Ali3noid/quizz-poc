import type { PageServerLoad } from './$types';
import { getServerSupabase } from '$lib/server/supabase';

export interface RankingEntry {
    id: string;
    nickname: string;
    hintsUsed: number;
    solvedCount: number;
    lastActivityAt: string;
}

export const load: PageServerLoad = async () => {
    try {
        const supabase = getServerSupabase();

        const { data, error } = await supabase
            .from('submissions')
            .select(`
                player_id,
                nickname,
                hints_used,
                is_correct,
                created_at
            `);

        if (error) {
            console.error('Błąd pobierania rankingu z Supabase:', error);
            return {
                rankings: [] as RankingEntry[],
                error: 'Nie udało się pobrać wyników z bazy danych'
            };
        }

        const aggregate = new Map<string, RankingEntry>();
        for (const item of (data || []) as Record<string, unknown>[]) {
            const nickname = typeof item.nickname === 'string' && item.nickname.trim() ? item.nickname.trim() : 'Anonim';
            const playerId = String(item.player_id);
            const existing = aggregate.get(playerId);
            const hints = typeof item.hints_used === 'number' ? item.hints_used : 0;
            const solvedCount = item.is_correct === true ? 1 : 0;
            const activityAt = typeof item.created_at === 'string' ? item.created_at : '';
            aggregate.set(playerId, existing
                ? {
                    ...existing,
                    solvedCount: existing.solvedCount + solvedCount,
                    hintsUsed: existing.hintsUsed + hints,
                    lastActivityAt: existing.lastActivityAt < activityAt ? existing.lastActivityAt : activityAt
                }
                : { id: playerId, nickname, solvedCount, hintsUsed: hints, lastActivityAt: activityAt });
        }
        const rankings = [...aggregate.values()];

        rankings.sort((a, b) => {
            if (a.solvedCount !== b.solvedCount) return b.solvedCount - a.solvedCount;
            if (a.hintsUsed !== b.hintsUsed) {
                return a.hintsUsed - b.hintsUsed;
            }
            return new Date(a.lastActivityAt).getTime() - new Date(b.lastActivityAt).getTime();
        });

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
