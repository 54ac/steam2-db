<script lang="ts">
	import { getCatalogStore } from "../../state/catalog.svelte";
	import { VIEW_MODE_OPTIONS } from "../../constants";

	const store = getCatalogStore();
</script>

<ul class="view-switcher" role="tablist" aria-label="View mode">
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
				<opt.icon size={13} weight="bold" />
				<span>{opt.label}</span>
			</button>
		</li>
	{/each}
</ul>

<style>
	.view-switcher {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		list-style: none;
		margin: 0;
		padding: 0;
		height: 100%;
		flex-shrink: 0;
	}

	.view-switcher .steam-tab.primary {
		padding: 0 0.375rem;
		font-size: var(--steam-fs-xs);
		gap: 0.2rem;
		height: var(--steam-h-control-sm);
		min-height: var(--steam-h-control-sm);
	}

	@container (width >= 640px) {
		.view-switcher .steam-tab.primary {
			padding: 0 0.5rem;
			font-size: var(--steam-fs-sm);
			gap: 0.25rem;
		}
	}
</style>
