<script lang="ts">
	import { getCatalogStore } from "../state/catalog.svelte";
	import SearchField from "./ui/SearchField.svelte";

	const store = getCatalogStore();

	const PLACEHOLDERS: Record<string, string> = {
		file: "Search files across all manifests (e.g. client.dll, de_dust2, hl2.exe, *.bsp)...",
		depot: "Search depots (e.g. 220, Half-Life 2, hl2*, Valve)...",
		app: "Search apps (e.g. 220, Half-Life, *strike*, Valve)..."
	};

	const ARIA_LABELS: Record<string, string> = {
		file: "Search files across all historical manifests",
		depot: "Search depots by ID, name, or developer",
		app: "Search apps by ID, game, or developer"
	};

	const placeholder = $derived(
		PLACEHOLDERS[store.viewMode] || PLACEHOLDERS.depot
	);
	const ariaLabel = $derived(ARIA_LABELS[store.viewMode] || ARIA_LABELS.depot);
</script>

<div class="toolbar-root" aria-label="Search controls">
	<SearchField
		bind:value={store.searchQuery}
		{placeholder}
		disabled={store.loading}
		isLoading={store.isFileSearching}
		{ariaLabel}
	/>
</div>

<style>
	.toolbar-root {
		width: 100%;
		height: var(--steam-h-control);
		flex-shrink: 0;
	}
</style>
