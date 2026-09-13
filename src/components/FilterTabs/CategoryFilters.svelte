<script lang="ts">
	import type { DepotFilter, AppFilter } from "../../types";
	import { getCatalogStore } from "../../state/catalog.svelte";
	import CategoryTabs from "./CategoryTabs.svelte";

	const store = getCatalogStore();

	const depotItems = $derived<
		Array<{ id: DepotFilter; label: string; count: number }>
	>([
		{ id: "all", label: "ALL", count: store.catalog.length },
		{ id: "multi", label: "MULTI", count: store.stats.multiBuilds },
		{ id: "single", label: "SINGLE", count: store.stats.singleBuild },
		{ id: "pre_release", label: "PRE-RELEASE", count: store.stats.preRelease }
	]);

	const appItems = $derived<
		Array<{ id: AppFilter; label: string; count: number }>
	>([
		{ id: "all", label: "ALL", count: store.appStats.total },
		{ id: "multi", label: "MULTI", count: store.appStats.multi },
		{ id: "single", label: "SINGLE", count: store.appStats.single }
	]);
</script>

{#if store.viewMode === "depot"}
	<CategoryTabs
		items={depotItems}
		activeId={store.depotFilter}
		onSelect={(f) => {
			store.depotFilter = f;
			store.currentPage = 1;
		}}
		disabled={store.loading}
		ariaLabel="Depot category filters"
		columns={4}
	/>
{:else if store.viewMode === "app"}
	<CategoryTabs
		items={appItems}
		activeId={store.appFilter}
		onSelect={(f) => {
			store.appFilter = f;
			store.currentPage = 1;
		}}
		disabled={store.loading}
		ariaLabel="App category filters"
		columns={3}
	/>
{/if}
