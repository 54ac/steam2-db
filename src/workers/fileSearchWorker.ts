import type {
	TrigramConfig,
	DepotBuildInfo,
	FileCandidateMatch,
	QueryResultPayload
} from "./trigramBinary";
import { cleanFilename } from "./trigramBinary";
import {
	ensureTrigramIndex,
	resolveCandidatesForQuery,
	buildWildcardRegex,
	scoreFilename,
	loadStringBlocksCoalesced,
	loadDepotsCoalesced,
	getCachedFilename,
	getCachedDepots,
	setCachedMetadata
} from "./trigramSearch";

const queryResultCache = new Map<string, QueryResultPayload>();
let activeAbortController: AbortController | null = null;
let edgeApiUnavailableUntil = 0;

/** Checks if Cloudflare Edge search API cooldown period has expired. */
const isEdgeApiAvailable = (): boolean => Date.now() >= edgeApiUnavailableUntil;

/** Activates a 30-second cooldown on Edge API requests after failure. */
const markEdgeApiFailed = (): void => {
	edgeApiUnavailableUntil = Date.now() + 30_000;
};

/**
 * Fast Edge lookup endpoint for batch resolving filenames and depot metadata in 1 single tiny HTTP request.
 */
const fetchBatchLookup = async (
	fileIds: number[],
	signal?: AbortSignal
): Promise<Array<{
	fileId: number;
	filename: string;
	depots: DepotBuildInfo[];
}> | null> => {
	if (!isEdgeApiAvailable() || fileIds.length === 0) {
		return null;
	}
	try {
		const res =
			fileIds.length > 100
				? await fetch("/api/lookup", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ ids: fileIds }),
						signal
					})
				: await fetch(`/api/lookup?ids=${fileIds.join(",")}`, {
						signal
					});
		if (!res.ok) {
			if (res.status >= 500) {
				markEdgeApiFailed();
			}
			return null;
		}
		const json = (await res.json()) as {
			results: Array<{
				fileId: number;
				filename: string;
				depots: DepotBuildInfo[];
			}>;
		};
		return json.results || [];
	} catch (err: unknown) {
		if (err instanceof DOMException && err.name === "AbortError") {
			return null;
		}
		markEdgeApiFailed();
		return null;
	}
};

/**
 * Attempts fast server-side edge search via /api/search before falling back to client binary trigrams.
 */
const fetchApiSearch = async (
	query: string,
	limit?: number,
	signal?: AbortSignal
): Promise<QueryResultPayload | null> => {
	if (!isEdgeApiAvailable()) {
		return null;
	}
	try {
		const limitParam = limit ? `&limit=${limit}` : "";
		const res = await fetch(
			`/api/search?q=${encodeURIComponent(query)}${limitParam}`,
			{ signal }
		);
		if (!res.ok) {
			if (res.status >= 500) {
				markEdgeApiFailed();
			}
			return null;
		}
		const json = (await res.json()) as QueryResultPayload;
		if (Array.isArray(json.matches)) {
			return json;
		}
	} catch (err: unknown) {
		if (err instanceof DOMException && err.name === "AbortError") {
			return null;
		}
		markEdgeApiFailed();
		return null;
	}
	return null;
};

/**
 * Scores, filters, and sorts batch API lookup results against query criteria.
 */
const processBatchResults = (
	batchResults: Array<{
		filename: string;
		fileId: number;
		depots: DepotBuildInfo[];
	}>,
	cleanQuery: string,
	wildcardRegex: RegExp | null,
	limit?: number
): Array<{ filename: string; fileId: number; depots: DepotBuildInfo[] }> => {
	const scored: Array<{
		item: (typeof batchResults)[0];
		score: number;
	}> = [];

	for (const item of batchResults) {
		const filename = cleanFilename(item.filename);
		if (!filename) {
			continue;
		}
		item.filename = filename;
		const score = scoreFilename(
			filename.toLowerCase(),
			cleanQuery,
			wildcardRegex
		);
		if (score === 0) {
			continue;
		}

		scored.push({ item, score });
		setCachedMetadata(item.fileId, item.filename, item.depots);
		if (scored.length >= (limit ?? 2000) * 8) {
			break;
		}
	}

	scored.sort(
		(a, b) =>
			b.score - a.score || a.item.filename.localeCompare(b.item.filename)
	);
	return scored.slice(0, limit ?? 2000).map((s) => s.item);
};

/**
 * Unpacks local string blocks, scores filenames, and hydrates depot metadata for candidate file IDs.
 */
const processLocalCandidates = async (
	candidateSlice: number[],
	cfg: TrigramConfig,
	blockIndex: DataView,
	cleanQuery: string,
	wildcardRegex: RegExp | null,
	limit: number | undefined,
	signal: AbortSignal
): Promise<Array<{
	filename: string;
	fileId: number;
	depots: DepotBuildInfo[];
}> | null> => {
	const BLOCK_SIZE = cfg.blockSize || 16;
	const blockIndices = candidateSlice.map((fid) =>
		Math.floor(fid / BLOCK_SIZE)
	);
	await loadStringBlocksCoalesced(cfg, blockIndex, blockIndices, signal);
	if (signal.aborted) {
		return null;
	}

	const scoredCandidates: Array<{
		candidate: FileCandidateMatch;
		score: number;
	}> = [];

	for (const fileId of candidateSlice) {
		const filename = getCachedFilename(fileId);
		if (!filename) {
			continue;
		}
		const score = scoreFilename(
			filename.toLowerCase(),
			cleanQuery,
			wildcardRegex
		);
		if (score === 0) {
			continue;
		}

		scoredCandidates.push({ candidate: { filename, fileId }, score });
		if (scoredCandidates.length >= (limit ?? 2000) * 8) {
			break;
		}
	}

	if (signal.aborted) {
		return null;
	}

	scoredCandidates.sort(
		(a, b) =>
			b.score - a.score ||
			a.candidate.filename.localeCompare(b.candidate.filename)
	);
	const topCandidates = scoredCandidates.slice(0, limit ?? 2000);
	const matchedFileIds = topCandidates.map((m) => m.candidate.fileId);
	await loadDepotsCoalesced(cfg, matchedFileIds, signal);
	if (signal.aborted) {
		return null;
	}

	return topCandidates.map(({ candidate }) => ({
		filename: candidate.filename,
		fileId: candidate.fileId,
		depots: getCachedDepots(candidate.fileId)
	}));
};

/**
 * Orchestrates full search workflow: index init, candidate resolution, lookup, and local decoding.
 */
const executeSearch = async (
	cleanQuery: string,
	limit: number | undefined,
	signal: AbortSignal
): Promise<Array<{
	filename: string;
	fileId: number;
	depots: DepotBuildInfo[];
}> | null> => {
	const { cfg, dir, blockIndex } = await ensureTrigramIndex();
	if (signal.aborted) {
		return null;
	}

	const isWildcard = cleanQuery.includes("*") || cleanQuery.includes("?");
	const candidates = await resolveCandidatesForQuery(
		cleanQuery,
		isWildcard,
		cfg,
		dir,
		limit,
		signal
	);

	if (signal.aborted || candidates.length === 0) {
		return [];
	}

	const wildcardRegex = buildWildcardRegex(cleanQuery, isWildcard);
	const candidateSlice = limit
		? candidates.slice(0, Math.min(candidates.length, limit * 10))
		: candidates.slice(0, 2000);

	const batchResults = await fetchBatchLookup(candidateSlice, signal);
	if (batchResults && batchResults.length > 0) {
		return processBatchResults(batchResults, cleanQuery, wildcardRegex, limit);
	}
	return processLocalCandidates(
		candidateSlice,
		cfg,
		blockIndex,
		cleanQuery,
		wildcardRegex,
		limit,
		signal
	);
};

const abortActiveSearch = (): void => {
	if (activeAbortController) {
		activeAbortController.abort();
		activeAbortController = null;
	}
};

const sendCachedResult = (
	id: number,
	query: string,
	cached: QueryResultPayload,
	limit: number | undefined,
	t0: number
): void => {
	self.postMessage({
		id,
		query,
		matches: limit ? cached.matches.slice(0, limit) : cached.matches,
		total: cached.total,
		elapsedMs: performance.now() - t0
	});
};

const sendEmptyResult = (id: number, query: string): void => {
	self.postMessage({
		id,
		query,
		matches: [],
		total: 0,
		elapsedMs: 0
	});
};

/** Main Web Worker message listener handling search requests and stream coordination. */
self.onmessage = async (e: MessageEvent) => {
	if (e.data?.type === "abort") {
		abortActiveSearch();
		return;
	}

	const { id, query, limit } = e.data;
	const t0 = performance.now();
	const cleanQuery = (query || "").trim().toLowerCase();

	abortActiveSearch();
	activeAbortController = new AbortController();
	const signal = activeAbortController.signal;

	try {
		if (!cleanQuery) {
			sendEmptyResult(id, cleanQuery);
			return;
		}

		const cachedResult = queryResultCache.get(cleanQuery);
		if (cachedResult) {
			sendCachedResult(id, cleanQuery, cachedResult, limit, t0);
			return;
		}

		// Try fast Edge 1-request search first
		const apiResult = await fetchApiSearch(cleanQuery, limit, signal);
		if (apiResult && !signal.aborted) {
			queryResultCache.set(cleanQuery, apiResult);
			self.postMessage({
				id,
				query: cleanQuery,
				...apiResult
			});
			return;
		}

		const matches = await executeSearch(cleanQuery, limit, signal);
		if (!matches || signal.aborted) {
			return;
		}

		const elapsedMs = performance.now() - t0;
		const responsePayload: QueryResultPayload = {
			total: matches.length,
			matches,
			elapsedMs
		};
		queryResultCache.set(cleanQuery, responsePayload);

		self.postMessage({
			id,
			query: cleanQuery,
			...responsePayload
		});
	} catch (err: unknown) {
		if (signal.aborted) {
			return;
		}
		self.postMessage({
			id,
			query: cleanQuery,
			error: err instanceof Error ? err.message : String(err),
			matches: [],
			total: 0,
			elapsedMs: performance.now() - t0
		});
	}
};
