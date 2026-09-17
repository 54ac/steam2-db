import { describe, it, expect, vi, beforeEach } from "vitest";
import { CatalogStore } from "../src/state/catalog.svelte";
import type { DepotItem, AppRecord } from "../src/types";

describe("CatalogStore", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it("initializes with default values", () => {
		const cleanup = $effect.root(() => {
			const store = new CatalogStore();
			expect(store.viewMode).toBe("depot");
			expect(store.loading).toBe(true);
			expect(store.currentPage).toBe(1);
			expect(store.sortBy).toBe("id");
			expect(store.sortOrder).toBe("asc");
		});
		cleanup();
	});

	it("fetches and populates catalog on load()", async () => {
		const mockDepots: DepotItem[] = [
			{ id: 220, game: "Half-Life 2", dumpSize: 1000 },
			{ id: 240, game: "Counter-Strike: Source", dumpSize: 2000 }
		];
		const mockApps: AppRecord[] = [
			{ appId: 220, name: "Half-Life 2", depots: [220] }
		];

		const fetchMock = vi.fn().mockImplementation((url: string) => {
			if (url === "/catalog.json") {
				return Promise.resolve({
					ok: true,
					json: () => Promise.resolve(mockDepots)
				});
			}
			if (url === "/apps.json") {
				return Promise.resolve({
					ok: true,
					json: () => Promise.resolve(mockApps)
				});
			}
			return Promise.reject(new Error("404"));
		});
		vi.stubGlobal("fetch", fetchMock);

		let store!: CatalogStore;
		const cleanup = $effect.root(() => {
			store = new CatalogStore();
		});

		await store.load();

		expect(store.loading).toBe(false);
		expect(store.catalog).toEqual(mockDepots);
		expect(store.stats.totalDepots).toBe(2);
		expect(store.appCatalog).toHaveLength(1);
		cleanup();
	});

	it("switches view mode and resets current page to 1", () => {
		const cleanup = $effect.root(() => {
			const store = new CatalogStore();
			store.currentPage = 4;
			store.setViewMode("app");
			expect(store.viewMode).toBe("app");
			expect(store.currentPage).toBe(1);
		});
		cleanup();
	});

	it("toggles sorting order when clicking active field", () => {
		const cleanup = $effect.root(() => {
			const store = new CatalogStore();
			expect(store.sortBy).toBe("id");
			expect(store.sortOrder).toBe("asc");

			store.toggleSort("id");
			expect(store.sortOrder).toBe("desc");

			store.toggleSort("id");
			expect(store.sortOrder).toBe("asc");
		});
		cleanup();
	});

	it("switches sort field and defaults order to asc", () => {
		const cleanup = $effect.root(() => {
			const store = new CatalogStore();
			store.toggleSort("size");
			expect(store.sortBy).toBe("size");
			expect(store.sortOrder).toBe("asc");

			store.toggleSort("size");
			expect(store.sortOrder).toBe("desc");

			store.toggleSort("name");
			expect(store.sortBy).toBe("name");
			expect(store.sortOrder).toBe("asc");
		});
		cleanup();
	});

	it("updates search query and resets current page", () => {
		const cleanup = $effect.root(() => {
			const store = new CatalogStore();
			store.currentPage = 3;
			store.searchQuery = "Half-Life";
			expect(store.searchQuery).toBe("Half-Life");
			expect(store.currentPage).toBe(1);

			store.searchQuery = "";
			expect(store.searchQuery).toBe("");
		});
		cleanup();
	});

	it("manages modal opening and closing", () => {
		const cleanup = $effect.root(() => {
			const store = new CatalogStore();
			const depot: DepotItem = {
				id: 220,
				game: "Half-Life 2",
				dumpSize: 1000
			};

			store.openDepot(depot, 1);
			expect(store.selectedDepot).toEqual(depot);
			expect(store.selectedBuildIndex).toBe(1);

			store.closeDepot();
			expect(store.selectedDepot).toBeNull();
		});
		cleanup();
	});
});
