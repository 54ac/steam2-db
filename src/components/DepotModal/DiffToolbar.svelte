<script lang="ts">
	import { ArrowsLeftRightIcon, DownloadIcon } from "phosphor-svelte";
	import type { DepotBuild } from "../../types";
	import SearchField from "../ui/SearchField.svelte";
	import Button from "../ui/Button.svelte";
	import BuildSelect from "./BuildSelect.svelte";

	interface Props {
		builds: DepotBuild[];
		diffBaseIndex: number;
		diffTargetIndex: number;
		diffFilter?: string;
		canExport?: boolean;
		onDiffBaseSelect: (idx: number) => void;
		onDiffTargetSelect: (idx: number) => void;
		onSwapDiffBuilds: () => void;
		onExport?: () => void;
		diffSearchInputRef?: HTMLInputElement | null;
	}

	let {
		builds,
		diffBaseIndex,
		diffTargetIndex,
		diffFilter = $bindable(""),
		canExport = false,
		onDiffBaseSelect,
		onDiffTargetSelect,
		onSwapDiffBuilds,
		onExport,
		diffSearchInputRef = $bindable(null)
	}: Props = $props();
</script>

<div class="steam-toolbar">
	<div class="diff-controls-group">
		<div class="diff-select-pair">
			<label class="desktop-date-label" for="diff-base-select">Base (A):</label>
			<BuildSelect
				id="diff-base-select"
				class="diff-build-select"
				{builds}
				value={diffBaseIndex}
				onchange={onDiffBaseSelect}
				disabledIndex={diffTargetIndex}
				disabledSuffix=" [Active B]"
				prefix="A"
				ariaLabel="Select base manifest build"
			/>

			<Button
				size="sm"
				onclick={onSwapDiffBuilds}
				title="Swap base and compare builds"
				aria-label="Swap base and compare builds"
			>
				{#snippet icon()}
					<ArrowsLeftRightIcon size={13} />
				{/snippet}
			</Button>

			<label class="desktop-date-label" for="diff-target-select"
				>Compare (B):</label
			>
			<BuildSelect
				id="diff-target-select"
				class="diff-build-select"
				{builds}
				value={diffTargetIndex}
				onchange={onDiffTargetSelect}
				disabledIndex={diffBaseIndex}
				disabledSuffix=" [Active A]"
				prefix="B"
				ariaLabel="Select compare manifest build"
			/>
		</div>

		<div class="diff-search-wrap">
			<SearchField
				bind:value={diffFilter}
				bind:inputElement={diffSearchInputRef}
				placeholder="Filter diff (.pdb, .dll)..."
				maxWidth="14rem"
				ariaLabel="Filter diff files"
			/>
			{#if canExport && onExport}
				<Button
					size="sm"
					onclick={onExport}
					title="Export manifest diff as text file"
					aria-label="Export manifest diff as text file"
				>
					{#snippet icon()}
						<DownloadIcon size={13} />
					{/snippet}
					<span>Export diff</span>
				</Button>
			{/if}
		</div>
	</div>
</div>

<style>
	.diff-controls-group {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		gap: 0.375rem;
		flex-wrap: nowrap;
	}

	@media (max-width: 639px) {
		.diff-controls-group {
			flex-flow: column wrap;
			align-items: stretch;
		}
	}

	.diff-select-pair {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		flex: 1;
		min-width: 0;
		flex-wrap: nowrap;
	}

	@media (max-width: 639px) {
		.diff-select-pair {
			width: 100%;
			flex-wrap: wrap;
		}
	}

	:global(.diff-build-select) {
		max-width: 10rem;
		min-width: 6rem;
		flex: 1;
		text-overflow: ellipsis;
		overflow: hidden;
		white-space: nowrap;
	}

	@media (max-width: 639px) {
		:global(.diff-build-select) {
			max-width: 100%;
		}
	}

	.desktop-date-label {
		font-size: var(--steam-fs-sm);
		font-weight: bold;
		color: var(--steam-text);
		white-space: nowrap;
	}

	@media (max-width: 639px) {
		.desktop-date-label {
			display: none;
		}
	}

	.diff-search-wrap {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		flex-shrink: 0;
	}

	@media (max-width: 639px) {
		.diff-search-wrap {
			width: 100%;
		}
	}
</style>
