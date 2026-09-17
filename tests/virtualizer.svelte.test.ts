import { describe, it, expect } from "vitest";
import { createFixedVirtualizer } from "../src/state/virtualizer.svelte";

describe("createFixedVirtualizer", () => {
	it("returns zero items and zero total size when count is 0", () => {
		const cleanup = $effect.root(() => {
			const virtualizer = createFixedVirtualizer({
				count: () => 0,
				itemHeight: 28,
				getScrollElement: () => null
			});

			expect(virtualizer.totalSize).toBe(0);
			expect(virtualizer.virtualItems).toEqual([]);
		});
		cleanup();
	});

	it("calculates total height and sliced window with overscan", () => {
		const cleanup = $effect.root(() => {
			const virtualizer = createFixedVirtualizer({
				count: () => 100,
				itemHeight: 28,
				overscan: 5,
				getScrollElement: () => null
			});

			expect(virtualizer.totalSize).toBe(2800);
			expect(virtualizer.virtualItems.length).toBeGreaterThan(0);
			expect(virtualizer.virtualItems[0]).toEqual({
				index: 0,
				start: 0,
				size: 28
			});
		});
		cleanup();
	});
});
