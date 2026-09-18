export type Hint = string | { text?: string; image?: string };

export interface RiddleRecord {
    id: string;
    question: string;
    images: unknown;
    hints: unknown;
    answers: string[];
    starts_at: string;
    ends_at: string;
}

export interface SafeRiddle {
    id: string;
    question: string;
    images: string[];
    hintCount: number;
    startsAt: string;
    endsAt: string;
}

function isHint(value: unknown): value is Hint {
    return typeof value === 'string' || (typeof value === 'object' && value !== null &&
        (!('text' in value) || typeof value.text === 'string') &&
        (!('image' in value) || typeof value.image === 'string'));
}

export function mapImages(value: unknown): string[] {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

export function mapHints(value: unknown): Hint[] {
    return Array.isArray(value) ? value.filter(isHint) : [];
}

export function toSafeRiddle(riddle: RiddleRecord): SafeRiddle {
    return { id: riddle.id, question: riddle.question, images: mapImages(riddle.images), hintCount: mapHints(riddle.hints).length, startsAt: riddle.starts_at, endsAt: riddle.ends_at };
}

export function normalizeText(text: string): string {
    return text.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');
}
