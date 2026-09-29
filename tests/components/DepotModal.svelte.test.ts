import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, fireEvent } from "@testing-library/svelte";
import DepotModal from "../../src/components/DepotModal/DepotModal.svelte";
import { CatalogStore, CATALOG_KEY } from "../../src/state/catalog.svelte";
import type { DepotItem } from "../../src/types";

describe("DepotModal diff tab switching", () => {
	const mockDepot: DepotItem = {
		id: 220,
		game: "Half-Life 2",
		dumpSize: 1000,
		builds: [
			{ version: 1, date: "2024-01-01", crc32: "11111111" },
			{ version: 2, date: "2024-01-02", crc32: "22222222" },
			{ version: 3, date: "2024-01-03", crc32: "33333333" }
		]
	};

	beforeAll(() => {
		if (!window.matchMedia) {
			window.matchMedia = vi.fn().mockImplementation((query) => ({
				matches: false,
				media: query,
				onchange: null,
				addListener: vi.fn(),
				removeListener: vi.fn(),
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				dispatchEvent: vi.fn()
			}));
		}
	});

	it("initializes diff with A = selectedBuildIndex and B = next build when tabbing to diff", async () => {
		let store!: CatalogStore;
		let unmountModal!: () => void;
		const cleanup = $effect.root(() => {
			store = new CatalogStore();
			store.selectedBuildIndex = 0;

			const { unmount } = render(DepotModal, {
				props: { depot: mockDepot },
				context: new Map([[CATALOG_KEY, store]])
			});
			unmountModal = unmount;
		});

		const diffTabBtn = Array.from(document.body.querySelectorAll("button")).find(
			(btn) => btn.textContent?.toUpperCase().includes("DIFF")
		);
		expect(diffTabBtn).toBeDefined();

		await fireEvent.click(diffTabBtn!);

		const baseSelect = document.body.querySelector("#diff-base-select") as HTMLSelectElement;
		const targetSelect = document.body.querySelector("#diff-target-select") as HTMLSelectElement;

		expect(baseSelect.value).toBe("0"); // A is index 0
		expect(targetSelect.value).toBe("1"); // B is next index 1
		unmountModal?.();
		cleanup();
	});

	it("initializes diff with B = previous build when A is the last build", async () => {
		let store!: CatalogStore;
		let unmountModal!: () => void;
		const cleanup = $effect.root(() => {
			store = new CatalogStore();
			store.selectedBuildIndex = 2; // last build (index 2 out of 3)

			const { unmount } = render(DepotModal, {
				props: { depot: mockDepot },
				context: new Map([[CATALOG_KEY, store]])
			});
			unmountModal = unmount;
		});

		const diffTabBtn = Array.from(document.body.querySelectorAll("button")).find(
			(btn) => btn.textContent?.toUpperCase().includes("DIFF")
		);
		expect(diffTabBtn).toBeDefined();

		await fireEvent.click(diffTabBtn!);

		const baseSelect = document.body.querySelector("#diff-base-select") as HTMLSelectElement;
		const targetSelect = document.body.querySelector("#diff-target-select") as HTMLSelectElement;

		expect(baseSelect.value).toBe("2"); // A is index 2
		expect(targetSelect.value).toBe("1"); // B is previous index 1
		unmountModal?.();
		cleanup();
	});
});
