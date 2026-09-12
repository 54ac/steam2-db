export interface Env {
	ASSETS: {
		fetch: (request: Request | string) => Promise<Response>;
	};
}

export interface EventContext {
	request: Request;
	env: Env;
}

export interface TrigramConfig {
	version: number;
	numTrigrams: number;
	numFiles: number;
	blockSize: number;
	partSize: number;
	offsetPostings: number;
	postingsSize: number;
	offsetStringBlockIndex: number;
	offsetStringData: number;
	offsetFileDepotIndex: number;
	offsetFileDepotData: number;
	totalBinarySize: number;
}

export interface TrigramEntry {
	triCode: number;
	offset: number;
	byteLen: number;
	count: number;
}

export interface DepotBuildInfo {
	depotId: number;
	buildMaskLow: number;
	buildMaskHigh: number;
	builds: number[];
}

const utf8Decoder = new TextDecoder("utf-8", { fatal: true });
const win1252Decoder = new TextDecoder("windows-1252");

const decodeFilenameBytes = (bytes: Uint8Array): string => {
	try {
		return utf8Decoder.decode(bytes);
	} catch {
		return win1252Decoder.decode(bytes);
	}
};

export const cleanFilename = (fn: string): string => {
	if (!fn || !fn.includes("\uFFFD")) {
		return fn;
	}
	return fn.replace(/\uFFFD+/g, "_");
};

const TRIGRAMS_BASE = "/trigrams";

let configPromise: Promise<TrigramConfig> | null = null;
let blockIndexPromise: Promise<DataView> | null = null;
let dirViewPromise: Promise<DataView> | null = null;

/**
 * Loads and caches binary index metadata headers in isolate memory.
 * Reuses DataViews across requests on the same isolate for zero-latency lookups.
 */
export const ensureMeta = async (
	env: Env,
	origin: string,
	includeDirectory = false
): Promise<{
	cfg: TrigramConfig;
	blockIndex: DataView;
	dirView?: DataView;
}> => {
	if (!configPromise) {
		configPromise = env.ASSETS.fetch(`${origin}${TRIGRAMS_BASE}/config.json`)
			.then(async (res) => {
				if (!res.ok) {
					throw new Error("Failed to load trigram config.");
				}
				return (await res.json()) as TrigramConfig;
			})
			.catch((err) => {
				configPromise = null;
				throw err;
			});
	}

	if (!blockIndexPromise) {
		blockIndexPromise = env.ASSETS.fetch(
			`${origin}${TRIGRAMS_BASE}/string_index.bin`
		)
			.then(async (res) => {
				if (!res.ok) {
					throw new Error("Failed to load string index.");
				}
				return new DataView(await res.arrayBuffer());
			})
			.catch((err) => {
				blockIndexPromise = null;
				throw err;
			});
	}

	if (includeDirectory && !dirViewPromise) {
		dirViewPromise = env.ASSETS.fetch(`${origin}${TRIGRAMS_BASE}/directory.bin`)
			.then(async (res) => {
				if (!res.ok) {
					throw new Error("Failed to load directory.");
				}
				return new DataView(await res.arrayBuffer());
			})
			.catch((err) => {
				dirViewPromise = null;
				throw err;
			});
	}

	const [cfg, blockIndex, dirView] = await Promise.all([
		configPromise,
		blockIndexPromise,
		dirViewPromise ?? Promise.resolve(undefined)
	]);

	return {
		cfg,
		blockIndex,
		dirView
	};
};

/**
 * Reads binary bytes from partition slices spanning arbitrary offsets.
 * Optimizes single-partition ranges with zero-copy subarray views.
 */
export const readGlobalBytes = (
	cfg: TrigramConfig,
	partitionMap: Map<number, Uint8Array>,
	globalOffset: number,
	length: number
): Uint8Array => {
	if (length <= 0) {
		return new Uint8Array(0);
	}
	const PART_SIZE = cfg.partSize;
	const startPart = Math.floor(globalOffset / PART_SIZE);
	const endPart = Math.floor((globalOffset + length - 1) / PART_SIZE);

	if (startPart === endPart) {
		const partBuf = partitionMap.get(startPart);
		if (!partBuf) {
			return new Uint8Array(length);
		}
		const localStart = globalOffset % PART_SIZE;
		return partBuf.subarray(localStart, localStart + length);
	}

	const result = new Uint8Array(length);
	let written = 0;
	let curOff = globalOffset;
	let rem = length;

	while (rem > 0) {
		const pIdx = Math.floor(curOff / PART_SIZE);
		const lStart = curOff % PART_SIZE;
		const toRead = Math.min(rem, PART_SIZE - lStart);
		const pBuf = partitionMap.get(pIdx);
		if (pBuf) {
			result.set(pBuf.subarray(lStart, lStart + toRead), written);
		}
		written += toRead;
		curOff += toRead;
		rem -= toRead;
	}

	return result;
};

/**
 * Creates a partition fetcher callback that caches partition buffers into partitionMap in parallel.
 */
export const createPartitionFetcher = (
	env: Env,
	origin: string,
	partitionMap: Map<number, Uint8Array>
) => {
	return async (partIndices: number[]): Promise<void> => {
		const toFetch = partIndices.filter((idx) => !partitionMap.has(idx));
		if (toFetch.length === 0) {
			return;
		}
		await Promise.all(
			toFetch.map(async (partIdx) => {
				const res = await env.ASSETS.fetch(
					`${origin}${TRIGRAMS_BASE}/files_${partIdx}.bin`
				);
				if (res.ok) {
					const buf = await res.arrayBuffer();
					partitionMap.set(partIdx, new Uint8Array(buf));
				}
			})
		);
	};
};

/**
 * Resolves and decodes filename for a fileId from front-coded string blocks.
 * Supports an optional per-request decoded block cache for 5-10x speedup when
 * candidate files share adjacent directory blocks.
 */
export const resolveFilename = (
	cfg: TrigramConfig,
	blockIndex: DataView,
	partitionMap: Map<number, Uint8Array>,
	fileId: number,
	blockCache?: Map<number, string[]>
): string => {
	const BLOCK_SIZE = cfg.blockSize || 16;
	const blockIdx = Math.floor(fileId / BLOCK_SIZE);
	const localIdx = fileId % BLOCK_SIZE;

	if (blockCache) {
		const cachedBlock = blockCache.get(blockIdx);
		if (cachedBlock) {
			return cachedBlock[localIdx] || "";
		}
	}

	const startOff = blockIndex.getUint32(blockIdx * 4, true);
	const endOff = blockIndex.getUint32((blockIdx + 1) * 4, true);
	const blockLen = endOff - startOff;
	if (blockLen <= 0) {
		return "";
	}

	const blockBytes = readGlobalBytes(
		cfg,
		partitionMap,
		cfg.offsetStringData + startOff,
		blockLen
	);
	if (blockBytes.length === 0) {
		return "";
	}

	const strings: string[] = [];
	let p = 0;
	const firstLen = blockBytes[p++];
	let prevBytes = blockBytes.subarray(p, p + firstLen);
	p += firstLen;
	strings.push(cleanFilename(decodeFilenameBytes(prevBytes)));

	for (let i = 1; i < BLOCK_SIZE; i++) {
		if (p >= blockBytes.length) {
			break;
		}
		const common = blockBytes[p++];
		const suffixLen = blockBytes[p++];
		const suffix = blockBytes.subarray(p, p + suffixLen);
		p += suffixLen;

		const curBytes = new Uint8Array(common + suffixLen);
		curBytes.set(prevBytes.subarray(0, common), 0);
		curBytes.set(suffix, common);
		prevBytes = curBytes;
		strings.push(cleanFilename(decodeFilenameBytes(prevBytes)));
	}

	if (blockCache) {
		blockCache.set(blockIdx, strings);
	}

	return strings[localIdx] || "";
};

export const readVarint32 = (
	bytes: Uint8Array,
	offset: { p: number }
): number => {
	let value = 0;
	let shift = 0;
	while (offset.p < bytes.length) {
		const b = bytes[offset.p++];
		value |= (b & 0x7f) << shift;
		if (!(b & 0x80)) {
			break;
		}
		shift += 7;
	}
	return value >>> 0;
};

export const readVarint64 = (
	bytes: Uint8Array,
	offset: { p: number }
): bigint => {
	let mask = 0n;
	let bShift = 0n;
	while (offset.p < bytes.length) {
		const b = BigInt(bytes[offset.p++]);
		mask |= (b & 0x7fn) << bShift;
		if (!(b & 0x80n)) {
			break;
		}
		bShift += 7n;
	}
	return mask;
};

export const maskToBuilds = (mask: bigint): number[] => {
	const builds: number[] = [];
	for (let bit = 0; bit < 64; bit++) {
		if ((mask & (1n << BigInt(bit))) !== 0n) {
			builds.push(bit);
		}
	}
	return builds;
};

/**
 * Reads and decodes delta-varint depot affiliations and build bitmasks for a fileId.
 */
export const resolveDepots = (
	cfg: TrigramConfig,
	partitionMap: Map<number, Uint8Array>,
	fileId: number
): DepotBuildInfo[] => {
	const indexBytes = readGlobalBytes(
		cfg,
		partitionMap,
		cfg.offsetFileDepotIndex + fileId * 4,
		8
	);
	if (indexBytes.byteLength < 8) {
		return [];
	}
	const indexView = new DataView(
		indexBytes.buffer,
		indexBytes.byteOffset,
		indexBytes.byteLength
	);
	const startOff = indexView.getUint32(0, true);
	const endOff = indexView.getUint32(4, true);
	const dataLen = endOff - startOff;
	if (dataLen <= 0) {
		return [];
	}

	const metaDataBytes = readGlobalBytes(
		cfg,
		partitionMap,
		cfg.offsetFileDepotData + startOff,
		dataLen
	);

	const offset = { p: 0 };
	const depotCount = readVarint32(metaDataBytes, offset);

	const depots: DepotBuildInfo[] = [];
	let prevDepot = 0;
	for (let d = 0; d < depotCount; d++) {
		const delta = readVarint32(metaDataBytes, offset);
		const depotId = prevDepot + delta;
		prevDepot = depotId;

		const mask = readVarint64(metaDataBytes, offset);
		const builds = maskToBuilds(mask);

		depots.push({
			depotId,
			buildMaskLow: Number(mask & 0xffffffffn),
			buildMaskHigh: Number((mask >> 32n) & 0xffffffffn),
			builds
		});
	}

	return depots;
};

/**
 * Determines and pre-fetches string data partitions for given file IDs.
 */
export const fetchFilenamePartitions = async (
	fileIds: number[],
	cfg: TrigramConfig,
	blockIndex: DataView,
	fetchPartitions: (indices: number[]) => Promise<void>
): Promise<void> => {
	if (fileIds.length === 0) {
		return;
	}
	const PART_SIZE = cfg.partSize;
	const BLOCK_SIZE = cfg.blockSize || 16;
	const parts = new Set<number>();

	for (const fid of fileIds) {
		const blockIdx = Math.floor(fid / BLOCK_SIZE);
		const startOff = blockIndex.getUint32(blockIdx * 4, true);
		parts.add(Math.floor((cfg.offsetStringData + startOff) / PART_SIZE));
	}
	if (parts.size > 0) {
		await fetchPartitions(Array.from(parts));
	}
};

/**
 * Determines and pre-fetches depot index and data partitions for matched candidate file IDs.
 */
export const fetchDepotPartitions = async (
	matchedFileIds: number[],
	cfg: TrigramConfig,
	partitionMap: Map<number, Uint8Array>,
	fetchPartitions: (indices: number[]) => Promise<void>
): Promise<void> => {
	if (matchedFileIds.length === 0) {
		return;
	}

	const PART_SIZE = cfg.partSize;
	const indexParts = new Set<number>();
	for (const fid of matchedFileIds) {
		indexParts.add(
			Math.floor((cfg.offsetFileDepotIndex + fid * 4) / PART_SIZE)
		);
	}
	await fetchPartitions(Array.from(indexParts));

	const dataParts = new Set<number>();
	for (const fid of matchedFileIds) {
		const indexBytes = readGlobalBytes(
			cfg,
			partitionMap,
			cfg.offsetFileDepotIndex + fid * 4,
			8
		);
		if (indexBytes.byteLength < 8) {
			continue;
		}
		const indexView = new DataView(
			indexBytes.buffer,
			indexBytes.byteOffset,
			indexBytes.byteLength
		);
		const startOff = indexView.getUint32(0, true);
		const endOff = indexView.getUint32(4, true);
		if (endOff > startOff) {
			dataParts.add(
				Math.floor((cfg.offsetFileDepotData + startOff) / PART_SIZE)
			);
			dataParts.add(
				Math.floor((cfg.offsetFileDepotData + endOff - 1) / PART_SIZE)
			);
		}
	}
	if (dataParts.size > 0) {
		await fetchPartitions(Array.from(dataParts));
	}
};

/**
 * Standard JSON response constructor with immutable CDN caching and CORS headers.
 */
export const jsonResponse = (
	data: unknown,
	status = 200,
	maxAge = 86400
): Response => {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			"Content-Type": "application/json",
			"Cache-Control": `public, max-age=${maxAge}, immutable`,
			"Access-Control-Allow-Origin": "*"
		}
	});
};

/**
 * Standard error response constructor with JSON payload and CORS headers.
 */
export const errorResponse = (
	message: string,
	status = 500,
	extra: Record<string, unknown> = {}
): Response => {
	return new Response(JSON.stringify({ error: message, ...extra }), {
		status,
		headers: {
			"Content-Type": "application/json",
			"Access-Control-Allow-Origin": "*"
		}
	});
};
