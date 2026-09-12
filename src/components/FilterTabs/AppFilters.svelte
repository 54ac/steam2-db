<script lang="ts">
	import type { AppFilter } from "../../types";
	import { getCatalogStore } from "../../state/catalog.svelte";
	import CategoryTabs from "./CategoryTabs.svelte";

	const store = getCatalogStore();

	const setFilter = (f: AppFilter) => {
		store.appFilter = f;
		store.currentPage = 1;
	};

	const filterItems = $derived<
		Array<{ id: AppFilter; label: string; count: number }>
	>([
		{ id: "all", label: "ALL", count: store.appStats.total },
		{ id: "multi", label: "MULTI", count: store.appStats.multi },
		{ id: "single", label: "SINGLE", count: store.appStats.single }
	]);
</script>

<CategoryTabs
	items={filterItems}
	activeId={store.appFilter}
	onSelect={setFilter}
	disabled={store.loading}
	ariaLabel="App category filters"
	columns={3}
/>
