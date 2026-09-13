<script lang="ts">
	import { FileIcon } from "phosphor-svelte";
	import { cleanFilename } from "../../utils/formatters";

	interface FileMatch {
		filename: string;
		builds: number[];
	}

	interface Props {
		matches?: FileMatch[];
	}

	let { matches }: Props = $props();

	const first = $derived(matches?.[0]);
	const extraCount = $derived((matches?.length ?? 0) - 1);
	const titleText = $derived(
		matches
			?.map(
				(m) =>
					`${cleanFilename(m.filename)} (${m.builds.map((b) => "v" + b).join(", ")})`
			)
			.join("\n") ?? ""
	);
</script>

{#if first}
	<div class="file-match-pill" title={titleText}>
		<FileIcon size={11} weight="bold" color="var(--steam-accent)" />
		<span>{cleanFilename(first.filename)}</span>
		{#if first.builds.length > 0}
			<span class="pill-tag">{`v${first.builds[0]}`}</span>
		{/if}
		{#if extraCount > 0}
			<span class="pill-tag accent">+{extraCount} more</span>
		{/if}
	</div>
{/if}

<style>
	.file-match-pill {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font-family: var(--steam-font-sans);
		font-size: var(--steam-fs-xs);
		font-weight: normal;
		color: white;
		background: var(--steam-chip-bg);
		border: 1px solid var(--steam-chip-border);
		padding: 0.0625rem 0.375rem;
		margin-top: 0.125rem;
		width: fit-content;
		max-width: 100%;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.pill-tag {
		color: var(--steam-text);
		font-size: 0.625rem;
	}

	.pill-tag.accent {
		color: var(--steam-accent);
	}
</style>
