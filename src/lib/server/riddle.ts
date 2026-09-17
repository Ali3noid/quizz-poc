export type Hint = string | {
    text?: string;
    image?: string;
};

export interface Riddle {
    id: string;
    question: string;
    images: string[];
    hints: Hint[];
    answers: string[];
}

export const RIDDLES: Record<string, Riddle> = {
    "1": {
        id: "1",
        question: "Jaki film łączy te 3 kadry?",
        images: [
            "https://picsum.photos/800/600",
            "https://picsum.photos/800/600"
        ],
        hints: [
            "Podpowiedź 1: Premiera w latach 90.",
            {
                text: "Podpowiedź 2: Zgarniała Oscary za efekty wizualne.",
                image: "https://picsum.photos/600/400"
            },
            {
                image: "https://picsum.photos/600/400"
            },
            {
                text: "Podpowiedź 4: Czerwona albo niebieska pigułka."
            },
            "Podpowiedź 5: Neo i Morfeusz."
        ],
        answers: ["matrix", "the matrix"]
    }
};