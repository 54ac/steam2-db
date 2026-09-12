<script lang="ts">
	import type { Snippet } from "svelte";

	type Variant = "ghost" | "raised";
	type Size = "xs" | "sm" | "md";

	interface Props {
		href?: string;
		target?: string;
		rel?: string;
		type?: "button" | "submit" | "reset";
		variant?: Variant;
		size?: Size;
		disabled?: boolean;
		title?: string;
		ariaLabel?: string;
		"aria-label"?: string;
		class?: string;
		onclick?: (e: MouseEvent) => void;
		onkeydown?: (e: KeyboardEvent) => void;
		children?: Snippet;
		[key: string]: unknown;
	}

	let {
		href,
		target,
		rel,
		type = "button",
		variant = "ghost",
		size = "sm",
		disabled = false,
		title,
		ariaLabel,
		"aria-label": ariaLabelAttr,
		class: className = "",
		onclick,
		onkeydown,
		children,
		...rest
	}: Props = $props();

	const resolvedAriaLabel = $derived(ariaLabelAttr || ariaLabel || title);
	const resolvedRel = $derived(
		rel ?? (target === "_blank" ? "noopener noreferrer" : undefined)
	);
</script>

{#if href}
	<a
		{href}
		{target}
		rel={resolvedRel}
		class="steam-icon-btn variant-{variant} size-{size} {className}"
		{title}
		aria-label={resolvedAriaLabel}
		{onclick}
		{onkeydown}
		{...rest}
	>
		{#if children}
			{@render children()}
		{/if}
	</a>
{:else}
	<button
		{type}
		{disabled}
		class="steam-icon-btn variant-{variant} size-{size} {className}"
		{title}
		aria-label={resolvedAriaLabel}
		{onclick}
		{onkeydown}
		{...rest}
	>
		{#if children}
			{@render children()}
		{/if}
	</button>
{/if}

<style>
	.steam-icon-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		line-height: 1;
		flex-shrink: 0;
		box-sizing: border-box;
		text-decoration: none;
		user-select: none;
		cursor: pointer;
		color: var(--steam-accent);
		background: transparent;
		border: none;
		padding: 0;
		font-family: var(--steam-font-sans);
		opacity: 1;
	}

	.steam-icon-btn :global(svg) {
		color: currentcolor;
		flex-shrink: 0;
		display: block;
	}

	@media (hover: hover) {
		.steam-icon-btn:hover:not(:disabled) {
			color: white;
		}
	}

	.size-xs {
		padding: 0.0625rem;
	}

	.size-sm {
		padding: 0.125rem;
	}

	.size-md {
		padding: 0.25rem;
	}

	.variant-raised {
		background-color: var(--steam-panel);
		border-top: 1px solid var(--steam-border-light);
		border-left: 1px solid var(--steam-border-light);
		border-bottom: 1px solid var(--steam-border-dark);
		border-right: 1px solid var(--steam-border-dark);
		box-shadow: var(--steam-shadow-btn);
		padding: 0.125rem 0.25rem;
	}

	.variant-raised:active:not(:disabled) {
		background-color: var(--steam-panel-active);
		border-top: 1px solid var(--steam-border-dark);
		border-left: 1px solid var(--steam-border-dark);
		border-bottom: 1px solid var(--steam-border-light);
		border-right: 1px solid var(--steam-border-light);
		box-shadow: var(--steam-shadow-btn-active);
	}

	.steam-icon-btn:disabled {
		opacity: 0.5;
		cursor: default;
		color: var(--steam-text-dim);
	}

	.steam-icon-btn:disabled :global(svg) {
		color: var(--steam-text-dim);
	}
</style>
