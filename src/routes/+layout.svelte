<script lang="ts">
	import '../app.css';
	import ChangelogModal from '$lib/components/ChangelogModal.svelte';
	import { changelog, CHANGELOG_STORAGE_KEY } from '$lib/changelog';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();
	let isChangelogOpen = $state(false);
	let checkedForCurrentSession = $state(false);

	$effect(() => {
		if (!data.isAuthenticated) {
			isChangelogOpen = false;
			checkedForCurrentSession = false;
			return;
		}

		if (checkedForCurrentSession) return;
		checkedForCurrentSession = true;

		try {
			const storedVersion = localStorage.getItem(CHANGELOG_STORAGE_KEY);
			const lastSeenVersion = Number.parseInt(storedVersion ?? '', 10);
			isChangelogOpen = !Number.isInteger(lastSeenVersion) || lastSeenVersion < changelog.version;
		} catch {
			isChangelogOpen = true;
		}
	});

	function dismissChangelog() {
		try {
			localStorage.setItem(CHANGELOG_STORAGE_KEY, String(changelog.version));
		} catch {
			// Storage can be unavailable in privacy-restricted browser contexts.
		} finally {
			isChangelogOpen = false;
		}
	}
</script>

{@render children()}

{#if isChangelogOpen}
	<ChangelogModal entry={changelog} onClose={dismissChangelog} />
{/if}
