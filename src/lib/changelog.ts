export const CHANGELOG_STORAGE_KEY = 'lastSeenChangelogVersion';

export const changelog = {
    version: 5,
    title: 'Aktualizacja 0.5',
    message: 'Trochę mi zajęło przygotowanie samej zagadki, więc jedyne zmiany, jakie mamy, to głównie estetyka.',
    changes: [
        'Podpowiedzi mogą zawierać krótkie, automatycznie odtwarzane filmy bez dźwięku.',
        'Poprawione wyświetlanie tekstu zagadki.',
        'Po błędnej odpowiedzi pole tekstowe czyści się automatycznie i jest gotowe na kolejną próbę.',
        'Aktywna zagadka ma teraz neutralny, szary kolor. Zieleń oznacza wyłącznie poprawną odpowiedź.'
    ]
} as const;
