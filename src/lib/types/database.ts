export interface Player {
    id: string;
    nickname: string;
    password_hash: string;
    created_at?: string;
}

export interface Submission {
    id: string;
    player_id: string;
    riddle_id: string;
    hints_used: number;
    is_correct: boolean;
    created_at?: string;
}

export interface SubmissionInsert {
    id?: string;
    player_id: string;
    riddle_id: string;
    hints_used?: number;
    is_correct?: boolean;
    created_at?: string;
}

export interface PlayerInsert {
    id?: string;
    nickname: string;
    password_hash: string;
    created_at?: string;
}
