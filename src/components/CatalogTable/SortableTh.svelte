<script lang="ts">
	import type { Snippet } from "svelte";
	import { ArrowUpIcon, ArrowDownIcon } from "phosphor-svelte";
	import type { SortField } from "../../types";
	import { getCatalogStore } from "../../state/catalog.svelte";
	import { onActionKey } from "../../utils/formatters";

	interface Props {
		field?: SortField;
		width?: string;
		align?: "left" | "center" | "right";
		title?: string;
		children?: Snippet;
	}

	let { field, width, align = "left", title, children }: Props = $props();

	const store = getCatalogStore();

	const isSortable = $derived(Boolean(field));
	const isActive = $derived(isSortable && store.sortBy === field);
	const sortOrder = $derived(store.sortOrder);

	const handleClick = () => {
		if (field) {
			store.toggleSort(field);
		}
	};

	const handleKeyDown = (e: KeyboardEvent) => {
		if (isSortable) {
			onActionKey(e, handleClick);
		}
	};

	const ariaSort = $derived.by<"ascending" | "descending" | "none" | undefined>(
		() => {
			if (!isSortable) {
				return undefined;
			}
			if (!isActive) {
				return "none";
			}
			return sortOrder === "asc" ? "ascending" : "descending";
		}
	);
</script>

<th
	class="steam-th"
	class:clickable={isSortable}
	class:active={isActive}
	class:align-left={align === "left"}
	class:align-center={align === "center"}
	class:align-right={align === "right"}
	style:width
	style:text-align={align}
	scope="col"
	tabindex={isSortable ? 0 : undefined}
	onclick={isSortable ? handleClick : undefined}
	onkeydown={isSortable ? handleKeyDown : undefined}
	aria-sort={ariaSort}
	{title}
>
	<div class="th-cell">
		<span class="th-label">
			{#if children}
				{@render children()}
			{/if}
		</span>
		{#if isActive}
			<span class="th-icon" aria-hidden="true">
				{#if sortOrder === "asc"}
					<ArrowUpIcon size={10} weight="bold" />
				{:else}
					<ArrowDownIcon size={10} weight="bold" />
				{/if}
			</span>
		{/if}
	</div>
</th>

<style>
	.steam-th {
		position: relative;
		background-color: var(--steam-panel);
		color: white;
		padding: 0.375rem 0.5rem;
		font-size: var(--steam-fs-sm);
		font-family: inherit;
		white-space: nowrap;
		user-select: none;
		border-top: 1px solid var(--steam-border-light);
		border-left: 1px solid var(--steam-border-light);
		border-bottom: 1px solid var(--steam-border-dark);
		border-right: 1px solid var(--steam-border-dark);
		box-shadow: var(--steam-shadow-panel);
		cursor: default;
		box-sizing: border-box;
	}

	.steam-th.clickable {
		cursor: pointer;
		padding-right: 1.125rem;
	}

	@media (hover: hover) {
		.steam-th.clickable:hover {
			background-color: var(--steam-panel-hover);
			color: white;
		}

		.steam-th.clickable:hover .th-icon {
			color: white;
		}

		.steam-th.active.clickable:hover {
			background-color: var(--steam-panel-hover-bright);
		}
	}

	.steam-th.clickable:focus-visible {
		outline: none;
		box-shadow: inset 0 0 0 1px var(--steam-accent);
	}

	.steam-th.active {
		background-color: var(--steam-panel-hover);
	}

	.th-cell {
		display: flex;
		align-items: center;
		width: 100%;
		box-sizing: border-box;
		min-height: var(--steam-h-control-xs);
	}

	.steam-th.align-left .th-cell {
		justify-content: flex-start;
	}

	.steam-th.align-left .th-label {
		text-align: left;
	}

	.steam-th.align-center .th-cell {
		justify-content: center;
	}

	.steam-th.align-center .th-label {
		text-align: center;
	}

	.steam-th.align-right .th-cell {
		justify-content: flex-end;
	}

	.steam-th.align-right .th-label {
		text-align: right;
	}

	.th-label {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.th-icon {
		position: absolute;
		right: 0.375rem;
		top: 50%;
		transform: translateY(-50%);
		display: inline-flex;
		align-items: center;
		color: var(--steam-accent);
		pointer-events: none;
		line-height: 1;
		flex-shrink: 0;
	}
</style>
