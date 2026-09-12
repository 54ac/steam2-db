<script lang="ts">
	import {
		MagnifyingGlassIcon as SearchIcon,
		XIcon as ClearIcon,
		ArrowClockwiseIcon as LoadingIcon
	} from "phosphor-svelte";

	interface Props {
		value?: string;
		placeholder?: string;
		disabled?: boolean;
		ariaLabel?: string;
		maxWidth?: number | string;
		isLoading?: boolean;
		inputElement?: HTMLInputElement | null;
	}

	let {
		value = $bindable(""),
		placeholder = "",
		disabled = false,
		ariaLabel = "Search",
		maxWidth,
		isLoading = false,
		inputElement = $bindable(null)
	}: Props = $props();

	const handleInput = (e: Event) => {
		const target = e.target as HTMLInputElement;
		value = target.value;
	};

	const handleClear = () => {
		value = "";
		inputElement?.focus();
	};
</script>

<div
	class="search-wrapper"
	style:max-width={typeof maxWidth === "number"
		? `${maxWidth / 16}rem`
		: maxWidth}
>
	{#if isLoading}
		<span class="loading-icon">
			<span class="spinner">
				<LoadingIcon size={14} />
			</span>
		</span>
	{:else}
		<span class="search-icon">
			<SearchIcon size={14} />
		</span>
	{/if}

	<input
		bind:this={inputElement}
		type="search"
		class="steam-input search-input-field"
		{placeholder}
		{value}
		{disabled}
		aria-label={ariaLabel}
		oninput={handleInput}
	/>

	{#if value}
		<button
			type="button"
			class="clear-btn"
			onclick={handleClear}
			title="Clear search"
			aria-label="Clear search text"
		>
			<ClearIcon size={12} />
		</button>
	{/if}
</div>

<style>
	.search-wrapper {
		position: relative;
		flex: 1;
		width: 100%;
		height: var(--steam-h-control);
		display: flex;
		align-items: center;
		box-sizing: border-box;
	}

	.search-icon {
		position: absolute;
		left: 0.625rem;
		top: 50%;
		transform: translateY(-50%);
		color: var(--steam-text);
		pointer-events: none;
		display: inline-flex;
	}

	.loading-icon {
		position: absolute;
		left: 0.625rem;
		top: 50%;
		transform: translateY(-50%);
		color: var(--steam-accent);
		pointer-events: none;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	.spinner {
		display: inline-flex;
		animation: spin 1s linear infinite;
	}

	.search-input-field {
		width: 100%;
		padding-left: 1.75rem;
		padding-right: 1.75rem;
		text-overflow: ellipsis;
	}

	.search-input-field::-webkit-search-cancel-button {
		display: none;
	}

	.clear-btn {
		position: absolute;
		right: 0.5rem;
		top: 50%;
		transform: translateY(-50%);
		color: var(--steam-text);
		background: transparent;
		border: none;
		cursor: pointer;
		padding: 0.125rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		line-height: 1;
	}

	.clear-btn:hover {
		color: white;
	}
</style>
