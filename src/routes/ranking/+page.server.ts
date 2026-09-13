import type { PageServerLoad } from './$types';
import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';

export interface RankingEntry {
    id: string | number;
    nickname: string;
    hintsUsed: number;
    time: string;
    isCorrect?: boolean;
    createdAt?: string;
}

export const load: PageServerLoad = async () => {
    const supabaseUrl = env.SUPABASE_URL;
    const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.warn('Brak konfiguracji Supabase w zmiennych środowiskowych');
        return {
            rankings: [] as RankingEntry[],
            error: 'Brak konfiguracji bazy danych'
        };
    }

    try {
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data, error } = await supabase
            .from('submissions')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Błąd pobierania rankingu z Supabase:', error);
            return {
                rankings: [] as RankingEntry[],
                error: 'Nie udało się pobrać wyników z bazy danych'
            };
        }

        const validSubmissions = (data || []).filter((item: Record<string, unknown>) => {
            if (typeof item.is_correct === 'boolean') {
                return item.is_correct;
            }
            return true;
        });

        const rankings: RankingEntry[] = validSubmissions.map((item: Record<string, unknown>, index: number) => {
            const nickname = (typeof item.nickname === 'string' && item.nickname.trim())
                ? item.nickname.trim()
                : (typeof item.player === 'string' && item.player.trim())
                ? item.player.trim()
                : 'Anonim';

            let hintsUsed = 0;
            if (typeof item.hints_used === 'number') {
                hintsUsed = item.hints_used;
            } else if (typeof item.hints_count === 'number') {
                hintsUsed = item.hints_count;
            } else if (Array.isArray(item.hints)) {
                hintsUsed = item.hints.length;
            }

            let formattedTime = '-';
            if (typeof item.duration === 'number' || typeof item.time_taken === 'number') {
                const totalSeconds = (item.duration ?? item.time_taken) as number;
                const minutes = Math.floor(totalSeconds / 60);
                const seconds = totalSeconds % 60;
                formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            } else if (typeof item.time === 'string' && item.time) {
                formattedTime = item.time;
            } else if (typeof item.created_at === 'string' && item.created_at) {
                try {
                    const date = new Date(item.created_at);
                    if (!isNaN(date.getTime())) {
                        formattedTime = date.toLocaleTimeString('pl-PL', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                        });
                    }
                } catch {
                    formattedTime = String(item.created_at);
                }
            }

            return {
                id: (item.id as string | number) ?? index + 1,
                nickname,
                hintsUsed,
                time: formattedTime,
                isCorrect: typeof item.is_correct === 'boolean' ? item.is_correct : true,
                createdAt: typeof item.created_at === 'string' ? item.created_at : undefined
            };
        });

        rankings.sort((a, b) => {
            if (a.hintsUsed !== b.hintsUsed) {
                return a.hintsUsed - b.hintsUsed;
            }
            if (a.createdAt && b.createdAt) {
                return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            }
            return 0;
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
