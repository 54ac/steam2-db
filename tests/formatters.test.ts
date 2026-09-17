import { describe, it, expect } from "vitest";
import {
	formatBytes,
	formatBuildDate,
	formatReleaseDate,
	formatDeveloper,
	getEarliestDate,
	formatBuildRanges,
	getReleaseDelta,
	isGenericDepotName,
	getDepotDisplayName,
	getDepotPageTitle,
	cleanFilename
} from "../src/utils/formatters";
import type { DepotItem } from "../src/types";

describe("formatBytes", () => {
	it("returns fallback for empty, zero, or negative values", () => {
		expect(formatBytes()).toBe("0 B");
		expect(formatBytes(0)).toBe("0 B");
		expect(formatBytes(-100)).toBe("0 B");
		expect(formatBytes(NaN)).toBe("0 B");
		expect(formatBytes(0, "N/A")).toBe("N/A");
	});

	it("formats byte values into human-readable units", () => {
		expect(formatBytes(500)).toBe("500.00 B");
		expect(formatBytes(1024)).toBe("1.00 KB");
		expect(formatBytes(1536)).toBe("1.50 KB");
		expect(formatBytes(1048576)).toBe("1.00 MB");
		expect(formatBytes(1073741824)).toBe("1.00 GB");
		expect(formatBytes(1099511627776)).toBe("1.00 TB");
	});
});

describe("formatBuildDate", () => {
	it("returns dash for falsy values", () => {
		expect(formatBuildDate()).toBe("—");
		expect(formatBuildDate("")).toBe("—");
	});

	it("formats ISO timestamps with timezone offsets", () => {
		expect(formatBuildDate("2004-11-16T14:30:00+00:00")).toBe(
			"2004-11-16 14:30"
		);
	});

	it("truncates standard date strings to 16 characters", () => {
		expect(formatBuildDate("2004-11-16 14:30:00")).toBe("2004-11-16 14:30");
	});
});

describe("formatReleaseDate", () => {
	it("returns dash for missing values", () => {
		expect(formatReleaseDate()).toBe("—");
		expect(formatReleaseDate("")).toBe("—");
	});

	it("preserves valid YYYY-MM-DD strings", () => {
		expect(formatReleaseDate("2004-11-16")).toBe("2004-11-16");
	});

	it("converts year-only strings to January 1st", () => {
		expect(formatReleaseDate("2004")).toBe("2004-01-01");
	});

	it("parses valid UTC date strings into ISO format", () => {
		expect(formatReleaseDate("2004-11-16T12:00:00Z")).toBe("2004-11-16");
	});
});

describe("formatDeveloper", () => {
	it("returns empty string when no developer provided", () => {
		expect(formatDeveloper()).toBe("");
		expect(formatDeveloper("")).toBe("");
	});

	it("normalizes comma- and semicolon-separated strings", () => {
		expect(formatDeveloper("Valve; Valve Corporation, Valve")).toBe(
			"Valve, Valve Corporation, Valve"
		);
		expect(formatDeveloper("  Valve ,  Hidden Path  ")).toBe(
			"Valve, Hidden Path"
		);
	});
});

describe("getEarliestDate", () => {
	it("returns minDate or maxDate fallback", () => {
		expect(
			getEarliestDate({ minDate: "2004-01-01", maxDate: "2004-12-31" })
		).toBe("2004-01-01");
		expect(getEarliestDate({ minDate: undefined, maxDate: "2004-12-31" })).toBe(
			"2004-12-31"
		);
		expect(
			getEarliestDate({ minDate: undefined, maxDate: undefined })
		).toBeUndefined();
	});
});

describe("formatBuildRanges", () => {
	it("returns dash for empty array or undefined", () => {
		expect(formatBuildRanges()).toBe("—");
		expect(formatBuildRanges([])).toBe("—");
	});

	it("formats single and contiguous build ranges", () => {
		expect(formatBuildRanges([0])).toBe("v0");
		expect(formatBuildRanges([0, 1, 2])).toBe("v0–v2");
		expect(formatBuildRanges([0, 1, 2, 4, 5, 7])).toBe("v0–v2, v4–v5, v7");
	});

	it("truncates lists with more than 3 distinct ranges", () => {
		expect(formatBuildRanges([1, 3, 5, 7])).toBe("v1, v3, ... (+2 more)");
	});
});

describe("getReleaseDelta", () => {
	it("returns null days when build or release date is missing", () => {
		expect(getReleaseDelta()).toEqual({
			days: null,
			label: "—",
			isPreRelease: false,
			isPostRelease: false
		});
		expect(getReleaseDelta("2004-11-16")).toEqual({
			days: null,
			label: "—",
			isPreRelease: false,
			isPostRelease: false
		});
	});

	it("identifies pre-release builds correctly", () => {
		const res = getReleaseDelta("2004-10-01", "2004-11-16");
		expect(res.isPreRelease).toBe(true);
		expect(res.isPostRelease).toBe(false);
		expect(res.days).toBe(-46);
		expect(res.label).toBe("-46d");
	});

	it("identifies post-release builds correctly", () => {
		const res = getReleaseDelta("2004-12-01", "2004-11-16");
		expect(res.isPreRelease).toBe(false);
		expect(res.isPostRelease).toBe(true);
		expect(res.days).toBe(15);
		expect(res.label).toBe("+15d");
	});

	it("handles same-day build and release", () => {
		const res = getReleaseDelta("2004-11-16", "2004-11-16");
		expect(res.days).toBe(0);
		expect(res.label).toBe("0d");
		expect(res.isPreRelease).toBe(false);
		expect(res.isPostRelease).toBe(false);
	});
});

describe("isGenericDepotName & getDepotDisplayName", () => {
	it("identifies generic role names", () => {
		expect(isGenericDepotName("data")).toBe(true);
		expect(isGenericDepotName("Content")).toBe(true);
		expect(isGenericDepotName("PC Data")).toBe(true);
		expect(isGenericDepotName("main")).toBe(true);
		expect(isGenericDepotName("Half-Life 2 Content")).toBe(false);
	});

	it("qualifies generic depot titles with game title", () => {
		const info = getDepotDisplayName({
			id: 221,
			depot: "data",
			game: "Half-Life 2"
		});
		expect(info.primaryTitle).toBe("Half-Life 2 Data");
		expect(info.subtitle).toBe("Half-Life 2");
		expect(info.chipName).toBe("Data");
	});

	it("returns depot name when specific", () => {
		const info = getDepotDisplayName({
			id: 220,
			depot: "Half-Life 2 Base",
			game: "Half-Life 2"
		});
		expect(info.primaryTitle).toBe("Half-Life 2 Base");
		expect(info.subtitle).toBe("Half-Life 2");
		expect(info.chipName).toBe("Half-Life 2 Base");
	});

	it("falls back to Depot <id> when unnamed", () => {
		const info = getDepotDisplayName({ id: 999 });
		expect(info.primaryTitle).toBe("—");
		expect(info.chipName).toBe("Depot 999");
	});
});

describe("getDepotPageTitle", () => {
	it("returns default title when depot is null", () => {
		expect(getDepotPageTitle(null)).toBe("Steam2 Browser");
	});

	it("includes depot title and build date", () => {
		const depot: DepotItem = {
			id: 220,
			game: "Half-Life 2",
			dumpSize: 1000,
			builds: [{ version: 0, date: "2004-11-16", crc32: "12345678" }]
		};
		expect(getDepotPageTitle(depot, 0)).toBe(
			"Steam2 Browser: Half-Life 2 (2004-11-16)"
		);
	});
});

describe("cleanFilename", () => {
	it("replaces Unicode replacement chars with underscore", () => {
		expect(cleanFilename("normal_file.txt")).toBe("normal_file.txt");
		expect(cleanFilename("corrupted\uFFFD\uFFFDname.txt")).toBe(
			"corrupted_name.txt"
		);
		expect(cleanFilename()).toBe("");
	});
});
