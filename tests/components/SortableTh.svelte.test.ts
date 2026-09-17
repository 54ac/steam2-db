import { describe, it, expect } from "vitest";
import { render, fireEvent } from "@testing-library/svelte";
import SortableTh from "../../src/components/CatalogTable/SortableTh.svelte";
import { CatalogStore, CATALOG_KEY } from "../../src/state/catalog.svelte";

describe("SortableTh component", () => {
	it("renders non-sortable table header when field is not provided", () => {
		const cleanup = $effect.root(() => {
			const store = new CatalogStore();
			const { container } = render(SortableTh, {
				context: new Map([[CATALOG_KEY, store]]),
				props: {
					title: "Static Header"
				}
			});

			const th = container.querySelector("th") as HTMLTableCellElement;
			expect(th.classList.contains("clickable")).toBe(false);
			expect(th.getAttribute("aria-sort")).toBeNull();
		});
		cleanup();
	});

	it("renders sortable table header and toggles sort on click", async () => {
		let store!: CatalogStore;
		let container!: HTMLElement;

		const cleanup = $effect.root(() => {
			store = new CatalogStore();
			store.sortBy = "id";
			store.sortOrder = "asc";

			const rendered = render(SortableTh, {
				context: new Map([[CATALOG_KEY, store]]),
				props: {
					field: "id",
					title: "Sort by ID"
				}
			});
			container = rendered.container;
		});

		const th = container.querySelector("th") as HTMLTableCellElement;
		expect(th.classList.contains("clickable")).toBe(true);
		expect(th.classList.contains("active")).toBe(true);
		expect(th.getAttribute("aria-sort")).toBe("ascending");

		await fireEvent.click(th);
		expect(store.sortOrder).toBe("desc");
		cleanup();
	});
});
