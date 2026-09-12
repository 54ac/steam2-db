<script lang="ts">
	import type { DepotFilter } from "../../types";
	import { getCatalogStore } from "../../state/catalog.svelte";
	import CategoryTabs from "./CategoryTabs.svelte";

	const store = getCatalogStore();

	const setFilter = (f: DepotFilter) => {
		store.depotFilter = f;
		store.currentPage = 1;
	};

	const filterItems = $derived<
		Array<{ id: DepotFilter; label: string; count: number }>
	>([
		{ id: "all", label: "ALL", count: store.catalog.length },
		{ id: "multi", label: "MULTI", count: store.stats.multiBuilds },
		{ id: "single", label: "SINGLE", count: store.stats.singleBuild },
		{ id: "pre_release", label: "PRE-RELEASE", count: store.stats.preRelease }
	]);
</script>

<CategoryTabs
	items={filterItems}
	activeId={store.depotFilter}
	onSelect={setFilter}
	disabled={store.loading}
	ariaLabel="Depot category filters"
	columns={4}
/>
