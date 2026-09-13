<script lang="ts">
	import type { AppGroup, DepotItem } from "../../types";
	import { getCatalogStore } from "../../state/catalog.svelte";
	import {
		formatBytes,
		formatBuildDate,
		formatReleaseDate,
		formatDeveloper,
		getDepotDisplayName,
		getEarliestDate,
		onActionKey
	} from "../../utils/formatters";
	import { CaretDownIcon, CaretUpIcon } from "phosphor-svelte";
	import ReleaseDeltaBadge from "./ReleaseDeltaBadge.svelte";
	import TitleCell from "./TitleCell.svelte";
	import FileMatchPill from "./FileMatchPill.svelte";
	import SteamDbLink from "../ui/SteamDbLink.svelte";
	import IconButton from "../ui/IconButton.svelte";

	interface Props {
		app: AppGroup;
		isEven?: boolean;
	}

	let { app, isEven = false }: Props = $props();

	let isExpanded = $state(false);

	const store = getCatalogStore();

	const devName = $derived(formatDeveloper(app.dev));

	const isSingleDepot = $derived(
		app.depots.length === 1 && Boolean(app.depots[0]?.builds?.length)
	);

	const appFileMatches = $derived.by(() => {
		const matches: { filename: string; builds: number[] }[] = [];
		for (let i = 0; i < app.depots.length; i++) {
			const m = store.depotMatchMap.get(app.depots[i].id);
			if (m) {
				matches.push(...m);
			}
		}
		return matches;
	});

	const handleRowClick = () => {
		if (isSingleDepot) {
			store.openDepot(app.depots[0], 0);
		}
	};

	const handleKeyDown = (e: KeyboardEvent) => {
		if (isSingleDepot && e.target === e.currentTarget) {
			onActionKey(e, () => store.openDepot(app.depots[0], 0));
		}
	};

	const handleChipClick = (e: MouseEvent, depot: DepotItem) => {
		if (depot.builds && depot.builds.length > 0) {
			e.stopPropagation();
			store.openDepot(depot, 0);
		}
	};
</script>

<tr
	class="steam-table-row"
	class:clickable={isSingleDepot}
	class:even={isEven}
	tabindex={isSingleDepot ? 0 : undefined}
	role={isSingleDepot ? "button" : undefined}
	aria-label={isSingleDepot ? `Open App ${app.appId}, ${app.game}` : undefined}
	onclick={handleRowClick}
	onkeydown={handleKeyDown}
>
	<td class="cell-id">{app.appId}</td>

	<TitleCell primaryTitle={app.game} subtitle={devName}>
		{#snippet badge()}
			<SteamDbLink type="app" id={app.appId} />
		{/snippet}
		<FileMatchPill matches={appFileMatches} />

		<div
			class="depots-container"
			aria-label={`Depots belonging to ${app.game}`}
		>
			{#each app.depots as depot, idx (depot.id)}
				{@const hasManifest = Boolean(depot.builds && depot.builds.length > 0)}
				{@const isMatched = store.depotMatchMap.has(depot.id)}
				{@const info = getDepotDisplayName(depot)}
				{@const isSameName =
					!depot.depot ||
					depot.depot.trim().toLowerCase() === app.game.trim().toLowerCase() ||
					info.chipName.trim().toLowerCase() === app.game.trim().toLowerCase()}
				{@const displayChipName = isSameName
					? `Depot #${depot.id}`
					: info.chipName}

				<button
					type="button"
					class="depot-chip-btn"
					class:has-manifest={hasManifest}
					class:matched={isMatched}
					class:mobile-hidden={!isExpanded && idx >= 2 && !isMatched}
					disabled={!hasManifest}
					onclick={(e) => handleChipClick(e, depot)}
					title={hasManifest
						? `Click to view ${info.primaryTitle} files`
						: `${info.primaryTitle} (Depot ${depot.id}) has no manifest filelist`}
				>
					<span>{displayChipName}</span>
					{#if !isSameName}
						<span class="depot-id-label" class:has-manifest={hasManifest}>
							({depot.id})
						</span>
					{/if}
				</button>
			{/each}
			{#if app.depots.length > 2}
				<IconButton
					variant="raised"
					class="depot-expand-btn"
					onclick={(e) => {
						e.stopPropagation();
						isExpanded = !isExpanded;
					}}
					title={isExpanded
						? "Collapse depots"
						: `Show all ${app.depots.length} depots`}
					ariaLabel={isExpanded
						? "Collapse depots"
						: `Show all ${app.depots.length} depots`}
					aria-expanded={isExpanded}
				>
					{#if isExpanded}
						<CaretUpIcon size={11} weight="bold" />
					{:else}
						<CaretDownIcon size={11} weight="bold" />
					{/if}
				</IconButton>
			{/if}
		</div>
	</TitleCell>

	<td class="cell-date">{formatBuildDate(getEarliestDate(app))}</td>
	<td class="cell-date">{formatReleaseDate(app.releaseDate)}</td>

	<td class="cell-delta">
		<ReleaseDeltaBadge
			buildDate={getEarliestDate(app)}
			releaseDate={app.releaseDate}
		/>
	</td>

	<td class="cell-size">{app.dumpSize ? formatBytes(app.dumpSize) : "—"}</td>

	<td class="cell-count">
		<span class="count-val">{app.depots.length}</span>
	</td>
</tr>

<style>
	.count-val {
		color: var(--steam-text-light);
		font-weight: bold;
	}

	.depots-container {
		margin-top: 0.375rem;
		display: flex;
		align-items: center;
		gap: 0.375rem;
		flex-wrap: wrap;
		width: 100%;
	}

	.depot-chip-btn {
		padding: 0.125rem 0.375rem;
		border: 1px solid var(--steam-chip-border);
		font-family: var(--steam-font-sans);
		font-size: var(--steam-fs-xs);
		line-height: normal;
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		width: auto;
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		background-color: var(--steam-darkest);
		color: var(--steam-text-dim);
		cursor: default;
		opacity: 0.6;
		box-sizing: border-box;
	}

	.depot-chip-btn.has-manifest {
		background-color: var(--steam-chip-bg);
		color: white;
		cursor: pointer;
		opacity: 1;
	}

	@media (hover: hover) {
		.depot-chip-btn.has-manifest:hover {
			background-color: var(--steam-hover-bg);
			color: white;
		}
	}

	.depot-chip-btn.matched {
		border-color: var(--steam-accent);
		background-color: var(--steam-accent-muted);
		color: var(--steam-accent);
	}

	.depot-id-label {
		color: var(--steam-text-dim);
		font-size: 0.625rem;
		flex-shrink: 0;
	}

	.depot-id-label.has-manifest {
		color: var(--steam-text);
	}

	:global(.depot-expand-btn) {
		display: none;
		min-height: 1.25rem;
	}

	@container (width < 640px) {
		.depot-chip-btn.mobile-hidden {
			display: none;
		}

		:global(.depot-expand-btn) {
			display: inline-flex;
		}
	}
</style>
