import type { PageServerLoad } from './$types';
import { getServerSupabase } from '$lib/server/supabase';

export interface RankingEntry {
    id: string;
    nickname: string;
    hintsUsed: number;
    solvedCount: number;
    lastSolvedAt: string;
}

export const load: PageServerLoad = async () => {
    try {
        const supabase = getServerSupabase();

        const { data, error } = await supabase
            .from('player_riddle_progress')
            .select(`
                player_id,
                hints_revealed,
                solved_at,
                players (
                    id,
                    nickname
                )
            `)
            .not('solved_at', 'is', null);

        if (error) {
            console.error('Błąd pobierania rankingu z Supabase:', error);
            return {
                rankings: [] as RankingEntry[],
                error: 'Nie udało się pobrać wyników z bazy danych'
            };
        }

        const aggregate = new Map<string, RankingEntry>();
        for (const item of (data || []) as Record<string, unknown>[]) {
            const playerObj = (item.players && typeof item.players === 'object')
                ? (Array.isArray(item.players) ? item.players[0] : item.players)
                : null;

            const nickname = (playerObj && typeof playerObj === 'object' && typeof (playerObj as Record<string, unknown>).nickname === 'string' && (playerObj as Record<string, unknown>).nickname)
                ? ((playerObj as Record<string, unknown>).nickname as string).trim()
                : (typeof item.nickname === 'string' && item.nickname.trim())
                ? item.nickname.trim()
                : (typeof item.player === 'string' && item.player.trim())
                ? item.player.trim()
                : 'Anonim';

            const playerId = String(item.player_id);
            const existing = aggregate.get(playerId);
            const hints = typeof item.hints_revealed === 'number' ? item.hints_revealed : 0;
            const solvedAt = String(item.solved_at);
            aggregate.set(playerId, existing ? { ...existing, solvedCount: existing.solvedCount + 1, hintsUsed: existing.hintsUsed + hints, lastSolvedAt: existing.lastSolvedAt < solvedAt ? existing.lastSolvedAt : solvedAt } : { id: playerId, nickname, solvedCount: 1, hintsUsed: hints, lastSolvedAt: solvedAt });
        }
        const rankings = [...aggregate.values()];

        rankings.sort((a, b) => {
            if (a.solvedCount !== b.solvedCount) return b.solvedCount - a.solvedCount;
            if (a.hintsUsed !== b.hintsUsed) {
                return a.hintsUsed - b.hintsUsed;
            }
            return new Date(a.lastSolvedAt).getTime() - new Date(b.lastSolvedAt).getTime();
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
