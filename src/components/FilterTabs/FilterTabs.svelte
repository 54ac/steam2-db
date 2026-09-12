<script lang="ts">
	import { getCatalogStore } from "../../state/catalog.svelte";
	import ViewSwitcher from "./ViewSwitcher.svelte";
	import DepotFilters from "./DepotFilters.svelte";
	import AppFilters from "./AppFilters.svelte";
	import SortControls from "./SortControls.svelte";

	const store = getCatalogStore();

	const hasMobileSubFilters = $derived(store.viewMode !== "file");
</script>

<nav
	class="filter-tabs-root"
	class:has-mobile-content={hasMobileSubFilters}
	aria-label="Catalog filters and sort navigation"
>
	<div class="left-group">
		<ViewSwitcher />
		{#if store.viewMode === "depot"}
			<DepotFilters />
		{:else if store.viewMode === "app"}
			<AppFilters />
		{/if}
	</div>

	<div class="right-group">
		<SortControls />
	</div>
</nav>

<style>
	.filter-tabs-root {
		background-color: var(--steam-panel);
		height: var(--steam-h-bar);
		padding: 0 0.75rem;
		border-bottom: 1px solid var(--steam-border-dark);
		box-shadow: 0 1px 0 var(--steam-border-light);
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		font-size: var(--steam-fs-sm);
		font-weight: bold;
		flex-shrink: 0;
		user-select: none;
		box-sizing: border-box;
	}

	@container (width < 640px) {
		.filter-tabs-root {
			display: none;
			padding: 0 0.375rem;
			height: auto;
			min-height: 2.125rem;
		}

		.filter-tabs-root.has-mobile-content {
			display: flex;
		}
	}

	.left-group {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
		height: 100%;
	}

	@container (width >= 640px) {
		.left-group {
			width: auto;
		}
	}

	.right-group {
		display: none;
		align-items: center;
	}

	@container (width >= 640px) {
		.right-group {
			display: flex;
		}
	}
</style>
