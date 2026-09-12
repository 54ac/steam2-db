<script lang="ts">
	import type { Snippet } from "svelte";
	import type { HTMLButtonAttributes } from "svelte/elements";

	type ButtonVariant = "raised" | "sunken";
	type ButtonSize = "sm" | "md";

	interface Props extends HTMLButtonAttributes {
		variant?: ButtonVariant;
		size?: ButtonSize;
		active?: boolean;
		icon?: Snippet;
		children?: Snippet;
	}

	let {
		variant = "raised",
		size = "md",
		active = false,
		disabled = false,
		type = "button",
		icon,
		children,
		class: className = "",
		...rest
	}: Props = $props();
</script>

<button
	{type}
	{disabled}
	class="steam-btn variant-{variant} size-{size} {className}"
	class:active
	{...rest}
>
	{#if icon}
		{@render icon()}
	{/if}
	{#if children}
		{@render children()}
	{/if}
</button>

<style>
	.steam-btn {
		font-family: var(--steam-font-sans);
		box-sizing: border-box;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.25rem;
		user-select: none;
		text-decoration: none;
		white-space: nowrap;
		flex-shrink: 0;
		line-height: 1;
	}

	.steam-btn:disabled {
		opacity: 0.65;
		cursor: default;
		color: var(--steam-text-dim);
	}

	.size-sm {
		height: var(--steam-h-control-sm);
		min-height: var(--steam-h-control-sm);
		max-height: var(--steam-h-control-sm);
		padding: 0 0.5rem;
		font-size: var(--steam-fs-sm);
	}

	.size-md {
		height: var(--steam-h-control);
		min-height: var(--steam-h-control);
		max-height: var(--steam-h-control);
		padding: 0 0.625rem;
		font-size: var(--steam-fs-base);
	}

	.variant-raised {
		background-color: var(--steam-panel);
		color: white;
		border-top: 1px solid var(--steam-border-light);
		border-left: 1px solid var(--steam-border-light);
		border-bottom: 1px solid var(--steam-border-dark);
		border-right: 1px solid var(--steam-border-dark);
		box-shadow: var(--steam-shadow-btn);
	}

	.variant-raised:hover:not(:disabled) {
		background-color: var(--steam-panel-hover);
		color: white;
	}

	.variant-raised:active:not(:disabled),
	.variant-raised.active {
		background-color: var(--steam-panel-active);
		border-top: 1px solid var(--steam-border-dark);
		border-left: 1px solid var(--steam-border-dark);
		border-bottom: 1px solid var(--steam-border-light);
		border-right: 1px solid var(--steam-border-light);
		box-shadow: var(--steam-shadow-btn-active);
		color: var(--steam-accent);
	}

	.variant-sunken {
		background-color: var(--steam-darkpanel);
		border-top: 1px solid var(--steam-border-dark);
		border-left: 1px solid var(--steam-border-dark);
		border-bottom: 1px solid var(--steam-border-light);
		border-right: 1px solid var(--steam-border-light);
		box-shadow: var(--steam-shadow-inset);
		color: var(--steam-text);
	}

	.variant-sunken:hover:not(:disabled) {
		color: white;
	}

	.variant-sunken.active {
		color: var(--steam-accent);
	}
</style>
