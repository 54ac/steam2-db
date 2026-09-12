<!--
  Depot Properties modal dialog
  - Backed by bits-ui Dialog primitive with backdrop blur and escape key dismissal
  - Synchronizes selected build version and depot ID with browser URL params
  - Coordinates three sub-tabs: Files (filelist / tree), Diff (delta between builds), and Checksums (dump files)
  - Manages lazy loaders for manifest data and diff comparisons, plus text file exports
-->
<script lang="ts">
	import { tick } from "svelte";
	import { Dialog } from "bits-ui";
	import { InfoIcon, ArrowClockwiseIcon } from "phosphor-svelte";
	import type { DepotItem, ModalTab, DiffFilterMode } from "../../types";
	import { getCatalogStore } from "../../state/catalog.svelte";
	import { createManifestLoader } from "../../state/manifest.svelte";
	import { createManifestDiffLoader } from "../../state/manifestDiff.svelte";
	import { exportManifestAsTxt } from "../../utils/manifestService";
	import { exportDiffAsTxt } from "../../utils/diffEngine";
	import { getDepotDisplayName } from "../../utils/formatters";
	import ModalHeader from "./ModalHeader.svelte";
	import ModalSubTabs from "./ModalSubTabs.svelte";
	import ManifestToolbar from "./ManifestToolbar.svelte";
	import DiffToolbar from "./DiffToolbar.svelte";
	import FilesTab from "./FilesTab.svelte";
	import DiffTab from "./DiffTab.svelte";
	import ChecksumsTab from "./ChecksumsTab.svelte";
	import Button from "../ui/Button.svelte";

	interface Props {
		depot: DepotItem;
	}

	let { depot }: Props = $props();

	const store = getCatalogStore();

	let modalTab = $state<ModalTab>("files");
	let fileFilter = $state("");
	let fileViewMode = $state<"list" | "tree">("list");
	let diffFilter = $state("");
	let diffBaseIndex = $state(0);
	let diffTargetIndex = $state(0);
	let diffFilterMode = $state<DiffFilterMode>("changed");
	let currentDepotId = $state<number | null>(null);

	$effect(() => {
		if (currentDepotId !== depot.id) {
			currentDepotId = depot.id;
			diffBaseIndex = 0;
			diffTargetIndex = (depot.builds || []).length > 1 ? 1 : 0;
		}
	});

	let hasVisitedDiff = $state(false);
	let hasVisitedHashes = $state(false);

	let fileSearchInputRef = $state<HTMLInputElement | null>(null);
	let diffSearchInputRef = $state<HTMLInputElement | null>(null);

	const builds = $derived(depot.builds || []);
	const hasBuilds = $derived(builds.length > 0);
	const selectedBuildIndex = $derived(store.selectedBuildIndex);

	// Focus input on tab change for desktop users
	$effect(() => {
		const isDesktop =
			window.matchMedia("(min-width: 640px)").matches &&
			window.matchMedia("(pointer: fine)").matches;

		if (!isDesktop) {
			return;
		}

		if (modalTab === "files") {
			tick().then(() => fileSearchInputRef?.focus());
		} else if (modalTab === "diff") {
			tick().then(() => diffSearchInputRef?.focus());
		}
	});

	const manifestLoader = createManifestLoader(
		() => depot,
		() => selectedBuildIndex
	);

	const diffLoader = createManifestDiffLoader(
		() => depot,
		() => diffBaseIndex,
		() => diffTargetIndex,
		() => hasVisitedDiff
	);

	const handleBuildSelect = (idx: number) => {
		store.selectBuild(idx);
	};

	// Select base build (A); if same as target (B), auto-advance target to avoid comparing build to itself
	const handleDiffBaseSelect = (newBase: number) => {
		diffBaseIndex = newBase;
		if (newBase === diffTargetIndex) {
			const nextTarget = builds.findIndex((_, idx) => idx !== newBase);
			if (nextTarget >= 0) {
				diffTargetIndex = nextTarget;
			}
		}
	};

	// Select compare build (B); if same as base (A), auto-reassign base
	const handleDiffTargetSelect = (newTarget: number) => {
		diffTargetIndex = newTarget;
		if (newTarget === diffBaseIndex) {
			const nextBase = builds.findIndex((_, idx) => idx !== newTarget);
			if (nextBase >= 0) {
				diffBaseIndex = nextBase;
			}
		}
	};

	// Invert base and compare builds
	const handleSwapDiffBuilds = () => {
		const temp = diffBaseIndex;
		diffBaseIndex = diffTargetIndex;
		diffTargetIndex = temp;
	};

	// Exports either single manifest filelist or computed diff summary to .txt download
	const handleExport = () => {
		if (modalTab === "diff") {
			if (diffLoader.diffSummary) {
				exportDiffAsTxt(
					depot,
					diffBaseIndex,
					diffTargetIndex,
					diffLoader.diffSummary
				);
			}
		} else if (manifestLoader.manifestData) {
			exportManifestAsTxt(
				depot,
				manifestLoader.manifestData,
				selectedBuildIndex
			);
		}
	};

	// Switch to diff tab: initialize base to currently viewed build and target to adjacent version
	const handleSelectDiff = () => {
		hasVisitedDiff = true;
		if (builds.length >= 2) {
			if (selectedBuildIndex < builds.length - 1) {
				diffBaseIndex = selectedBuildIndex;
				diffTargetIndex = selectedBuildIndex + 1;
			} else {
				diffBaseIndex = selectedBuildIndex - 1;
				diffTargetIndex = selectedBuildIndex;
			}
		}
		modalTab = "diff";
	};

	const { primaryTitle } = $derived(getDepotDisplayName(depot));
	const canShowDiff = $derived(hasVisitedDiff && builds.length >= 2);
</script>

<Dialog.Root open={true} onOpenChange={(open) => !open && store.closeDepot()}>
	<Dialog.Portal>
		<Dialog.Overlay class="modal-overlay" />
		<Dialog.Content
			class="modal-content"
			preventScroll={false}
			aria-label={`Depot Properties: ${primaryTitle}`}
			aria-describedby={`depot-modal-content-${depot.id}`}
		>
			<div class="modal-titlebar">
				<div class="title-group">
					<InfoIcon size={16} color="var(--steam-accent)" />
					<Dialog.Title class="title-text">DEPOT PROPERTIES</Dialog.Title>
				</div>
				<Dialog.Close class="modal-close-btn" aria-label="Close dialog">
					✕
				</Dialog.Close>
			</div>

			<ModalHeader {depot} />

			<ModalSubTabs
				activeTab={modalTab}
				fileCount={manifestLoader.manifestData?.files?.length}
				hasMultipleBuilds={builds.length >= 2}
				onSelectFiles={() => (modalTab = "files")}
				onSelectDiff={handleSelectDiff}
				onSelectHashes={() => {
					hasVisitedHashes = true;
					modalTab = "hashes";
				}}
			/>

			<div class="modal-body" id={`depot-modal-content-${depot.id}`}>
				{#if modalTab === "diff"}
					<DiffToolbar
						{builds}
						{diffBaseIndex}
						{diffTargetIndex}
						bind:diffFilter
						bind:diffSearchInputRef
						canExport={Boolean(diffLoader.diffSummary)}
						onDiffBaseSelect={handleDiffBaseSelect}
						onDiffTargetSelect={handleDiffTargetSelect}
						onSwapDiffBuilds={handleSwapDiffBuilds}
						onExport={handleExport}
					/>
				{:else}
					<ManifestToolbar
						activeTab={modalTab}
						{builds}
						{selectedBuildIndex}
						depotId={depot.id}
						dumpFiles={manifestLoader.manifestData?.dumpFiles || []}
						bind:fileFilter
						bind:fileViewMode
						bind:searchInputRef={fileSearchInputRef}
						canExport={Boolean(manifestLoader.manifestData?.files?.length)}
						onBuildSelect={handleBuildSelect}
						onExport={handleExport}
					/>
				{/if}

				{#if !hasBuilds}
					<div class="state-box steam-sunken">
						<InfoIcon size={24} color="var(--steam-accent)" />
						<span class="state-text-light">No manifest available</span>
					</div>
				{:else}
					<!-- Files -->
					<div class="tab-container" class:hidden={modalTab !== "files"}>
						{#if manifestLoader.loading}
							<div class="state-box steam-sunken">
								<span class="spinner-icon"
									><ArrowClockwiseIcon size={20} /></span
								>
								<span class="state-text">Loading files...</span>
							</div>
						{:else if manifestLoader.error}
							<div class="state-box steam-sunken">
								<span class="state-text-light">Failed to load manifest</span>
								<span class="state-error-detail">{manifestLoader.error}</span>
								<Button size="sm" onclick={manifestLoader.retry}>
									{#snippet icon()}
										<ArrowClockwiseIcon size={12} />
									{/snippet}
									<span>Retry</span>
								</Button>
							</div>
						{:else if manifestLoader.manifestData}
							<FilesTab
								files={manifestLoader.manifestData.files}
								filterQuery={fileFilter}
								viewMode={fileViewMode}
							/>
						{:else}
							<div class="state-box steam-sunken">
								<span class="state-text"
									>No manifest file available for this depot build.</span
								>
							</div>
						{/if}
					</div>

					<!-- Diff -->
					{#if canShowDiff}
						<div class="tab-container" class:hidden={modalTab !== "diff"}>
							{#if diffLoader.loading}
								<div class="state-box steam-sunken">
									<span class="spinner-icon"
										><ArrowClockwiseIcon size={20} /></span
									>
									<span class="state-text"
										>Calculating manifest differences...</span
									>
								</div>
							{:else if diffLoader.error}
								<div class="state-box steam-sunken">
									<span class="state-text-light">Failed to load diff</span>
									<span class="state-error-detail">{diffLoader.error}</span>
									<Button size="sm" onclick={diffLoader.retry}>
										{#snippet icon()}
											<ArrowClockwiseIcon size={12} />
										{/snippet}
										<span>Retry</span>
									</Button>
								</div>
							{:else if diffLoader.diffSummary}
								<DiffTab
									summary={diffLoader.diffSummary}
									filterQuery={diffFilter}
									bind:filterMode={diffFilterMode}
								/>
							{:else}
								<div class="state-box">
									<span class="state-text"
										>Unable to compute diff for selected builds.</span
									>
								</div>
							{/if}
						</div>
					{/if}

					<!-- Checksums -->
					{#if hasVisitedHashes}
						<div class="tab-container" class:hidden={modalTab !== "hashes"}>
							<ChecksumsTab
								dumpFiles={manifestLoader.manifestData?.dumpFiles || []}
								depotId={depot.id}
							/>
						</div>
					{/if}
				{/if}
			</div>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>

<style>
	:global(.modal-content) {
		width: calc(100% - 1rem);
		max-width: 56rem;
		height: min(41.25rem, calc(100dvh - 1rem));
	}

	@media (min-width: 640px) {
		:global(.modal-content) {
			width: calc(100% - 2rem);
			height: min(41.25rem, 90vh);
		}
	}

	.modal-body {
		gap: 0.5rem;
	}

	.tab-container {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-height: 0;
	}

	.tab-container.hidden {
		display: none;
	}

	.state-box {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		color: var(--steam-text);
		padding: 2rem;
		text-align: center;
		box-sizing: border-box;
	}

	.state-text {
		color: var(--steam-text);
		font-size: var(--steam-fs-base);
	}

	.state-text-light {
		color: var(--steam-text-light);
		font-size: var(--steam-fs-md);
		font-weight: bold;
	}

	.state-error-detail {
		color: var(--steam-text-dim);
		font-size: var(--steam-fs-sm);
		max-width: min(45ch, 100%);
	}
</style>
