<script lang="ts">
	import { FileIcon, GitDiffIcon, ShieldCheckIcon } from "phosphor-svelte";
	import type { ModalTab } from "../../types";

	interface Props {
		activeTab: ModalTab;
		fileCount?: number;
		hasMultipleBuilds?: boolean;
		onSelectFiles: () => void;
		onSelectDiff: () => void;
		onSelectHashes: () => void;
	}

	let {
		activeTab,
		fileCount,
		hasMultipleBuilds = false,
		onSelectFiles,
		onSelectDiff,
		onSelectHashes
	}: Props = $props();

	const tabs = $derived([
		{
			id: "files" as const,
			label: "FILES",
			icon: FileIcon,
			count: fileCount,
			onclick: onSelectFiles,
			visible: true
		},
		{
			id: "diff" as const,
			label: "DIFF",
			icon: GitDiffIcon,
			count: undefined,
			onclick: onSelectDiff,
			visible: hasMultipleBuilds
		},
		{
			id: "hashes" as const,
			label: "CHECKSUMS",
			icon: ShieldCheckIcon,
			count: undefined,
			onclick: onSelectHashes,
			visible: true
		}
	]);
</script>

<div class="tabs-list" role="tablist" aria-label="Manifest sections">
	{#each tabs as tab (tab.id)}
		{#if tab.visible}
			<button
				type="button"
				role="tab"
				class="steam-tab"
				class:active={activeTab === tab.id}
				aria-selected={activeTab === tab.id}
				onclick={tab.onclick}
			>
				<tab.icon size={14} weight="bold" color="var(--steam-accent)" />
				<span>{tab.label}</span>
				{#if tab.count !== undefined}
					<span class="count-label">({tab.count.toLocaleString()})</span>
				{/if}
			</button>
		{/if}
	{/each}
</div>

<style>
	.tabs-list {
		background-color: var(--steam-panel);
		padding: 0.375rem 0.75rem 0;
		border-bottom: 1px solid var(--steam-border-dark);
		display: flex;
		align-items: center;
		gap: 0.25rem;
		font-size: var(--steam-fs-sm);
		font-weight: bold;
		flex-shrink: 0;
		margin: 0;
		box-sizing: border-box;
		width: 100%;
	}
</style>
