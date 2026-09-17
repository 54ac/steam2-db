import type {
	DepotItem,
	AppGroup,
	AppRecord,
	DepotFileMatchRow,
	CatalogStats,
	AppStats,
	DepotFilter,
	AppFilter,
	SortField,
	SortOrder
} from "../types";
import {
	formatDeveloper,
	getDepotDisplayName,
	getReleaseDelta,
	getEarliestDate,
	collator
} from "./formatters";

const SORT_SENTINEL_MAX = "\uffff";
const SORT_SENTINEL_MIN = "";
const DATE_SENTINEL_MAX = "9999-99-99";
const DATE_SENTINEL_MIN = "0000-00-00";

const displayTitleCache = new WeakMap<DepotItem, string>();

/**
 * Retrieves or computes the cached display title for a depot item.
 */
const getCachedDisplayTitle = (d: DepotItem): string => {
	let t = displayTitleCache.get(d);
	if (t === undefined) {
		t = getDepotDisplayName(d).primaryTitle;
		displayTitleCache.set(d, t);
	}
	return t;
};

/**
 * Computes live aggregate metrics across all depots in the catalog.
 */
export const calculateCatalogStats = (catalog: DepotItem[]): CatalogStats => {
	let multiBuilds = 0;
	let singleBuild = 0;
	let preRelease = 0;
	let totalDumpBytes = 0;
	let withoutManifests = 0;
	let named = 0;

	for (let i = 0; i < catalog.length; i++) {
		const c = catalog[i];
		const buildCount = c.builds?.length || 0;
		if (buildCount > 1) {
			multiBuilds++;
		} else if (buildCount === 1) {
			singleBuild++;
		} else {
			withoutManifests++;
		}
		if (getItemDelta(c) < 0) {
			preRelease++;
		}
		totalDumpBytes += c.dumpSize || 0;
		if (c.game) {
			named++;
		}
	}

	return {
		totalDepots: catalog.length,
		named,
		multiBuilds,
		singleBuild,
		preRelease,
		totalDumpBytes,
		withoutManifests
	};
};

/**
 * Aggregates depot records, sizes, and date ranges into an AppGroup for a single app record.
 */
const resolveAppRecord = (
	rec: AppRecord,
	catalogById: Map<number, DepotItem>
): AppGroup => {
	const depots: DepotItem[] = [];
	let dumpSize = 0;
	let datCount = 0;
	let blobCount = 0;
	let minDate: string | undefined;
	let maxDate: string | undefined;

	for (const depotId of rec.depots) {
		const d = catalogById.get(depotId);
		if (!d) {
			continue;
		}

		depots.push(d);
		dumpSize += d.dumpSize || 0;
		datCount += d.datCount || 0;
		blobCount += d.blobCount || 0;
		if (d.minDate && (!minDate || d.minDate < minDate)) {
			minDate = d.minDate;
		}
		if (d.maxDate && (!maxDate || d.maxDate > maxDate)) {
			maxDate = d.maxDate;
		}
	}

	const primary = depots[0];
	return {
		appId: rec.appId,
		game: rec.name || primary?.game || "—",
		isNamed: Boolean(rec.name),
		dev: formatDeveloper(
			rec.developer || rec.publisher || primary?.dev || primary?.pub
		),
		releaseDate: rec.releaseDate || primary?.releaseDate,
		minDate,
		maxDate,
		dumpSize,
		datCount,
		blobCount,
		depots
	};
};

/**
 * Builds App-level groupings from apps.json AppRecord data.
 * Each app resolves its depot IDs against the catalogById map so shared depots appear under every mounting app.
 */
export const buildAppCatalog = (
	appsData: AppRecord[] | null,
	catalogById: Map<number, DepotItem>
): AppGroup[] => {
	if (!appsData) {
		return [];
	}
	return appsData.map((rec) => resolveAppRecord(rec, catalogById));
};

/**
 * Computes aggregate metrics for application groups.
 */
export const calculateAppStats = (appCatalog: AppGroup[]): AppStats => {
	let multi = 0;
	let single = 0;

	for (let i = 0; i < appCatalog.length; i++) {
		const a = appCatalog[i];
		const len = a.depots.length;
		if (len > 1) {
			multi++;
		} else if (len === 1) {
			single++;
		}
	}

	return {
		total: appCatalog.length,
		multi,
		single
	};
};

/**
 * Converts a simple glob string with wildcards (*, ?) into an optimized case-insensitive RegExp.
 */
const globToRegex = (pattern: string): RegExp => {
	let res = "^";
	for (let i = 0; i < pattern.length; i++) {
		const c = pattern[i];
		if (c === "*") {
			res += ".*";
		} else if (c === "?") {
			res += ".";
		} else if ("\\.[]{}()+^$|".includes(c)) {
			res += "\\" + c;
		} else {
			res += c;
		}
	}
	res += "$";
	return new RegExp(res, "i");
};

/**
 * Pre-compiles search tokens into an optimized predicate matcher function.
 * Supports exact phrase matching ("..."), wildcards (*.bsp), and multi-field token evaluation.
 */
export const createSearchMatcher = (query: string) => {
	const rawQuery = query.trim();
	if (!rawQuery) {
		return () => true;
	}

	const lowerQuery = rawQuery.toLowerCase();
	const tokens = lowerQuery.split(/\s+/).filter(Boolean);

	const tokenMatchers = tokens.map((token) => {
		let isExact = false;
		let cleanToken = token;
		if (
			(token.startsWith('"') && token.endsWith('"')) ||
			(token.startsWith("'") && token.endsWith("'"))
		) {
			isExact = true;
			cleanToken = token.slice(1, -1);
		}

		if (
			!isExact &&
			(cleanToken.includes("*") ||
				cleanToken.includes("?") ||
				cleanToken.includes("/"))
		) {
			const rx = globToRegex(cleanToken);
			return (str: string) => rx.test(str);
		}

		if (isExact) {
			return (str: string) => str.toLowerCase() === cleanToken;
		}

		return (str: string) => str.toLowerCase().includes(cleanToken);
	});

	return (id: number, appIds: number[], textFields: (string | undefined)[]) => {
		const idStr = String(id);
		const appIdStrs = appIds.map(String);
		const cleanTexts = textFields.filter(Boolean) as string[];

		for (let i = 0; i < tokenMatchers.length; i++) {
			const matcher = tokenMatchers[i];
			if (
				matcher(idStr) ||
				appIdStrs.some(matcher) ||
				cleanTexts.some(matcher)
			) {
				continue;
			}
			return false;
		}
		return true;
	};
};

const deltaCache = new WeakMap<DepotItem | AppGroup, number>();

/**
 * Calculates or retrieves the cached day discrepancy for a depot or app item.
 */
const getItemDelta = (item: DepotItem | AppGroup): number => {
	const cached = deltaCache.get(item);
	if (cached !== undefined) {
		return cached;
	}

	const delta = getReleaseDelta(getEarliestDate(item), item.releaseDate);
	const days = delta.days === null ? 999999999 : delta.days;
	deltaCache.set(item, days);
	return days;
};

/**
 * Compares two optional date strings using localized sort sentinels for missing values.
 */
const compareDateStrings = (
	dateA: string | undefined,
	dateB: string | undefined,
	fallback: string
): number => {
	const sentinel =
		fallback === SORT_SENTINEL_MAX ? DATE_SENTINEL_MAX : DATE_SENTINEL_MIN;
	const valA = dateA || sentinel;
	const valB = dateB || sentinel;
	return valA.localeCompare(valB);
};

/**
 * Compares two depot items by a designated field key.
 */
const compareDepotFields = (
	a: DepotItem,
	b: DepotItem,
	sortBy: SortField,
	fallback: string
): number => {
	switch (sortBy) {
		case "name": {
			const titleA = getCachedDisplayTitle(a) || fallback;
			const titleB = getCachedDisplayTitle(b) || fallback;
			return collator.compare(titleA, titleB);
		}
		case "game": {
			const valA = a.game || fallback;
			const valB = b.game || fallback;
			return collator.compare(valA, valB);
		}
		case "build_date":
			return compareDateStrings(
				getEarliestDate(a),
				getEarliestDate(b),
				fallback
			);
		case "release_date":
			return compareDateStrings(a.releaseDate, b.releaseDate, fallback);
		case "discrepancy":
			return getItemDelta(a) - getItemDelta(b);
		case "id":
			return a.id - b.id;
		case "size":
			return (a.dumpSize || 0) - (b.dumpSize || 0);
		case "builds":
			return (a.builds?.length || 0) - (b.builds?.length || 0);
		default:
			return 0;
	}
};

/**
 * Compares two depot items with directional ordering.
 */
const compareDepots = (
	a: DepotItem,
	b: DepotItem,
	sortBy: SortField,
	sortOrder: SortOrder
): number => {
	const fallback = sortOrder === "asc" ? SORT_SENTINEL_MAX : SORT_SENTINEL_MIN;
	const cmp = compareDepotFields(a, b, sortBy, fallback);
	if (cmp !== 0) {
		return sortOrder === "asc" ? cmp : -cmp;
	}
	return a.id - b.id;
};

/**
 * Compares two application groups by a designated field key.
 */
const compareAppFields = (
	a: AppGroup,
	b: AppGroup,
	sortBy: SortField,
	fallback: string
): number => {
	switch (sortBy) {
		case "name":
		case "game": {
			const valA = a.isNamed ? a.game : fallback;
			const valB = b.isNamed ? b.game : fallback;
			return collator.compare(valA, valB);
		}
		case "build_date":
			return compareDateStrings(
				getEarliestDate(a),
				getEarliestDate(b),
				fallback
			);
		case "release_date":
			return compareDateStrings(a.releaseDate, b.releaseDate, fallback);
		case "discrepancy":
			return getItemDelta(a) - getItemDelta(b);
		case "id":
			return a.appId - b.appId;
		case "size":
			return (a.dumpSize || 0) - (b.dumpSize || 0);
		case "builds":
			return a.depots.length - b.depots.length;
		default:
			return 0;
	}
};

/**
 * Compares two application groups with directional ordering.
 */
const compareApps = (
	a: AppGroup,
	b: AppGroup,
	sortBy: SortField,
	sortOrder: SortOrder
): number => {
	const fallback = sortOrder === "asc" ? SORT_SENTINEL_MAX : SORT_SENTINEL_MIN;
	const cmp = compareAppFields(a, b, sortBy, fallback);
	if (cmp !== 0) {
		return sortOrder === "asc" ? cmp : -cmp;
	}
	return a.appId - b.appId;
};

/**
 * Filters and sorts individual Steam depots based on active criteria, tokens, and sorting keys.
 */
export const filterAndSortDepots = (
	catalog: DepotItem[],
	searchQuery: string,
	filter: DepotFilter,
	sortBy: SortField,
	sortOrder: SortOrder
): DepotItem[] => {
	let result = catalog;

	if (searchQuery.trim()) {
		const matcher = createSearchMatcher(searchQuery);
		result = result.filter((c) =>
			matcher(c.id, [], [c.depot, c.game, c.pub, c.dev])
		);
	}

	if (filter === "multi") {
		result = result.filter((c) => (c.builds?.length || 0) > 1);
	} else if (filter === "single") {
		result = result.filter((c) => (c.builds?.length || 0) === 1);
	} else if (filter === "pre_release") {
		result = result.filter((c) => getItemDelta(c) < 0);
	}

	return [...result].sort((a, b) => compareDepots(a, b, sortBy, sortOrder));
};

/**
 * Filters and sorts grouped Steam applications based on active criteria, tokens, and sorting keys.
 */
export const filterAndSortApps = (
	appCatalog: AppGroup[],
	searchQuery: string,
	filter: AppFilter,
	sortBy: SortField,
	sortOrder: SortOrder
): AppGroup[] => {
	let result = appCatalog;

	if (searchQuery.trim()) {
		const matcher = createSearchMatcher(searchQuery);
		result = result.filter((a) => matcher(a.appId, [], [a.game, a.dev]));
	}

	if (filter === "multi") {
		result = result.filter((a) => a.depots.length > 1);
	} else if (filter === "single") {
		result = result.filter((a) => a.depots.length === 1);
	}

	return [...result].sort((a, b) => compareApps(a, b, sortBy, sortOrder));
};

/**
 * Sorts filename search result depot groups by ID, name, or file match count.
 */
export const sortFileMatchRows = (
	rows: DepotFileMatchRow[],
	sortBy: SortField,
	sortOrder: SortOrder
): DepotFileMatchRow[] => {
	const sorted = [...rows];
	sorted.sort((a, b) => {
		let cmp: number;
		if (sortBy === "id") {
			cmp = a.depotId - b.depotId;
		} else if (sortBy === "name") {
			const nameA = a.depot?.depot || a.depot?.game || `Depot ${a.depotId}`;
			const nameB = b.depot?.depot || b.depot?.game || `Depot ${b.depotId}`;
			cmp = collator.compare(nameA, nameB);
		} else if (sortBy === "builds") {
			cmp = a.files.length - b.files.length;
		} else {
			cmp = a.depotId - b.depotId;
		}
		return sortOrder === "asc" ? cmp : -cmp;
	});
	return sorted;
};
