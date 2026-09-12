/** Binary Trigram index configuration header layout. */
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

/** Directory entry record in directory.bin (16 bytes). */
export interface TrigramEntry {
	triCode: number;
	offset: number;
	byteLen: number;
	count: number;
}

/** Depot attachment info and active build version bitmask. */
export interface DepotBuildInfo {
	depotId: number;
	buildMaskLow: number;
	buildMaskHigh: number;
	builds: number[];
}

/** Candidate file match passing filename filter before depot metadata resolution. */
export interface FileCandidateMatch {
	filename: string;
	fileId: number;
}

/** Query result payload returned to main thread. */
export interface QueryResultPayload {
	total: number;
	matches: Array<{
		filename: string;
		fileId: number;
		depots: DepotBuildInfo[];
	}>;
	elapsedMs: number;
}

const utf8Decoder = new TextDecoder("utf-8", { fatal: true });
const win1252Decoder = new TextDecoder("windows-1252");

/**
 * Decodes raw filename byte sequence using UTF-8 with Windows-1252 fallback.
 */
export const decodeFilenameBytes = (bytes: Uint8Array): string => {
	try {
		return utf8Decoder.decode(bytes);
	} catch {
		return win1252Decoder.decode(bytes);
	}
};

/**
 * Sanitizes replacement characters (corrupted bytes) in filenames with underscores.
 */
export const cleanFilename = (fn: string): string => {
	if (!fn || !fn.includes("\uFFFD")) {
		return fn;
	}
	return fn.replace(/\uFFFD+/g, "_");
};

/**
 * Packs 3 ASCII bytes into an unsigned 24-bit integer trigram code.
 */
export const packTrigram = (str: string, start: number): number => {
	const b0 = str.charCodeAt(start) & 0xff;
	const b1 = str.charCodeAt(start + 1) & 0xff;
	const b2 = str.charCodeAt(start + 2) & 0xff;
	return (b0 | (b1 << 8) | (b2 << 16)) >>> 0;
};

/**
 * Performs a binary search over directory.bin for a given 24-bit trigram code.
 */
export const findTrigram = (
	dir: DataView,
	numTrigrams: number,
	triCode: number
): TrigramEntry | null => {
	let low = 0;
	let high = numTrigrams - 1;
	while (low <= high) {
		const mid = (low + high) >> 1;
		const midCode = dir.getUint32(mid * 16, true);
		if (midCode === triCode) {
			const offset = dir.getUint32(mid * 16 + 4, true);
			const byteLen = dir.getUint32(mid * 16 + 8, true);
			const count = dir.getUint32(mid * 16 + 12, true);
			return { triCode, offset, byteLen, count };
		}
		if (midCode < triCode) {
			low = mid + 1;
		} else {
			high = mid - 1;
		}
	}
	return null;
};

/**
 * Decodes Delta-encoded varints from a binary buffer.
 */
export const decodeVarints = (buf: Uint8Array): number[] => {
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
 * Two-pointer sorted array intersection.
 */
export const intersectSorted = (a: number[], b: number[]): number[] => {
	let i = 0;
	let j = 0;
	const res: number[] = [];
	const lenA = a.length;
	const lenB = b.length;

	while (i < lenA && j < lenB) {
		const valA = a[i];
		const valB = b[j];
		if (valA === valB) {
			res.push(valA);
			i++;
			j++;
		} else if (valA < valB) {
			i++;
		} else {
			j++;
		}
	}
	return res;
};

/**
 * Unpacks a single front-coded string block and fills filenameCache.
 */
export const unpackStringBlock = (
	cfg: TrigramConfig,
	blockIdx: number,
	blockBytes: Uint8Array,
	filenameCache: Map<number, string>,
	stringBlockCache: Map<number, Uint8Array>
): void => {
	stringBlockCache.set(blockIdx, blockBytes);
	let p = 0;
	const firstLen = blockBytes[p++];
	let prevBytes = blockBytes.subarray(p, p + firstLen);
	p += firstLen;

	const BLOCK_SIZE = cfg.blockSize || 16;
	const baseFileId = blockIdx * BLOCK_SIZE;
	filenameCache.set(baseFileId, cleanFilename(decodeFilenameBytes(prevBytes)));

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
		filenameCache.set(
			baseFileId + i,
			cleanFilename(decodeFilenameBytes(prevBytes))
		);
	}
};

/**
 * Reads a variable-length 32-bit unsigned integer from a byte buffer at the given offset.
 */
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
	return value;
};

/**
 * Reads a variable-length 64-bit unsigned integer (as BigInt) from a byte buffer at the given offset.
 */
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

/**
 * Expands a 64-bit build bitmask into an array of active build version indices.
 */
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
 * Decodes delta-encoded depot IDs and build version bitmasks from raw metadata bytes.
 */
export const decodeDepotsFromBytes = (
	metaDataBytes: Uint8Array
): DepotBuildInfo[] => {
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
