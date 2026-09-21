<script lang="ts">
    import { invalidateAll } from '$app/navigation';
    import { onMount } from 'svelte';
    import type { RiddleListItem } from '$lib/types/database';

    let { data } = $props<{ data: { isAuthorized: boolean; player: { id: string; nickname: string } | null; riddles: RiddleListItem[]; error: string | null } }>();
    let password = $state('');
    let isLoading = $state(false);
    let authMode = $state<'register' | 'login'>('register');
    let authNickname = $state('');
    let authPassword = $state('');
    let authError = $state('');
    let isAuthLoading = $state(false);

    onMount(() => {
        authNickname = localStorage.getItem('quiz_nickname') ?? '';
    });

    async function gate() {
        if (isLoading) return;
        isLoading = true;
        const response = await fetch('/api/gate', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password })
        }).catch(() => null);
        if (response?.ok) await invalidateAll(); else password = '';
        isLoading = false;
    }

    async function authenticate(event: SubmitEvent) {
        event.preventDefault();
        authError = '';
        if (!authNickname.trim() || authPassword.length < 4) {
            authError = 'Podaj nick i hasło (minimum 4 znaki).';
            return;
        }
        isAuthLoading = true;
        try {
            const response = await fetch(`/api/auth/${authMode}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nickname: authNickname.trim(), password: authPassword })
            });
            const result = await response.json();
            if (!response.ok || !result.ok) authError = result.message ?? 'Nie udało się uwierzytelnić.';
            else { localStorage.setItem('quiz_nickname', result.player.nickname); authPassword = ''; await invalidateAll(); }
        } catch { authError = 'Błąd połączenia z serwerem.'; }
        finally { isAuthLoading = false; }
    }

    async function logout() {
        await fetch('/api/auth/logout', { method: 'POST' });
        localStorage.removeItem('quiz_nickname');
        await invalidateAll();
    }

    const labels: Record<RiddleListItem['status'], string> = {
        current: 'Aktywna', solved: 'Rozwiązana', unsolved: 'Nieodgadnięta', missed: 'Pominięta', archived: 'Archiwalna'
    };
    function statusLabel(status: unknown): string { return labels[status as RiddleListItem['status']] ?? 'Niedostępna'; }
    function cardClasses(riddle: RiddleListItem): string {
        if (riddle.lastAnswerResult === 'correct') return 'border-emerald-600 bg-emerald-950/30';
        if (riddle.lastAnswerResult === 'incorrect') return 'border-rose-700 bg-rose-950/30';
        if (riddle.status === 'current' && riddle.isOpen) return 'border-emerald-700 bg-emerald-950/20';
        return 'border-neutral-800 bg-neutral-900/60';
    }
    function formatDate(value: string): string {
        return new Intl.DateTimeFormat('pl-PL', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(value));
    }
</script>

<main class="min-h-screen bg-neutral-950 p-4 text-neutral-100 sm:p-8">
    {#if !data.isAuthorized}
        <div class="mx-auto flex min-h-[80vh] max-w-4xl items-center">
            <input bind:value={password} oninput={() => password.length >= 5 && gate()} type="password" disabled={isLoading} placeholder="••••••" class="w-full rounded-[3rem] border-4 border-neutral-800 bg-neutral-900 px-10 py-16 text-center text-6xl tracking-[0.4em] outline-none focus:ring-4 focus:ring-neutral-700 md:text-8xl" />
        </div>
    {:else if !data.player}
        <section class="mx-auto mt-20 max-w-md rounded-3xl border border-neutral-800 bg-neutral-900 p-8 shadow-2xl">
            <h1 class="text-2xl font-bold">{authMode === 'register' ? 'Witaj w Quizie' : 'Witaj ponownie'}</h1>
            <p class="mt-1 text-sm text-neutral-400">Zaloguj się, aby zachować swój postęp.</p>
            <div class="mt-6 flex rounded-xl border border-neutral-800 bg-neutral-950 p-1">
                <button onclick={() => authMode = 'register'} class="flex-1 rounded-lg py-2 text-sm {authMode === 'register' ? 'bg-neutral-800' : 'text-neutral-400'}">Rejestracja</button>
                <button onclick={() => authMode = 'login'} class="flex-1 rounded-lg py-2 text-sm {authMode === 'login' ? 'bg-neutral-800' : 'text-neutral-400'}">Logowanie</button>
            </div>
            <form onsubmit={authenticate} class="mt-5 space-y-4">
                <input bind:value={authNickname} placeholder="Nick" class="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3" />
                <input bind:value={authPassword} type="password" placeholder="Hasło" class="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3" />
                {#if authError}<p class="text-sm text-rose-300">{authError}</p>{/if}
                <button disabled={isAuthLoading} class="w-full rounded-xl bg-neutral-100 py-3 font-bold text-neutral-900">{isAuthLoading ? 'Trwa przetwarzanie...' : authMode === 'register' ? 'Utwórz konto' : 'Zaloguj się'}</button>
            </form>
        </section>
    {:else}
        <div class="mx-auto max-w-5xl py-6">
            <header class="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-neutral-800 bg-neutral-900/60 p-6">
                <div><p class="text-xs text-emerald-400">DOSTĘP PRZYZNANY</p><h1 class="text-3xl font-bold">Historia zagadek</h1></div>
                <div class="flex items-center gap-3"><a href="/ranking" class="rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm">Ranking</a><span class="text-sm text-neutral-400">{data.player.nickname}</span><button onclick={logout} class="text-sm text-rose-300">Wyloguj</button></div>
            </header>
            {#if data.error}<p class="mt-6 rounded-xl border border-rose-800 bg-rose-950/30 p-4 text-rose-200">{data.error}</p>{/if}
            <section class="mt-8 grid gap-4">
                {#each data.riddles as riddle}
                    <article class="rounded-2xl border p-5 {cardClasses(riddle)}">
                        <div class="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <span class="rounded-full bg-neutral-800 px-3 py-1 text-xs">{statusLabel(riddle.status)}</span>
                                <p class="mt-3 text-sm text-neutral-300">Dodano: {formatDate(riddle.createdAt)}</p>
                                <p class="mt-1 text-sm text-neutral-400">Aktywna do: {formatDate(riddle.endsAt)}</p>
                                <p class="mt-1 text-sm text-neutral-400">Użyte podpowiedzi: {riddle.hintsUsed}</p>
                            </div>
                            {#if riddle.isOpen}<a href={`/riddles/${riddle.id}`} class="rounded-xl bg-neutral-100 px-5 py-3 font-bold text-neutral-900">Otwórz zagadkę</a>{:else}<span class="text-sm text-neutral-500">Niedostępna</span>{/if}
                        </div>
                    </article>
                {:else}<p class="rounded-2xl border border-neutral-800 p-8 text-center text-neutral-400">Nie ma jeszcze rozpoczętych zagadek.</p>{/each}
            </section>
        </div>
    {/if}
</main>
