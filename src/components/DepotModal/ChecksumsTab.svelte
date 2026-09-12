<script lang="ts">
	import { ArchiveIcon } from "phosphor-svelte";
	import type { DumpFile } from "../../types";
	import { formatBytes } from "../../utils/formatters";
	import CopyButton from "../ui/CopyButton.svelte";
	import EmptyState from "../ui/EmptyState.svelte";

	interface Props {
		dumpFiles: DumpFile[];
		depotId?: number;
	}

	let { dumpFiles, depotId }: Props = $props();

	const isEmpty = $derived(dumpFiles.length === 0);
</script>

{#snippet fieldRow(
	label: string,
	value: string,
	copyTitle: string,
	filename: string
)}
	<div class="field-row">
		<div class="field-label-group">
			<span class="field-label">{label}</span>
			<CopyButton
				variant="ghost"
				text={value}
				ariaLabel={`Copy ${copyTitle} for ${filename}`}
				title={`Copy ${copyTitle}`}
				class="mobile-copy-btn"
			/>
		</div>

		<div class="value-box" title={value}>{value}</div>

		<CopyButton
			text={value}
			ariaLabel={`Copy ${copyTitle} for ${filename}`}
			class="desktop-copy-btn"
		/>
	</div>
{/snippet}

<div class="modal-tab-root steam-sunken">
	{#if isEmpty}
		<EmptyState
			title="No dump files recorded for this manifest build"
			subtitle={depotId !== undefined
				? `No dump files found for depot ${depotId}`
				: undefined}
		>
			{#snippet icon()}
				<ArchiveIcon size={32} />
			{/snippet}
		</EmptyState>
	{:else}
		<div class="table-header">
			<span>Dump files ({dumpFiles.length})</span>
		</div>

		<ul class="scroll-area" aria-label="Dump files checksum list">
			{#each dumpFiles as dumpFile, idx (`${dumpFile.name}_${idx}`)}
				<li class="dump-card-item">
					<div class="dump-card">
						<div class="card-header">
							<span class="filesize">
								{formatBytes(dumpFile.size)}
								{#if dumpFile.date}
									· {dumpFile.date}
								{/if}
							</span>
							<span class="dump-index">#{idx + 1}</span>
						</div>

						{@render fieldRow(
							"FILENAME",
							dumpFile.name,
							"filename",
							dumpFile.name
						)}
						{#if dumpFile.crc}
							{@render fieldRow(
								"CRC32",
								dumpFile.crc,
								"CRC32 checksum",
								dumpFile.name
							)}
						{/if}
						{#if dumpFile.sha256}
							{@render fieldRow(
								"SHA-256",
								dumpFile.sha256,
								"SHA-256 checksum",
								dumpFile.name
							)}
						{/if}
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.table-header {
		background-color: var(--steam-panel);
		border-bottom: 1px solid var(--steam-border-dark);
		min-height: 1.75rem;
		padding: 0.25rem 0.5rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: var(--steam-fs-xs);
		font-weight: bold;
		color: var(--steam-text-light);
		flex-shrink: 0;
		box-sizing: border-box;
		user-select: none;
	}

	@container (width >= 600px) {
		.table-header {
			padding: 0.375rem 0.75rem;
			font-size: var(--steam-fs-sm);
		}
	}

	.scroll-area {
		flex: 1;
		overflow-y: auto;
		padding: 0.375rem;
		font-family: var(--steam-font-sans);
		font-size: var(--steam-fs-sm);
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		list-style: none;
		margin: 0;
		box-sizing: border-box;
	}

	@container (width >= 600px) {
		.scroll-area {
			padding: 0.5rem;
			gap: 0.625rem;
			font-size: var(--steam-fs-base);
		}
	}

	.dump-card-item {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.dump-card {
		background-color: var(--steam-chip-bg);
		padding: 0.5rem;
		border: 1px solid var(--steam-chip-border);
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		box-sizing: border-box;
	}

	@container (width >= 600px) {
		.dump-card {
			padding: 0.625rem;
			gap: 0.5rem;
		}
	}

	.card-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		padding-bottom: 0.125rem;
		border-bottom: 1px solid var(--steam-border-subtle);
	}

	.filesize {
		font-size: var(--steam-fs-xs);
		color: white;
		font-weight: bold;
		white-space: nowrap;
	}

	@container (width >= 600px) {
		.filesize {
			font-size: var(--steam-fs-sm);
		}
	}

	.dump-index {
		font-size: var(--steam-fs-xs);
		color: var(--steam-text);
		font-family: var(--steam-font-mono);
	}

	@container (width >= 600px) {
		.dump-index {
			font-size: var(--steam-fs-sm);
		}
	}

	.field-row {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	@container (width >= 600px) {
		.field-row {
			display: grid;
			grid-template-columns: 5rem 1fr 4.25rem;
			align-items: center;
			gap: 0.5rem;
		}
	}

	.field-label-group {
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}

	@container (width >= 600px) {
		.field-label-group {
			gap: 0;
		}
	}

	.field-label {
		font-size: var(--steam-fs-xs);
		font-weight: bold;
		color: var(--steam-text);
		letter-spacing: 0.04em;
		white-space: nowrap;
	}

	@container (width >= 600px) {
		.field-label {
			font-size: var(--steam-fs-sm);
		}
	}

	@container (width >= 600px) {
		:global(.mobile-copy-btn) {
			display: none !important;
		}
	}

	:global(button.desktop-copy-btn) {
		display: none !important;
		width: 100%;
	}

	@container (width >= 600px) {
		:global(button.desktop-copy-btn) {
			display: inline-flex !important;
		}
	}

	.value-box {
		background-color: var(--steam-darkest);
		border: 1px solid var(--steam-border-dark);
		padding: 0.3rem 0.45rem;
		font-family: var(--steam-font-mono);
		font-size: var(--steam-fs-xs);
		line-height: 1.4;
		color: white;
		user-select: all;
		word-break: break-all;
		overflow-wrap: anywhere;
		letter-spacing: 0.02em;
		min-width: 0;
		box-sizing: border-box;
	}

	@container (width >= 600px) {
		.value-box {
			font-size: var(--steam-fs-sm);
			padding: 0.25rem 0.5rem;
			letter-spacing: 0;
		}
	}
</style>
