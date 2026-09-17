import { describe, it, expect } from "vitest";
import {
	packTrigram,
	decodeFilenameBytes,
	cleanFilename,
	decodeVarints,
	intersectSorted,
	maskToBuilds,
	readVarint32,
	readVarint64
} from "../src/workers/trigramBinary";

describe("packTrigram", () => {
	it("packs 3 ASCII bytes into 24-bit unsigned integer", () => {
		// 'abc': 'a'=0x61, 'b'=0x62, 'c'=0x63
		// result = 0x61 | (0x62 << 8) | (0x63 << 16) = 0x636261
		const code = packTrigram("abc", 0);
		expect(code).toBe(0x636261);
	});

	it("extracts from arbitrary offset in string", () => {
		const code = packTrigram("gaben", 2); // "ben"
		const expected =
			"b".charCodeAt(0) | ("e".charCodeAt(0) << 8) | ("n".charCodeAt(0) << 16);
		expect(code).toBe(expected);
	});
});

describe("decodeFilenameBytes & cleanFilename", () => {
	it("decodes UTF-8 bytes to string", () => {
		const bytes = new TextEncoder().encode("hl2/resource/game.txt");
		expect(decodeFilenameBytes(bytes)).toBe("hl2/resource/game.txt");
	});

	it("sanitizes replacement characters", () => {
		expect(cleanFilename("test\uFFFD\uFFFDfile.dat")).toBe("test_file.dat");
	});
});

describe("decodeVarints", () => {
	it("decodes delta-encoded varints from binary buffer", () => {
		// Deltas: 5, 10, 2 -> Values: 5, 15, 17
		// Each <= 127, so 1 byte each: [0x05, 0x0a, 0x02]
		const buf = new Uint8Array([5, 10, 2]);
		expect(decodeVarints(buf)).toEqual([5, 15, 17]);
	});

	it("handles multi-byte LEB128 varints", () => {
		// 300 = 0x12c -> 0xac 0x02
		const buf = new Uint8Array([0xac, 0x02]);
		expect(decodeVarints(buf)).toEqual([300]);
	});
});

describe("intersectSorted", () => {
	it("finds intersection of two sorted arrays", () => {
		expect(intersectSorted([1, 3, 5, 7, 9], [2, 3, 4, 7, 10])).toEqual([3, 7]);
	});

	it("handles disjoint arrays", () => {
		expect(intersectSorted([1, 2, 3], [4, 5, 6])).toEqual([]);
	});

	it("handles empty arrays", () => {
		expect(intersectSorted([], [1, 2])).toEqual([]);
		expect(intersectSorted([1, 2], [])).toEqual([]);
	});
});

describe("maskToBuilds", () => {
	it("expands 64-bit BigInt mask to array of active build version indices", () => {
		// bit 0 and bit 2 set: 1 | 4 = 5n
		expect(maskToBuilds(5n)).toEqual([0, 2]);

		// empty mask
		expect(maskToBuilds(0n)).toEqual([]);

		// bit 35
		expect(maskToBuilds(1n << 35n)).toEqual([35]);
	});
});

describe("readVarint32 and readVarint64", () => {
	it("reads single byte and multi-byte varints with mutable offset pointer", () => {
		const bytes = new Uint8Array([0x05, 0xac, 0x02]);
		const offset = { p: 0 };

		const v1 = readVarint32(bytes, offset);
		expect(v1).toBe(5);
		expect(offset.p).toBe(1);

		const v2 = readVarint32(bytes, offset);
		expect(v2).toBe(300);
		expect(offset.p).toBe(3);
	});

	it("reads 64-bit varints as BigInt", () => {
		const bytes = new Uint8Array([0x80, 0x80, 0x80, 0x80, 0x10]);
		const offset = { p: 0 };
		const v = readVarint64(bytes, offset);
		expect(v).toBe(4294967296n);
	});
});
