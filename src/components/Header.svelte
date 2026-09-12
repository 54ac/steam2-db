<script lang="ts">
	import {
		ListDashesIcon,
		TreeStructureIcon,
		FileTextIcon,
		GithubLogoIcon
	} from "phosphor-svelte";
	import type { ViewMode } from "../types";
	import { getCatalogStore } from "../state/catalog.svelte";
	import { formatBytes } from "../utils/formatters";
	import {
		GITHUB_URL,
		TOTAL_ARCHIVE_FILES,
		VIEW_MODE_OPTIONS
	} from "../constants";
	import Button from "./ui/Button.svelte";

	const store = getCatalogStore();

	const handleSelectMode = (mode: ViewMode) => {
		store.setViewMode(mode);
	};
</script>

<header class="header-root">
	<div class="title-area">
		<h1 class="title">Steam2 Browser</h1>
		<a
			href={GITHUB_URL}
			target="_blank"
			rel="noopener noreferrer"
			class="github-header-link"
			title="GitHub repository (opens in new tab)"
			aria-label="GitHub repository (opens in new tab)"
		>
			<GithubLogoIcon size={15} />
		</a>
	</div>

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

	<nav class="mobile-switcher" aria-label="View mode switcher">
		{#each VIEW_MODE_OPTIONS as opt (opt.id)}
			<Button
				size="sm"
				variant={store.viewMode === opt.id ? "sunken" : "raised"}
				active={store.viewMode === opt.id}
				disabled={store.loading}
				class="mobile-btn"
				onclick={() => handleSelectMode(opt.id)}
				title={opt.title}
			>
				{#if opt.id === "depot"}
					<ListDashesIcon size={12} />
				{:else if opt.id === "app"}
					<TreeStructureIcon size={12} />
				{:else}
					<FileTextIcon size={12} />
				{/if}
				<span>{opt.label}</span>
			</Button>
		{/each}
	</nav>
</header>

<style>
	.header-root {
		background-color: var(--steam-panel);
		border-bottom: 1px solid var(--steam-border-dark);
		box-shadow: 0 1px 0 var(--steam-border-light);
		user-select: none;
		flex-shrink: 0;
		z-index: 5;
		box-sizing: border-box;
		padding: max(0.4rem, env(safe-area-inset-top)) 0.375rem 0.35rem;
		min-height: 2.375rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.25rem;
	}

	@media (min-width: 640px) {
		.header-root {
			padding: 0 0.75rem;
			height: var(--steam-h-bar);
			min-height: var(--steam-h-bar);
			gap: 0.5rem;
		}
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

	@media (min-width: 400px) {
		.title {
			font-size: var(--steam-fs-md);
			letter-spacing: 0.03em;
		}
	}

	@media (min-width: 640px) {
		.title {
			font-size: var(--steam-fs-lg);
		}
	}

	.github-header-link {
		color: var(--steam-text);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		text-decoration: none;
		padding: 0.125rem;
		transition: color 0.1s ease;
		flex-shrink: 0;
	}

	.github-header-link:hover {
		color: white;
	}

	.stats {
		display: none;
		align-items: center;
		gap: 1rem;
		font-size: var(--steam-fs-sm);
		font-family: var(--steam-font-sans);
		list-style: none;
		margin: 0;
		padding: 0;
	}

	@media (min-width: 640px) {
		.stats {
			display: flex;
		}
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

	.mobile-switcher {
		display: flex;
		align-items: center;
		gap: 0.15rem;
		font-size: var(--steam-fs-xs);
		flex-shrink: 0;
	}

	@media (min-width: 640px) {
		.mobile-switcher {
			display: none;
		}
	}

	.mobile-switcher :global(.mobile-btn) {
		padding: 0.125rem 0.25rem;
		font-size: var(--steam-fs-xs);
		gap: 0.15rem;
		font-weight: bold;
	}
</style>
