<script lang="ts">
	import { getReleaseDelta } from "../../utils/formatters";

	interface Props {
		buildDate?: string;
		releaseDate?: string;
	}

	let { buildDate, releaseDate }: Props = $props();

	const delta = $derived(getReleaseDelta(buildDate, releaseDate));
	const absDays = $derived(delta.days !== null ? Math.abs(delta.days) : 0);
</script>

{#if delta.days === null}
	<span
		class="delta-badge variant-none"
		title="No release date comparison available">—</span
	>
{:else if delta.isPreRelease}
	<span
		class="delta-badge variant-pre"
		title={`Build is ${absDays} ${absDays === 1 ? "day" : "days"} before release`}
	>
		{delta.label}
	</span>
{:else if delta.isPostRelease}
	<span
		class="delta-badge variant-post"
		title={`Build is ${absDays} ${absDays === 1 ? "day" : "days"} after release`}
	>
		{delta.label}
	</span>
{:else}
	<span
		class="delta-badge variant-zero"
		title="Build date matches release date"
	>
		0d
	</span>
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

	.variant-post,
	.variant-zero {
		color: var(--steam-text);
		font-weight: normal;
	}

	.variant-none {
		color: var(--steam-text-dim);
		font-weight: normal;
	}
</style>
