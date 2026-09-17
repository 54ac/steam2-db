<script lang="ts">
	import {
		FileIcon,
		FolderIcon,
		FolderOpenIcon,
		CaretRightIcon,
		CaretDownIcon,
		ArrowUpIcon,
		ArrowDownIcon
	} from "phosphor-svelte";
	import type { ManifestFile } from "../../types";
	import { SvelteSet } from "svelte/reactivity";
	import { formatBytes, cleanFilename } from "../../utils/formatters";
	import { createFixedVirtualizer } from "../../state/virtualizer.svelte";
	import EmptyState from "../ui/EmptyState.svelte";

	type SortField = "path" | "size";
	type SortOrder = "asc" | "desc";
	type FileViewMode = "list" | "tree";

	interface TreeNode {
		name: string;
		path: string;
		size: number;
		isFile: boolean;
		children?: Map<string, TreeNode>;
	}

	interface FlattenedTreeItem {
		node: TreeNode;
		depth: number;
		isExpanded: boolean;
	}

	interface Props {
		files: ManifestFile[];
		filterQuery?: string;
		viewMode?: FileViewMode;
	}

	let { files, filterQuery = "", viewMode = "list" }: Props = $props();

	let sortField = $state<SortField>("path");
	let sortOrder = $state<SortOrder>("asc");
	let expandedDirs = new SvelteSet<string>([""]);
	let scrollParent = $state<HTMLDivElement | null>(null);

	const handleToggleSort = (field: SortField) => {
		if (sortField === field) {
			sortOrder = sortOrder === "asc" ? "desc" : "asc";
		} else {
			sortField = field;
			sortOrder = "asc";
		}
	};

	const filteredFiles = $derived.by(() => {
		const q = filterQuery.trim().toLowerCase();
		if (!q) {
			return files;
		}
		return files.filter((f) => f.p.toLowerCase().includes(q));
	});

	const sortedFiles = $derived.by(() => {
		const list = [...filteredFiles];
		list.sort((a, b) => {
			if (sortField === "size") {
				const diff = a.s - b.s;
				return sortOrder === "asc" ? diff : -diff;
			}
			const diff = a.p.localeCompare(b.p);
			return sortOrder === "asc" ? diff : -diff;
		});
		return list;
	});

	// Build folder hierarchy tree
	const insertFileIntoTree = (root: TreeNode, file: ManifestFile) => {
		const parts = file.p.split("/");
		let current = root;
		let currentPath = "";

		for (let i = 0; i < parts.length; i++) {
			const part = parts[i];
			currentPath = currentPath ? `${currentPath}/${part}` : part;
			const isFile = i === parts.length - 1;

			if (!current.children) {
				current.children = new Map();
			}

			if (!current.children.has(part)) {
				const newNode: TreeNode = {
					name: part,
					path: currentPath,
					size: isFile ? file.s : 0,
					isFile,
					children: isFile ? undefined : new Map()
				};
				current.children.set(part, newNode);
			}

			const nextNode = current.children.get(part)!;
			if (isFile) {
				nextNode.size = file.s;
			}
			current = nextNode;
		}
	};

	const computeDirSize = (node: TreeNode): number => {
		if (node.isFile) {
			return node.size;
		}
		let total = 0;
		if (node.children) {
			for (const child of node.children.values()) {
				total += computeDirSize(child);
			}
		}
		node.size = total;
		return total;
	};

	const treeRoot = $derived.by(() => {
		const root: TreeNode = {
			name: "",
			path: "",
			size: 0,
			isFile: false,
			children: new Map()
		};
		for (let i = 0; i < filteredFiles.length; i++) {
			insertFileIntoTree(root, filteredFiles[i]);
		}
		computeDirSize(root);
		return root;
	});

	// Auto-expand all folders when user enters a filter query
	$effect(() => {
		if (filterQuery.trim()) {
			const allPaths = new SvelteSet<string>();
			const collect = (node: TreeNode) => {
				if (!node.isFile && node.path) {
					allPaths.add(node.path);
				}
				if (node.children) {
					for (const child of node.children.values()) {
						collect(child);
					}
				}
			};
			collect(treeRoot);
			expandedDirs = allPaths;
		}
	});

	const toggleDirExpand = (path: string) => {
		if (expandedDirs.has(path)) {
			expandedDirs.delete(path);
		} else {
			expandedDirs.add(path);
		}
	};

	const flattenedTree = $derived.by<FlattenedTreeItem[]>(() => {
		if (viewMode !== "tree") {
			return [];
		}
		const result: FlattenedTreeItem[] = [];

		const traverse = (node: TreeNode, depth: number) => {
			if (node.path) {
				const isExpanded = expandedDirs.has(node.path);
				result.push({ node, depth, isExpanded });
				if (!node.isFile && !isExpanded) {
					return;
				}
			}

			if (node.children) {
				const entries = Array.from(node.children.values());
				entries.sort((a, b) => {
					if (a.isFile !== b.isFile) {
						return a.isFile ? 1 : -1;
					}
					if (sortField === "size") {
						const diff = a.size - b.size;
						return sortOrder === "asc" ? diff : -diff;
					}
					const diff = a.name.localeCompare(b.name);
					return sortOrder === "asc" ? diff : -diff;
				});

				for (let i = 0; i < entries.length; i++) {
					traverse(entries[i], node.path ? depth + 1 : 0);
				}
			}
		};

		traverse(treeRoot, 0);
		return result;
	});

	const activeItemCount = $derived(
		viewMode === "tree" ? flattenedTree.length : sortedFiles.length
	);

	const virtualizer = createFixedVirtualizer({
		count: () => activeItemCount,
		itemHeight: 28,
		overscan: 20,
		getScrollElement: () => scrollParent
	});

	const isEmpty = $derived(filteredFiles.length === 0);

	$effect(() => {
		if (files || viewMode) {
			virtualizer.scrollToTop();
		}
	});
</script>

<div class="modal-tab-root steam-sunken">
	{#if isEmpty}
		{#if filterQuery.trim()}
			<EmptyState title={`No files match filter "${filterQuery}"`}>
				{#snippet icon()}
					<FileIcon size={32} />
				{/snippet}
			</EmptyState>
		{:else}
			<EmptyState title="No files recorded in this manifest build">
				{#snippet icon()}
					<FileIcon size={32} />
				{/snippet}
			</EmptyState>
		{/if}
	{:else}
		<div class="table-header">
			<button
				type="button"
				class="header-path-th"
				onclick={() => handleToggleSort("path")}
			>
				<div class="th-inner">
					<span class="header-label">Path</span>
					<span class="count-label">
						({filteredFiles.length.toLocaleString()} files)
					</span>
					{#if sortField === "path"}
						<span class="sort-icon-wrap">
							{#if sortOrder === "asc"}
								<ArrowUpIcon size={12} />
							{:else}
								<ArrowDownIcon size={12} />
							{/if}
						</span>
					{/if}
				</div>
			</button>

			<button
				type="button"
				class="header-size-th"
				onclick={() => handleToggleSort("size")}
			>
				<div class="th-inner align-right">
					{#if sortField === "size"}
						<span class="sort-icon-wrap">
							{#if sortOrder === "asc"}
								<ArrowUpIcon size={12} />
							{:else}
								<ArrowDownIcon size={12} />
							{/if}
						</span>
					{/if}
					<span>Size</span>
				</div>
			</button>
		</div>

		<div class="virtual-scroll-area" bind:this={scrollParent}>
			<div class="virtual-inner" style:height="{virtualizer.totalSize / 16}rem">
				{#each virtualizer.virtualItems as virtualRow (virtualRow.index)}
					{#if viewMode === "tree"}
						{@const item = flattenedTree[virtualRow.index]}
						{#if item}
							{@const node = item.node}
							{@const isClickable = !node.isFile}
							<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
							<div
								class="file-row"
								class:even={virtualRow.index % 2 === 0}
								class:clickable={isClickable}
								style:top="{virtualRow.start / 16}rem"
								style:height="{virtualRow.size / 16}rem"
								onclick={() => isClickable && toggleDirExpand(node.path)}
							>
								<div
									class="file-path-group"
									style:padding-left="{item.depth * 1.125}rem"
								>
									{#if !node.isFile}
										<button
											type="button"
											class="folder-toggle-btn"
											onclick={(e) => {
												e.stopPropagation();
												toggleDirExpand(node.path);
											}}
											aria-label={item.isExpanded
												? "Collapse folder"
												: "Expand folder"}
										>
											{#if item.isExpanded}
												<CaretDownIcon size={13} weight="bold" />
												<FolderOpenIcon
													size={14}
													weight="bold"
													color="var(--steam-accent)"
												/>
											{:else}
												<CaretRightIcon size={13} weight="bold" />
												<FolderIcon
													size={14}
													weight="bold"
													color="var(--steam-accent)"
												/>
											{/if}
										</button>
									{:else}
										<span class="file-icon-indent">
											<FileIcon
												size={14}
												weight="bold"
												color="var(--steam-accent)"
											/>
										</span>
									{/if}
									<span
										class="file-name"
										class:is-folder={!node.isFile}
										title={cleanFilename(node.path)}
									>
										{cleanFilename(node.name)}
									</span>
								</div>
								<span class="file-size">{formatBytes(node.size)}</span>
							</div>
						{/if}
					{:else}
						{@const file = sortedFiles[virtualRow.index]}
						{#if file}
							<div
								class="file-row"
								class:even={virtualRow.index % 2 === 0}
								style:top="{virtualRow.start / 16}rem"
								style:height="{virtualRow.size / 16}rem"
							>
								<div class="file-path-group">
									<FileIcon
										size={14}
										weight="bold"
										color="var(--steam-accent)"
									/>
									<span class="file-name" title={cleanFilename(file.p)}
										>{cleanFilename(file.p)}</span
									>
								</div>
								<span class="file-size">{formatBytes(file.s)}</span>
							</div>
						{/if}
					{/if}
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.table-header {
		background-color: var(--steam-panel);
		border-bottom: 1px solid var(--steam-border-dark);
		min-height: 1.75rem;
		display: flex;
		align-items: stretch;
		font-size: var(--steam-fs-xs);
		font-weight: bold;
		color: var(--steam-text-light);
		flex-shrink: 0;
		box-sizing: border-box;
		user-select: none;
	}

	.header-path-th {
		flex: 1;
		min-width: 0;
		padding: 0.25rem 0.5rem;
		cursor: pointer;
		border: none;
		background: transparent;
		border-right: 1px solid var(--steam-border-dark);
		color: inherit;
		font: inherit;
		text-align: left;
		display: flex;
		align-items: center;
		box-sizing: border-box;
	}

	@media (hover: hover) {
		.header-path-th:hover,
		.header-size-th:hover {
			background-color: var(--steam-panel-hover);
			color: white;
		}
	}

	.header-size-th {
		width: 6rem;
		padding: 0.25rem 0.5rem;
		cursor: pointer;
		border: none;
		background: transparent;
		color: inherit;
		font: inherit;
		text-align: right;
		display: flex;
		align-items: center;
		justify-content: flex-end;
		box-sizing: border-box;
	}

	@container (width >= 600px) {
		.table-header {
			font-size: var(--steam-fs-sm);
		}

		.header-path-th,
		.header-size-th {
			padding: 0.375rem 0.5rem;
		}
	}

	.th-inner {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		width: 100%;
	}

	.th-inner.align-right {
		justify-content: flex-end;
	}

	.header-label {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.sort-icon-wrap {
		color: var(--steam-accent);
		display: inline-flex;
		align-items: center;
	}

	.file-row {
		position: absolute;
		left: 0;
		width: 100%;
		padding: 0 0.5rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		color: var(--steam-text);
		background-color: var(--steam-darkpanel-alt);
		border-bottom: 1px solid var(--steam-border-subtle);
		box-sizing: border-box;
		cursor: default;
		user-select: none;
	}

	.file-row.even {
		background-color: var(--steam-darkpanel);
	}

	.file-row.clickable {
		cursor: pointer;
	}

	@media (hover: hover) {
		.file-row:hover {
			background-color: var(--steam-hover-bg);
			color: white;
		}
	}

	.file-path-group {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		overflow: hidden;
		min-width: 0;
		flex: 1;
	}

	.folder-toggle-btn {
		background: transparent;
		border: none;
		padding: 0;
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		color: var(--steam-text);
		cursor: pointer;
		user-select: none;
	}

	@media (hover: hover) {
		.folder-toggle-btn:hover {
			color: white;
		}
	}

	.file-icon-indent {
		margin-left: 1.125rem;
		display: inline-flex;
		align-items: center;
		user-select: none;
	}

	.file-name {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		color: white;
		min-width: 0;
		user-select: text;
	}

	.file-name.is-folder {
		color: var(--steam-text-light);
		font-weight: 600;
	}

	.file-size {
		color: var(--steam-text-light);
		flex-shrink: 0;
		font-family: var(--steam-font-sans);
		width: 5.5rem;
		text-align: right;
		user-select: none;
	}
</style>
