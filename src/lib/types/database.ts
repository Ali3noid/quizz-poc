export interface Player {
    id: string;
    nickname: string;
    password_hash: string;
    created_at?: string;
}

export interface Submission {
    id: string;
    player_id?: string;
    nickname?: string;
    riddle_id: string;
    hints_used: number;
    is_correct: boolean;
    created_at?: string;
}

export interface RiddleRow {
    id: string;
    question: string;
    images: unknown;
    hints: unknown;
    answers: string[];
    starts_at: string;
    ends_at: string;
    created_at: string;
    updated_at: string;
}

export interface PlayerRiddleProgress {
    player_id: string;
    riddle_id: string;
    hints_revealed: number;
    attempts_count: number;
    last_attempt_hint_index: number | null;
    solved_at: string | null;
    exhausted_at: string | null;
    created_at: string;
    updated_at: string;
}

export type RiddleStatus = 'current' | 'solved' | 'unsolved' | 'missed' | 'archived';
export type RiddleAnswerResult = 'correct' | 'incorrect' | null;

export interface RiddleListItem {
    id: string;
    createdAt: string;
    endsAt: string;
    status: RiddleStatus;
    isOpen: boolean;
    hintsUsed: number;
    lastAnswerResult: RiddleAnswerResult;
}

export interface HintRpcResult {
    hints_revealed: number;
    hint: import('$lib/server/riddle').Hint;
}

export interface SubmitRpcResult {
    is_correct: boolean;
    hints_revealed: number;
    attempts_count: number;
    solved_at: string | null;
    exhausted_at: string | null;
}
