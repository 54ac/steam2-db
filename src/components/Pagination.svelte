<script lang="ts">
	import { InfoIcon } from "phosphor-svelte";
	import { getCatalogStore } from "../state/catalog.svelte";
	import { DISCLAIMER_TEXT, PAGE_SIZE } from "../constants";
	import Button from "./ui/Button.svelte";
	import MobileScrollArea from "./ui/MobileScrollArea.svelte";

	const store = getCatalogStore();

	const totalItems = $derived(store.filteredItems.length);
	const startItem = $derived(
		totalItems > 0 ? (store.currentPage - 1) * PAGE_SIZE + 1 : 0
	);
	const endItem = $derived(Math.min(store.currentPage * PAGE_SIZE, totalItems));

	const handlePrev = () => {
		store.currentPage = Math.max(store.currentPage - 1, 1);
	};

	const handleNext = () => {
		store.currentPage = Math.min(store.currentPage + 1, store.totalPages);
	};
</script>

<footer class="pagination-root" aria-label="Table status and pagination">
	<div class="main-status-bar">
		<div class="left-section">
			{#if store.loading}
				<span>Loading items...</span>
			{:else}
				<span class="count-text">
					<span>Showing</span>
					<strong>{startItem}</strong>
					<span>-</span>
					<strong>{endItem}</strong>
					<span>of</span>
					<strong>{totalItems.toLocaleString()}</strong>
				</span>
			{/if}
		</div>

		<div class="center-section">
			<span class="info-icon">
				<InfoIcon size={13} weight="bold" />
			</span>
			<span class="desktop-disclaimer-text" title={DISCLAIMER_TEXT}>
				{DISCLAIMER_TEXT}
			</span>
		</div>

		<div class="right-section">
			<div class="controls">
				<Button
					size="sm"
					onclick={handlePrev}
					disabled={store.loading || store.currentPage <= 1}
				>
					Prev
				</Button>
				<span class="page-indicator">
					{store.loading ? 1 : store.currentPage} / {store.loading
						? 1
						: store.totalPages}
				</span>
				<Button
					size="sm"
					onclick={handleNext}
					disabled={store.loading || store.currentPage >= store.totalPages}
				>
					Next
				</Button>
			</div>
		</div>
	</div>

	<div class="mobile-disclaimer-wrapper">
		<MobileScrollArea class="disclaimer-scroll-area">
			<span class="info-icon">
				<InfoIcon size={12} weight="bold" />
			</span>
			<span class="mobile-disclaimer-text" title={DISCLAIMER_TEXT}>
				{DISCLAIMER_TEXT}
			</span>
		</MobileScrollArea>
	</div>
</footer>

<style>
	.pagination-root {
		background-color: var(--steam-panel);
		border-top: 1px solid var(--steam-border-light);
		border-left: 1px solid var(--steam-border-light);
		border-bottom: 1px solid var(--steam-border-dark);
		border-right: 1px solid var(--steam-border-dark);
		box-shadow: var(--steam-shadow-panel);
		display: flex;
		flex-direction: column;
		font-size: var(--steam-fs-sm);
		font-family: var(--steam-font-sans);
		flex-shrink: 0;
		user-select: none;
		box-sizing: border-box;
	}

	.main-status-bar {
		padding: 0.25rem 0.5rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		min-height: 1.875rem;
		box-sizing: border-box;
	}

	.left-section {
		color: var(--steam-text);
		white-space: nowrap;
		flex-shrink: 0;
	}

	.count-text {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
	}

	.count-text strong {
		color: white;
	}

	.center-section {
		display: none;
		min-width: 0;
		flex: 1;
		align-items: center;
		justify-content: center;
		gap: 0.35rem;
	}

	@container (width >= 900px) {
		.center-section {
			display: flex;
		}
	}

	.info-icon {
		color: var(--steam-accent);
		display: inline-flex;
		flex-shrink: 0;
	}

	.desktop-disclaimer-text {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		display: inline-block;
		max-width: 100%;
		color: var(--steam-text);
		font-size: var(--steam-fs-xs);
		font-weight: 500;
	}

	.mobile-disclaimer-wrapper {
		position: relative;
		display: flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.375rem 0.625rem;
		border-top: 1px solid var(--steam-border-dark);
		box-shadow: 0 1px 0 var(--steam-border-light) inset;
		background-color: var(--steam-panel-dark);
		overflow: hidden;
		box-sizing: border-box;
	}

	@container (width >= 900px) {
		.mobile-disclaimer-wrapper {
			display: none;
		}
	}

	:global(.disclaimer-scroll-area) {
		--scroll-fade-bg: var(--steam-panel-dark);
	}

	.mobile-disclaimer-text {
		white-space: nowrap;
		flex-shrink: 0;
		color: var(--steam-text);
		font-size: var(--steam-fs-xs);
		font-weight: 500;
	}

	.right-section {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	.controls {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.page-indicator {
		padding: 0 0.375rem;
		color: white;
		font-weight: bold;
	}
</style>
