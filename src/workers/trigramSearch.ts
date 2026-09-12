import type {
	TrigramConfig,
	TrigramEntry,
	DepotBuildInfo
} from "./trigramBinary";
import {
	packTrigram,
	findTrigram,
	decodeVarints,
	intersectSorted,
	unpackStringBlock,
	decodeDepotsFromBytes
} from "./trigramBinary";

const partitionFullCache = new Map<number, Uint8Array>();
const filenameCache = new Map<number, string>();
const stringBlockCache = new Map<number, Uint8Array>();
const depotCache = new Map<number, DepotBuildInfo[]>();

let config: TrigramConfig | null = null;
let dirView: DataView | null = null;
let stringBlockIndexView: DataView | null = null;
let initPromise: Promise<void> | null = null;

/**
 * Retrieves decoded filename for a file ID from the memory cache.
 */
export const getCachedFilename = (fileId: number): string => {
	return filenameCache.get(fileId) || "";
};

/**
 * Retrieves cached depot attachment metadata for a file ID.
 */
export const getCachedDepots = (fileId: number): DepotBuildInfo[] => {
	return depotCache.get(fileId) || [];
};

/**
 * Caches decoded filename and depot metadata for a file ID.
 */
export const setCachedMetadata = (
	fileId: number,
	filename: string,
	depots: DepotBuildInfo[]
): void => {
	filenameCache.set(fileId, filename);
	depotCache.set(fileId, depots);
};

/**
 * Tests a lowercased filename or basename against a wildcard regex or literal query.
 */
export const testWildcardMatch = (
	wildcardRegex: RegExp | null,
	lower: string,
	base: string,
	cleanQuery: string
): boolean => {
	if (!wildcardRegex) {
		return lower.includes(cleanQuery);
	}
	if (cleanQuery.includes("/")) {
		return wildcardRegex.test(lower);
	}
	return wildcardRegex.test(base);
};

/**
 * Tests a lowercased filename against the query and returns a relevance score (0 = no match).
 */
export const scoreFilename = (
	lower: string,
	cleanQuery: string,
	wildcardRegex: RegExp | null
): number => {
	const base = lower.split("/").pop() || lower;
	const isMatch = testWildcardMatch(wildcardRegex, lower, base, cleanQuery);
	if (!isMatch) {
		return 0;
	}
	if (base === cleanQuery) {
		return 1000;
	}
	if (base.startsWith(cleanQuery)) {
		return 500;
	}
	if (base.includes(cleanQuery)) {
		return 200;
	}
	if (lower.startsWith(cleanQuery)) {
		return 100;
	}
	return 10;
};

/**
 * Fetches a byte range from a single partition.
 */
export const fetchPartRange = async (
	partIdx: number,
	localStart: number,
	bytesCount: number,
	signal?: AbortSignal
): Promise<Uint8Array> => {
	const cachedPart = partitionFullCache.get(partIdx);
	if (cachedPart) {
		return cachedPart.subarray(localStart, localStart + bytesCount);
	}

	const end = localStart + bytesCount - 1;
	const res = await fetch(`/trigrams/files_${partIdx}.bin`, {
		headers: { Range: `bytes=${localStart}-${end}` },
		signal
	});

	if (!res.ok) {
		throw new Error(
			`Failed to fetch partition ${partIdx} range: HTTP ${res.status}`
		);
	}

	const buf = await res.arrayBuffer();
	if (res.status === 206) {
		return new Uint8Array(buf);
	}

	const full = new Uint8Array(buf);
	partitionFullCache.set(partIdx, full);
	return full.subarray(localStart, localStart + bytesCount);
};

/**
 * Fetches an arbitrary byte range from partitioned binary files (files_0.bin .. files_7.bin).
 * Handles cross-partition boundary requests.
 */
export const fetchByteRange = async (
	cfg: TrigramConfig,
	globalOffset: number,
	length: number,
	signal?: AbortSignal
): Promise<Uint8Array> => {
	const PART_SIZE = cfg.partSize;
	const startPart = Math.floor(globalOffset / PART_SIZE);
	const endPart = Math.floor((globalOffset + length - 1) / PART_SIZE);

	if (startPart === endPart) {
		const localStart = globalOffset % PART_SIZE;
		return fetchPartRange(startPart, localStart, length, signal);
	}

	const result = new Uint8Array(length);
	let written = 0;
	let curOffset = globalOffset;
	let remaining = length;

	while (remaining > 0) {
		const partIdx = Math.floor(curOffset / PART_SIZE);
		const localStart = curOffset % PART_SIZE;
		const bytesInThisPart = Math.min(remaining, PART_SIZE - localStart);

		const chunk = await fetchPartRange(
			partIdx,
			localStart,
			bytesInThisPart,
			signal
		);
		result.set(chunk.subarray(0, bytesInThisPart), written);

		written += bytesInThisPart;
		curOffset += bytesInThisPart;
		remaining -= bytesInThisPart;
	}

	return result;
};

/**
 * Initializes and caches index metadata (config.json, directory.bin, and string_index.bin).
 */
export const ensureTrigramIndex = async (): Promise<{
	cfg: TrigramConfig;
	dir: DataView;
	blockIndex: DataView;
}> => {
	if (config && dirView && stringBlockIndexView) {
		return { cfg: config, dir: dirView, blockIndex: stringBlockIndexView };
	}

	if (!initPromise) {
		initPromise = (async () => {
			const [cfgRes, dirRes, strIndexRes] = await Promise.all([
				fetch("/trigrams/config.json"),
				fetch("/trigrams/directory.bin"),
				fetch("/trigrams/string_index.bin")
			]);

			if (!cfgRes.ok || !dirRes.ok || !strIndexRes.ok) {
				throw new Error(
					`Failed to load trigram index: HTTP ${cfgRes.status}/${dirRes.status}/${strIndexRes.status}`
				);
			}

			config = (await cfgRes.json()) as TrigramConfig;
			const dirBuf = await dirRes.arrayBuffer();
			dirView = new DataView(dirBuf);

			const strIndexBuf = await strIndexRes.arrayBuffer();
			stringBlockIndexView = new DataView(strIndexBuf);
		})();
	}

	await initPromise;
	return {
		cfg: config!,
		dir: dirView!,
		blockIndex: stringBlockIndexView!
	};
};

/**
 * Coalesces missing string blocks into minimal range requests.
 */
export const loadStringBlocksCoalesced = async (
	cfg: TrigramConfig,
	blockIndex: DataView,
	blockIndices: number[],
	signal?: AbortSignal
): Promise<void> => {
	const missing = Array.from(
		new Set(blockIndices.filter((b) => !stringBlockCache.has(b)))
	).sort((a, b) => a - b);

	if (missing.length === 0) {
		return;
	}

	// Cluster blocks with gap <= 32KB
	const MAX_GAP_BYTES = 32768;
	const clusters: number[][] = [];
	let currentCluster: number[] = [missing[0]];

	for (let i = 1; i < missing.length; i++) {
		const prevBlock = missing[i - 1];
		const currBlock = missing[i];
		const prevEnd = blockIndex.getUint32((prevBlock + 1) * 4, true);
		const currStart = blockIndex.getUint32(currBlock * 4, true);

		if (currStart - prevEnd <= MAX_GAP_BYTES) {
			currentCluster.push(currBlock);
		} else {
			clusters.push(currentCluster);
			currentCluster = [currBlock];
		}
	}
	clusters.push(currentCluster);

	// Fetch each cluster in a single range request
	await Promise.all(
		clusters.map(async (cluster) => {
			const firstBlock = cluster[0];
			const lastBlock = cluster[cluster.length - 1];
			const startOff = blockIndex.getUint32(firstBlock * 4, true);
			const endOff = blockIndex.getUint32((lastBlock + 1) * 4, true);
			const byteLen = endOff - startOff;

			const clusterBytes = await fetchByteRange(
				cfg,
				cfg.offsetStringData + startOff,
				byteLen,
				signal
			);

			for (const bIdx of cluster) {
				const bStart = blockIndex.getUint32(bIdx * 4, true) - startOff;
				const bEnd = blockIndex.getUint32((bIdx + 1) * 4, true) - startOff;
				unpackStringBlock(
					cfg,
					bIdx,
					clusterBytes.subarray(bStart, bEnd),
					filenameCache,
					stringBlockCache
				);
			}
		})
	);
};

/**
 * Coalesces depot metadata retrieval for all matched file IDs into minimal requests (max 1-2 requests).
 */
export const loadDepotsCoalesced = async (
	cfg: TrigramConfig,
	fileIds: number[],
	signal?: AbortSignal
): Promise<void> => {
	const uncached = Array.from(
		new Set(fileIds.filter((fid) => !depotCache.has(fid)))
	).sort((a, b) => a - b);

	if (uncached.length === 0) {
		return;
	}

	// 1. Fetch entire index range in 1 single request
	const minFid = uncached[0];
	const maxFid = uncached[uncached.length - 1];
	const indexStartGlobal = cfg.offsetFileDepotIndex + minFid * 4;
	const indexLength = (maxFid - minFid + 2) * 4;

	const indexBytes = await fetchByteRange(
		cfg,
		indexStartGlobal,
		indexLength,
		signal
	);
	const indexView = new DataView(
		indexBytes.buffer,
		indexBytes.byteOffset,
		indexBytes.byteLength
	);

	// 2. Determine data offsets for uncached files
	const fileRanges: Array<{
		fileId: number;
		startOff: number;
		endOff: number;
	}> = [];
	let minDataOff = Infinity;
	let maxDataOff = -Infinity;

	for (const fid of uncached) {
		const relIndexOff = (fid - minFid) * 4;
		const startOff = indexView.getUint32(relIndexOff, true);
		const endOff = indexView.getUint32(relIndexOff + 4, true);
		fileRanges.push({ fileId: fid, startOff, endOff });
		if (startOff < minDataOff) {
			minDataOff = startOff;
		}
		if (endOff > maxDataOff) {
			maxDataOff = endOff;
		}
	}

	if (minDataOff >= maxDataOff) {
		for (const fid of uncached) {
			depotCache.set(fid, []);
		}
		return;
	}

	// 3. Fetch data range in 1 single request
	const dataBytes = await fetchByteRange(
		cfg,
		cfg.offsetFileDepotData + minDataOff,
		maxDataOff - minDataOff,
		signal
	);

	// 4. Decode all depot metadata
	for (const { fileId, startOff, endOff } of fileRanges) {
		const metaDataBytes = dataBytes.subarray(
			startOff - minDataOff,
			endOff - minDataOff
		);
		const depots = decodeDepotsFromBytes(metaDataBytes);
		depotCache.set(fileId, depots);
	}
};

/**
 * Scans directory.bin linearly to find trigrams matching a specific bitmask and prefix value.
 */
export const scanMatchingPrefixTrigrams = (
	cfg: TrigramConfig,
	dir: DataView,
	mask: number,
	prefix: number,
	maxCount: number = 50,
	signal?: AbortSignal
): TrigramEntry[] => {
	const entries: TrigramEntry[] = [];
	for (let i = 0; i < cfg.numTrigrams; i++) {
		if (signal?.aborted) {
			return [];
		}
		const code = dir.getUint32(i * 16, true);
		if ((code & mask) === prefix) {
			entries.push({
				triCode: code,
				offset: dir.getUint32(i * 16 + 4, true),
				byteLen: dir.getUint32(i * 16 + 8, true),
				count: dir.getUint32(i * 16 + 12, true)
			});
			if (entries.length >= maxCount) {
				break;
			}
		}
	}
	return entries;
};

/**
 * Fetches and decodes posting lists for the rarest matching trigrams up to a candidate limit.
 */
export const fetchCandidatePostings = async (
	cfg: TrigramConfig,
	entries: TrigramEntry[],
	maxFetch: number,
	limit: number,
	signal?: AbortSignal
): Promise<number[]> => {
	if (entries.length === 0 || signal?.aborted) {
		return [];
	}
	entries.sort((a, b) => b.count - a.count);
	const toFetch = entries.slice(0, Math.min(maxFetch, entries.length));
	const postingsLists = await Promise.all(
		toFetch.map(async (t) => {
			if (signal?.aborted) {
				return [];
			}
			const bytes = await fetchByteRange(
				cfg,
				cfg.offsetPostings + t.offset,
				t.byteLen,
				signal
			);
			return decodeVarints(bytes);
		})
	);
	if (signal?.aborted) {
		return [];
	}
	const candidateSet = new Set<number>();
	const maxCandidates = Math.min(cfg.numFiles, limit * 15, 1500);
	for (const list of postingsLists) {
		for (let i = 0; i < Math.min(list.length, 100); i++) {
			candidateSet.add(list[i]);
			if (candidateSet.size >= maxCandidates) {
				break;
			}
		}
		if (candidateSet.size >= maxCandidates) {
			break;
		}
	}
	return Array.from(candidateSet);
};

/**
 * Extracts trigrams or 2-character prefixes from a literal segment of a wildcard query.
 */
export const collectWildcardLiteralTrigrams = (
	lit: string,
	cfg: TrigramConfig,
	dir: DataView,
	trigramEntries: TrigramEntry[]
) => {
	if (lit.length >= 3) {
		for (let i = 0; i <= lit.length - 3; i++) {
			const code = packTrigram(lit, i);
			const entry = findTrigram(dir, cfg.numTrigrams, code);
			if (entry) {
				trigramEntries.push(entry);
			}
		}
	} else if (lit.length === 2) {
		const prefix =
			(lit.charCodeAt(0) & 0xff) | ((lit.charCodeAt(1) & 0xff) << 8);
		const matches = scanMatchingPrefixTrigrams(cfg, dir, 0xffff, prefix, 50);
		trigramEntries.push(...matches);
	}
};

/**
 * Searches posting lists for wildcard patterns (*, ?) by extracting literals and intersecting posting lists.
 */
export const searchWildcardCandidates = async (
	cfg: TrigramConfig,
	dir: DataView,
	query: string,
	limit: number,
	signal?: AbortSignal
): Promise<number[]> => {
	const literals = query.split(/[*?]+/).filter((s: string) => s.length > 0);
	if (literals.length === 0) {
		return Array.from({ length: limit * 2 }, (_, i) => i);
	}

	const trigramEntries: TrigramEntry[] = [];
	for (const lit of literals) {
		collectWildcardLiteralTrigrams(lit, cfg, dir, trigramEntries);
	}

	if (trigramEntries.length === 0) {
		return [];
	}

	const uniqueMap = new Map<number, TrigramEntry>();
	for (const t of trigramEntries) {
		uniqueMap.set(t.triCode, t);
	}
	const sortedTrigrams = Array.from(uniqueMap.values()).sort(
		(a, b) => a.count - b.count
	);

	const toFetch = sortedTrigrams.slice(0, Math.min(3, sortedTrigrams.length));
	const postingsLists = await Promise.all(
		toFetch.map(async (t) => {
			const bytes = await fetchByteRange(
				cfg,
				cfg.offsetPostings + t.offset,
				t.byteLen,
				signal
			);
			return decodeVarints(bytes);
		})
	);

	let candidates = postingsLists[0];
	for (let i = 1; i < postingsLists.length; i++) {
		candidates = intersectSorted(candidates, postingsLists[i]);
		if (candidates.length <= limit) {
			break;
		}
	}
	return candidates;
};

/**
 * Searches posting lists for 1-character queries by scanning matching prefix trigrams.
 */
export const searchSingleCharCandidates = async (
	cfg: TrigramConfig,
	dir: DataView,
	query: string,
	limit: number,
	signal?: AbortSignal
): Promise<number[]> => {
	const c0 = query.charCodeAt(0) & 0xff;
	const matchedTriEntries = scanMatchingPrefixTrigrams(
		cfg,
		dir,
		0xff,
		c0,
		100,
		signal
	);
	return fetchCandidatePostings(cfg, matchedTriEntries, 25, limit, signal);
};

/**
 * Searches posting lists for 2-character queries by scanning 16-bit prefix trigrams.
 */
export const searchDoubleCharCandidates = async (
	cfg: TrigramConfig,
	dir: DataView,
	query: string,
	limit: number,
	signal?: AbortSignal
): Promise<number[]> => {
	const c0 = query.charCodeAt(0) & 0xff;
	const c1 = query.charCodeAt(1) & 0xff;
	const targetPrefix = c0 | (c1 << 8);

	const prefixMatches: TrigramEntry[] = [];
	const otherMatches: TrigramEntry[] = [];

	for (let i = 0; i < cfg.numTrigrams; i++) {
		if (signal?.aborted) {
			return [];
		}
		const code = dir.getUint32(i * 16, true);
		const entry: TrigramEntry = {
			triCode: code,
			offset: dir.getUint32(i * 16 + 4, true),
			byteLen: dir.getUint32(i * 16 + 8, true),
			count: dir.getUint32(i * 16 + 12, true)
		};

		if ((code & 0xffff) === targetPrefix) {
			prefixMatches.push(entry);
		} else if (((code >>> 8) & 0xffff) === targetPrefix) {
			otherMatches.push(entry);
		}
	}

	prefixMatches.sort((a, b) => b.count - a.count);
	otherMatches.sort((a, b) => b.count - a.count);

	const combined = [
		...prefixMatches.slice(0, 35),
		...otherMatches.slice(0, 15)
	];
	return fetchCandidatePostings(cfg, combined, 25, limit, signal);
};

/**
 * Searches posting lists for 3+ character queries using exact trigram decomposition and posting intersection.
 */
export const searchTrigramCandidates = async (
	cfg: TrigramConfig,
	dir: DataView,
	query: string,
	limit: number,
	signal?: AbortSignal
): Promise<number[]> => {
	const trigrams: TrigramEntry[] = [];
	for (let i = 0; i <= query.length - 3; i++) {
		const code = packTrigram(query, i);
		const entry = findTrigram(dir, cfg.numTrigrams, code);
		if (!entry) {
			return [];
		}
		trigrams.push(entry);
	}

	trigrams.sort((a, b) => a.count - b.count);
	const toFetch = trigrams.slice(0, Math.min(3, trigrams.length));
	const postingsLists = await Promise.all(
		toFetch.map(async (t) => {
			if (signal?.aborted) {
				return [];
			}
			const bytes = await fetchByteRange(
				cfg,
				cfg.offsetPostings + t.offset,
				t.byteLen,
				signal
			);
			return decodeVarints(bytes);
		})
	);

	if (signal?.aborted) {
		return [];
	}

	let candidates = postingsLists[0];
	for (let i = 1; i < postingsLists.length; i++) {
		candidates = intersectSorted(candidates, postingsLists[i]);
		if (candidates.length <= limit) {
			break;
		}
	}
	return candidates;
};

/**
 * Compiles a wildcard query string into an anchored case-insensitive RegExp.
 */
export const buildWildcardRegex = (
	cleanQuery: string,
	isWildcard: boolean
): RegExp | null => {
	if (!isWildcard) {
		return null;
	}
	const regexPattern = cleanQuery
		.replace(/[.+^${}()|[\]\\]/g, "\\$&")
		.replace(/\*/g, ".*")
		.replace(/\?/g, ".");
	if (!cleanQuery.includes("/")) {
		return new RegExp(`^${regexPattern}$`, "i");
	}
	const pattern = cleanQuery.startsWith("*")
		? regexPattern
		: `(?:^|/)${regexPattern}`;
	return new RegExp(pattern, "i");
};

/**
 * Routes query to the appropriate candidate identification algorithm based on syntax and length.
 */
export const resolveCandidatesForQuery = async (
	cleanQuery: string,
	isWildcard: boolean,
	cfg: TrigramConfig,
	dir: DataView,
	limit: number,
	signal: AbortSignal
): Promise<number[]> => {
	if (isWildcard) {
		return searchWildcardCandidates(cfg, dir, cleanQuery, limit, signal);
	}
	if (cleanQuery.length === 1) {
		return searchSingleCharCandidates(cfg, dir, cleanQuery, limit, signal);
	}
	if (cleanQuery.length === 2) {
		return searchDoubleCharCandidates(cfg, dir, cleanQuery, limit, signal);
	}
	return searchTrigramCandidates(cfg, dir, cleanQuery, limit, signal);
};
