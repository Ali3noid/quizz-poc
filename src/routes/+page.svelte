<script lang="ts">
    import { invalidateAll } from '$app/navigation';
    import { onMount } from 'svelte';

    let { data } = $props<{
        data: {
            isAuthorized: boolean;
            player: { id: string; nickname: string } | null;
            riddle: { id: string; question: string; images: string[] } | null;
        }
    }>();

    let password = $state('');
    let isShaking = $state(false);
    let isLoading = $state(false);
    let inputElement = $state<HTMLInputElement>();

    const PASSWORD_TRIGGER_LENGTH = 5;

    $effect(() => {
        if (!data.isAuthorized) {
            inputElement?.focus();
        }
    });

    async function handleInput() {
        if (password.length >= PASSWORD_TRIGGER_LENGTH && !isLoading) {
            await verifyPassword();
        }
    }

    async function verifyPassword() {
        isLoading = true;

        try {
            const res = await fetch('/api/gate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });

            if (res.ok) {
                await invalidateAll();
            } else {
                triggerError();
            }
        } catch {
            triggerError();
        } finally {
            isLoading = false;
        }
    }

    function triggerError() {
        isShaking = true;
        setTimeout(() => {
            password = '';
            isShaking = false;
            inputElement?.focus();
        }, 450);
    }

    // --- REJESTRACJA I LOGOWANIE GRACZA ---
    let authMode = $state<'register' | 'login'>('register');
    let authNickname = $state('');
    let authPassword = $state('');
    let authError = $state('');
    let isAuthLoading = $state(false);
    let isGuest = $state(false);

    // Ksywka aktualnego gracza
    let currentNickname = $derived(
        data.player?.nickname || (isGuest ? (authNickname || 'Gość') : '')
    );

    $effect(() => {
        if (data.player?.nickname) {
            localStorage.setItem('quiz_nickname', data.player.nickname);
        }
    });

    onMount(() => {
        const savedNickname = localStorage.getItem('quiz_nickname');
        if (savedNickname && !authNickname) {
            authNickname = savedNickname;
        }
    });

    async function handleAuthSubmit(e?: Event) {
        if (e) e.preventDefault();
        authError = '';

        if (!authNickname.trim()) {
            authError = 'Podaj swój nick';
            return;
        }

        if (authMode === 'register' && authNickname.trim().length < 3) {
            authError = 'Nick musi mieć co najmniej 3 znaki';
            return;
        }

        if (authPassword.length < 4) {
            authError = 'Hasło musi mieć co najmniej 4 znaki';
            return;
        }

        isAuthLoading = true;
        try {
            const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nickname: authNickname.trim(),
                    password: authPassword
                })
            });

            const result = await res.json();
            if (res.ok && result.ok) {
                localStorage.setItem('quiz_nickname', result.player.nickname);
                authPassword = '';
                await invalidateAll();
            } else {
                authError = result.message || 'Wystąpił błąd podczas uwierzytelniania';
            }
        } catch (err) {
            console.error('Błąd auth:', err);
            authError = 'Błąd połączenia z serwerem';
        } finally {
            isAuthLoading = false;
        }
    }

    async function handleLogout() {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            localStorage.removeItem('quiz_nickname');
            isGuest = false;
            authNickname = '';
            authPassword = '';
            await invalidateAll();
        } catch (err) {
            console.error('Błąd wylogowania:', err);
        }
    }

    function continueAsGuest() {
        isGuest = true;
        if (!authNickname.trim()) {
            authNickname = 'Gość_' + Math.floor(1000 + Math.random() * 9000);
        }
        localStorage.setItem('quiz_nickname', authNickname);
    }

    // --- LOGIKA PODPOWIEDZI ---
    type HintItem = string | { text?: string; image?: string };
    let revealedHints = $state<HintItem[]>([]);
    let isHintLoading = $state(false);

    async function fetchHint() {
        if (!data.riddle || revealedHints.length >= 5 || isHintLoading) return;

        isHintLoading = true;
        try {
            const res = await fetch('/api/hint', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    riddleId: data.riddle.id,
                    hintIndex: revealedHints.length
                })
            });

            if (res.ok) {
                const result = await res.json();
                revealedHints = [...revealedHints, result.hint];
            }
        } catch (err) {
            console.error('Błąd pobierania podpowiedzi:', err);
        } finally {
            isHintLoading = false;
        }
    }

    // --- LOGIKA ODPOWIEDZI ---
    let answer = $state('');
    let isSubmitting = $state(false);
    let submissionStatus = $state<'idle' | 'success' | 'error'>('idle');
    let submissionFeedback = $state('');
    let isAnswerShaking = $state(false);

    async function submitAnswer(e?: Event) {
        if (e) e.preventDefault();
        if (!data.riddle || !answer.trim() || isSubmitting) return;

        isSubmitting = true;
        submissionStatus = 'idle';
        submissionFeedback = '';

        try {
            const res = await fetch('/api/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    riddleId: data.riddle.id,
                    answer,
                    nickname: currentNickname || authNickname || 'Anonim',
                    hints_used: revealedHints.length
                })
            });

            const result = await res.json();

            if (res.ok && result.isCorrect) {
                submissionStatus = 'success';
                submissionFeedback = result.message || 'Gratulacje! To poprawna odpowiedź!';
            } else {
                submissionStatus = 'error';
                submissionFeedback = result.message || result.error || 'Niestety, to nie jest poprawna odpowiedź.';
                isAnswerShaking = true;
                setTimeout(() => {
                    isAnswerShaking = false;
                }, 450);
            }
        } catch (err) {
            submissionStatus = 'error';
            submissionFeedback = 'Wystąpił błąd podczas wysyłania odpowiedzi.';
            isAnswerShaking = true;
            setTimeout(() => {
                isAnswerShaking = false;
            }, 450);
        } finally {
            isSubmitting = false;
        }
    }
</script>

<main class="min-h-screen w-full bg-neutral-950 flex flex-col items-center justify-center p-4 selection:bg-neutral-800 text-neutral-100">
    {#if !data.isAuthorized}
        <!-- WIDOK BRAMKI -->
        <div class="w-full max-w-5xl relative {isShaking ? 'animate-shake' : ''}">
            <input
                    bind:this={inputElement}
                    bind:value={password}
                    oninput={handleInput}
                    type="password"
                    disabled={isLoading}
                    placeholder="••••••"
                    autocomplete="off"
                    class="w-full bg-neutral-900 border-4 border-neutral-800 rounded-[3rem] px-12 py-16 text-center text-7xl md:text-9xl tracking-[0.4em] text-neutral-100 placeholder:text-neutral-800 focus:outline-none focus:border-neutral-600 focus:ring-4 focus:ring-neutral-700 transition-all shadow-2xl disabled:opacity-30"
            />
        </div>
    {:else if !data.player && !isGuest}
        <!-- WIDOK PIERWSZEGO ODPALENIA / REJESTRACJI I LOGOWANIA -->
        <div class="w-full max-w-md bg-neutral-900/90 border border-neutral-800 rounded-3xl p-8 shadow-2xl animate-fade-in backdrop-blur-sm">
            <div class="text-center mb-6">
                <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-neutral-800 border border-neutral-700 mb-4 text-2xl shadow-inner">
                    🎮
                </div>
                <h1 class="text-2xl font-bold tracking-tight text-neutral-100">
                    {authMode === 'register' ? 'Witaj w Quizie!' : 'Witaj ponownie!'}
                </h1>
                <p class="text-sm text-neutral-400 mt-1">
                    {authMode === 'register'
                        ? 'Utwórz konto gracza, aby zapisywać wyniki w rankingu'
                        : 'Zaloguj się na swoje konto gracza'}
                </p>
            </div>

            <!-- Przełącznik trybu (Rejestracja / Logowanie) -->
            <div class="flex bg-neutral-950 p-1 rounded-xl border border-neutral-800 mb-6">
                <button
                    type="button"
                    onclick={() => { authMode = 'register'; authError = ''; }}
                    class="flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer {authMode === 'register' ? 'bg-neutral-800 text-white shadow' : 'text-neutral-400 hover:text-neutral-200'}"
                >
                    Nowy gracz (Rejestracja)
                </button>
                <button
                    type="button"
                    onclick={() => { authMode = 'login'; authError = ''; }}
                    class="flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer {authMode === 'login' ? 'bg-neutral-800 text-white shadow' : 'text-neutral-400 hover:text-neutral-200'}"
                >
                    Mam konto (Logowanie)
                </button>
            </div>

            <!-- Formularz -->
            <form onsubmit={handleAuthSubmit} class="space-y-4">
                <div>
                    <label for="auth-nick" class="block text-xs font-medium text-neutral-400 mb-1.5">Nick gracza</label>
                    <input
                        id="auth-nick"
                        type="text"
                        bind:value={authNickname}
                        placeholder="np. CyberGracz"
                        maxlength="30"
                        disabled={isAuthLoading}
                        autocomplete="username"
                        class="w-full bg-neutral-950 border border-neutral-800 focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 rounded-xl px-4 py-3 text-neutral-100 placeholder:text-neutral-600 transition-all text-sm outline-none"
                    />
                </div>

                <div>
                    <label for="auth-pass" class="block text-xs font-medium text-neutral-400 mb-1.5">Hasło</label>
                    <input
                        id="auth-pass"
                        type="password"
                        bind:value={authPassword}
                        placeholder="••••••••"
                        disabled={isAuthLoading}
                        autocomplete={authMode === 'register' ? 'new-password' : 'current-password'}
                        class="w-full bg-neutral-950 border border-neutral-800 focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 rounded-xl px-4 py-3 text-neutral-100 placeholder:text-neutral-600 transition-all text-sm outline-none"
                    />
                </div>

                {#if authError}
                    <div class="p-3 rounded-xl bg-rose-950/50 border border-rose-800/60 text-rose-300 text-xs animate-fade-in flex items-center gap-2">
                        <span>⚠️</span>
                        <span>{authError}</span>
                    </div>
                {/if}

                <button
                    type="submit"
                    disabled={isAuthLoading}
                    class="w-full py-3.5 bg-neutral-100 text-neutral-900 font-bold rounded-xl hover:bg-white active:scale-[0.98] transition-all duration-200 shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-sm mt-2 flex items-center justify-center gap-2"
                >
                    {#if isAuthLoading}
                        <span class="animate-spin inline-block w-4 h-4 border-2 border-neutral-900 border-t-transparent rounded-full"></span>
                        <span>Trwa przetwarzanie...</span>
                    {:else}
                        <span>{authMode === 'register' ? 'Zarejestruj się i zacznij grę' : 'Zaloguj się'}</span>
                    {/if}
                </button>

                <div class="pt-2 text-center">
                    <button
                        type="button"
                        onclick={continueAsGuest}
                        class="text-xs text-neutral-500 hover:text-neutral-300 transition-colors underline cursor-pointer"
                    >
                        Graj jako gość (bez hasła)
                    </button>
                </div>
            </form>
        </div>
    {:else}
        <!-- WIDOK GRY -->
        <div class="w-full max-w-6xl flex flex-col space-y-10 animate-fade-in pt-8 pb-16">

            <!-- Nagłówek z ksywką -->
            <header class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-neutral-900/50 p-6 rounded-3xl border border-neutral-800">
                <div class="flex items-center gap-4">
                    <div>
                        <span class="inline-block px-3 py-1 rounded-full text-xs font-mono bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 mb-2">
                            Dostęp przyznany
                        </span>
                        <h2 class="text-2xl font-bold tracking-tight">Quiz PoC</h2>
                    </div>
                </div>
                <div class="flex items-center flex-wrap gap-4">
                    <a
                        href="/ranking"
                        class="px-4 py-2 text-sm font-semibold text-neutral-300 bg-neutral-800/80 hover:bg-neutral-700 hover:text-white rounded-xl border border-neutral-700 transition-all flex items-center gap-2"
                    >
                        <span>🏆</span> Ranking
                    </a>
                    <div class="flex items-center gap-3 bg-neutral-950 px-4 py-2 rounded-xl border border-neutral-800">
                        <span class="text-xs text-neutral-400">Gracz:</span>
                        <span class="text-sm font-bold text-neutral-100 flex items-center gap-1.5">
                            <span class="w-2 h-2 rounded-full {data.player ? 'bg-emerald-400' : 'bg-amber-400'} inline-block"></span>
                            {currentNickname || 'Anonim'}
                        </span>
                        {#if data.player}
                            <button
                                onclick={handleLogout}
                                title="Wyloguj się"
                                class="ml-2 text-xs text-neutral-400 hover:text-rose-400 transition-colors underline cursor-pointer"
                            >
                                Wyloguj
                            </button>
                        {:else}
                            <button
                                onclick={() => { isGuest = false; }}
                                class="ml-2 text-xs text-emerald-400 hover:text-emerald-300 transition-colors underline cursor-pointer"
                            >
                                Zaloguj / Rejestracja
                            </button>
                        {/if}
                    </div>
                </div>
            </header>

            {#if data.riddle}
                {@const imgCount = data.riddle.images.length}

                <section class="space-y-8 text-center mt-8">
                    <!-- Treść pytania -->
                    <h1 class="text-3xl md:text-5xl font-bold tracking-tight text-neutral-100">
                        {data.riddle.question}
                    </h1>

                    <!-- Dynamiczna siatka zdjęć -->
                    <div class="grid grid-cols-1 gap-6 mx-auto
                        {imgCount === 1 ? 'md:grid-cols-1 max-w-2xl' :
                         imgCount === 2 ? 'md:grid-cols-2 max-w-4xl' :
                         'md:grid-cols-3 max-w-6xl'}">
                        {#each data.riddle.images as src}
                            <div class="relative aspect-[4/3] rounded-3xl overflow-hidden border border-neutral-800 shadow-xl bg-neutral-900">
                                <img
                                        {src}
                                        alt="Kadr z zagadki"
                                        class="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                                />
                            </div>
                        {/each}
                    </div>
                </section>

                <!-- SEKCJA PODPOWIEDZI (Blok 7) -->
                <section class="max-w-2xl mx-auto w-full flex flex-col items-center space-y-6 mt-12">
                    <button
                            onclick={fetchHint}
                            disabled={revealedHints.length >= 5 || isHintLoading}
                            class="group relative inline-flex items-center justify-center px-8 py-3.5 text-sm font-bold tracking-wide text-neutral-200 transition-all duration-200 bg-neutral-900 border border-neutral-700 rounded-2xl hover:bg-neutral-800 hover:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-neutral-950 focus:ring-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                    >
                        {#if isHintLoading}
                            <span class="animate-pulse">Pobieranie...</span>
                        {:else if revealedHints.length >= 5}
                            <span class="text-neutral-500">Wyczerpano podpowiedzi (5/5)</span>
                        {:else}
                            <span>Odkryj podpowiedź ({revealedHints.length}/5)</span>
                        {/if}
                    </button>

                    {#if revealedHints.length > 0}
                        <div class="w-full flex flex-col gap-3 text-left">
                            {#each revealedHints as hint, i}
                                {@const text = typeof hint === 'string' ? hint : hint?.text}
                                {@const image = typeof hint === 'object' && hint ? hint.image : undefined}
                                <div class="p-4 rounded-2xl bg-neutral-900/40 border border-neutral-800/60 text-neutral-300 animate-fade-in shadow-inner flex flex-col gap-3">
                                    <div class="flex items-start gap-3">
                                        <span class="font-mono font-bold text-neutral-500 shrink-0 select-none">#{i + 1}</span>
                                        <div class="flex-1 flex flex-col gap-3">
                                            {#if text}
                                                <p class="text-neutral-200 leading-relaxed text-sm md:text-base">{text}</p>
                                            {/if}
                                            {#if image}
                                                <div class="relative rounded-xl overflow-hidden border border-neutral-800 bg-neutral-950/60 max-w-sm w-full">
                                                    <img
                                                        src={image}
                                                        alt="Podpowiedź #{i + 1}"
                                                        class="w-full h-auto max-h-60 object-contain rounded-xl hover:scale-105 transition-transform duration-300"
                                                        loading="lazy"
                                                    />
                                                </div>
                                            {/if}
                                        </div>
                                    </div>
                                </div>
                            {/each}
                        </div>
                    {/if}
                </section>

            {:else}
                <div class="text-center text-red-500 p-8 border border-red-900/50 bg-red-950/20 rounded-2xl mt-8">
                    <h3 class="text-xl font-bold mb-2">Błąd wczytywania zagadki</h3>
                    <p class="text-neutral-400">Upewnij się, że w pliku <code class="text-red-400">riddles.ts</code> istnieje zagadka o kluczu <code>"1"</code>.</p>
                </div>
            {/if}

            <!-- SEKCJA ODPOWIEDZI (Blok 8) -->
            <section class="max-w-2xl mx-auto w-full mt-10">
                <form
                    onsubmit={submitAnswer}
                    class="flex flex-col items-center space-y-4"
                >
                    <div class="w-full relative {isAnswerShaking ? 'animate-shake' : ''}">
                        <div class="flex flex-col sm:flex-row gap-3">
                            <input
                                type="text"
                                bind:value={answer}
                                disabled={isSubmitting || submissionStatus === 'success'}
                                placeholder="Wpisz swoją odpowiedź..."
                                class="flex-1 bg-neutral-900/80 border rounded-2xl px-6 py-4 text-lg text-neutral-100 placeholder:text-neutral-500 focus:outline-none transition-all shadow-inner disabled:opacity-60
                                    {submissionStatus === 'success'
                                        ? 'border-emerald-500 ring-2 ring-emerald-500/50 bg-emerald-950/20 text-emerald-200'
                                        : submissionStatus === 'error'
                                        ? 'border-rose-500 ring-2 ring-rose-500/50 bg-rose-950/20'
                                        : 'border-neutral-700 focus:border-neutral-400 focus:ring-2 focus:ring-neutral-600'}"
                            />
                            <button
                                type="submit"
                                disabled={!answer.trim() || isSubmitting || submissionStatus === 'success'}
                                class="px-8 py-4 bg-neutral-100 text-neutral-900 font-bold rounded-2xl hover:bg-white active:scale-95 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-neutral-100 disabled:active:scale-100 shadow-lg cursor-pointer shrink-0"
                            >
                                {#if isSubmitting}
                                    <span class="inline-flex items-center gap-2">
                                        <span class="animate-spin inline-block w-4 h-4 border-2 border-neutral-900 border-t-transparent rounded-full"></span>
                                        Sprawdzam...
                                    </span>
                                {:else if submissionStatus === 'success'}
                                    <span>Rozwiązano!</span>
                                {:else}
                                    <span>Zatwierdź</span>
                                {/if}
                            </button>
                        </div>
                    </div>

                    {#if submissionFeedback}
                        <div
                            class="w-full p-4 rounded-2xl text-center text-sm font-medium animate-fade-in border flex flex-col items-center gap-3
                                {submissionStatus === 'success'
                                    ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                                    : 'bg-rose-950/40 border-rose-800/60 text-rose-300'}"
                        >
                            <span>{submissionFeedback}</span>
                            {#if submissionStatus === 'success'}
                                <a
                                    href="/ranking"
                                    class="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-neutral-950 font-bold rounded-xl hover:bg-emerald-400 transition-all text-xs shadow-md mt-1"
                                >
                                    <span>🏆</span> Zobacz ranking
                                </a>
                            {/if}
                        </div>
                    {/if}
                </form>
            </section>

        </div>
    {/if}
</main>

<style>
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        20% { transform: translateX(-15px); }
        40% { transform: translateX(15px); }
        60% { transform: translateX(-10px); }
        80% { transform: translateX(10px); }
    }

    .animate-shake {
        animation: shake 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
    }

    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }

    .animate-fade-in {
        animation: fadeIn 0.6s ease-out forwards;
    }
</style>