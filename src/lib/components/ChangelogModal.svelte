<script lang="ts">
    import { onMount } from 'svelte';
    import type { changelog } from '$lib/changelog';

    let { entry, onClose }: { entry: typeof changelog; onClose: () => void } = $props();
    let dialog: HTMLDialogElement;

    onMount(() => dialog.showModal());

    function closeOnBackdrop(event: MouseEvent) {
        if (event.target === event.currentTarget) dialog.close();
    }
</script>

<dialog
    bind:this={dialog}
    aria-labelledby="changelog-title"
    aria-describedby="changelog-description"
    class="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-xl overflow-hidden rounded-3xl border border-neutral-700 bg-neutral-900 p-0 text-neutral-100 shadow-2xl backdrop:bg-black/75 backdrop:backdrop-blur-sm"
    onclick={closeOnBackdrop}
    onclose={onClose}
>
    <div class="flex max-h-[calc(100dvh-2rem)] flex-col">
        <header class="flex items-start justify-between gap-4 border-b border-neutral-800 px-5 py-5 sm:px-7 sm:py-6">
            <div>
                <p class="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">Co nowego?</p>
                <h2 id="changelog-title" class="mt-2 text-2xl font-bold sm:text-3xl">{entry.title}</h2>
            </div>
            <button
                type="button"
                aria-label="Zamknij changelog"
                class="-mr-1 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-neutral-700 bg-neutral-800 text-2xl text-neutral-300 transition hover:border-neutral-500 hover:text-white"
                onclick={() => dialog.close()}
            >
                <span aria-hidden="true">×</span>
            </button>
        </header>

        <div class="min-h-0 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
            <p id="changelog-description" class="text-sm leading-relaxed text-neutral-300 sm:text-base">{entry.message}</p>
            <p class="mt-5 text-xs font-semibold uppercase tracking-wider text-neutral-500">W tej wersji:</p>
            <ul class="mt-3 space-y-3">
                {#each entry.changes as change}
                    <li class="rounded-2xl border border-neutral-800 bg-neutral-950/70 px-4 py-3 text-sm leading-relaxed sm:text-base">
                        {change}
                    </li>
                {/each}
            </ul>
        </div>

        <footer class="border-t border-neutral-800 bg-neutral-900 px-5 py-4 sm:px-7 sm:py-5">
            <button
                type="button"
                class="w-full rounded-xl bg-neutral-100 px-5 py-3 font-bold text-neutral-900 transition hover:bg-white"
                onclick={() => dialog.close()}
            >
                Super, pokaż quiz
            </button>
        </footer>
    </div>
</dialog>
