import { describe, it, expect } from "vitest";
import { render, fireEvent } from "@testing-library/svelte";
import Pagination from "../../src/components/Pagination.svelte";
import { CatalogStore, CATALOG_KEY } from "../../src/state/catalog.svelte";
import type { DepotItem } from "../../src/types";

describe("Pagination component", () => {
	it("renders loading state when store is loading", () => {
		const cleanup = $effect.root(() => {
			const store = new CatalogStore();
			store.loading = true;

			const { container } = render(Pagination, {
				context: new Map([[CATALOG_KEY, store]])
			});

			expect(container.textContent).toContain("Loading items...");
			const prevBtn = container.querySelector(
				"button:first-of-type"
			) as HTMLButtonElement;
			const nextBtn = container.querySelector(
				"button:last-of-type"
			) as HTMLButtonElement;
			expect(prevBtn.disabled).toBe(true);
			expect(nextBtn.disabled).toBe(true);
		});
		cleanup();
	});

	it("renders item counts and pagination controls", async () => {
		let store!: CatalogStore;
		let container!: HTMLElement;

		const cleanup = $effect.root(() => {
			store = new CatalogStore();
			store.loading = false;
			store.catalog = Array.from({ length: 120 }, (_, i) => ({
				id: i + 1,
				dumpSize: 100
			})) as DepotItem[];

			const rendered = render(Pagination, {
				context: new Map([[CATALOG_KEY, store]])
			});
			container = rendered.container;
		});

		expect(container.textContent).toContain("Showing");
		expect(container.textContent).toContain("1");
		expect(container.textContent).toContain("50");
		expect(container.textContent).toContain("120");
		expect(container.querySelector(".page-indicator")?.textContent).toContain(
			"1 / 3"
		);

		const buttons = container.querySelectorAll("button");
		const prevBtn = buttons[0];
		const nextBtn = buttons[1];

		expect(prevBtn.disabled).toBe(true);
		expect(nextBtn.disabled).toBe(false);

		await fireEvent.click(nextBtn);
		expect(store.currentPage).toBe(2);
		cleanup();
	});
});
