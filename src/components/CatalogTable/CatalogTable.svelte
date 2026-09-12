<!--
  Main catalog data table:
  - Renders sortable headers and rows based on store.viewMode (depot / app / file)
  - Displays context-specific EmptyState / LoadingState messages per view mode
  - Delegates row rendering to DepotRow, AppRow, or FileRow
  - Handles sticky table header positioning with vintage Steam sunken border styling
-->
<script lang="ts">
	import { ArchiveIcon, FileCodeIcon } from "phosphor-svelte";
	import type { DepotItem, AppGroup, DepotFileMatchRow } from "../../types";
	import { getCatalogStore } from "../../state/catalog.svelte";
	import SortableTh from "./SortableTh.svelte";
	import DepotRow from "./DepotRow.svelte";
	import AppRow from "./AppRow.svelte";
	import FileRow from "./FileRow.svelte";
	import EmptyState from "../ui/EmptyState.svelte";
	import LoadingState from "../ui/LoadingState.svelte";

	const store = getCatalogStore();

	const paginatedItems = $derived(store.paginatedItems);
	const isEmpty = $derived(paginatedItems.length === 0);
</script>

<div
	class="table-container steam-sunken"
	aria-label="Catalog data table container"
>
	{#snippet commonColumns()}
		<SortableTh
			field="build_date"
			width="7rem"
			align="center"
			title="Earliest Steam2 manifest timestamp"
		>
			Manifest date
		</SortableTh>
		<SortableTh
			field="release_date"
			width="7rem"
			align="center"
			title="Original commercial retail release date"
		>
			Released
		</SortableTh>
		<SortableTh
			field="discrepancy"
			width="6rem"
			align="center"
			title="Days relative to release date (- = Pre-release build, + = Post-release build)"
		>
			Delta
		</SortableTh>
		<SortableTh field="size" width="7rem" align="right">Content size</SortableTh
		>
	{/snippet}

	{#if store.loading}
		<LoadingState
			title="Loading Steam2 master catalog..."
			subtitle="Indexing 10,876 historical depots"
			size={32}
		/>
	{:else if isEmpty}
		{#if store.viewMode === "file"}
			{#if store.isFileSearching}
				<LoadingState
					title="Searching 4,153,601 files across all depots..."
					subtitle={`Query: "${store.searchQuery}"`}
					size={24}
				/>
			{:else if store.fileSearchError}
				<EmptyState title="Search error" subtitle={store.fileSearchError}>
					{#snippet icon()}
						<ArchiveIcon size={32} />
					{/snippet}
				</EmptyState>
			{:else if !store.searchQuery.trim()}
				<EmptyState
					title="Type a filename to search 4.15M manifest files"
					subtitle="Examples: client.dll, de_dust2, hl2.exe, *.bsp, sound/weapons*"
				>
					{#snippet icon()}
						<FileCodeIcon size={32} color="var(--steam-accent)" />
					{/snippet}
				</EmptyState>
			{:else}
				<EmptyState
					title={`No files found matching "${store.searchQuery}"`}
					subtitle="Try searching for a different extension or broader filename pattern"
				>
					{#snippet icon()}
						<ArchiveIcon size={32} />
					{/snippet}
				</EmptyState>
			{/if}
		{:else}
			<EmptyState
				title="No items match current filter"
				subtitle={store.searchQuery
					? `No results for query "${store.searchQuery}"`
					: "Try switching filter categories above"}
			>
				{#snippet icon()}
					<ArchiveIcon size={32} />
				{/snippet}
			</EmptyState>
		{/if}
	{:else}
		<table class="steam-table">
			<thead class="steam-table-head">
				{#if store.viewMode === "file"}
					<tr>
						<SortableTh field="id" width="5.25rem" align="left"
							>Depot ID</SortableTh
						>
						<SortableTh field="name" align="left"
							>Depot title / parent game</SortableTh
						>
						<SortableTh field="builds" width="50%" align="left"
							>Matched files</SortableTh
						>
					</tr>
				{:else if store.viewMode === "depot"}
					<tr>
						<SortableTh field="id" width="5.25rem" align="left"
							>Depot ID</SortableTh
						>
						<SortableTh field="name" align="left">Depot title</SortableTh>
						<SortableTh field="game" align="left">Parent app / game</SortableTh>
						{@render commonColumns()}
						<SortableTh field="builds" width="5.25rem" align="right"
							>Manifests</SortableTh
						>
					</tr>
				{:else if store.viewMode === "app"}
					<tr>
						<SortableTh field="id" width="5.25rem" align="left"
							>App ID</SortableTh
						>
						<SortableTh field="name" align="left"
							>Game title / depots</SortableTh
						>
						{@render commonColumns()}
						<SortableTh field="builds" width="5.25rem" align="right"
							>Depots</SortableTh
						>
					</tr>
				{/if}
			</thead>

			<tbody class="steam-table-body">
				{#if store.viewMode === "depot"}
					{#each paginatedItems as item, idx ((item as DepotItem).id)}
						<DepotRow depot={item as DepotItem} isEven={idx % 2 === 0} />
					{/each}
				{:else if store.viewMode === "app"}
					{#each paginatedItems as app, idx ((app as AppGroup).appId)}
						<AppRow app={app as AppGroup} isEven={idx % 2 === 0} />
					{/each}
				{:else if store.viewMode === "file"}
					{#each paginatedItems as file, idx (`${(file as DepotFileMatchRow).depotId}-${idx}`)}
						<FileRow item={file as DepotFileMatchRow} isEven={idx % 2 === 0} />
					{/each}
				{/if}
			</tbody>
		</table>
	{/if}
</div>

<style>
	.table-container {
		flex: 1;
		overflow: auto;
		min-height: 0;
		position: relative;
		display: flex;
		flex-direction: column;
	}

	.steam-table {
		width: 100%;
		text-align: left;
		font-size: var(--steam-fs-sm);
		border-collapse: separate;
		border-spacing: 0;
	}

	.steam-table-head {
		position: sticky;
		top: 0;
		z-index: 10;
		font-weight: bold;
	}

	.steam-table-body {
		font-family: var(--steam-font-sans);
		user-select: none;
	}
</style>
