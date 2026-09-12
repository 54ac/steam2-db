<script lang="ts">
	import type { DepotItem } from "../../types";
	import {
		formatBytes,
		formatBuildDate,
		formatReleaseDate,
		formatDeveloper,
		getDepotDisplayName,
		getEarliestDate,
		isGenericDepotName
	} from "../../utils/formatters";
	import MobileScrollArea from "../ui/MobileScrollArea.svelte";
	import SteamDbLink from "../ui/SteamDbLink.svelte";

	interface Props {
		depot: DepotItem;
	}

	let { depot }: Props = $props();

	const info = $derived(getDepotDisplayName(depot));

	const titles = $derived.by(() => {
		const main = depot.game || info.primaryTitle;
		let sub = "";
		if (
			depot.game &&
			depot.depot &&
			depot.depot.toLowerCase() !== depot.game.toLowerCase()
		) {
			sub = isGenericDepotName(depot.depot)
				? `· ${info.chipName}`
				: `· ${depot.depot}`;
		}
		return { main, sub };
	});

	const metaItems = $derived.by(() => {
		const items: { label: string; val: string | number }[] = [];
		if (depot.dev || depot.pub) {
			items.push({
				label: "Developer",
				val: formatDeveloper(depot.dev || depot.pub)
			});
		}
		items.push({ label: "Depot", val: depot.id });
		items.push({ label: "App", val: depot.appId || "—" });
		if (depot.releaseDate) {
			items.push({
				label: "Released",
				val: formatReleaseDate(depot.releaseDate)
			});
		}
		items.push({
			label: "Manifest",
			val: formatBuildDate(getEarliestDate(depot))
		});
		items.push({
			label: "Size",
			val: depot.dumpSize ? formatBytes(depot.dumpSize) : "—"
		});
		return items;
	});
</script>

<div class="modal-header-root">
	<div class="header-top-line">
		<div class="game-title-row">
			<h2 class="main-title">{titles.main}</h2>
			{#if titles.sub}
				<span class="depot-subtitle">{titles.sub}</span>
			{/if}
		</div>
		<SteamDbLink type="depot" id={depot.id} variant="button" />
	</div>

	<ul class="meta-chips" aria-label="Depot metadata">
		{#each metaItems as item (item.label)}
			<li class="meta-chip">
				<span class="chip-label">{item.label}:</span>
				<strong class="chip-val">{item.val}</strong>
			</li>
		{/each}
	</ul>

	{#if depot.mountedApps && depot.mountedApps.length > 1}
		<div class="used-in-row">
			<MobileScrollArea
				desktopWrap={true}
				resetKey={depot.id}
				class="mounted-apps-scroll-area"
			>
				<span class="chip-label">Used in:</span>
				{#each depot.mountedApps as app, idx (app.appId)}
					{#if idx > 0}
						<span class="app-bullet" aria-hidden="true">•</span>
					{/if}
					<span class="app-item">
						<strong class="chip-val">{app.name}</strong>
						<span class="app-id">({app.appId})</span>
					</span>
				{/each}
			</MobileScrollArea>
		</div>
	{/if}
</div>

<style>
	.modal-header-root {
		padding: 0.5rem 0.75rem;
		background-color: var(--steam-bg);
		border-bottom: 1px solid var(--steam-border-dark);
		box-shadow: 0 1px 0 var(--steam-border-light);
		font-size: var(--steam-fs-sm);
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.header-top-line {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.625rem;
		min-width: 0;
	}

	.game-title-row {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		min-width: 0;
		flex: 1;
		overflow: hidden;
	}

	.main-title {
		font-size: var(--steam-fs-base);
		font-weight: 600;
		color: white;
		margin: 0;
		line-height: 1.35;
		white-space: nowrap;
		flex-shrink: 0;
	}

	.depot-subtitle {
		font-size: var(--steam-fs-sm);
		color: var(--steam-accent);
		font-family: var(--steam-font-sans);
		line-height: 1.35;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		min-width: 0;
	}

	.meta-chips {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.375rem 0.625rem;
		font-size: var(--steam-fs-sm);
		font-family: var(--steam-font-sans);
		line-height: 1.35;
		flex-shrink: 0;
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.meta-chip {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		list-style: none;
		line-height: 1.35;
	}

	.chip-label {
		color: var(--steam-text);
	}

	.chip-val {
		color: white;
	}

	.used-in-row {
		display: flex;
		align-items: center;
		width: 100%;
		min-width: 0;
		font-size: var(--steam-fs-sm);
		font-family: var(--steam-font-sans);
		line-height: 1.35;
	}

	:global(.mounted-apps-scroll-area) {
		--scroll-fade-bg: var(--steam-bg);
	}

	.used-in-row .chip-label {
		white-space: nowrap;
		flex-shrink: 0;
	}

	.app-bullet {
		color: var(--steam-text-dim);
		user-select: none;
		font-size: 0.625rem;
		line-height: 1;
	}

	.app-item {
		display: inline-flex;
		align-items: baseline;
		gap: 0.25rem;
		white-space: nowrap;
		line-height: 1.35;
	}

	.app-id {
		color: var(--steam-accent);
		font-size: var(--steam-fs-xs);
	}
</style>
