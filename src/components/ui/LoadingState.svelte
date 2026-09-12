<script lang="ts">
	import { ArrowClockwiseIcon } from "phosphor-svelte";

	interface Props {
		title?: string;
		subtitle?: string;
		size?: number;
	}

	let { title = "Loading...", subtitle, size = 28 }: Props = $props();
</script>

<div class="loading-state-root">
	<div class="spinner-icon">
		<ArrowClockwiseIcon {size} />
	</div>
	<div class="loading-title">{title}</div>
	{#if subtitle}
		<div class="loading-subtitle">{subtitle}</div>
	{/if}
</div>

<style>
	.loading-state-root {
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
	}

	.loading-title {
		font-weight: bold;
		font-size: var(--steam-fs-md);
		color: white;
	}

	.loading-subtitle {
		font-size: var(--steam-fs-sm);
		color: var(--steam-text-dim);
	}
</style>
