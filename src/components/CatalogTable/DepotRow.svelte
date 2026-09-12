<script lang="ts">
	import type { DepotItem } from "../../types";
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
	import ReleaseDeltaBadge from "./ReleaseDeltaBadge.svelte";
	import TitleCell from "./TitleCell.svelte";
	import FileMatchPill from "./FileMatchPill.svelte";
	import SteamDbLink from "../ui/SteamDbLink.svelte";

	interface Props {
		depot: DepotItem;
		isEven?: boolean;
	}

	let { depot, isEven = false }: Props = $props();

	const store = getCatalogStore();

	const { primaryTitle } = $derived(getDepotDisplayName(depot));
	const devName = $derived(formatDeveloper(depot.dev || depot.pub));
	const gameTitle = $derived(depot.game || "—");
	const hasManifest = $derived(
		Boolean(depot.builds && depot.builds.length > 0)
	);

	const fileMatches = $derived(store.depotMatchMap.get(depot.id));

	const handleRowClick = () => {
		if (hasManifest) {
			store.openDepot(depot);
		}
	};

	const handleKeyDown = (e: KeyboardEvent) => {
		if (hasManifest && e.target === e.currentTarget) {
			onActionKey(e, () => store.openDepot(depot));
		}
	};
</script>

<tr
	class="steam-table-row"
	class:even={isEven}
	class:clickable={hasManifest}
	tabindex={hasManifest ? 0 : undefined}
	role={hasManifest ? "button" : undefined}
	aria-label={hasManifest
		? `Open properties for Depot ${depot.id}, ${primaryTitle}`
		: undefined}
	onclick={handleRowClick}
	onkeydown={handleKeyDown}
>
	<td class="cell-id">{depot.id}</td>

	<TitleCell {primaryTitle} subtitle={devName}>
		{#snippet badge()}
			{#if !hasManifest}
				<span class="no-manifest-tag">(No manifest)</span>
			{/if}
		{/snippet}
		<FileMatchPill matches={fileMatches} />
	</TitleCell>

	<TitleCell
		primaryTitle={gameTitle}
		subtitle={depot.appId ? `App ${depot.appId}` : undefined}
	>
		{#snippet badge()}
			{#if depot.appId}
				<SteamDbLink type="app" id={depot.appId} />
			{/if}
			{#if depot.mountedApps && depot.mountedApps.length > 1}
				<span
					class="multi-app-badge"
					title={depot.mountedApps
						.map((a) => `${a.name} (${a.appId})`)
						.join(", ")}
				>
					+{depot.mountedApps.length - 1} apps
				</span>
			{/if}
		{/snippet}
	</TitleCell>

	<td class="cell-date">{formatBuildDate(getEarliestDate(depot))}</td>
	<td class="cell-date">{formatReleaseDate(depot.releaseDate)}</td>

	<td class="cell-delta">
		<ReleaseDeltaBadge
			buildDate={getEarliestDate(depot)}
			releaseDate={depot.releaseDate}
		/>
	</td>

	<td class="cell-size">{depot.dumpSize ? formatBytes(depot.dumpSize) : "—"}</td
	>

	<td class="cell-count">
		<span class="count-val" class:has-val={hasManifest}>
			{hasManifest ? depot.builds!.length : "—"}
		</span>
	</td>
</tr>

<style>
	.steam-table-row:not(.clickable) {
		opacity: 0.85;
	}

	.count-val {
		color: var(--steam-text);
		font-weight: normal;
	}

	.count-val.has-val {
		color: var(--steam-text-light);
		font-weight: bold;
	}

	.no-manifest-tag {
		font-size: var(--steam-fs-sm);
		color: var(--steam-text-dim);
		font-weight: normal;
		font-style: italic;
		flex-shrink: 0;
	}

	.multi-app-badge {
		font-size: var(--steam-fs-xs);
		color: var(--steam-accent);
		font-weight: bold;
		font-family: var(--steam-font-sans);
		flex-shrink: 0;
		white-space: nowrap;
	}
</style>
