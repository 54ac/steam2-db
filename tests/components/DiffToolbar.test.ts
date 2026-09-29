import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/svelte";
import BuildSelect from "../../src/components/DepotModal/BuildSelect.svelte";
import DiffToolbar from "../../src/components/DepotModal/DiffToolbar.svelte";
import type { DepotBuild } from "../../src/types";

describe("BuildSelect badges", () => {
	const mockBuilds: DepotBuild[] = [
		{ version: 1, date: "2024-01-01", crc32: "11111111" },
		{ version: 2, date: "2024-01-02", crc32: "22222222" },
		{ version: 3, date: "2024-01-03", crc32: "33333333" }
	];

	it("renders [A] and [B] tags in dropdown options", () => {
		const { container } = render(BuildSelect, {
			props: {
				id: "test-select",
				builds: mockBuilds,
				value: 0,
				onchange: vi.fn(),
				disabledIndex: 1,
				selectedIndexA: 0,
				selectedIndexB: 1
			}
		});

		const options = container.querySelectorAll("option");
		expect(options).toHaveLength(3);
		expect(options[0].textContent).toContain("[A]");
		expect(options[0].disabled).toBe(true);

		expect(options[1].textContent).toContain("[B]");
		expect(options[1].disabled).toBe(true);

		expect(options[2].textContent).not.toContain("[A]");
		expect(options[2].textContent).not.toContain("[B]");
		expect(options[2].disabled).toBe(false);
	});
});

describe("DiffToolbar", () => {
	const mockBuilds: DepotBuild[] = [
		{ version: 1, date: "2024-01-01", crc32: "11111111" },
		{ version: 2, date: "2024-01-02", crc32: "22222222" },
		{ version: 3, date: "2024-01-03", crc32: "33333333" }
	];

	it("shows [A] and [B] in both base and compare dropdowns with both disabled", () => {
		const { container } = render(DiffToolbar, {
			props: {
				builds: mockBuilds,
				diffBaseIndex: 0,
				diffTargetIndex: 1,
				onDiffBaseSelect: vi.fn(),
				onDiffTargetSelect: vi.fn(),
				onSwapDiffBuilds: vi.fn()
			}
		});

		const baseSelect = container.querySelector("#diff-base-select") as HTMLSelectElement;
		const targetSelect = container.querySelector("#diff-target-select") as HTMLSelectElement;

		expect(baseSelect).not.toBeNull();
		expect(targetSelect).not.toBeNull();

		const baseOptions = baseSelect.querySelectorAll("option");
		expect(baseOptions[0].textContent).toContain("[A]");
		expect(baseOptions[0].disabled).toBe(true);
		expect(baseOptions[1].textContent).toContain("[B]");
		expect(baseOptions[1].disabled).toBe(true);
		expect(baseOptions[2].disabled).toBe(false);

		const targetOptions = targetSelect.querySelectorAll("option");
		expect(targetOptions[0].textContent).toContain("[A]");
		expect(targetOptions[0].disabled).toBe(true);
		expect(targetOptions[1].textContent).toContain("[B]");
		expect(targetOptions[1].disabled).toBe(true);
		expect(targetOptions[2].disabled).toBe(false);
	});
});
