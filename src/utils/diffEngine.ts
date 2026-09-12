import type {
	ManifestFile,
	ManifestDiffSummary,
	FileDiffEntry,
	DepotItem
} from "../types";
import { formatBytes, collator } from "./formatters";
import { downloadTextFile } from "./manifestService";

/** Display priority ranking for file diff statuses. */
const STATUS_RANK: Record<string, number> = {
	added: 1,
	modified: 2,
	removed: 3,
	unchanged: 4
};

/** In-memory cache for computed manifest delta comparison summaries. */
const MAX_DIFF_CACHE = 50;
const diffSummaryCache = new Map<string, ManifestDiffSummary>();

/**
 * Computes a file delta comparison between two manifest filelists.
 * Tracks file additions, removals, size/CRC modifications, and unchanged entries.
 */
export const calculateManifestDiff = (
	filesA: ManifestFile[],
	filesB: ManifestFile[]
): ManifestDiffSummary => {
	const mapA = new Map<string, ManifestFile>();
	for (let i = 0; i < filesA.length; i++) {
		mapA.set(filesA[i].p, filesA[i]);
	}

	const mapB = new Map<string, ManifestFile>();
	for (let i = 0; i < filesB.length; i++) {
		mapB.set(filesB[i].p, filesB[i]);
	}

	const entries: FileDiffEntry[] = [];
	let addedCount = 0;
	let modifiedCount = 0;
	let removedCount = 0;
	let unchangedCount = 0;
	let netSizeDiff = 0;

	// Process all files in B (target)
	for (const [path, fileB] of mapB.entries()) {
		const fileA = mapA.get(path);
		if (!fileA) {
			addedCount++;
			netSizeDiff += fileB.s;
			entries.push({
				path,
				status: "added",
				sizeB: fileB.s,
				sizeDiff: fileB.s,
				crcB: fileB.c
			});
		} else {
			const isSizeDifferent = fileA.s !== fileB.s;
			const isCrcDifferent =
				fileA.c !== undefined &&
				fileB.c !== undefined &&
				String(fileA.c) !== String(fileB.c);

			if (isSizeDifferent || isCrcDifferent) {
				modifiedCount++;
				const sizeDelta = fileB.s - fileA.s;
				netSizeDiff += sizeDelta;
				entries.push({
					path,
					status: "modified",
					sizeA: fileA.s,
					sizeB: fileB.s,
					sizeDiff: sizeDelta,
					crcA: fileA.c,
					crcB: fileB.c
				});
			} else {
				unchangedCount++;
				entries.push({
					path,
					status: "unchanged",
					sizeA: fileA.s,
					sizeB: fileB.s,
					sizeDiff: 0,
					crcA: fileA.c,
					crcB: fileB.c
				});
			}
		}
	}

	// Process files in A that are missing in B (removed)
	for (const [path, fileA] of mapA.entries()) {
		if (!mapB.has(path)) {
			removedCount++;
			netSizeDiff -= fileA.s;
			entries.push({
				path,
				status: "removed",
				sizeA: fileA.s,
				sizeDiff: -fileA.s,
				crcA: fileA.c
			});
		}
	}

	// Sort changed items first, then alphabetically by path
	entries.sort((a, b) => {
		const rankA = STATUS_RANK[a.status] || 5;
		const rankB = STATUS_RANK[b.status] || 5;
		const rankDiff = rankA - rankB;
		if (rankDiff !== 0) {
			return rankDiff;
		}
		return collator.compare(a.path, b.path);
	});

	return {
		addedCount,
		modifiedCount,
		removedCount,
		unchangedCount,
		netSizeDiff,
		entries
	};
};

/**
 * Retrieves a cached manifest delta or calculates, caches, and returns it.
 */
export const getOrCalculateManifestDiff = (
	depotId: number,
	buildIdxA: number,
	buildIdxB: number,
	filesA: ManifestFile[],
	filesB: ManifestFile[]
): ManifestDiffSummary => {
	const key = `${depotId}_${buildIdxA}_${buildIdxB}`;
	if (diffSummaryCache.has(key)) {
		return diffSummaryCache.get(key)!;
	}
	const res = calculateManifestDiff(filesA, filesB);
	if (diffSummaryCache.size >= MAX_DIFF_CACHE) {
		const firstKey = diffSummaryCache.keys().next().value;
		if (firstKey) {
			diffSummaryCache.delete(firstKey);
		}
	}
	diffSummaryCache.set(key, res);
	return res;
};

/**
 * Formats a single file diff entry into an aligned text line for report export.
 */
const formatEntryLine = (entry: FileDiffEntry): string | null => {
	if (entry.status === "unchanged") {
		return null;
	}
	let symbol = " ";
	let deltaStr = "";
	if (entry.status === "added") {
		symbol = "+";
		deltaStr = "+" + formatBytes(entry.sizeB);
	} else if (entry.status === "removed") {
		symbol = "-";
		deltaStr = "-" + formatBytes(entry.sizeA);
	} else if (entry.status === "modified") {
		symbol = "~";
		const d = entry.sizeDiff || 0;
		if (d > 0) {
			deltaStr = "+" + formatBytes(d);
		} else if (d < 0) {
			deltaStr = "-" + formatBytes(Math.abs(d));
		} else {
			deltaStr = "0 B (hash)";
		}
	}
	const statusTag = `[${symbol}] ${entry.status.toUpperCase()}`.padEnd(14);
	const paddedDelta = deltaStr.padStart(16);
	return `${statusTag}${paddedDelta}   ${entry.path}`;
};

/**
 * Formats and exports a human-readable manifest diff report as a plain text file.
 */
export const exportDiffAsTxt = (
	depot: DepotItem,
	buildIdxA: number,
	buildIdxB: number,
	summary: ManifestDiffSummary
): void => {
	const buildA = depot.builds?.[buildIdxA];
	const buildB = depot.builds?.[buildIdxB];
	let buildDateA = `Build ${buildIdxA}`;
	if (buildA?.date) {
		const crcSuffix = buildA.crc32 ? " · " + buildA.crc32 : "";
		buildDateA = `${buildA.date} (v${buildA.version}${crcSuffix})`;
	}

	let buildDateB = `Build ${buildIdxB}`;
	if (buildB?.date) {
		const crcSuffix = buildB.crc32 ? " · " + buildB.crc32 : "";
		buildDateB = `${buildB.date} (v${buildB.version}${crcSuffix})`;
	}

	let netSizeChangeStr = "0 B";
	if (summary.netSizeDiff > 0) {
		netSizeChangeStr = "+" + formatBytes(summary.netSizeDiff);
	} else if (summary.netSizeDiff < 0) {
		netSizeChangeStr = "-" + formatBytes(Math.abs(summary.netSizeDiff));
	}

	// Diff text file output
	const lines = [
		"================================================================================",
		`Depot:            ${depot.depot || depot.game || depot.id} (${depot.id})`,
		`Base Build (A):   ${buildDateA}`,
		`Target Build (B):  ${buildDateB}`,
		`Diff Summary:     +${summary.addedCount} added, ~${summary.modifiedCount} modified, -${summary.removedCount} removed, ${summary.unchangedCount} unchanged`,
		`Net Size Change:  ${netSizeChangeStr}`,
		"================================================================================",
		`${"STATUS".padEnd(14)}${"SIZE DELTA".padStart(16)}   FILE PATH`,
		"--------------------------------------------------------------------------------"
	];

	for (let i = 0; i < summary.entries.length; i++) {
		const formatted = formatEntryLine(summary.entries[i]);
		if (formatted) {
			lines.push(formatted);
		}
	}

	downloadTextFile(
		`depot_${depot.id}_diff_${buildIdxA}_to_${buildIdxB}.txt`,
		lines
	);
};
