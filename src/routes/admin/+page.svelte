<script lang="ts">
    import type { PageData } from './$types';
    import { CATEGORY_LABELS, type RiddleCategory } from '$lib/categories';

    let { data } = $props<{ data: PageData }>();

    function categoryLabel(category: RiddleCategory): string {
        return CATEGORY_LABELS[category];
    }
</script>

<svelte:head><title>Panel administratora | Quiz</title></svelte:head>

<main class="min-h-screen bg-neutral-950 p-4 text-neutral-100 sm:p-8">
    <div class="mx-auto max-w-5xl py-4">
        <div class="flex flex-wrap items-center justify-between gap-4">
            <a href="/" class="text-sm text-neutral-400 hover:text-white">← Wróć do quizu</a>
            <span class="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1 text-xs uppercase tracking-wider text-neutral-400">Tylko odczyt</span>
        </div>

        <header class="mt-6 rounded-3xl border border-neutral-800 bg-neutral-900/60 p-6 sm:p-8">
            <p class="text-xs uppercase tracking-widest text-emerald-400">Administracja</p>
            <h1 class="mt-2 text-3xl font-bold sm:text-4xl">Głosowania kategorii</h1>
            <p class="mt-2 text-sm text-neutral-400">Wyniki ważone trudnością ukończonych zagadek.</p>
        </header>

        <section class="mt-8 grid gap-6">
            {#each data.riddles as riddle}
                <article class="rounded-3xl border border-neutral-800 bg-neutral-900/60 p-5 sm:p-7">
                    <p class="font-mono text-xs text-neutral-500">{riddle.id}</p>
                    <h2 class="mt-2 text-xl font-bold">{riddle.question}</h2>
                    <p class="mt-2 text-sm text-neutral-400">Kategoria zagadki: <span class="text-neutral-200">{categoryLabel(riddle.category)}</span></p>

                    <div class="mt-6 grid gap-3 md:grid-cols-3">
                        {#each riddle.options as option}
                            <div class="rounded-2xl border border-neutral-800 bg-neutral-950/70 p-4">
                                <h3 class="font-bold">{categoryLabel(option.category)}</h3>
                                <dl class="mt-4 space-y-2 text-sm">
                                    <div class="flex justify-between gap-3"><dt class="text-neutral-500">Gracze</dt><dd class="font-mono">{option.playerCount}</dd></div>
                                    <div class="flex justify-between gap-3"><dt class="text-neutral-500">Wynik ważony</dt><dd class="font-mono">{option.weightedScore}</dd></div>
                                    <div class="flex justify-between gap-3"><dt class="text-neutral-500">Udział</dt><dd class="font-mono font-bold">{option.percentage}%</dd></div>
                                </dl>
                            </div>
                        {/each}
                    </div>

                    <p class="mt-5 text-sm font-semibold text-neutral-300">Łącznie głosujących: {riddle.totalVoters}</p>
                </article>
            {:else}
                <p class="rounded-2xl border border-neutral-800 p-8 text-center text-neutral-400">Brak zagadek z ankietami.</p>
            {/each}
        </section>
    </div>
</main>
