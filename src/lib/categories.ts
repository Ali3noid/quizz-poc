export const RIDDLE_CATEGORIES = [
    'history',
    'geography',
    'science',
    'technology',
    'business_economics',
    'nature',
    'sport',
    'movies_tv',
    'music',
    'games',
    'literature_language',
    'art_culture',
    'food_drink',
    'world_society'
] as const;

export type RiddleCategory = typeof RIDDLE_CATEGORIES[number];

export const CATEGORY_LABELS: Record<RiddleCategory, string> = {
    history: 'Historia',
    geography: 'Geografia',
    science: 'Nauka',
    technology: 'Technologia',
    business_economics: 'Biznes i ekonomia',
    nature: 'Przyroda',
    sport: 'Sport',
    movies_tv: 'Film i seriale',
    music: 'Muzyka',
    games: 'Gry',
    literature_language: 'Literatura i język',
    art_culture: 'Sztuka i kultura',
    food_drink: 'Jedzenie i napoje',
    world_society: 'Świat i społeczeństwo'
};
