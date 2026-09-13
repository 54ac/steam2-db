<script lang="ts">
	import {
		CalendarIcon,
		ListIcon,
		TreeStructureIcon,
		DownloadIcon,
		TerminalIcon
	} from "phosphor-svelte";
	import type { DepotBuild, ModalTab, DumpFile } from "../../types";
	import SearchField from "../ui/SearchField.svelte";
	import Button from "../ui/Button.svelte";
	import CopyButton from "../ui/CopyButton.svelte";
	import BuildSelect from "./BuildSelect.svelte";

	interface Props {
		activeTab: ModalTab;
		builds: DepotBuild[];
		selectedBuildIndex: number;
		depotId?: number;
		dumpFiles?: DumpFile[];
		fileFilter?: string;
		fileViewMode?: "list" | "tree";
		canExport?: boolean;
		onBuildSelect: (idx: number) => void;
		onExport?: () => void;
		searchInputRef?: HTMLInputElement | null;
	}

	let {
		activeTab,
		builds,
		selectedBuildIndex,
		depotId,
		dumpFiles = [],
		fileFilter = $bindable(""),
		fileViewMode = $bindable("list"),
		canExport = false,
		onBuildSelect,
		onExport,
		searchInputRef = $bindable(null)
	}: Props = $props();

	let isExtractOpen = $state(false);

	const blobFile = $derived.by(() => {
		if (!dumpFiles || dumpFiles.length === 0) {
			return null;
		}
		return dumpFiles.find((d) => d.name.endsWith(".blob")) || null;
	});

	const blobCrc = $derived.by(() => {
		if (!blobFile) {
			return "";
		}
		if (blobFile.crc) {
			return blobFile.crc;
		}
		const parts = blobFile.name.split("_");
		return parts.length >= 3 ? parts[2] : "";
	});

	const currentCrc = $derived.by(() => {
		return builds[selectedBuildIndex]?.crc32 || blobCrc;
	});

	const extractCommand = $derived.by(() => {
		if (depotId === undefined) {
			return "";
		}
		const v = builds[selectedBuildIndex]?.version ?? 0;
		const crcFlag = currentCrc ? ` --blobcrc ${currentCrc}` : "";
		return `extract.exe ..\\blobs ..\\dats ${depotId} ${v}${crcFlag} --out ..\\out`;
	});

	const handleToggleExtract = () => {
		isExtractOpen = !isExtractOpen;
	};
</script>

<div class="toolbar-container">
	<div class="steam-toolbar" class:compact={activeTab !== "files"}>
		<div class="date-select-group">
			<CalendarIcon size={16} color="var(--steam-accent)" />
			<label class="date-label" for="manifest-build-select">Manifest:</label>
			<BuildSelect
				id="manifest-build-select"
				class="manifest-build-select"
				{builds}
				value={selectedBuildIndex}
				onchange={onBuildSelect}
				ariaLabel="Select manifest timestamp build"
			/>

			{#if activeTab === "files"}
				<div class="view-switch-group">
					<Button
						size="sm"
						active={fileViewMode === "list"}
						onclick={() => (fileViewMode = "list")}
						title="Flat list view"
						aria-label="Flat list view"
					>
						{#snippet icon()}
							<ListIcon size={14} weight="bold" />
						{/snippet}
					</Button>
					<Button
						size="sm"
						active={fileViewMode === "tree"}
						onclick={() => (fileViewMode = "tree")}
						title="Folder tree view"
						aria-label="Folder tree view"
					>
						{#snippet icon()}
							<TreeStructureIcon size={14} weight="bold" />
						{/snippet}
					</Button>
				</div>
			{/if}
		</div>

		<div class="search-and-export-wrap">
			{#if activeTab === "files"}
				<SearchField
					bind:value={fileFilter}
					bind:inputElement={searchInputRef}
					placeholder="Filter files (.pdb, .dll)..."
					maxWidth="20rem"
					ariaLabel="Filter manifest files"
				/>
			{/if}

			{#if activeTab === "files" && canExport && onExport}
				<Button
					size="sm"
					onclick={onExport}
					title="Export full filelist as text file"
					aria-label="Export full filelist as text file"
				>
					{#snippet icon()}
						<DownloadIcon size={13} weight="bold" />
					{/snippet}
					<span>Export</span>
				</Button>
			{/if}

			{#if depotId !== undefined}
				<Button
					size="sm"
					active={isExtractOpen}
					onclick={handleToggleExtract}
					title="Toggle extractor command"
					aria-label="Toggle extractor command"
					class="extract-btn"
				>
					{#snippet icon()}
						<TerminalIcon size={13} weight="bold" />
					{/snippet}
					<span>Extract</span>
				</Button>
			{/if}
		</div>
	</div>

	{#if isExtractOpen && extractCommand}
		<div class="extract-strip">
			<div class="strip-left" title={extractCommand}>
				<TerminalIcon
					size={12}
					color="var(--steam-accent)"
					class="strip-icon"
				/>
				<code class="strip-code">{extractCommand}</code>
			</div>
			<div class="strip-actions">
				<CopyButton
					size="sm"
					text={extractCommand}
					ariaLabel="Copy extraction command"
				/>
				<button
					type="button"
					class="strip-close"
					onclick={() => (isExtractOpen = false)}
					aria-label="Close extractor command bar"
					title="Close"
				>
					✕
				</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.toolbar-container {
		display: flex;
		flex-direction: column;
		flex-shrink: 0;
	}

	.extract-strip {
		background-color: var(--steam-darkest);
		border-bottom: 1px solid var(--steam-border-dark);
		box-shadow: var(--steam-shadow-inset);
		padding: 0.25rem 0.625rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		box-sizing: border-box;
	}

	.strip-left {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		min-width: 0;
		flex: 1;
	}

	.strip-code {
		font-family: var(--steam-font-mono);
		font-size: var(--steam-fs-sm);
		color: var(--steam-text-light);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		user-select: all;
	}

	.strip-actions {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		flex-shrink: 0;
	}

	.strip-close {
		background: transparent;
		border: none;
		color: var(--steam-text-dim);
		cursor: pointer;
		font-size: var(--steam-fs-sm);
		padding: 0.125rem 0.25rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-family: var(--steam-font-sans);
	}

	@media (hover: hover) {
		.strip-close:hover {
			color: white;
		}
	}

	.date-select-group {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		width: 100%;
	}

	@container (width >= 600px) {
		.date-select-group {
			width: auto;
		}
	}

	.date-label {
		font-size: var(--steam-fs-sm);
		font-weight: bold;
		color: var(--steam-text);
		white-space: nowrap;
	}

	.view-switch-group {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		margin-left: 0.25rem;
	}

	.search-and-export-wrap {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		width: 100%;
	}

	@container (width >= 600px) {
		.search-and-export-wrap {
			width: auto;
		}
	}

	:global(.manifest-build-select) {
		max-width: 16rem;
		text-overflow: ellipsis;
	}

	@container (width < 600px) {
		:global(.manifest-build-select) {
			flex: 1;
			min-width: 0;
		}
	}

	.steam-toolbar.compact {
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
	}

	.steam-toolbar.compact .date-select-group {
		width: auto;
	}

	@container (width < 600px) {
		.steam-toolbar.compact .date-select-group {
			flex: 1;
			min-width: 0;
		}
	}

	.steam-toolbar.compact .search-and-export-wrap {
		width: auto;
		flex-shrink: 0;
	}

	@container (width < 640px) {
		:global(.extract-btn),
		.extract-strip {
			display: none !important;
		}
	}

	@media (hover: none) and (pointer: coarse) {
		:global(.extract-btn),
		.extract-strip {
			display: none !important;
		}
	}
</style>
