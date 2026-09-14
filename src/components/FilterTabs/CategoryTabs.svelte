<script lang="ts" generics="T extends string">
	interface TabItem {
		id: T;
		label: string;
		count?: number;
	}

	interface Props {
		items: TabItem[];
		activeId: T;
		onSelect: (id: T) => void;
		disabled?: boolean;
		ariaLabel?: string;
		columns?: number;
	}

	let {
		items,
		activeId,
		onSelect,
		disabled = false,
		ariaLabel,
		columns = items.length
	}: Props = $props();
</script>

<div
	class="category-tabs-grid"
	role="tablist"
	aria-label={ariaLabel}
	style:--tab-cols={columns}
>
	{#each items as item (item.id)}
		<div class="category-tab-item" role="presentation">
			<button
				type="button"
				role="tab"
				aria-selected={activeId === item.id}
				{disabled}
				class="steam-tab sub"
				class:active={activeId === item.id}
				onclick={() => onSelect(item.id)}
			>
				<span>{item.label}</span>
				{#if !disabled && item.count !== undefined}
					<span class="count-label">({item.count.toLocaleString()})</span>
				{/if}
			</button>
		</div>
	{/each}
</div>

<style>
	.category-tab-item > button.active {
		color: white;
	}

	.category-tabs-grid {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		overflow-x: auto;
		scrollbar-width: none;
		height: 100%;
		flex: 1;
	}

	.category-tabs-grid::-webkit-scrollbar {
		display: none;
	}

	.category-tab-item {
		display: flex;
		align-items: center;
		flex-shrink: 0;
	}

	.category-tab-item > button {
		height: var(--steam-h-control-sm);
		min-height: var(--steam-h-control-sm);
		padding: 0 0.4rem;
		font-size: var(--steam-fs-sm);
		gap: 0.25rem;
	}

	@container (width < 880px) {
		.category-tabs-grid {
			padding: 0.25rem 0;
			width: 100%;
			display: grid;
			gap: 0.25rem;
			grid-template-columns: repeat(var(--tab-cols, 4), minmax(0, 1fr));
		}

		.category-tab-item {
			width: 100%;
			min-width: 0;
		}

		.category-tab-item > button {
			width: 100%;
			min-width: 0;
			justify-content: center;
			padding: 0 0.25rem;
			font-size: var(--steam-fs-xs);
		}

		.category-tab-item > button span {
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
			max-width: 100%;
		}
	}

	@container (width < 640px) {
		.category-tab-item > button .count-label {
			display: none;
		}
	}

	@container (640px <= width < 880px) {
		.category-tab-item > button {
			font-size: var(--steam-fs-sm);
		}
	}
</style>
