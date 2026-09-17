import { describe, it, expect } from "vitest";
import { render, fireEvent } from "@testing-library/svelte";
import SearchField from "../../src/components/ui/SearchField.svelte";

describe("SearchField component", () => {
	it("renders input with placeholder and search icon", () => {
		const { container } = render(SearchField, {
			props: {
				placeholder: "Search depots...",
				ariaLabel: "Filter catalog"
			}
		});

		const input = container.querySelector("input") as HTMLInputElement;
		expect(input).toBeDefined();
		expect(input.placeholder).toBe("Search depots...");
		expect(input.getAttribute("aria-label")).toBe("Filter catalog");
		expect(container.querySelector(".search-icon")).not.toBeNull();
		expect(container.querySelector(".clear-btn")).toBeNull();
	});

	it("shows loading spinner when isLoading is true", () => {
		const { container } = render(SearchField, {
			props: {
				isLoading: true
			}
		});

		expect(container.querySelector(".loading-icon")).not.toBeNull();
		expect(container.querySelector(".search-icon")).toBeNull();
	});

	it("shows clear button when text is present and clears on click", async () => {
		const { container } = render(SearchField, {
			props: {
				value: "Half-Life"
			}
		});

		const input = container.querySelector("input") as HTMLInputElement;
		expect(input.value).toBe("Half-Life");

		const clearBtn = container.querySelector(
			'button[aria-label="Clear search text"]'
		) as HTMLButtonElement;
		expect(clearBtn).not.toBeNull();

		await fireEvent.click(clearBtn);
		expect(input.value).toBe("");
	});
});
