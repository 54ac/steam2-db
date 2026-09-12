<script lang="ts">
	import { onMount } from "svelte";
	import { CatalogStore, setCatalogStore } from "./state/catalog.svelte";
	import Header from "./components/Header.svelte";
	import FilterTabs from "./components/FilterTabs/FilterTabs.svelte";
	import Toolbar from "./components/Toolbar.svelte";
	import CatalogTable from "./components/CatalogTable/CatalogTable.svelte";
	import Pagination from "./components/Pagination.svelte";
	import DepotModal from "./components/DepotModal/DepotModal.svelte";

	const store = new CatalogStore();
	setCatalogStore(store);

	onMount(() => {
		store.load();
	});
</script>

<div class="app-root">
	<Header />
	<FilterTabs />
	<main class="main-content">
		<Toolbar />
		<CatalogTable />
		<Pagination />
	</main>

	{#if store.selectedDepot}
		{#key store.selectedDepot.id}
			<DepotModal depot={store.selectedDepot} />
		{/key}
	{/if}
</div>

<style>
	.app-root {
		position: fixed;
		inset: 0;
		background-color: var(--steam-bg);
		color: var(--steam-text);
		display: flex;
		flex-direction: column;
		font-family: var(--steam-font-sans);
		overflow: hidden;
	}

	.main-content {
		padding: 0.5rem 0.75rem 0.75rem;
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		min-height: 0;
		overflow: hidden;
	}
</style>
