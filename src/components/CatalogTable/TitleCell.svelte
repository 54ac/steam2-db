<script lang="ts">
	import type { Snippet } from "svelte";

	interface Props {
		primaryTitle: string;
		subtitle?: string | null;
		badge?: Snippet;
		children?: Snippet;
	}

	let { primaryTitle, subtitle, badge, children }: Props = $props();
</script>

<td class="cell-title">
	<div class="title-box">
		<div class="primary-title">
			<span>{primaryTitle}</span>
			{#if badge}
				{@render badge()}
			{/if}
		</div>
		{#if subtitle && subtitle.trim()}
			<div class="subtitle">{subtitle}</div>
		{/if}
		{#if children}
			{@render children()}
		{/if}
	</div>
</td>

<style>
	.cell-title {
		padding: 0.375rem 0.5rem;
		max-width: 0;
		min-width: 12rem;
		border-right: 1px solid var(--steam-border-subtle);
		border-bottom: 1px solid var(--steam-border-row);
		font-family: var(--steam-font-sans);
		font-size: var(--steam-fs-base);
		white-space: nowrap;
		box-sizing: border-box;
	}

	.title-box {
		min-height: var(--steam-h-bar);
		display: flex;
		flex-direction: column;
		justify-content: center;
		min-width: 0;
		padding: 0.125rem 0;
	}

	.primary-title {
		font-weight: 600;
		color: white;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		line-height: 1.25;
		font-size: var(--steam-fs-base);
		word-break: break-word;
		white-space: normal;
	}

	.subtitle {
		font-size: var(--steam-fs-sm);
		color: var(--steam-text);
		font-family: var(--steam-font-sans);
		line-height: 1.2;
		margin-top: 0.125rem;
		word-break: break-word;
		white-space: normal;
	}
</style>
