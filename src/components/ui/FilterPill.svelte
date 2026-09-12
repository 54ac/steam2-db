<script lang="ts">
	import type { Snippet } from "svelte";

	type FilterPillVariant =
		"default" | "changed" | "added" | "modified" | "removed";

	interface Props {
		active?: boolean;
		variant?: FilterPillVariant;
		disabled?: boolean;
		title?: string;
		ariaLabel?: string;
		class?: string;
		onclick?: (e: MouseEvent) => void;
		children?: Snippet;
	}

	let {
		active = false,
		variant = "default",
		disabled = false,
		title,
		ariaLabel,
		class: className = "",
		onclick,
		children
	}: Props = $props();
</script>

<button
	type="button"
	class="filter-pill variant-{variant} {className}"
	class:active
	{disabled}
	{onclick}
	{title}
	aria-label={ariaLabel}
	aria-pressed={active}
>
	{#if children}
		{@render children()}
	{/if}
</button>

<style>
	.filter-pill {
		padding: 0.125rem 0.375rem;
		font-size: var(--steam-fs-xs);
		font-family: var(--steam-font-sans);
		font-weight: bold;
		border: 1px solid var(--steam-border-dark);
		background-color: var(--steam-panel);
		color: var(--steam-text);
		cursor: pointer;
		white-space: nowrap;
		line-height: 1.3;
		box-sizing: border-box;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		user-select: none;
	}

	.filter-pill.active {
		border-color: var(--steam-accent);
		background-color: var(--steam-darkpanel);
		color: var(--steam-accent);
	}

	.variant-added {
		color: var(--steam-green);
	}

	.variant-modified {
		color: var(--steam-accent);
	}

	.variant-removed {
		color: var(--steam-red);
	}

	@media (hover: hover) {
		.filter-pill:hover:not(:disabled) {
			background-color: var(--steam-panel-hover);
			color: white;
		}
	}

	.filter-pill:disabled {
		opacity: 0.5;
		cursor: default;
	}

	@container (width >= 600px) {
		.filter-pill {
			padding: 0.125rem 0.5rem;
			font-size: var(--steam-fs-sm);
		}
	}

	@media (hover: none) and (pointer: coarse) {
		.filter-pill {
			min-height: 1.625rem;
			padding: 0.125rem 0.5rem;
		}
	}
</style>
