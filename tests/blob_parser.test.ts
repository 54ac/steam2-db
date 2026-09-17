import { describe, it, expect } from "vitest";
import zlib from "node:zlib";
import { readBlobKV } from "../pipeline/lib/blob_parser";

describe("readBlobKV", () => {
	it("throws error for invalid blob magic bytes", () => {
		const buf = Buffer.alloc(32);
		buf.writeUInt16LE(0x1234, 0); // Invalid magic
		expect(() => readBlobKV(buf)).toThrow("Unknown blob magic 0x1234");
	});

	it("parses uncompressed key-value blob correctly", () => {
		const keyBuf = Buffer.from([0, 0, 0, 0]);
		const valBuf = Buffer.alloc(4);
		valBuf.writeUInt32LE(42, 0);

		const entryLen = 2 + 4 + keyBuf.length + valBuf.length;
		const totalSize = 10 + entryLen;

		const buf = Buffer.alloc(totalSize);
		buf.writeUInt16LE(0x5001, 0);
		buf.writeUInt32LE(totalSize, 2);

		let p = 10;
		buf.writeUInt16LE(keyBuf.length, p);
		p += 2;
		buf.writeUInt32LE(valBuf.length, p);
		p += 4;
		keyBuf.copy(buf, p);
		p += keyBuf.length;
		valBuf.copy(buf, p);

		const kv = readBlobKV(buf);
		expect(kv.size).toBe(1);
		const parsedVal = kv.get("00000000");
		expect(parsedVal).toBeDefined();
		expect(parsedVal?.readUInt32LE(0)).toBe(42);
	});

	it("parses zlib-compressed blob correctly", () => {
		const keyBuf = Buffer.from([1, 0, 0, 0]);
		const valBuf = Buffer.from("gaben", "utf8");

		const entryLen = 2 + 4 + keyBuf.length + valBuf.length;
		const innerSize = 10 + entryLen;

		const innerBuf = Buffer.alloc(innerSize);
		innerBuf.writeUInt32LE(innerSize, 2);

		let p = 10;
		innerBuf.writeUInt16LE(keyBuf.length, p);
		p += 2;
		innerBuf.writeUInt32LE(valBuf.length, p);
		p += 4;
		keyBuf.copy(innerBuf, p);
		p += keyBuf.length;
		valBuf.copy(innerBuf, p);

		const deflated = zlib.deflateSync(innerBuf);

		const outerBuf = Buffer.alloc(20 + deflated.length);
		outerBuf.writeUInt16LE(0x4301, 0);
		deflated.copy(outerBuf, 20);

		const kv = readBlobKV(outerBuf);
		expect(kv.size).toBe(1);
		const parsedVal = kv.get("01000000");
		expect(parsedVal).toBeDefined();
		expect(parsedVal?.toString("utf8")).toBe("gaben");
	});
});
