<script lang="ts">
	import {
		ListDashesIcon,
		TreeStructureIcon,
		FileTextIcon
	} from "phosphor-svelte";
	import { getCatalogStore } from "../../state/catalog.svelte";
	import { VIEW_MODE_OPTIONS } from "../../constants";

	const store = getCatalogStore();
</script>

<ul class="desktop-switcher" role="tablist" aria-label="View mode">
	{#each VIEW_MODE_OPTIONS as opt (opt.id)}
		<li role="presentation">
			<button
				type="button"
				role="tab"
				aria-selected={store.viewMode === opt.id}
				disabled={store.loading}
				class="steam-tab primary"
				class:active={store.viewMode === opt.id}
				onclick={() => store.setViewMode(opt.id)}
				title={opt.title}
			>
				{#if opt.id === "depot"}
					<ListDashesIcon size={15} weight="bold" />
				{:else if opt.id === "app"}
					<TreeStructureIcon size={15} weight="bold" />
				{:else}
					<FileTextIcon size={15} weight="bold" />
				{/if}
				<span>{opt.label}</span>
			</button>
		</li>
	{/each}
	{#if store.viewMode !== "file"}
		<div class="divider" role="presentation"></div>
	{/if}
</ul>

<style>
	.desktop-switcher {
		display: none;
		align-items: center;
		gap: 0.25rem;
		list-style: none;
		margin: 0;
		padding: 0;
		height: 100%;
	}

	@container (width >= 640px) {
		.desktop-switcher {
			display: flex;
		}
	}

	.divider {
		width: 1px;
		height: var(--steam-h-control-xs);
		background-color: var(--steam-border-dark);
		border-right: 1px solid var(--steam-border-light);
		margin: 0 0.5rem;
		flex-shrink: 0;
	}
</style>
