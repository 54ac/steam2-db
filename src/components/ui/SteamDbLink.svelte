<script lang="ts">
	import { ArrowSquareOutIcon } from "phosphor-svelte";

	interface Props {
		type: "app" | "depot";
		id: number;
		variant?: "icon" | "button";
		class?: string;
	}

	let { type, id, variant = "icon", class: className = "" }: Props = $props();

	const label = $derived(
		`View ${type === "app" ? "App" : "Depot"} ${id} on SteamDB`
	);
</script>

<a
	href={`https://steamdb.info/${type}/${id}`}
	target="_blank"
	rel="noopener noreferrer"
	class="steamdb-link {variant} {className}"
	title={label}
	aria-label={`${label} (opens in new tab)`}
	onclick={(e) => e.stopPropagation()}
	onkeydown={(e) => e.stopPropagation()}
>
	{#if variant === "button"}
		<span>SteamDB</span>
		<ArrowSquareOutIcon size={11} class="link-icon" />
	{:else}
		<ArrowSquareOutIcon size={12} class="link-icon" />
	{/if}
</a>

<style>
	.steamdb-link {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		text-decoration: none;
		line-height: 1;
		flex-shrink: 0;
		box-sizing: border-box;
	}

	.steamdb-link.icon {
		color: var(--steam-accent);
		opacity: 0.65;
		transition:
			opacity 0.15s ease,
			color 0.15s ease;
		padding: 0.125rem;
		vertical-align: middle;
	}

	.steamdb-link.icon:hover {
		opacity: 1;
		color: white;
		background-color: var(--steam-panel-hover);
	}

	.steamdb-link.button {
		background-color: var(--steam-panel);
		color: white;
		border-top: 1px solid var(--steam-border-light);
		border-left: 1px solid var(--steam-border-light);
		border-bottom: 1px solid var(--steam-border-dark);
		border-right: 1px solid var(--steam-border-dark);
		box-shadow: var(--steam-shadow-btn);
		font-family: var(--steam-font-sans);
		padding: 0 0.375rem;
		font-size: var(--steam-fs-xs);
		height: 1.25rem;
		min-height: 1.25rem;
		gap: 0.25rem;
		cursor: pointer;
	}

	.steamdb-link.button:hover {
		background-color: var(--steam-panel-hover);
		color: white;
	}

	.steamdb-link.button :global(.link-icon) {
		color: var(--steam-accent);
	}

	.steamdb-link.button:hover :global(.link-icon) {
		color: white;
	}

	.steamdb-link.button:active {
		background-color: var(--steam-panel-active);
		border-top: 1px solid var(--steam-border-dark);
		border-left: 1px solid var(--steam-border-dark);
		border-bottom: 1px solid var(--steam-border-light);
		border-right: 1px solid var(--steam-border-light);
		box-shadow: var(--steam-shadow-btn-active);
	}
</style>
