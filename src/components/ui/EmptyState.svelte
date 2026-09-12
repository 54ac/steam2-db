<script lang="ts">
	import type { Snippet } from "svelte";

	interface Props {
		title: string;
		subtitle?: string;
		icon?: Snippet;
	}

	let { title, subtitle, icon }: Props = $props();
</script>

<div class="empty-state-root">
	{#if icon}
		<div class="empty-icon-wrap">
			{@render icon()}
		</div>
	{/if}
	<div class="empty-title">{title}</div>
	{#if subtitle}
		<div class="empty-subtitle">{subtitle}</div>
	{/if}
</div>

<style>
	.empty-state-root {
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem 1rem;
		text-align: center;
		color: var(--steam-text);
		gap: 0.5rem;
		user-select: none;
		font-family: var(--steam-font-sans);
	}

	.empty-icon-wrap {
		color: var(--steam-accent);
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 0.25rem;
	}

	.empty-title {
		font-weight: bold;
		font-size: var(--steam-fs-md);
		color: white;
	}

	.empty-subtitle {
		font-size: var(--steam-fs-sm);
		color: var(--steam-text-dim);
		max-width: min(48ch, 100%);
	}
</style>
