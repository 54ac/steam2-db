<script lang="ts">
	import { getReleaseDelta } from "../../utils/formatters";

	interface Props {
		buildDate?: string;
		releaseDate?: string;
	}

	let { buildDate, releaseDate }: Props = $props();

	const delta = $derived(getReleaseDelta(buildDate, releaseDate));
</script>

{#if delta.days === null}
	<span
		class="delta-badge variant-none"
		title="No release date comparison available">—</span
	>
{:else if delta.isPreRelease}
	{@const d = Math.abs(delta.days)}
	<span
		class="delta-badge variant-pre"
		title={`Build is ${d} ${d === 1 ? "day" : "days"} before release`}
	>
		{delta.label}
	</span>
{:else if delta.isPostRelease}
	{@const d = Math.abs(delta.days)}
	<span
		class="delta-badge variant-post"
		title={`Build is ${d} ${d === 1 ? "day" : "days"} after release`}
	>
		{delta.label}
	</span>
{:else}
	<span class="delta-badge variant-post" title="Build date matches release date"
		>0d</span
	>
{/if}

<style>
	.delta-badge {
		display: inline-block;
		font-family: var(--steam-font-sans);
		font-size: var(--steam-fs-sm);
		white-space: nowrap;
	}

	.variant-pre {
		color: var(--steam-accent);
		font-weight: bold;
	}

	.variant-post {
		color: var(--steam-text);
		font-weight: normal;
	}

	.variant-none {
		color: var(--steam-text-dim);
		font-weight: normal;
	}
</style>
