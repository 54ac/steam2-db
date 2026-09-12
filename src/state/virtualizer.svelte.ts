/**
 * Fixed-height virtualizer
 */
export const createFixedVirtualizer = (options: {
	count: () => number;
	itemHeight: number;
	overscan?: number;
	getScrollElement: () => HTMLElement | null;
}) => {
	let scrollTop = $state(0);
	let clientHeight = $state(0);

	$effect(() => {
		const el = options.getScrollElement();
		if (!el) {
			return;
		}

		const handleScroll = () => {
			scrollTop = el.scrollTop;
		};

		const ro = new ResizeObserver(() => {
			clientHeight = el.clientHeight;
		});

		el.addEventListener("scroll", handleScroll, { passive: true });
		ro.observe(el);

		scrollTop = el.scrollTop;
		clientHeight = el.clientHeight;

		return () => {
			el.removeEventListener("scroll", handleScroll);
			ro.disconnect();
		};
	});

	const totalSize = $derived(options.count() * options.itemHeight);

	const virtualItems = $derived.by(() => {
		const count = options.count();
		if (count === 0) {
			return [];
		}

		const height = clientHeight || 600;
		const overscan = options.overscan ?? 20;
		const startIdx = Math.max(
			0,
			Math.floor(scrollTop / options.itemHeight) - overscan
		);
		const endIdx = Math.min(
			count,
			Math.ceil((scrollTop + height) / options.itemHeight) + overscan
		);

		const items = [];
		for (let i = startIdx; i < endIdx; i++) {
			items.push({
				index: i,
				start: i * options.itemHeight,
				size: options.itemHeight
			});
		}
		return items;
	});

	return {
		get totalSize() {
			return totalSize;
		},
		get virtualItems() {
			return virtualItems;
		},
		scrollToTop: () => {
			const el = options.getScrollElement();
			if (el) {
				el.scrollTop = 0;
			}
		}
	};
};
