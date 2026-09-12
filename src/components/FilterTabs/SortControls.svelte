<script lang="ts">
	import { ArrowUpIcon, ArrowDownIcon } from "phosphor-svelte";
	import type { SortField } from "../../types";
	import { getCatalogStore } from "../../state/catalog.svelte";
	import Button from "../ui/Button.svelte";

	const store = getCatalogStore();

	interface SortOption {
		value: SortField;
		label: string;
	}

	const sortOptions = $derived.by<SortOption[]>(() => {
		if (store.viewMode === "file") {
			return [
				{ value: "id", label: "Depot ID" },
				{ value: "name", label: "Depot title" },
				{ value: "builds", label: "Matched files count" }
			];
		}
		const isDepot = store.viewMode === "depot";
		return [
			{ value: "id", label: isDepot ? "Depot ID" : "App ID" },
			{ value: "name", label: isDepot ? "Depot title" : "Game title" },
			...(isDepot
				? [{ value: "game" as SortField, label: "Parent app / game" }]
				: []),
			{ value: "build_date", label: "Manifest date" },
			{ value: "release_date", label: "Release date" },
			{ value: "discrepancy", label: "Delta (release diff)" },
			{ value: "size", label: "Content size" },
			{ value: "builds", label: isDepot ? "Manifest count" : "Depot count" }
		];
	});

	const handleSortChange = (e: Event) => {
		const target = e.target as HTMLSelectElement;
		store.sortBy = target.value as SortField;
		store.currentPage = 1;
	};
</script>

<div class="sort-controls">
	<label class="sort-label" for="tabs-sort-select">Sort by:</label>
	<select
		id="tabs-sort-select"
		class="steam-select sort-select"
		value={store.sortBy}
		onchange={handleSortChange}
		disabled={store.loading}
		aria-label="Sort catalog by field"
	>
		{#each sortOptions as opt (opt.value)}
			<option value={opt.value}>{opt.label}</option>
		{/each}
	</select>

	<Button
		class="sort-order-btn"
		onclick={() => store.toggleSortOrder()}
		disabled={store.loading}
		title={store.sortOrder === "asc"
			? "Ascending (lowest first)"
			: "Descending (highest first)"}
		aria-label={`Sort order: currently ${store.sortOrder === "asc" ? "ascending" : "descending"}. Click to toggle.`}
	>
		{#snippet icon()}
			{#if store.sortOrder === "asc"}
				<ArrowUpIcon size={12} color="var(--steam-accent)" />
			{:else}
				<ArrowDownIcon size={12} color="var(--steam-accent)" />
			{/if}
		{/snippet}
		<span class="sort-text">{store.sortOrder === "asc" ? "ASC" : "DESC"}</span>
	</Button>
</div>

<style>
	.sort-controls {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		flex-shrink: 0;
	}

	.sort-select {
		width: 10rem;
		flex-shrink: 0;
	}

	.sort-label {
		font-size: var(--steam-fs-sm);
		font-weight: bold;
		color: var(--steam-text);
		white-space: nowrap;
	}

	:global(.sort-order-btn) {
		width: 4.25rem;
		padding: 0 0.375rem;
		justify-content: space-between;
	}

	.sort-text {
		margin-left: auto;
		font-family: var(--steam-font-sans);
		font-weight: bold;
	}
</style>
