export interface Riddle {
    id: string;
    question: string;
    images: string[];
    hints: string[];
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
            "Podpowiedź 2: Zgarniała Oscary za efekty.",
            "Podpowiedź 3: Reżyseria: rodzeństwo.",
            "Podpowiedź 4: Czerwona albo niebieska pigułka.",
            "Podpowiedź 5: Neo i Morfeusz."
        ],
        answers: ["matrix", "the matrix"]
    }
};