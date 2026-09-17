import { describe, it, expect } from "vitest";
import {
	createSearchMatcher,
	calculateCatalogStats,
	buildAppCatalog,
	calculateAppStats,
	filterAndSortDepots,
	filterAndSortApps
} from "../src/utils/searchFilter";
import type { DepotItem, AppRecord, AppGroup } from "../src/types";

describe("createSearchMatcher", () => {
	it("matches everything when query is empty or whitespace", () => {
		const matcher = createSearchMatcher("   ");
		expect(matcher(220, [], ["Half-Life 2", "Valve"])).toBe(true);
	});

	it("matches numerical depot/app ID exactly or partially", () => {
		const matcher = createSearchMatcher("220");
		expect(matcher(220, [], ["Half-Life 2"])).toBe(true);
		expect(matcher(300, [220], ["Counter-Strike"])).toBe(true);
		expect(matcher(400, [], ["Portal"])).toBe(false);
	});

	it("performs case-insensitive substring search", () => {
		const matcher = createSearchMatcher("valve");
		expect(matcher(220, [], ["Half-Life 2", "Valve Corporation"])).toBe(true);
		expect(matcher(300, [], ["Some Game", "Other Studio"])).toBe(false);
	});

	it("handles exact phrase matching in quotes", () => {
		const matcher = createSearchMatcher('"Half-Life"');
		expect(matcher(220, [], ["Half-Life"])).toBe(true);
		expect(matcher(220, [], ["Half-Life 2"])).toBe(false);
	});

	it("handles wildcard glob patterns", () => {
		const matcher = createSearchMatcher("*.bsp");
		expect(matcher(1, [], ["d1_trainstation_01.bsp"])).toBe(true);
		expect(matcher(1, [], ["client.dll"])).toBe(false);
	});

	it("matches multi-token AND queries across fields", () => {
		const matcher = createSearchMatcher("half-life valve");
		expect(matcher(220, [], ["Half-Life 2", "Valve"])).toBe(true);
		expect(matcher(220, [], ["Half-Life 2", "Gearbox"])).toBe(false);
	});
});

describe("calculateCatalogStats", () => {
	it("aggregates catalog stats correctly", () => {
		const depots: DepotItem[] = [
			{
				id: 1,
				game: "Game A",
				dumpSize: 1000,
				builds: [
					{ version: 0, date: "2004-10-01", crc32: "aaaa1111" },
					{ version: 1, date: "2004-10-10", crc32: "bbbb2222" }
				],
				minDate: "2004-10-01",
				releaseDate: "2004-11-01"
			},
			{
				id: 2,
				game: "Game B",
				dumpSize: 2000,
				builds: [{ version: 0, date: "2004-12-01", crc32: "cccc3333" }],
				minDate: "2004-12-01",
				releaseDate: "2004-11-01"
			},
			{
				id: 3,
				game: undefined,
				dumpSize: 500,
				builds: []
			}
		];

		const stats = calculateCatalogStats(depots);
		expect(stats.totalDepots).toBe(3);
		expect(stats.named).toBe(2);
		expect(stats.multiBuilds).toBe(1);
		expect(stats.singleBuild).toBe(1);
		expect(stats.withoutManifests).toBe(1);
		expect(stats.preRelease).toBe(1); // Game A build is before release
		expect(stats.totalDumpBytes).toBe(3500);
	});
});

describe("buildAppCatalog & calculateAppStats", () => {
	it("constructs AppGroup resolving mounted depots", () => {
		const catalogById = new Map<number, DepotItem>([
			[
				220,
				{
					id: 220,
					game: "Half-Life 2",
					dev: "Valve",
					dumpSize: 5000,
					datCount: 1,
					blobCount: 2,
					minDate: "2004-09-01",
					maxDate: "2004-10-01",
					releaseDate: "2004-11-16"
				}
			],
			[
				221,
				{
					id: 221,
					depot: "HL2 Shared",
					dumpSize: 3000,
					datCount: 1,
					blobCount: 1,
					minDate: "2004-08-01",
					maxDate: "2004-09-15"
				}
			]
		]);

		const apps: AppRecord[] = [
			{
				appId: 220,
				name: "Half-Life 2",
				developer: "Valve",
				releaseDate: "2004-11-16",
				depots: [220, 221]
			}
		];

		const appCatalog = buildAppCatalog(apps, catalogById);
		expect(appCatalog).toHaveLength(1);
		const app = appCatalog[0];
		expect(app.appId).toBe(220);
		expect(app.game).toBe("Half-Life 2");
		expect(app.dumpSize).toBe(8000);
		expect(app.datCount).toBe(2);
		expect(app.blobCount).toBe(3);
		expect(app.minDate).toBe("2004-08-01");
		expect(app.maxDate).toBe("2004-10-01");
		expect(app.depots).toHaveLength(2);

		const stats = calculateAppStats(appCatalog);
		expect(stats.total).toBe(1);
		expect(stats.multi).toBe(1);
		expect(stats.single).toBe(0);
	});
});

describe("filterAndSortDepots & filterAndSortApps", () => {
	const sampleDepots: DepotItem[] = [
		{
			id: 220,
			game: "Half-Life 2",
			dumpSize: 5000,
			builds: [
				{ version: 0, date: "2004-09-01", crc32: "11111111" },
				{ version: 1, date: "2004-10-01", crc32: "22222222" }
			],
			minDate: "2004-09-01",
			releaseDate: "2004-11-16"
		},
		{
			id: 240,
			game: "Counter-Strike: Source",
			dumpSize: 3000,
			builds: [{ version: 0, date: "2004-11-20", crc32: "33333333" }],
			minDate: "2004-11-20",
			releaseDate: "2004-11-01"
		}
	];

	it("filters depots by category: multi, single, pre_release", () => {
		const multi = filterAndSortDepots(sampleDepots, "", "multi", "id", "asc");
		expect(multi.map((d) => d.id)).toEqual([220]);

		const single = filterAndSortDepots(sampleDepots, "", "single", "id", "asc");
		expect(single.map((d) => d.id)).toEqual([240]);

		const preRelease = filterAndSortDepots(
			sampleDepots,
			"",
			"pre_release",
			"id",
			"asc"
		);
		expect(preRelease.map((d) => d.id)).toEqual([220]);
	});

	it("sorts depots by size descending and ascending", () => {
		const desc = filterAndSortDepots(sampleDepots, "", "all", "size", "desc");
		expect(desc.map((d) => d.id)).toEqual([220, 240]);

		const asc = filterAndSortDepots(sampleDepots, "", "all", "size", "asc");
		expect(asc.map((d) => d.id)).toEqual([240, 220]);
	});

	it("filters and sorts app groups", () => {
		const sampleApps: AppGroup[] = [
			{
				appId: 220,
				game: "Half-Life 2",
				isNamed: true,
				dev: "Valve",
				dumpSize: 5000,
				datCount: 1,
				blobCount: 2,
				depots: [sampleDepots[0]]
			},
			{
				appId: 240,
				game: "Counter-Strike: Source",
				isNamed: true,
				dev: "Valve",
				dumpSize: 3000,
				datCount: 1,
				blobCount: 1,
				depots: [sampleDepots[1]]
			}
		];

		const filtered = filterAndSortApps(
			sampleApps,
			"counter",
			"all",
			"name",
			"asc"
		);
		expect(filtered.map((a) => a.appId)).toEqual([240]);
	});
});
