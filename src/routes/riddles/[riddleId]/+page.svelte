<script lang="ts">
    import { invalidateAll } from '$app/navigation';
    import type { PageData } from './$types';
    import type { Hint } from '$lib/server/riddle';

    let { data } = $props<{ data: PageData }>();
    let hints = $state<Hint[]>([]);
    let canAttempt = $state(false);
    let answer = $state('');
    let loadingHint = $state(false);
    let loadingAnswer = $state(false);
    let status = $state<'idle' | 'error' | 'success'>('idle');
    let feedback = $state('');
    let exhausted = $state(false);

    $effect(() => {
        hints = [...data.riddle.revealedHints];
        canAttempt = data.riddle.canAttempt;
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
        } catch {
            feedback = 'Błąd połączenia z serwerem.';
            status = 'error';
        } finally {
            loadingAnswer = false;
        }
    }
</script>

<main class="min-h-screen bg-neutral-950 p-4 text-neutral-100 sm:p-8">
    <div class="mx-auto max-w-5xl py-4">
        <a href="/" class="text-sm text-neutral-400 hover:text-white">← Wróć do listy zagadek</a>

        <section class="mt-6 text-center">
            <h1 class="text-3xl font-bold sm:text-5xl">{data.riddle.question}</h1>
            <div class="mx-auto mt-8 grid max-w-5xl gap-5 {data.riddle.images.length > 1 ? 'md:grid-cols-2' : ''}">
                {#each data.riddle.images as src}
                    <img {src} alt="Kadr z zagadki" class="aspect-4/3 w-full rounded-3xl border border-neutral-800 object-cover" />
                {/each}
            </div>
        </section>

        <section class="mx-auto mt-10 max-w-2xl">
            <button onclick={revealHint} disabled={loadingHint || exhausted || hints.length >= data.riddle.hintCount} class="rounded-2xl border border-neutral-700 bg-neutral-900 px-6 py-3 font-bold disabled:opacity-50">
                {loadingHint ? 'Pobieranie...' : hints.length >= data.riddle.hintCount ? 'Wyczerpano podpowiedzi' : `Odkryj podpowiedź (${hints.length}/${data.riddle.hintCount})`}
            </button>

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
            <p class="mb-2 text-sm text-neutral-400">
                {canAttempt ? 'Masz jedną dostępną próbę.' : exhausted ? 'Wykorzystano wszystkie próby.' : 'Odkryj podpowiedź, aby odnowić próbę.'}
            </p>
            <form onsubmit={submit} class="flex gap-3">
                <input bind:value={answer} disabled={!canAttempt || loadingAnswer || exhausted || status === 'success'} placeholder="Wpisz odpowiedź..." class="min-w-0 flex-1 rounded-2xl border border-neutral-700 bg-neutral-900 px-5 py-4" />
                <button disabled={!canAttempt || !answer.trim() || loadingAnswer || exhausted || status === 'success'} class="rounded-2xl bg-neutral-100 px-6 font-bold text-neutral-900 disabled:opacity-40">
                    {loadingAnswer ? 'Sprawdzam...' : 'Zatwierdź'}
                </button>
            </form>

            {#if feedback}
                <div class="mt-4 rounded-2xl border p-4 {status === 'success' ? 'border-emerald-700 bg-emerald-950/30 text-emerald-200' : 'border-rose-800 bg-rose-950/30 text-rose-200'}">
                    <p>{feedback}</p>
                    {#if status === 'success'}
                        <div class="mt-3 flex gap-4"><a href="/" class="underline">Lista zagadek</a><a href="/ranking" class="underline">Ranking</a></div>
                    {/if}
                </div>
            {/if}
        </section>
    </div>
</main>
