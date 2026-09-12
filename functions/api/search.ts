import {
	type EventContext,
	type TrigramConfig,
	type TrigramEntry,
	ensureMeta,
	readGlobalBytes,
	resolveFilename,
	resolveDepots,
	createPartitionFetcher,
	fetchFilenamePartitions,
	fetchDepotPartitions,
	jsonResponse,
	errorResponse
} from "./_trigram";

/**
 * Packs 3 ASCII bytes starting at `start` into a 24-bit unsigned integer (little-endian).
 * e.g., 'abc' -> 0x61 | (0x62 << 8) | (0x63 << 16)
 */
const packTrigram = (str: string, start: number): number => {
	const b0 = str.charCodeAt(start) & 0xff;
	const b1 = str.charCodeAt(start + 1) & 0xff;
	const b2 = str.charCodeAt(start + 2) & 0xff;
	return (b0 | (b1 << 8) | (b2 << 16)) >>> 0;
};

/**
 * Binary searches the sorted directory.bin index (16-byte fixed records: triCode:u32, offset:u32, byteLen:u32, count:u32)
 * to locate a trigram's posting list offset and length in postings data.
 */
const findTrigram = (
	dir: DataView,
	numTrigrams: number,
	triCode: number
): TrigramEntry | null => {
	let low = 0;
	let high = numTrigrams - 1;
	while (low <= high) {
		const mid = (low + high) >>> 1;
		const code = dir.getUint32(mid * 16, true);
		if (code === triCode) {
			return {
				triCode: code,
				offset: dir.getUint32(mid * 16 + 4, true),
				byteLen: dir.getUint32(mid * 16 + 8, true),
				count: dir.getUint32(mid * 16 + 12, true)
			};
		}
		if (code < triCode) {
			low = mid + 1;
		} else {
			high = mid - 1;
		}
	}
	return null;
};

/**
 * Decodes variable-byte delta-encoded file IDs from a posting list buffer.
 * Each value represents: prevFileId + delta.
 */
const decodeVarints = (buf: Uint8Array): number[] => {
	const result: number[] = [];
	let ptr = 0;
	let prevVal = 0;
	while (ptr < buf.length) {
		let delta = 0;
		let shift = 0;
		while (ptr < buf.length) {
			const b = buf[ptr++];
			delta |= (b & 0x7f) << shift;
			if (!(b & 0x80)) {
				break;
			}
			shift += 7;
		}
		const val = prevVal + delta;
		prevVal = val;
		result.push(val);
	}
	return result;
};

/**
 * Linear-time intersection of two sorted file ID arrays using two pointers.
 */
const intersectSorted = (a: number[], b: number[]): number[] => {
	const result: number[] = [];
	let i = 0;
	let j = 0;
	while (i < a.length && j < b.length) {
		if (a[i] === b[j]) {
			result.push(a[i]);
			i++;
			j++;
		} else if (a[i] < b[j]) {
			i++;
		} else {
			j++;
		}
	}
	return result;
};

/**
 * Extracts search query and limit from either GET query params or POST JSON payload.
 */
const parseSearchRequest = async (
	request: Request
): Promise<{ query: string; limit?: number } | null> => {
	if (request.method === "POST") {
		try {
			const body = (await request.json()) as {
				query?: string;
				limit?: number;
			};
			const query = body.query || "";
			const limit = body.limit && body.limit > 0 ? body.limit : undefined;
			return { query, limit };
		} catch {
			return null;
		}
	}
	const url = new URL(request.url);
	const query =
		url.searchParams.get("q") || url.searchParams.get("query") || "";
	let limit: number | undefined;
	const limitParam = url.searchParams.get("limit");
	if (limitParam) {
		const parsed = parseInt(limitParam, 10);
		if (!isNaN(parsed) && parsed > 0) {
			limit = parsed;
		}
	}
	return { query, limit };
};

/**
 * Extracts 3-character sequences from a literal string segment and locates their directory entries.
 */
const collectLiteralTrigrams = (
	lit: string,
	dirView: DataView,
	numTrigrams: number,
	trigrams: TrigramEntry[]
): void => {
	if (lit.length < 3) {
		return;
	}
	for (let i = 0; i <= lit.length - 3; i++) {
		const code = packTrigram(lit, i);
		const entry = findTrigram(dirView, numTrigrams, code);
		if (entry) {
			trigrams.push(entry);
		}
	}
};

/**
 * Extracts trigrams from query. For exact substrings, all trigrams must exist (returns null if any missing).
 * For wildcard queries, splits by wildcard chars (*, ?) and collects trigrams from literals >= 3 chars.
 */
const extractQueryTrigrams = (
	cleanQuery: string,
	isWildcard: boolean,
	dirView: DataView,
	numTrigrams: number
): TrigramEntry[] | null => {
	const trigrams: TrigramEntry[] = [];
	if (isWildcard) {
		const literals = cleanQuery.split(/[*?]+/).filter((s) => s.length > 0);
		for (const lit of literals) {
			collectLiteralTrigrams(lit, dirView, numTrigrams, trigrams);
		}
	} else if (cleanQuery.length >= 3) {
		for (let i = 0; i <= cleanQuery.length - 3; i++) {
			const code = packTrigram(cleanQuery, i);
			const entry = findTrigram(dirView, numTrigrams, code);
			if (!entry) {
				return null;
			}
			trigrams.push(entry);
		}
	}
	return trigrams;
};

/**
 * Downloads posting list partitions for top rarest trigrams, decodes delta varints,
 * and intersects their file ID lists to produce narrow candidate set.
 */
const resolveCandidates = async (
	topTrigrams: TrigramEntry[],
	cfg: TrigramConfig,
	partitionMap: Map<number, Uint8Array>,
	fetchPartitions: (indices: number[]) => Promise<void>
): Promise<number[]> => {
	const postingParts = new Set<number>();
	for (const t of topTrigrams) {
		postingParts.add(
			Math.floor((cfg.offsetPostings + t.offset) / cfg.partSize)
		);
		postingParts.add(
			Math.floor((cfg.offsetPostings + t.offset + t.byteLen - 1) / cfg.partSize)
		);
	}
	await fetchPartitions(Array.from(postingParts));

	const postingsLists = topTrigrams.map((t) => {
		const bytes = readGlobalBytes(
			cfg,
			partitionMap,
			cfg.offsetPostings + t.offset,
			t.byteLen
		);
		return decodeVarints(bytes);
	});

	let candidates = postingsLists[0] || [];
	for (let i = 1; i < postingsLists.length; i++) {
		candidates = intersectSorted(candidates, postingsLists[i]);
	}
	return candidates;
};

const scanMatchingShortTrigrams = (
	dirView: DataView,
	numTrigrams: number,
	cleanQuery: string
): TrigramEntry[] => {
	const c0 = cleanQuery.charCodeAt(0) & 0xff;
	const prefixMatches: TrigramEntry[] = [];
	const otherMatches: TrigramEntry[] = [];

	if (cleanQuery.length >= 2) {
		const target = c0 | ((cleanQuery.charCodeAt(1) & 0xff) << 8);
		for (let i = 0; i < numTrigrams; i++) {
			const code = dirView.getUint32(i * 16, true);
			if ((code & 0xffff) === target) {
				prefixMatches.push({
					triCode: code,
					offset: dirView.getUint32(i * 16 + 4, true),
					byteLen: dirView.getUint32(i * 16 + 8, true),
					count: dirView.getUint32(i * 16 + 12, true)
				});
			} else if (((code >>> 8) & 0xffff) === target) {
				otherMatches.push({
					triCode: code,
					offset: dirView.getUint32(i * 16 + 4, true),
					byteLen: dirView.getUint32(i * 16 + 8, true),
					count: dirView.getUint32(i * 16 + 12, true)
				});
			}
		}
	} else {
		for (let i = 0; i < numTrigrams; i++) {
			const code = dirView.getUint32(i * 16, true);
			if ((code & 0xff) === c0) {
				prefixMatches.push({
					triCode: code,
					offset: dirView.getUint32(i * 16 + 4, true),
					byteLen: dirView.getUint32(i * 16 + 8, true),
					count: dirView.getUint32(i * 16 + 12, true)
				});
			} else if (
				((code >>> 8) & 0xff) === c0 ||
				((code >>> 16) & 0xff) === c0
			) {
				otherMatches.push({
					triCode: code,
					offset: dirView.getUint32(i * 16 + 4, true),
					byteLen: dirView.getUint32(i * 16 + 8, true),
					count: dirView.getUint32(i * 16 + 12, true)
				});
			}
		}
	}

	prefixMatches.sort((a, b) => b.count - a.count);
	otherMatches.sort((a, b) => b.count - a.count);
	return [...prefixMatches.slice(0, 25), ...otherMatches.slice(0, 15)];
};

/**
 * Resolves candidates for 1- and 2-character queries by scanning matching prefix/suffix trigrams.
 */
const resolveShortQueryCandidates = async (
	cleanQuery: string,
	dirView: DataView,
	cfg: TrigramConfig,
	partitionMap: Map<number, Uint8Array>,
	fetchPartitions: (indices: number[]) => Promise<void>,
	limit?: number
): Promise<number[]> => {
	const selectedTrigrams = scanMatchingShortTrigrams(
		dirView,
		cfg.numTrigrams,
		cleanQuery
	);
	if (selectedTrigrams.length === 0) {
		return [];
	}

	const postingParts = new Set<number>();
	for (const t of selectedTrigrams) {
		postingParts.add(
			Math.floor((cfg.offsetPostings + t.offset) / cfg.partSize)
		);
		postingParts.add(
			Math.floor((cfg.offsetPostings + t.offset + t.byteLen - 1) / cfg.partSize)
		);
	}
	await fetchPartitions(Array.from(postingParts));

	const candidateSet = new Set<number>();
	const maxCandidates = limit ? Math.min(cfg.numFiles, limit * 15, 1500) : 2000;

	for (const t of selectedTrigrams) {
		const bytes = readGlobalBytes(
			cfg,
			partitionMap,
			cfg.offsetPostings + t.offset,
			t.byteLen
		);
		const fids = decodeVarints(bytes);
		for (let i = 0; i < Math.min(fids.length, 100); i++) {
			candidateSet.add(fids[i]);
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

const selectCandidates = async (
	cleanQuery: string,
	trigrams: TrigramEntry[] | null,
	dirView: DataView,
	cfg: TrigramConfig,
	partitionMap: Map<number, Uint8Array>,
	fetchPartitions: (indices: number[]) => Promise<void>,
	limit?: number
): Promise<number[]> => {
	if (trigrams && trigrams.length > 0) {
		trigrams.sort((a, b) => a.count - b.count);
		const topTrigrams = trigrams.slice(0, Math.min(4, trigrams.length));
		return resolveCandidates(topTrigrams, cfg, partitionMap, fetchPartitions);
	}
	if (cleanQuery.length === 1 || cleanQuery.length === 2) {
		return resolveShortQueryCandidates(
			cleanQuery,
			dirView,
			cfg,
			partitionMap,
			fetchPartitions,
			limit
		);
	}
	return [];
};

/**
 * Ranks filename relevance:
 * - Exact filename match: 1000
 * - Filename starts with query: 500
 * - Filename contains query: 200
 * - Full path starts with query: 100
 * - Substring path match: 10
 */
const scoreMatch = (lower: string, cleanQuery: string): number => {
	const lastSlash = lower.lastIndexOf("/");
	const base = lastSlash === -1 ? lower : lower.slice(lastSlash + 1);
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

const testWildcardMatch = (
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

const compileWildcardPattern = (cleanQuery: string): string => {
	const regexPattern = cleanQuery
		.replace(/[.+^${}()|[\]\\]/g, "\\$&")
		.replace(/\*/g, ".*")
		.replace(/\?/g, ".");
	if (!cleanQuery.includes("/")) {
		return `^${regexPattern}$`;
	}
	if (cleanQuery.startsWith("*")) {
		return regexPattern;
	}
	return `(?:^|/)${regexPattern}`;
};

/**
 * Decodes candidate filenames from front-coded string blocks, filters against regex/substring,
 * and assigns ranking scores.
 */
const findScoredMatches = (
	targetCandidates: number[],
	cfg: TrigramConfig,
	blockIndex: DataView,
	partitionMap: Map<number, Uint8Array>,
	wildcardRegex: RegExp | null,
	cleanQuery: string,
	limit?: number,
	blockCache?: Map<number, string[]>
): { fid: number; fn: string; score: number }[] => {
	const scoredMatches: { fid: number; fn: string; score: number }[] = [];
	for (const fid of targetCandidates) {
		const fn = resolveFilename(cfg, blockIndex, partitionMap, fid, blockCache);
		if (!fn) {
			continue;
		}
		const lower = fn.toLowerCase();
		const lastSlash = lower.lastIndexOf("/");
		const base = lastSlash === -1 ? lower : lower.slice(lastSlash + 1);
		const isMatch = testWildcardMatch(wildcardRegex, lower, base, cleanQuery);

		if (isMatch) {
			const score = scoreMatch(lower, cleanQuery);
			scoredMatches.push({ fid, fn, score });
			if (scoredMatches.length >= (limit ?? 2000) * 8) {
				break;
			}
		}
	}
	return scoredMatches;
};

/**
 * Cloudflare Pages Function entrypoint for trigram-based file search.
 *
 * Search execution pipeline:
 * 1. Parse query & limit from GET / POST request.
 * 2. Ensure index metadata (config, string block index, and directory table) are cached in isolate memory.
 * 3. Extract 3-char trigrams from query (or wildcard segments) and locate their entries in directory.bin.
 * 4. Fetch posting list partitions for the rarest trigrams and intersect file IDs to form candidate set.
 * 5. Stream string data partitions containing candidate filenames.
 * 6. Decode front-coded filename blocks, filter against query/regex, and calculate relevance scores.
 * 7. Slice to top matches, stream their depot partitions, and hydrate depot/build metadata.
 */
export const onRequest = async (context: EventContext): Promise<Response> => {
	const t0 = performance.now();
	try {
		// Step 1: Parse request parameters
		const request = context.request;
		const parsedReq = await parseSearchRequest(request);
		if (!parsedReq) {
			return errorResponse("Invalid JSON", 400);
		}
		const { query, limit } = parsedReq;

		const cleanQuery = query.trim().toLowerCase();
		if (!cleanQuery) {
			return jsonResponse({ matches: [], total: 0, elapsedMs: 0 });
		}

		// Step 2: Ensure binary index headers are loaded in isolate cache
		const origin = new URL(request.url).origin;
		const { cfg, dirView, blockIndex } = await ensureMeta(
			context.env,
			origin,
			true
		);
		if (!dirView) {
			return errorResponse("Directory index unavailable", 500);
		}

		// Step 3: Extract trigrams from search query and look up their posting list pointers
		const isWildcard = cleanQuery.includes("*") || cleanQuery.includes("?");
		const trigrams = extractQueryTrigrams(
			cleanQuery,
			isWildcard,
			dirView,
			cfg.numTrigrams
		);

		// If query has >= 3 chars but missing any required trigram, no file can match
		if (!trigrams || (trigrams.length === 0 && cleanQuery.length >= 3)) {
			return jsonResponse({
				matches: [],
				total: 0,
				elapsedMs: performance.now() - t0
			});
		}

		const partitionMap = new Map<number, Uint8Array>();
		const fetchPartitions = createPartitionFetcher(
			context.env,
			origin,
			partitionMap
		);

		// Step 4: Resolve candidate file IDs by intersecting posting lists of rarest trigrams
		const candidates = await selectCandidates(
			cleanQuery,
			trigrams,
			dirView,
			cfg,
			partitionMap,
			fetchPartitions,
			limit
		);

		if (candidates.length === 0) {
			return jsonResponse({
				matches: [],
				total: 0,
				elapsedMs: performance.now() - t0
			});
		}

		let wildcardRegex: RegExp | null = null;
		if (isWildcard) {
			wildcardRegex = new RegExp(compileWildcardPattern(cleanQuery), "i");
		}

		const targetCandidates = limit
			? candidates.slice(0, Math.min(candidates.length, limit * 10))
			: candidates.slice(0, 2000);

		// Step 5: Prefetch string data partitions containing candidate filenames
		await fetchFilenamePartitions(
			targetCandidates,
			cfg,
			blockIndex,
			fetchPartitions
		);

		// Step 6: Decode front-coded filenames using block cache, verify match, and score
		const blockCache = new Map<number, string[]>();
		const scoredMatches = findScoredMatches(
			targetCandidates,
			cfg,
			blockIndex,
			partitionMap,
			wildcardRegex,
			cleanQuery,
			limit,
			blockCache
		);

		// Step 7: Sort by relevance score descending, then alphabetical
		scoredMatches.sort((a, b) => b.score - a.score || a.fn.localeCompare(b.fn));
		const topMatches = scoredMatches.slice(0, limit ?? 2000);
		const matchedFileIds = topMatches.map((m) => m.fid);
		const matchedFilenames = new Map(topMatches.map((m) => [m.fid, m.fn]));

		// Step 8: Hydrate depot metadata only for winning matches
		await fetchDepotPartitions(
			matchedFileIds,
			cfg,
			partitionMap,
			fetchPartitions
		);

		const matches = matchedFileIds.map((fid) => ({
			fileId: fid,
			filename: matchedFilenames.get(fid) || "",
			depots: resolveDepots(cfg, partitionMap, fid)
		}));

		const elapsedMs = performance.now() - t0;
		return jsonResponse({
			matches,
			total: matches.length,
			elapsedMs
		});
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		return errorResponse(message, 500, {
			matches: [],
			total: 0,
			elapsedMs: performance.now() - t0
		});
	}
};
