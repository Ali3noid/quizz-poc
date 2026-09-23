<script lang="ts">
    import { invalidateAll } from '$app/navigation';
    import type { PageData } from './$types';
    import type { Hint } from '$lib/server/riddle';
    import { CATEGORY_LABELS, type RiddleCategory } from '$lib/categories';
    import type { CategoryPoll } from '$lib/types/database';

    let { data } = $props<{ data: PageData }>();
    let hints = $state<Hint[]>([]);
    let canAttempt = $state(false);
    let answer = $state('');
    let loadingHint = $state(false);
    let loadingAnswer = $state(false);
    let status = $state<'idle' | 'error' | 'success'>('idle');
    let feedback = $state('');
    let exhausted = $state(false);
    let poll = $state<CategoryPoll | null>(null);
    let voting = $state(false);
    let voteError = $state('');

    $effect(() => {
        hints = [...data.riddle.revealedHints];
        canAttempt = data.riddle.canAttempt;
        exhausted = Boolean(data.riddle.completion && !data.riddle.completion.solved);
        poll = data.riddle.poll;
    });

    async function revealHint() {
        if (loadingHint || exhausted || hints.length >= data.riddle.hintCount) return;
        loadingHint = true;

        try {
            const response = await fetch('/api/hint', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ riddleId: data.riddle.id })
            });
            const result = await response.json();

            if (!response.ok) {
                feedback = result.error ?? 'Nie udało się pobrać podpowiedzi.';
                status = 'error';
                return;
            }

            hints = [...hints, result.hint];
            canAttempt = result.canAttempt;
            status = 'idle';
            feedback = '';
        } catch {
            feedback = 'Błąd połączenia z serwerem.';
            status = 'error';
        } finally {
            loadingHint = false;
        }
    }

    async function submit(event: SubmitEvent) {
        event.preventDefault();
        if (!canAttempt || !answer.trim() || loadingAnswer || exhausted) return;
        loadingAnswer = true;

        try {
            const response = await fetch('/api/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ riddleId: data.riddle.id, answer })
            });
            const result = await response.json();
            feedback = result.message ?? result.error ?? 'Nie udało się zapisać odpowiedzi.';

            if (!response.ok) {
                if (response.status === 409) {
                    // A duplicate request or a concurrent tab can make the client state stale.
                    await invalidateAll();
                }
                status = 'error';
                return;
            }

            canAttempt = false;
            exhausted = result.exhausted;
            status = result.isCorrect ? 'success' : 'error';
            if (result.isCorrect || result.exhausted) await invalidateAll();
        } catch {
            feedback = 'Błąd połączenia z serwerem.';
            status = 'error';
        } finally {
            loadingAnswer = false;
        }
    }

    async function vote(category: RiddleCategory) {
        if (!poll || poll.selectedCategory || voting) return;
        voting = true;
        voteError = '';

        try {
            const response = await fetch('/api/vote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ riddleId: data.riddle.id, category })
            });
            const result = await response.json();
            if (!response.ok) {
                voteError = result.error ?? 'Nie udało się zapisać głosu.';
                if (response.status === 409) await invalidateAll();
                return;
            }
            poll = result.poll;
        } catch {
            voteError = 'Błąd połączenia z serwerem.';
        } finally {
            voting = false;
        }
    }

    function completionText(solved: boolean, hintsUsed: number): string {
        if (!solved) return 'Nie udało się odgadnąć zagadki';
        if (hintsUsed === 0) return 'Zgadłeś bez podpowiedzi';
        if (hintsUsed === 1) return 'Zgadłeś po 1 podpowiedzi';
        return `Zgadłeś po ${hintsUsed} podpowiedziach`;
    }

    function categoryLabel(category: RiddleCategory): string {
        return CATEGORY_LABELS[category];
    }
</script>

<main class="min-h-screen bg-neutral-950 p-4 text-neutral-100 sm:p-8">
    <div class="mx-auto max-w-5xl py-4">
        <a href="/" class="text-sm text-neutral-400 hover:text-white">← Wróć do listy zagadek</a>

        <section class="mt-6 text-center">
            <h1 class="text-3xl font-bold sm:text-5xl">{data.riddle.question}</h1>
            <div class="mx-auto mt-8 grid max-w-5xl gap-5 {data.riddle.images.length > 1 ? 'md:grid-cols-2' : ''}">
                {#each data.riddle.images as src}
                    <img {src} alt="Kadr z zagadki" class="aspect-4/3 w-full rounded-3xl border border-neutral-800 bg-gray-900 object-contain" />
                {/each}
            </div>
        </section>

        <section class="mx-auto mt-10 max-w-2xl">
            {#if !data.riddle.completion}
                <button onclick={revealHint} disabled={loadingHint || exhausted || hints.length >= data.riddle.hintCount} class="rounded-2xl border border-neutral-700 bg-neutral-900 px-6 py-3 font-bold disabled:opacity-50">
                    {loadingHint ? 'Pobieranie...' : hints.length >= data.riddle.hintCount ? 'Wyczerpano podpowiedzi' : `Odkryj podpowiedź (${hints.length}/${data.riddle.hintCount})`}
                </button>
            {/if}

            {#each hints as hint, index}
                <div class="mt-4 rounded-2xl border border-neutral-800 bg-neutral-900/70 p-4">
                    <span class="font-mono text-neutral-500">#{index + 1}</span>
                    {#if typeof hint === 'string'}
                        <p class="mt-2">{hint}</p>
                    {:else}
                        {#if hint.text}<p class="mt-2">{hint.text}</p>{/if}
                        {#if hint.image}<img src={hint.image} alt={`Podpowiedź ${index + 1}`} class="mt-3 max-h-64 rounded-xl" />{/if}
                    {/if}
                </div>
            {/each}
        </section>

        <section class="mx-auto mt-10 max-w-2xl">
            {#if data.riddle.completion && poll}
                <div class="overflow-hidden rounded-3xl border {data.riddle.completion.solved ? 'border-emerald-800 bg-emerald-950/20' : 'border-amber-800 bg-amber-950/20'}">
                    <div class="p-6 sm:p-8">
                        <p class="text-2xl font-bold">{completionText(data.riddle.completion.solved, data.riddle.completion.hintsUsed)}</p>
                        <p class="mt-2 text-neutral-300">Kategoria: <span class="font-semibold text-white">{categoryLabel(data.riddle.category)}</span></p>
                    </div>

                    <div class="border-t border-neutral-800 bg-neutral-950/50 p-6 sm:p-8">
                        <p class="text-sm uppercase tracking-wider text-neutral-400">Twój głos ma siłę <span class="font-mono font-bold text-white">{poll.voteWeight}</span></p>

                        {#if !poll.selectedCategory}
                            <h2 class="mt-3 text-xl font-bold">Na jaki temat chcesz kolejną zagadkę?</h2>
                            <div class="mt-5 grid gap-3 sm:grid-cols-3">
                                {#each poll.options as option}
                                    <button onclick={() => vote(option)} disabled={voting} class="rounded-2xl border border-neutral-700 bg-neutral-900 px-4 py-4 font-bold transition hover:border-neutral-500 hover:bg-neutral-800 disabled:opacity-50">
                                        {categoryLabel(option)}
                                    </button>
                                {/each}
                            </div>
                        {:else if poll.results}
                            <h2 class="mt-3 text-xl font-bold">Wyniki głosowania</h2>
                            <div class="mt-5 space-y-4">
                                {#each poll.results as result}
                                    <div>
                                        <div class="flex items-center justify-between gap-4 text-sm">
                                            <span class={result.category === poll.selectedCategory ? 'font-bold text-emerald-300' : 'text-neutral-200'}>{categoryLabel(result.category)}</span>
                                            <span class="font-mono font-bold">{result.percentage}%</span>
                                        </div>
                                        <div class="mt-2 h-2 overflow-hidden rounded-full bg-neutral-800">
                                            <div class="h-full rounded-full {result.category === poll.selectedCategory ? 'bg-emerald-400' : 'bg-neutral-500'}" style={`width: ${result.percentage}%`}></div>
                                        </div>
                                    </div>
                                {/each}
                            </div>
                            <p class="mt-6 text-sm text-neutral-400">{poll.totalVoters} {poll.totalVoters === 1 ? 'gracz zagłosował' : 'graczy zagłosowało'}</p>
                            <p class="mt-2 font-semibold text-emerald-300">Twój głos: {categoryLabel(poll.selectedCategory)} ×{poll.voteWeight}</p>
                        {/if}

                        {#if voteError}<p class="mt-4 text-sm text-rose-300">{voteError}</p>{/if}
                        <div class="mt-6 flex gap-4 text-sm"><a href="/" class="underline">Lista zagadek</a><a href="/ranking" class="underline">Ranking</a></div>
                    </div>
                </div>
            {:else}
                <p class="mb-2 text-sm text-neutral-400">
                    {canAttempt ? 'Masz jedną dostępną próbę.' : exhausted ? 'Wykorzystano wszystkie próby.' : 'Odkryj podpowiedź, aby odnowić próbę.'}
                </p>
                <form onsubmit={submit} class="flex flex-col gap-3 sm:flex-row">
                    <input bind:value={answer} disabled={!canAttempt || loadingAnswer || exhausted || status === 'success'} placeholder="Wpisz odpowiedź..." class="min-w-0 flex-1 rounded-2xl border border-neutral-700 bg-neutral-900 px-5 py-4" />
                    <button disabled={!canAttempt || !answer.trim() || loadingAnswer || exhausted || status === 'success'} class="rounded-2xl bg-neutral-100 px-6 py-4 font-bold text-neutral-900 disabled:opacity-40">
                        {loadingAnswer ? 'Sprawdzam...' : 'Zatwierdź'}
                    </button>
                </form>
            {/if}

            {#if feedback && !data.riddle.completion}
                <div class="mt-4 rounded-2xl border p-4 {status === 'success' ? 'border-emerald-700 bg-emerald-950/30 text-emerald-200' : 'border-rose-800 bg-rose-950/30 text-rose-200'}">
                    <p>{feedback}</p>
                    {#if status === 'success' || exhausted}
                        <div class="mt-3 flex gap-4"><a href="/" class="underline">Lista zagadek</a><a href="/ranking" class="underline">Ranking</a></div>
                    {/if}
                </div>
            {/if}
        </section>
    </div>
</main>
