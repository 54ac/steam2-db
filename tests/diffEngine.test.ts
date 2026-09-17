import { describe, it, expect } from "vitest";
import {
	calculateManifestDiff,
	getOrCalculateManifestDiff
} from "../src/utils/diffEngine";
import type { ManifestFile } from "../src/types";

describe("calculateManifestDiff", () => {
	it("detects added files in build B", () => {
		const filesA: ManifestFile[] = [];
		const filesB: ManifestFile[] = [
			{ p: "bin/client.dll", s: 2048, c: "abcd1234" }
		];

		const diff = calculateManifestDiff(filesA, filesB);
		expect(diff.addedCount).toBe(1);
		expect(diff.removedCount).toBe(0);
		expect(diff.modifiedCount).toBe(0);
		expect(diff.unchangedCount).toBe(0);
		expect(diff.netSizeDiff).toBe(2048);
		expect(diff.entries[0]).toEqual({
			path: "bin/client.dll",
			status: "added",
			sizeB: 2048,
			sizeDiff: 2048,
			crcB: "abcd1234"
		});
	});

	it("detects removed files missing from build B", () => {
		const filesA: ManifestFile[] = [{ p: "hl2.exe", s: 1024, c: "11112222" }];
		const filesB: ManifestFile[] = [];

		const diff = calculateManifestDiff(filesA, filesB);
		expect(diff.addedCount).toBe(0);
		expect(diff.removedCount).toBe(1);
		expect(diff.modifiedCount).toBe(0);
		expect(diff.unchangedCount).toBe(0);
		expect(diff.netSizeDiff).toBe(-1024);
		expect(diff.entries[0]).toEqual({
			path: "hl2.exe",
			status: "removed",
			sizeA: 1024,
			sizeDiff: -1024,
			crcA: "11112222"
		});
	});

	it("detects modified files when size or CRC changes", () => {
		const filesA: ManifestFile[] = [
			{ p: "materials/wood.vtf", s: 4000, c: "aaaa1111" },
			{ p: "materials/metal.vtf", s: 3000, c: "bbbb2222" }
		];
		const filesB: ManifestFile[] = [
			{ p: "materials/wood.vtf", s: 5000, c: "aaaa1111" }, // size change
			{ p: "materials/metal.vtf", s: 3000, c: "cccc3333" } // crc change
		];

		const diff = calculateManifestDiff(filesA, filesB);
		expect(diff.modifiedCount).toBe(2);
		expect(diff.netSizeDiff).toBe(1000);

		const wood = diff.entries.find((e) => e.path === "materials/wood.vtf");
		expect(wood?.status).toBe("modified");
		expect(wood?.sizeDiff).toBe(1000);

		const metal = diff.entries.find((e) => e.path === "materials/metal.vtf");
		expect(metal?.status).toBe("modified");
		expect(metal?.sizeDiff).toBe(0);
	});

	it("classifies identical files as unchanged", () => {
		const filesA: ManifestFile[] = [{ p: "readme.txt", s: 100, c: "beef1234" }];
		const filesB: ManifestFile[] = [{ p: "readme.txt", s: 100, c: "beef1234" }];

		const diff = calculateManifestDiff(filesA, filesB);
		expect(diff.unchangedCount).toBe(1);
		expect(diff.entries[0].status).toBe("unchanged");
		expect(diff.netSizeDiff).toBe(0);
	});

	it("sorts results by status rank (added -> modified -> removed -> unchanged)", () => {
		const filesA: ManifestFile[] = [
			{ p: "same.txt", s: 10, c: "c1" },
			{ p: "old.txt", s: 20, c: "c2" },
			{ p: "mod.txt", s: 30, c: "c3" }
		];
		const filesB: ManifestFile[] = [
			{ p: "same.txt", s: 10, c: "c1" },
			{ p: "new.txt", s: 40, c: "c4" },
			{ p: "mod.txt", s: 50, c: "c5" }
		];

		const diff = calculateManifestDiff(filesA, filesB);
		const statuses = diff.entries.map((e) => e.status);
		expect(statuses).toEqual(["added", "modified", "removed", "unchanged"]);
	});
});

describe("getOrCalculateManifestDiff cache", () => {
	it("returns cached diff summary on second call", () => {
		const filesA: ManifestFile[] = [{ p: "a.txt", s: 10 }];
		const filesB: ManifestFile[] = [{ p: "a.txt", s: 20 }];

		const res1 = getOrCalculateManifestDiff(220, 0, 1, filesA, filesB);
		const res2 = getOrCalculateManifestDiff(220, 0, 1, filesA, filesB);
		expect(res1).toBe(res2);
	});
});
