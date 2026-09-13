<script lang="ts">
	import type { Snippet } from "svelte";
	import { CaretLeftIcon, CaretRightIcon } from "phosphor-svelte";

	interface Props {
		children?: Snippet;
		class?: string;
		desktopWrap?: boolean;
		resetKey?: unknown;
	}

	let {
		children,
		class: className = "",
		desktopWrap = false,
		resetKey
	}: Props = $props();

	let trackEl = $state<HTMLDivElement | null>(null);
	let canScrollLeft = $state(false);
	let canScrollRight = $state(false);

	const updateScroll = () => {
		if (!trackEl) {
			return;
		}
		const { scrollLeft, scrollWidth, clientWidth } = trackEl;
		canScrollLeft = scrollLeft > 2;
		canScrollRight = scrollWidth - clientWidth - scrollLeft > 2;
	};

	$effect(() => {
		if (!trackEl) {
			return;
		}
		if (resetKey !== undefined) {
			trackEl.scrollLeft = 0;
		}
		updateScroll();
		const ro = new ResizeObserver(updateScroll);
		ro.observe(trackEl);
		return () => ro.disconnect();
	});
</script>

<div class="mobile-scroll-root {className}" class:desktop-wrap={desktopWrap}>
	<div class="mobile-scroll-track" bind:this={trackEl} onscroll={updateScroll}>
		{@render children?.()}
	</div>
	{#if canScrollLeft}
		<div class="scroll-fade left" aria-hidden="true">
			<CaretLeftIcon size={11} weight="bold" />
		</div>
	{/if}
	{#if canScrollRight}
		<div class="scroll-fade right" aria-hidden="true">
			<CaretRightIcon size={11} weight="bold" />
		</div>
	{/if}
</div>

<style>
	.mobile-scroll-root {
		position: relative;
		display: flex;
		align-items: center;
		width: 100%;
		min-width: 0;
		overflow: hidden;
	}

	.mobile-scroll-track {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		overflow-x: auto;
		scrollbar-width: none;
		white-space: nowrap;
		width: 100%;
		min-width: 0;
	}

	.mobile-scroll-track::-webkit-scrollbar {
		display: none;
	}

	.scroll-fade {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 1.5rem;
		display: flex;
		align-items: center;
		pointer-events: none;
		color: var(--steam-accent);
		z-index: 2;
	}

	.scroll-fade.left {
		left: 0;
		justify-content: flex-start;
		padding-left: 0.125rem;
		background: linear-gradient(
			to right,
			var(--scroll-fade-bg, var(--steam-panel-dark)) 50%,
			transparent
		);
	}

	.scroll-fade.right {
		right: 0;
		justify-content: flex-end;
		padding-right: 0.125rem;
		background: linear-gradient(
			to left,
			var(--scroll-fade-bg, var(--steam-panel-dark)) 50%,
			transparent
		);
	}

	@container (width >= 600px) {
		.mobile-scroll-root.desktop-wrap .mobile-scroll-track {
			overflow-x: visible;
			flex-wrap: wrap;
			white-space: normal;
		}

		.mobile-scroll-root.desktop-wrap .scroll-fade {
			display: none;
		}
	}
</style>
