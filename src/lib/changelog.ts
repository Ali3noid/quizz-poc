export const CHANGELOG_STORAGE_KEY = 'lastSeenChangelogVersion';

export const changelog = {
    version: 4,
    title: 'Aktualizacja 0.4',
    message: 'Dodałem pomiar czasu rozwiązywania zagadek oraz premie dla najszybszych graczy. Ranking pokazuje teraz pełniejszy wynik i pozwala porównać czasy uzyskane w aktualnej zagadce. Lista zmian znajduje się poniżej.',
    changes: [
        'Timer rozpoczyna się przy pierwszym otwarciu zagadki i nie resetuje się po odświeżeniu strony.',
        'Trzech najszybszych graczy w każdej nowej zagadce otrzymuje dynamiczną premię: 0,5, 0,3 lub 0,2 punktu.',
        'Ranking pokazuje łączną liczbę punktów, sumę premii czasowych oraz czas rozwiązania aktualnej zagadki.',
        'Premie mogą zmieniać się, gdy kolejny gracz uzyska lepszy czas i znajdzie się w pierwszej trójce.',
        'Wcześniejsze zagadki nie przyznają premii za czas.'
    ]
} as const;
