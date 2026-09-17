import { getContext, setContext } from "svelte";
import { SvelteMap, SvelteURL, SvelteURLSearchParams } from "svelte/reactivity";
import type {
	DepotItem,
	AppGroup,
	AppRecord,
	AppSummary,
	DepotFileMatchRow,
	MatchedFileItem,
	ViewMode,
	DepotFilter,
	AppFilter,
	SortField,
	SortOrder,
	CatalogStats,
	AppStats
} from "../types";
import {
	calculateCatalogStats,
	buildAppCatalog,
	calculateAppStats,
	filterAndSortDepots,
	filterAndSortApps,
	sortFileMatchRows
} from "../utils/searchFilter";
import { getDepotPageTitle } from "../utils/formatters";
import { PAGE_SIZE } from "../constants";
import { createFileSearch } from "./fileSearch.svelte";

export const CATALOG_KEY = Symbol("steam2_catalog");

/**
 * Store for catalog navigation, search, filtering, modal opening
 */
export class CatalogStore {
	catalog = $state.raw<DepotItem[]>([]);
	loading = $state(true);

	selectedDepot = $state.raw<DepotItem | null>(null);
	selectedBuildIndex = $state(0);

	viewMode = $state<ViewMode>("depot");
	catalogSearchQuery = $state("");
	fileSearchQuery = $state("");
	depotFilter = $state<DepotFilter>("all");
	appFilter = $state<AppFilter>("all");
	sortConfig = $state<Record<ViewMode, { by: SortField; order: SortOrder }>>({
		depot: { by: "id", order: "asc" },
		app: { by: "id", order: "asc" },
		file: { by: "id", order: "asc" }
	});

	/** Active sort field for the current catalog view mode. */
	get sortBy(): SortField {
		return this.sortConfig[this.viewMode].by;
	}

	set sortBy(field: SortField) {
		this.sortConfig[this.viewMode].by = field;
	}

	/** Active sort direction ('asc' or 'desc') for the current catalog view mode. */
	get sortOrder(): SortOrder {
		return this.sortConfig[this.viewMode].order;
	}

	set sortOrder(order: SortOrder) {
		this.sortConfig[this.viewMode].order = order;
	}

	currentPage = $state(1);

	/** Switches catalog view mode and resets page to 1. */
	setViewMode(mode: ViewMode): void {
		this.viewMode = mode;
		this.currentPage = 1;
	}

	// In-memory O(1) lookup table populated when catalog.json is fetched
	private catalogById = new SvelteMap<number, DepotItem>();

	// Canonical app records from apps.json (null = not yet loaded / unavailable)
	private appsData = $state.raw<AppRecord[] | null>(null);

	// Off-thread trigram search worker runner for fast filename querying
	private fileSearch = createFileSearch(
		() => this.fileSearchQuery,
		() => this.viewMode === "file"
	);

	constructor() {
		if (typeof window === "undefined") {
			return;
		}

		// Synchronize browser document title with selected depot and manifest version
		$effect(() => {
			document.title = this.selectedDepot
				? getDepotPageTitle(this.selectedDepot, this.selectedBuildIndex)
				: "Steam2 Browser";
		});

		// Browser history popstate handler
		$effect(() => {
			const handlePopState = (e: PopStateEvent) => {
				this.restoreModalFromUrl(e.state);
			};

			window.addEventListener("popstate", handlePopState);

			return () => {
				window.removeEventListener("popstate", handlePopState);
			};
		});
	}

	stats = $derived<CatalogStats>(calculateCatalogStats(this.catalog));
	appCatalog = $derived<AppGroup[]>(
		buildAppCatalog(this.appsData, this.catalogById)
	);
	appStats = $derived<AppStats>(calculateAppStats(this.appCatalog));

	get searchQuery(): string {
		return this.viewMode === "file"
			? this.fileSearchQuery
			: this.catalogSearchQuery;
	}

	set searchQuery(val: string) {
		this.currentPage = 1;
		if (this.viewMode === "file") {
			this.fileSearchQuery = val;
		} else {
			this.catalogSearchQuery = val;
		}
	}

	get isFileSearching(): boolean {
		return this.fileSearch.isSearching;
	}

	get fileSearchError(): string | null {
		return this.fileSearch.searchError;
	}

	depotMatchMap = $derived.by<Map<number, MatchedFileItem[]>>(() => {
		const results = this.fileSearch.results;
		if (!results || results.length === 0) {
			return new SvelteMap();
		}

		const map = new SvelteMap<number, MatchedFileItem[]>();
		for (let i = 0; i < results.length; i++) {
			const match = results[i];
			for (let j = 0; j < match.depots.length; j++) {
				const depot = match.depots[j];
				let fileList = map.get(depot.depotId);
				if (!fileList) {
					fileList = [];
					map.set(depot.depotId, fileList);
				}
				fileList.push({
					filename: match.filename,
					fileId: match.fileId,
					builds: depot.builds
				});
			}
		}
		return map;
	});

	fileMatchRows = $derived.by<DepotFileMatchRow[]>(() => {
		const rows: DepotFileMatchRow[] = [];
		for (const [depotId, files] of this.depotMatchMap.entries()) {
			rows.push({
				depotId,
				depot: this.catalogById.get(depotId),
				files
			});
		}
		return rows;
	});

	filteredItems = $derived.by<(DepotItem | AppGroup | DepotFileMatchRow)[]>(
		() => {
			if (this.viewMode === "file") {
				return sortFileMatchRows(
					this.fileMatchRows,
					this.sortBy,
					this.sortOrder
				);
			}
			if (this.viewMode === "app") {
				return filterAndSortApps(
					this.appCatalog,
					this.searchQuery,
					this.appFilter,
					this.sortBy,
					this.sortOrder
				);
			}
			return filterAndSortDepots(
				this.catalog,
				this.searchQuery,
				this.depotFilter,
				this.sortBy,
				this.sortOrder
			);
		}
	);

	totalPages = $derived(Math.ceil(this.filteredItems.length / PAGE_SIZE) || 1);

	paginatedItems = $derived.by<(DepotItem | AppGroup | DepotFileMatchRow)[]>(
		() => {
			const safePage = Math.min(this.currentPage, this.totalPages);
			const start = (safePage - 1) * PAGE_SIZE;
			return this.filteredItems.slice(start, start + PAGE_SIZE);
		}
	);

	private restoreModalFromUrl(state?: {
		depotId?: number;
		buildIdx?: number;
	}): void {
		if (typeof window === "undefined") {
			return;
		}

		const searchParams = new SvelteURLSearchParams(window.location.search);
		const targetId = state?.depotId
			? String(state.depotId)
			: searchParams.get("depot");

		if (!targetId || this.catalog.length === 0) {
			this.selectedDepot = null;
			return;
		}

		const target = this.catalogById.get(Number(targetId));
		if (!target) {
			this.selectedDepot = null;
			return;
		}

		const targetDate = searchParams.get("date") || searchParams.get("build");
		const foundIdx =
			targetDate && target.builds
				? target.builds.findIndex((b) => b.date === targetDate)
				: -1;
		this.selectedDepot = target;
		this.selectedBuildIndex = foundIdx >= 0 ? foundIdx : (state?.buildIdx ?? 0);
	}

	/**
	 * Fetches catalog.json and apps.json in parallel, indexes depots by ID, annotates mountedApps on each depot, and restores any deep-linked modal.
	 */
	async load(): Promise<void> {
		this.loading = true;
		try {
			const [catalogRes, appsRes] = await Promise.all([
				fetch("/catalog.json"),
				fetch("/apps.json")
			]);

			if (!catalogRes.ok) {
				throw new Error(`HTTP ${catalogRes.status}`);
			}
			if (!appsRes.ok) {
				throw new Error(`HTTP ${appsRes.status}`);
			}

			const [data, apps] = (await Promise.all([
				catalogRes.json(),
				appsRes.json()
			])) as [DepotItem[], AppRecord[]];

			this.catalog = data;
			this.appsData = apps;

			this.catalogById.clear();
			for (let i = 0; i < data.length; i++) {
				this.catalogById.set(data[i].id, data[i]);
			}

			this.annotateMountedApps(apps, data);
			this.restoreModalFromUrl();
		} catch (err) {
			console.error("Failed to load master catalog:", err);
		} finally {
			this.loading = false;
		}
	}

	private annotateMountedApps(apps: AppRecord[], depots: DepotItem[]): void {
		const depotToApps = new SvelteMap<number, AppSummary[]>();
		for (const app of apps) {
			const summary: AppSummary = { appId: app.appId, name: app.name };
			for (const depotId of app.depots) {
				let list = depotToApps.get(depotId);
				if (!list) {
					list = [];
					depotToApps.set(depotId, list);
				}
				list.push(summary);
			}
		}

		for (const depot of depots) {
			const mounted = depotToApps.get(depot.id);
			if (mounted) {
				depot.mountedApps = mounted;
			}
		}
	}

	/**
	 * Cycles or activates sort for a column field.
	 *
	 * @param field - Selected table column sort field.
	 */
	toggleSort(field: SortField): void {
		if (this.sortBy === field) {
			this.toggleSortOrder();
		} else {
			this.currentPage = 1;
			this.sortBy = field;
			this.sortOrder = "asc";
		}
	}

	/**
	 * Inverts the active sort direction ('asc' <-> 'desc') and resets to page 1.
	 */
	toggleSortOrder(): void {
		this.currentPage = 1;
		this.sortOrder = this.sortOrder === "asc" ? "desc" : "asc";
	}

	/** Synchronizes active depot and build index into browser URL query parameters. */
	private syncModalUrl(replace = false): void {
		if (typeof window === "undefined" || !this.selectedDepot) {
			return;
		}

		const url = new SvelteURL(window.location.href);
		url.searchParams.set("depot", String(this.selectedDepot.id));
		const bDate = this.selectedDepot.builds?.[this.selectedBuildIndex]?.date;
		if (bDate) {
			url.searchParams.set("date", bDate);
		} else {
			url.searchParams.delete("date");
		}

		const state = {
			modalOpen: true,
			depotId: this.selectedDepot.id,
			buildIdx: this.selectedBuildIndex
		};

		if (replace) {
			window.history.replaceState(state, "", url.pathname + url.search);
		} else {
			window.history.pushState(state, "", url.pathname + url.search);
		}
	}

	/**
	 * Opens the depot properties modal and pushes state to browser history.
	 *
	 * @param depot - Target depot item.
	 * @param buildIndex - Build version index to display initially (default 0).
	 */
	openDepot(depot: DepotItem, buildIndex = 0): void {
		this.selectedDepot = depot;
		this.selectedBuildIndex = buildIndex;
		this.syncModalUrl(false);
	}

	/**
	 * Resolves depot by numerical ID and opens modal at specified version or index.
	 *
	 * @param depotId - Numerical Steam depot ID.
	 * @param buildVersionOrIndex - Specific version number or build array index.
	 */
	openDepotById(depotId: number, buildVersionOrIndex = 0): void {
		const target = this.catalogById.get(depotId);
		if (!target) {
			return;
		}

		const builds = target.builds || [];
		const byVer = builds.findIndex((b) => b.version === buildVersionOrIndex);
		const fallbackIdx = builds[buildVersionOrIndex] ? buildVersionOrIndex : 0;
		this.openDepot(target, byVer >= 0 ? byVer : fallbackIdx);
	}

	/**
	 * Closes the depot modal and removes URL query parameters.
	 */
	closeDepot(): void {
		this.selectedDepot = null;

		if (typeof window !== "undefined") {
			const url = new SvelteURL(window.location.href);
			url.searchParams.delete("depot");
			url.searchParams.delete("date");
			url.searchParams.delete("build");
			window.history.pushState({}, "", url.pathname + url.search);
		}
	}

	/**
	 * Switches the active manifest build version index within the open modal.
	 *
	 * @param newIdx - Target build index in selectedDepot.builds.
	 */
	selectBuild(newIdx: number): void {
		this.selectedBuildIndex = newIdx;
		this.syncModalUrl(true);
	}
}

/**
 * Registers the CatalogStore instance in Svelte component context.
 */
export const setCatalogStore = (store: CatalogStore): void => {
	setContext(CATALOG_KEY, store);
};

/**
 * Retrieves the CatalogStore instance from Svelte component context.
 *
 * @throws Error if CatalogStore has not been registered in context hierarchy.
 */
export const getCatalogStore = (): CatalogStore => {
	const store = getContext<CatalogStore>(CATALOG_KEY);
	if (!store) {
		throw new Error("CatalogStore not found in context");
	}
	return store;
};
