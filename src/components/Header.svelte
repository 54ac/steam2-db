<script lang="ts">
	import { GithubLogoIcon } from "phosphor-svelte";
	import { getCatalogStore } from "../state/catalog.svelte";
	import { formatBytes } from "../utils/formatters";
	import { GITHUB_URL, TOTAL_ARCHIVE_FILES } from "../constants";
	import IconButton from "./ui/IconButton.svelte";
	import ViewSwitcher from "./FilterTabs/ViewSwitcher.svelte";
	import CategoryFilters from "./FilterTabs/CategoryFilters.svelte";

	const store = getCatalogStore();
</script>

<header class="header-root">
	<div class="header-main">
		<div class="title-area">
			<h1 class="title">Steam2 Browser</h1>
			<IconButton
				href={GITHUB_URL}
				target="_blank"
				title="GitHub repository (opens in new tab)"
				ariaLabel="GitHub repository (opens in new tab)"
			>
				<GithubLogoIcon size={15} weight="bold" />
			</IconButton>
		</div>

		<div class="v-divider" aria-hidden="true"></div>

		<ViewSwitcher />

		{#if store.viewMode === "depot" || store.viewMode === "app"}
			<div class="v-divider nav-divider" aria-hidden="true"></div>

			<div class="category-filters">
				<CategoryFilters />
			</div>
		{/if}
	</div>

	<div class="header-stats-group">
		<ul class="stats" aria-label="Archive catalog statistics">
			<li class="stat-item">
				<span>Depots:</span>
				<strong class="stat-val">
					{store.loading ? "..." : store.stats.totalDepots?.toLocaleString()}
				</strong>
			</li>
			<li class="stat-item">
				<span>Apps:</span>
				<strong class="stat-val">
					{store.loading ? "..." : store.appCatalog.length.toLocaleString()}
				</strong>
			</li>
			<li class="stat-item">
				<span>Files:</span>
				<strong class="stat-val">
					{store.loading ? "..." : TOTAL_ARCHIVE_FILES.toLocaleString()}
				</strong>
			</li>
			<li class="stat-item">
				<span>Size:</span>
				<strong class="stat-val">
					{store.loading ? "..." : formatBytes(store.stats.totalDumpBytes)}
				</strong>
			</li>
		</ul>
	</div>
</header>

<style>
	.header-root {
		background-color: var(--steam-panel);
		border-bottom: 1px solid var(--steam-border-dark);
		user-select: none;
		flex-shrink: 0;
		z-index: 5;
		box-sizing: border-box;
		padding: max(0.375rem, env(safe-area-inset-top)) 0.375rem 0.375rem;
		min-height: 2.375rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.25rem;
	}

	.header-main {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		min-width: 0;
	}

	.title-area {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		flex-shrink: 0;
	}

	.title {
		color: white;
		font-weight: bold;
		font-size: var(--steam-fs-base);
		line-height: 1.2;
		letter-spacing: 0.02em;
		text-transform: uppercase;
		margin: 0;
		white-space: nowrap;
	}

	.v-divider {
		width: 0;
		height: var(--steam-h-control-sm);
		border-left: 1px solid var(--steam-border-dark);
		border-right: 1px solid var(--steam-border-light);
		margin: 0 0.25rem;
		flex-shrink: 0;
	}

	.nav-divider {
		display: none;
	}

	.category-filters {
		display: flex;
		align-items: center;
		min-width: 0;
	}

	.header-stats-group {
		display: none;
		align-items: center;
		margin-left: auto;
		flex-shrink: 0;
		min-width: max-content;
	}

	.stats {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: var(--steam-fs-xs);
		font-family: var(--steam-font-sans);
		list-style: none;
		margin: 0;
		padding: 0;
		white-space: nowrap;
	}

	.stat-item {
		color: var(--steam-text);
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
	}

	.stat-val {
		color: white;
		font-weight: bold;
	}

	@container (width < 880px) {
		.header-main {
			width: 100%;
			flex-wrap: wrap;
			gap: 0.25rem 0.5rem;
		}

		.category-filters {
			width: 100%;
			border-top: 1px solid var(--steam-border-dark);
			box-shadow: inset 0 1px 0 var(--steam-border-light);
			padding-top: 0.25rem;
			margin-top: 0.125rem;
		}
	}

	@container (width >= 400px) {
		.title {
			font-size: var(--steam-fs-md);
			letter-spacing: 0.03em;
		}
	}

	@container (width >= 640px) {
		.title {
			font-size: var(--steam-fs-lg);
		}
	}

	@container (width >= 880px) {
		.header-root {
			padding: 0 0.75rem;
			height: var(--steam-h-bar);
			min-height: var(--steam-h-bar);
			max-height: var(--steam-h-bar);
			flex-wrap: wrap;
			align-content: flex-start;
			overflow: hidden;
			gap: 0 0.5rem;
		}

		.header-main {
			height: var(--steam-h-bar);
			flex-shrink: 0;
			min-width: max-content;
		}

		.category-filters {
			flex-shrink: 0;
		}

		.v-divider {
			margin: 0 0.375rem;
		}

		.nav-divider {
			display: block;
		}

		.header-stats-group {
			height: var(--steam-h-bar);
			display: flex;
		}
	}

	@container (width >= 1200px) {
		.stats {
			gap: 1rem;
			font-size: var(--steam-fs-sm);
		}
	}
</style>
