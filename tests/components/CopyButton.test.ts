import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent } from "@testing-library/svelte";
import CopyButton from "../../src/components/ui/CopyButton.svelte";

describe("CopyButton component", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it("renders button variant and copies text on click", async () => {
		const writeTextMock = vi.fn().mockResolvedValue(undefined);
		Object.assign(navigator, {
			clipboard: {
				writeText: writeTextMock
			}
		});

		const { container } = render(CopyButton, {
			props: {
				text: "220",
				label: "Copy ID",
				copiedLabel: "ID Copied"
			}
		});

		const button = container.querySelector("button") as HTMLButtonElement;
		expect(button).toBeDefined();
		expect(button.textContent).toContain("Copy ID");

		await fireEvent.click(button);
		expect(writeTextMock).toHaveBeenCalledWith("220");
		expect(button.textContent).toContain("ID Copied");
	});

	it("renders ghost variant with proper aria-label", () => {
		const { container } = render(CopyButton, {
			props: {
				text: "https://example.com",
				variant: "ghost",
				ariaLabel: "Copy link"
			}
		});

		const button = container.querySelector("button") as HTMLButtonElement;
		expect(button.classList.contains("copy-ghost-btn")).toBe(true);
		expect(button.getAttribute("aria-label")).toBe("Copy link");
	});

	it("disables button when disabled prop is true or text is empty", () => {
		const { container } = render(CopyButton, {
			props: {
				text: "",
				disabled: true
			}
		});

		const button = container.querySelector("button") as HTMLButtonElement;
		expect(button.disabled).toBe(true);
	});
});
