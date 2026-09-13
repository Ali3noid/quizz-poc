<script lang="ts">
    import type { PageData } from './$types';

    let { data } = $props<{ data: PageData }>();
</script>

<main class="min-h-screen w-full bg-neutral-950 flex flex-col items-center p-4 sm:p-8 selection:bg-neutral-800 text-neutral-100">
    <div class="w-full max-w-5xl flex flex-col space-y-8 animate-fade-in pt-4 pb-16">
        
        <!-- Górna belka nawigacyjna -->
        <div class="flex items-center justify-between gap-4">
            <a
                href="/"
                class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-400 bg-neutral-900 border border-neutral-800 rounded-xl hover:text-neutral-100 hover:bg-neutral-800/80 transition-all shadow-sm"
            >
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Wróć do quizu
            </a>

            <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-mono bg-neutral-900 text-neutral-400 border border-neutral-800">
                🏆 Tabela Liderów
            </span>
        </div>

        <!-- Nagłówek strony -->
        <header class="bg-neutral-900/50 p-6 sm:p-8 rounded-3xl border border-neutral-800 text-center sm:text-left flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-xl">
            <div>
                <h1 class="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-100">
                    Ranking Graczy
                </h1>
                <p class="text-sm text-neutral-400 mt-1">
                    Najlepsze wyniki i czas rozwiązania zagadek.
                </p>
            </div>
            <div class="bg-neutral-950/80 border border-neutral-800 rounded-2xl px-5 py-3 text-center self-center sm:self-auto shrink-0">
                <span class="text-xs uppercase tracking-wider text-neutral-500 block">Liczba graczy</span>
                <span class="text-xl font-bold text-neutral-200 font-mono">{data.rankings.length}</span>
            </div>
        </header>

        {#if data.error}
            <div class="p-4 rounded-2xl bg-amber-950/30 border border-amber-800/50 text-amber-300 text-sm flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{data.error}</span>
            </div>
        {/if}

        <!-- Karta z tabelą -->
        <div class="w-full bg-neutral-900/60 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-sm">
            {#if data.rankings.length === 0}
                <div class="flex flex-col items-center justify-center p-12 sm:p-16 text-center space-y-4">
                    <div class="w-16 h-16 rounded-full bg-neutral-800/80 border border-neutral-700 flex items-center justify-center text-2xl">
                        🎯
                    </div>
                    <h3 class="text-xl font-semibold text-neutral-200">Brak zarejestrowanych wyników</h3>
                    <p class="text-sm text-neutral-400 max-w-md">
                        Bądź pierwszym graczem, który rozwiąże zagadkę i zdobędzie najwyższe miejsce na podium!
                    </p>
                    <a
                        href="/"
                        class="mt-2 inline-flex items-center gap-2 px-6 py-3 bg-neutral-100 text-neutral-900 font-bold rounded-2xl hover:bg-white active:scale-95 transition-all text-sm shadow-lg"
                    >
                        Rozwiąż quiz
                    </a>
                </div>
            {:else}
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse min-w-[600px]">
                        <thead>
                            <tr class="bg-neutral-900/90 border-b border-neutral-800 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                                <th scope="col" class="py-4 px-6 text-center w-24">Miejsce</th>
                                <th scope="col" class="py-4 px-6">Gracz</th>
                                <th scope="col" class="py-4 px-6 text-center">Użyte podpowiedzi</th>
                                <th scope="col" class="py-4 px-6 text-right">Czas</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-neutral-800/60 font-sans">
                            {#each data.rankings as player, index}
                                <tr class="hover:bg-neutral-800/30 transition-colors">
                                    <!-- Miejsce -->
                                    <td class="py-4 px-6 text-center whitespace-nowrap">
                                        {#if index === 0}
                                            <span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold font-mono text-sm shadow-[0_0_12px_rgba(245,158,11,0.2)]">
                                                🥇 1
                                            </span>
                                        {:else if index === 1}
                                            <span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-300/20 text-slate-200 border border-slate-400/40 font-bold font-mono text-sm">
                                                🥈 2
                                            </span>
                                        {:else if index === 2}
                                            <span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-700/20 text-amber-400 border border-amber-700/40 font-bold font-mono text-sm">
                                                🥉 3
                                            </span>
                                        {:else}
                                            <span class="inline-flex items-center justify-center font-mono text-neutral-500 text-sm font-medium">
                                                #{index + 1}
                                            </span>
                                        {/if}
                                    </td>

                                    <!-- Gracz -->
                                    <td class="py-4 px-6 whitespace-nowrap">
                                        <div class="flex items-center gap-3">
                                            <div class="w-8 h-8 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-xs font-bold text-neutral-300 uppercase">
                                                {player.nickname.slice(0, 2)}
                                            </div>
                                            <span class="font-semibold text-neutral-100">
                                                {player.nickname}
                                            </span>
                                        </div>
                                    </td>

                                    <!-- Użyte podpowiedzi -->
                                    <td class="py-4 px-6 text-center whitespace-nowrap">
                                        <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium font-mono
                                            {player.hintsUsed === 0
                                                ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                                                : player.hintsUsed <= 2
                                                ? 'bg-neutral-800/80 text-neutral-300 border border-neutral-700'
                                                : 'bg-amber-950/40 text-amber-400 border border-amber-800/50'}">
                                            {player.hintsUsed} / 5
                                        </span>
                                    </td>

                                    <!-- Czas -->
                                    <td class="py-4 px-6 text-right whitespace-nowrap font-mono text-sm text-neutral-300">
                                        {player.time}
                                    </td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            {/if}
        </div>

    </div>
</main>
