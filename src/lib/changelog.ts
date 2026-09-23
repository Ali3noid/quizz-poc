export const CHANGELOG_STORAGE_KEY = 'lastSeenChangelogVersion';

export const changelog = {
    version: 3,
    title: 'Aktualizacja 0.3',
    message: 'Dodałem parę rzeczy i planuję dodawać zagadki co dwa dni. Daje mi to wystarczająco dużo czasu, żeby je przygotować i dorzucić coś nowego na stronę. Postaram się trochę poeksperymentować, ale wciąż w ramach formuły: pytanie + pięć odpowiedzi. Lista zmian znajduje się poniżej.',
    changes: [
        'Głosowanie na kategorię następnego pytania.',
        'Okienko „Co nowego?”.',
        'Możliwość wglądu w poprzednie pytania.',
        'Poprawione wyświetlanie rankingu. Wcześniej było w nim parę błędów.'
    ]
} as const;
