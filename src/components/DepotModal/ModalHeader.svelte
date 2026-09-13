<script lang="ts">
	import { CaretDownIcon, CaretUpIcon } from "phosphor-svelte";
	import type { DepotItem } from "../../types";
	import {
		formatBytes,
		formatReleaseDate,
		formatDeveloper,
		getDepotDisplayName,
		isGenericDepotName
	} from "../../utils/formatters";
	import MobileScrollArea from "../ui/MobileScrollArea.svelte";
	import SteamDbLink from "../ui/SteamDbLink.svelte";
	import Button from "../ui/Button.svelte";

	interface Props {
		depot: DepotItem;
	}

	let { depot }: Props = $props();

	let isExpanded = $state(false);

	const info = $derived(getDepotDisplayName(depot));
	const developer = $derived(formatDeveloper(depot.dev || depot.pub));

	const titles = $derived.by(() => {
		if (isGenericDepotName(depot.depot) && depot.game) {
			return {
				main: info.primaryTitle,
				sub: ""
			};
		}
		const main = depot.depot || info.primaryTitle;
		let sub = "";
		if (depot.game && main && depot.game.toLowerCase() !== main.toLowerCase()) {
			sub = `· ${depot.game}`;
		}
		return { main, sub };
	});

	const metaItems = $derived.by(() => {
		const items: { label: string; val: string | number }[] = [];
		if (depot.appId && depot.appId !== depot.id) {
			items.push({ label: "Depot", val: `${depot.id} (App ${depot.appId})` });
		} else {
			items.push({ label: "Depot", val: depot.id });
		}
		if (depot.releaseDate) {
			items.push({
				label: "Released",
				val: formatReleaseDate(depot.releaseDate)
			});
		}
		if (depot.dumpSize) {
			items.push({
				label: "Size",
				val: formatBytes(depot.dumpSize)
			});
		}
		return items;
	});
</script>

<div class="modal-header-root">
	<div class="header-top-line">
		<div class="game-title-row">
			<h2 class="main-title">{titles.main}</h2>
			<SteamDbLink type="depot" id={depot.id} class="steamdb-mobile-icon" />
			{#if titles.sub}
				<span class="depot-subtitle">{titles.sub}</span>
			{/if}
			{#if developer}
				<span class="depot-dev">· {developer}</span>
			{/if}
		</div>
		<SteamDbLink
			type="depot"
			id={depot.id}
			variant="button"
			class="steamdb-desktop-btn"
		/>
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
			<span class="chip-label">Used in:</span>
			<MobileScrollArea
				desktopWrap={isExpanded}
				resetKey={depot.id}
				class="mounted-apps-scroll-area"
			>
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
			{#if depot.mountedApps.length > 2}
				<Button
					size="sm"
					class="expand-apps-btn"
					onclick={() => (isExpanded = !isExpanded)}
					title={isExpanded
						? "Collapse applications"
						: `Show all ${depot.mountedApps.length} applications`}
					aria-label={isExpanded
						? "Collapse applications"
						: `Show all ${depot.mountedApps.length} applications`}
					aria-expanded={isExpanded}
				>
					{#snippet icon()}
						{#if isExpanded}
							<CaretUpIcon size={12} weight="bold" />
						{:else}
							<CaretDownIcon size={12} weight="bold" />
						{/if}
					{/snippet}
				</Button>
			{/if}
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
		overflow: hidden;
		text-overflow: ellipsis;
		min-width: 0;
		flex-shrink: 1;
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
		flex-shrink: 2;
	}

	.depot-dev {
		font-size: var(--steam-fs-sm);
		color: var(--steam-text);
		font-family: var(--steam-font-sans);
		line-height: 1.35;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		min-width: 0;
		flex-shrink: 3;
	}

	:global(.steamdb-mobile-icon) {
		display: none !important;
	}

	:global(.steamdb-desktop-btn) {
		display: inline-flex !important;
	}

	.meta-chips {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.375rem 0.625rem;
		font-size: var(--steam-fs-sm);
		font-family: var(--steam-font-sans);
		line-height: 1.35;
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.meta-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		line-height: 1.35;
		white-space: nowrap;
	}

	.chip-label {
		color: var(--steam-text);
	}

	.chip-val {
		color: white;
	}

	.used-in-row {
		display: flex;
		align-items: flex-start;
		gap: 0.375rem;
		width: 100%;
		min-width: 0;
		font-size: var(--steam-fs-sm);
		font-family: var(--steam-font-sans);
		line-height: 1.35;
	}

	:global(.mounted-apps-scroll-area) {
		--scroll-fade-bg: var(--steam-bg);

		flex: 1;
		min-width: 0;
	}

	.used-in-row .chip-label {
		white-space: nowrap;
		flex-shrink: 0;
		line-height: 1.35;
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

	:global(.expand-apps-btn) {
		align-self: flex-start;
		padding: 0 0.25rem;
	}

	@container (width < 600px) {
		.depot-subtitle,
		.depot-dev {
			display: none;
		}

		:global(.steamdb-mobile-icon) {
			display: inline-flex !important;
		}

		:global(.steamdb-desktop-btn) {
			display: none !important;
		}

		:global(.expand-apps-btn) {
			display: none !important;
		}
	}
</style>
