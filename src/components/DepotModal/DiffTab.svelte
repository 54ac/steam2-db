<script lang="ts">
	import type {
		ManifestDiffSummary,
		DiffFilterMode,
		FileDiffEntry
	} from "../../types";
	import { ArchiveIcon } from "phosphor-svelte";
	import { formatBytes, cleanFilename } from "../../utils/formatters";
	import { createFixedVirtualizer } from "../../state/virtualizer.svelte";
	import EmptyState from "../ui/EmptyState.svelte";
	import FilterPill from "../ui/FilterPill.svelte";

	interface Props {
		summary: ManifestDiffSummary;
		filterQuery?: string;
		filterMode?: DiffFilterMode;
	}

	let {
		summary,
		filterQuery = "",
		filterMode = $bindable("changed")
	}: Props = $props();

	let scrollParent = $state<HTMLDivElement | null>(null);

	const filteredEntries = $derived.by<FileDiffEntry[]>(() => {
		let result = summary.entries;

		if (filterMode === "changed") {
			result = result.filter((e) => e.status !== "unchanged");
		} else if (filterMode === "added") {
			result = result.filter((e) => e.status === "added");
		} else if (filterMode === "modified") {
			result = result.filter((e) => e.status === "modified");
		} else if (filterMode === "removed") {
			result = result.filter((e) => e.status === "removed");
		}

		if (filterQuery.trim()) {
			const q = filterQuery.toLowerCase();
			result = result.filter((e) => e.path.toLowerCase().includes(q));
		}

		return result;
	});

	const virtualizer = createFixedVirtualizer({
		count: () => filteredEntries.length,
		itemHeight: 28,
		overscan: 20,
		getScrollElement: () => scrollParent
	});

	// Scroll to top on filter changes
	$effect(() => {
		const _trigger = `${filterMode}:${filterQuery}`;
		if (_trigger) {
			virtualizer.scrollToTop();
		}
	});

	const totalChanged = $derived(
		summary.addedCount + summary.modifiedCount + summary.removedCount
	);

	const filterButtons = $derived<
		{
			mode: DiffFilterMode;
			variant?: "default" | "changed" | "added" | "modified" | "removed";
			label: string;
		}[]
	>([
		{ mode: "all", label: `All (${summary.entries.length.toLocaleString()})` },
		{
			mode: "changed",
			variant: "changed",
			label: `Changed (${totalChanged.toLocaleString()})`
		},
		{
			mode: "added",
			variant: "added",
			label: `+${summary.addedCount} added`
		},
		{
			mode: "modified",
			variant: "modified",
			label: `~${summary.modifiedCount} modified`
		},
		{
			mode: "removed",
			variant: "removed",
			label: `-${summary.removedCount} removed`
		}
	]);

	const netChangeText = $derived.by(() => {
		if (summary.netSizeDiff > 0) {
			return `+${formatBytes(summary.netSizeDiff)}`;
		}
		if (summary.netSizeDiff < 0) {
			return `-${formatBytes(Math.abs(summary.netSizeDiff))}`;
		}
		return "0 B";
	});

	const getStatusSymbol = (status: FileDiffEntry["status"]) => {
		switch (status) {
			case "added":
				return "+";
			case "removed":
				return "-";
			case "modified":
				return "~";
			default:
				return "•";
		}
	};

	const isEmpty = $derived(filteredEntries.length === 0);
</script>

<div class="modal-tab-root steam-sunken">
	<div class="filter-bar" role="toolbar" aria-label="Diff filter controls">
		<div class="filter-group">
			{#each filterButtons as btn (btn.mode)}
				<FilterPill
					variant={btn.variant}
					active={filterMode === btn.mode}
					onclick={() => (filterMode = btn.mode)}
				>
					{btn.label}
				</FilterPill>
			{/each}
		</div>

		<div class="net-size-label">
			<span>Net change:</span>
			<strong
				class="net-size-val"
				class:positive={summary.netSizeDiff > 0}
				class:negative={summary.netSizeDiff < 0}
			>
				{netChangeText}
			</strong>
		</div>
	</div>

	{#if isEmpty}
		<EmptyState
			title={filterQuery.trim()
				? `No diff entries match "${filterQuery}"`
				: `No diff entries for filter "${filterMode}"`}
		>
			{#snippet icon()}
				<ArchiveIcon size={32} />
			{/snippet}
		</EmptyState>
	{:else}
		<div class="table-header">
			<span class="path-header">
				Status & file path ({filteredEntries.length.toLocaleString()} items)
			</span>
			<span class="size-header">Size change</span>
		</div>

		<div class="virtual-scroll-area" bind:this={scrollParent}>
			<div class="virtual-inner" style:height="{virtualizer.totalSize / 16}rem">
				{#each virtualizer.virtualItems as virtualRow (virtualRow.index)}
					{@const entry = filteredEntries[virtualRow.index]}
					{#if entry}
						<div
							class="diff-row status-{entry.status}"
							style:top="{virtualRow.start / 16}rem"
							style:height="{virtualRow.size / 16}rem"
						>
							<div class="file-path-group">
								<span class="status-badge status-{entry.status}">
									{getStatusSymbol(entry.status)}
								</span>
								<span class="file-path" title={cleanFilename(entry.path)}
									>{cleanFilename(entry.path)}</span
								>
							</div>

							<div class="size-info">
								{#if entry.status === "added"}
									<span class="added-size">+{formatBytes(entry.sizeB)}</span>
								{:else if entry.status === "removed"}
									<span class="removed-size">-{formatBytes(entry.sizeA)}</span>
								{:else if entry.status === "modified"}
									{@const d = entry.sizeDiff || 0}
									{#if d > 0}
										<span class="added-size">+{formatBytes(d)}</span>
									{:else if d < 0}
										<span class="removed-size">-{formatBytes(Math.abs(d))}</span
										>
									{:else}
										<span class="modified-hash-size">
											Hash change ({formatBytes(entry.sizeB)})
										</span>
									{/if}
								{:else}
									<span class="unchanged-size">{formatBytes(entry.sizeB)}</span>
								{/if}
							</div>
						</div>
					{/if}
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.filter-bar {
		background-color: var(--steam-panel);
		padding: 0.35rem 0.5rem;
		border-bottom: 1px solid var(--steam-border-dark);
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.35rem;
		flex-shrink: 0;
		flex-wrap: wrap;
		box-sizing: border-box;
	}

	@media (min-width: 640px) {
		.filter-bar {
			padding: 0.375rem 0.75rem;
			gap: 0.5rem;
		}
	}

	.filter-group {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		flex-wrap: wrap;
		width: 100%;
	}

	@media (min-width: 640px) {
		.filter-group {
			width: auto;
		}
	}

	.net-size-label {
		font-size: var(--steam-fs-xs);
		font-family: var(--steam-font-sans);
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		color: var(--steam-text);
		padding-top: 0.125rem;
	}

	@media (min-width: 640px) {
		.net-size-label {
			width: auto;
			font-size: var(--steam-fs-sm);
			padding-top: 0;
		}
	}

	.net-size-val {
		color: white;
	}

	.net-size-val.positive {
		color: var(--steam-green);
	}

	.net-size-val.negative {
		color: var(--steam-red);
	}

	.table-header {
		background-color: var(--steam-panel);
		border-bottom: 1px solid var(--steam-border-dark);
		min-height: 1.75rem;
		padding: 0.25rem 0.5rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: var(--steam-fs-xs);
		font-weight: bold;
		color: var(--steam-text-light);
		flex-shrink: 0;
		box-sizing: border-box;
		user-select: none;
	}

	@media (min-width: 640px) {
		.table-header {
			padding: 0.375rem 0.75rem;
			font-size: var(--steam-fs-sm);
		}
	}

	.path-header {
		flex: 1;
		min-width: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.size-header {
		flex-shrink: 0;
	}

	.diff-row {
		position: absolute;
		left: 0;
		width: 100%;
		padding: 0 0.5rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		color: var(--steam-text);
		border-bottom: 1px solid var(--steam-border-subtle);
		box-sizing: border-box;
		user-select: none;
	}

	.diff-row.status-added {
		background-color: var(--steam-green-dim);
	}

	.diff-row.status-removed {
		background-color: var(--steam-red-dim);
	}

	.diff-row.status-modified {
		background-color: var(--steam-accent-dim);
	}

	@media (min-width: 640px) {
		.diff-row {
			padding: 0 0.75rem;
			gap: 1rem;
		}
	}

	.file-path-group {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		overflow: hidden;
		min-width: 0;
		flex: 1;
	}

	@media (min-width: 640px) {
		.file-path-group {
			gap: 0.5rem;
		}
	}

	.status-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1rem;
		height: 1rem;
		font-weight: bold;
		font-size: var(--steam-fs-xs);
		flex-shrink: 0;
		background-color: var(--steam-darkpanel);
		color: var(--steam-darkest);
		user-select: none;
	}

	.status-badge.status-added {
		background-color: var(--steam-green);
	}

	.status-badge.status-removed {
		background-color: var(--steam-red);
	}

	.status-badge.status-modified {
		background-color: var(--steam-accent);
	}

	@media (min-width: 640px) {
		.status-badge {
			width: var(--steam-h-control-xs);
			height: var(--steam-h-control-xs);
			font-size: var(--steam-fs-sm);
		}
	}

	.file-path {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		color: white;
		font-size: var(--steam-fs-sm);
		user-select: text;
	}

	@media (min-width: 640px) {
		.file-path {
			font-size: var(--steam-fs-base);
		}
	}

	.size-info {
		flex-shrink: 0;
		font-family: var(--steam-font-sans);
		font-size: var(--steam-fs-xs);
		user-select: none;
	}

	@media (min-width: 640px) {
		.size-info {
			font-size: var(--steam-fs-sm);
		}
	}

	.added-size {
		color: var(--steam-green);
		font-weight: bold;
	}

	.removed-size {
		color: var(--steam-red);
		font-weight: bold;
	}

	.modified-hash-size {
		color: var(--steam-accent);
	}

	.unchanged-size {
		color: var(--steam-text);
	}
</style>
