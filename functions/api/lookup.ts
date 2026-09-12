import {
	type EventContext,
	ensureMeta,
	resolveFilename,
	resolveDepots,
	createPartitionFetcher,
	fetchFilenamePartitions,
	fetchDepotPartitions,
	jsonResponse,
	errorResponse
} from "./_trigram";

/**
 * Parses file IDs from the incoming HTTP request.
 *
 * Supports two request formats:
 * 1. POST request with JSON body: `{ "ids": [10, 20, 30] }`
 * 2. GET request with query parameter: `?ids=10,20,30`
 *
 * Returns:
 * - `number[]`: successfully parsed array of non-negative integer file IDs.
 * - `null`: if a POST request body contains invalid JSON.
 */
const parseIdsFromRequest = async (
	request: Request
): Promise<number[] | null> => {
	if (request.method === "POST") {
		try {
			const body = (await request.json()) as { ids?: number[] };
			return Array.isArray(body.ids) ? body.ids : [];
		} catch {
			// Malformed JSON in request payload
			return null;
		}
	}
	const url = new URL(request.url);
	const idsParam = url.searchParams.get("ids");
	if (idsParam) {
		return idsParam
			.split(",")
			.map((s) => parseInt(s, 10))
			.filter((n) => !isNaN(n));
	}
	return [];
};

/**
 * Cloudflare Pages Function endpoint: GET/POST /api/lookup
 *
 * Resolves file metadata (full filename path and containing depot IDs)
 * for a batch of file IDs (0 to 4.15M) without performing a full search.
 *
 * Execution flow:
 * 1. Parse and validate file IDs from request (POST body or GET query param).
 * 2. Load global trigram metadata configuration and compressed filename block index (`ensureMeta`).
 * 3. Filter IDs to valid range [0, numFiles) and cap to 200 items per batch to prevent DoS.
 * 4. Fetch only the required binary partitions in parallel (both filename partitions and depot partitions).
 * 5. Resolve filenames (with an in-memory blockCache to prevent duplicate decompression) and depot associations.
 * 6. Return results with aggressive caching (1 year) since historical archive data is static and immutable.
 */
export const onRequest = async (context: EventContext): Promise<Response> => {
	try {
		const request = context.request;
		const url = new URL(request.url);

		// Extract target file IDs from request payload or query string
		const ids = await parseIdsFromRequest(request);
		if (ids === null) {
			return errorResponse("Invalid JSON", 400);
		}

		if (ids.length === 0) {
			return jsonResponse({ results: [] }, 200, 31536000);
		}

		const origin = url.origin;
		// Load static trigram metadata and filename block index (cached across requests in global scope)
		const { cfg, blockIndex } = await ensureMeta(context.env, origin);

		// Validate bounds: ensure file ID is within valid archive range, capped at 200 items per request
		const targetIds = Array.from(
			new Set(ids.filter((fid) => fid >= 0 && fid < cfg.numFiles))
		).slice(0, 200);

		if (targetIds.length === 0) {
			return jsonResponse({ results: [] }, 200, 31536000);
		}

		// Map to store fetched binary partition chunks in memory for this request
		const partitionMap = new Map<number, Uint8Array>();
		const fetchPartitions = createPartitionFetcher(
			context.env,
			origin,
			partitionMap
		);

		// Concurrently fetch only the partition chunks needed for the requested file IDs:
		// - Filename partitions (deflate-compressed filename blocks)
		// - Depot partitions (bitpacked depot lists mapping fileId -> depotIds)
		await Promise.all([
			fetchFilenamePartitions(targetIds, cfg, blockIndex, fetchPartitions),
			fetchDepotPartitions(targetIds, cfg, partitionMap, fetchPartitions)
		]);

		// Cache decompressed blocks during this request so file IDs in the same block don't re-inflate
		const blockCache = new Map<number, string[]>();
		const results = targetIds.map((fileId) => ({
			fileId,
			filename: resolveFilename(
				cfg,
				blockIndex,
				partitionMap,
				fileId,
				blockCache
			),
			depots: resolveDepots(cfg, partitionMap, fileId)
		}));

		// Return metadata with 1-year immutable cache header
		return jsonResponse({ results }, 200, 31536000);
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		return errorResponse(message, 500, { results: [] });
	}
};
