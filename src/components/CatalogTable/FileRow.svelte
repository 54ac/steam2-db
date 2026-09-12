<script lang="ts">
	import { FileIcon } from "phosphor-svelte";
	import type { DepotFileMatchRow, MatchedFileItem } from "../../types";
	import { getCatalogStore } from "../../state/catalog.svelte";
	import {
		formatBuildRanges,
		formatDeveloper,
		cleanFilename,
		onActionKey
	} from "../../utils/formatters";
	import TitleCell from "./TitleCell.svelte";
	import SteamDbLink from "../ui/SteamDbLink.svelte";

	const MAX_VISIBLE_FILES = 3;

	interface Props {
		item: DepotFileMatchRow;
		isEven?: boolean;
	}

	let { item, isEven = false }: Props = $props();

	const store = getCatalogStore();
	const depot = $derived(item.depot);
	const earliestBuild = $derived(item.files[0]?.builds?.[0] ?? 0);

	const primaryTitle = $derived(depot?.depot || depot?.game || "—");
	const devName = $derived(formatDeveloper(depot?.dev || depot?.pub));
	const gameName = $derived(depot?.game);

	const subtitle = $derived.by<string | null>(() => {
		if (
			gameName &&
			depot?.depot &&
			gameName.toLowerCase() !== depot.depot.toLowerCase()
		) {
			const devSuffix = devName ? " · " + devName : "";
			return `${gameName} · App ${depot.appId || depot.id}${devSuffix}`;
		} else if (depot?.appId) {
			const gamePrefix = gameName ? gameName + " · " : "";
			const devSuffix = devName ? " · " + devName : "";
			return `${gamePrefix}App ${depot.appId}${devSuffix}`;
		} else if (gameName || devName) {
			return [gameName, devName].filter(Boolean).join(" · ");
		}
		return null;
	});

	const visibleFiles = $derived(item.files.slice(0, MAX_VISIBLE_FILES));
	const extraCount = $derived(item.files.length - MAX_VISIBLE_FILES);

	const handleRowClick = () => {
		store.openDepotById(item.depotId, earliestBuild);
	};

	const handleKeyDown = (e: KeyboardEvent) => {
		if (e.target === e.currentTarget) {
			onActionKey(e, () => store.openDepotById(item.depotId, earliestBuild));
		}
	};

	const handleFileChipClick = (e: MouseEvent, file: MatchedFileItem) => {
		e.stopPropagation();
		store.openDepotById(item.depotId, file.builds?.[0] ?? 0);
	};
</script>

<tr
	class="steam-table-row clickable"
	class:even={isEven}
	tabindex={0}
	role="button"
	aria-label={`Open properties for Depot ${item.depotId}`}
	onclick={handleRowClick}
	onkeydown={handleKeyDown}
>
	<td class="cell-id">{item.depotId}</td>

	<TitleCell {primaryTitle} {subtitle}>
		{#snippet badge()}
			{#if depot?.appId}
				<SteamDbLink type="app" id={depot.appId} />
			{:else}
				<SteamDbLink type="depot" id={item.depotId} />
			{/if}
		{/snippet}
	</TitleCell>

	<td class="cell-matched-files">
		<div class="files-wrapper">
			<div class="files-flex-container">
				{#each visibleFiles as file (file.fileId)}
					{@const buildRanges = formatBuildRanges(file.builds)}
					{@const earliest = file.builds?.[0] ?? 0}
					<button
						type="button"
						class="file-chip-btn"
						onclick={(e) => handleFileChipClick(e, file)}
						title={`Click to view ${file.filename} in manifest (earliest build: v${earliest})`}
						aria-label={`Open manifest build ${earliest} for ${file.filename}`}
					>
						<FileIcon size={12} color="var(--steam-accent)" />
						<span class="file-chip-name">{cleanFilename(file.filename)}</span>
						{#if file.builds && file.builds.length > 0}
							<span class="build-badge">{buildRanges}</span>
						{/if}
					</button>
				{/each}
			</div>

			{#if extraCount > 0}
				{@const extraTitle = item.files
					.slice(MAX_VISIBLE_FILES)
					.map(
						(f) =>
							`${cleanFilename(f.filename)} (${formatBuildRanges(f.builds)})`
					)
					.join("\n")}
				<span class="more-files-tag" title={extraTitle}>
					+{extraCount} more {extraCount === 1 ? "file" : "files"} in this depot
				</span>
			{/if}
		</div>
	</td>
</tr>

<style>
	.cell-matched-files {
		padding: 0.375rem 0.75rem;
		vertical-align: middle;
	}

	.files-wrapper {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.files-flex-container {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		flex-wrap: wrap;
		max-width: 100%;
	}

	.file-chip-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.125rem 0.375rem;
		background-color: var(--steam-chip-bg);
		border: 1px solid var(--steam-chip-border);
		max-width: 100%;
		min-width: 0;
		cursor: pointer;
		font-family: inherit;
		font-size: inherit;
		color: inherit;
		text-align: left;
		transition:
			background-color 0.1s ease,
			border-color 0.1s ease;
		box-sizing: border-box;
	}

	.file-chip-btn:hover {
		background-color: var(--steam-hover-bg);
		border-color: var(--steam-accent);
		color: white;
	}

	.file-chip-name {
		font-weight: normal;
		color: white;
		word-break: break-all;
		min-width: 0;
	}

	.build-badge {
		font-size: var(--steam-fs-xs);
		font-family: var(--steam-font-sans);
		font-weight: normal;
		color: var(--steam-text-light);
		background: var(--steam-darkest);
		padding: 0 0.25rem;
		flex-shrink: 0;
	}

	.more-files-tag {
		font-size: var(--steam-fs-xs);
		color: var(--steam-accent);
		font-style: normal;
		flex-shrink: 0;
	}
</style>
