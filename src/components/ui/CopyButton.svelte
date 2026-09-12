<script lang="ts">
	import { CopyIcon, CheckIcon } from "phosphor-svelte";
	import Button from "./Button.svelte";

	interface Props {
		text: string;
		variant?: "button" | "ghost";
		size?: "sm" | "md";
		label?: string;
		copiedLabel?: string;
		showLabel?: boolean;
		showLabelOnCopied?: boolean;
		title?: string;
		ariaLabel?: string;
		class?: string;
		disabled?: boolean;
		timeout?: number;
	}

	let {
		text,
		variant = "button",
		size = "sm",
		label = "Copy",
		copiedLabel = "Copied",
		showLabel = variant === "button",
		showLabelOnCopied = true,
		title,
		ariaLabel,
		class: className = "",
		disabled = false,
		timeout = 2000
	}: Props = $props();

	let copied = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;

	$effect(() => {
		return () => {
			if (timer) {
				clearTimeout(timer);
			}
		};
	});

	const handleCopy = async () => {
		if (!text || disabled) {
			return;
		}
		try {
			if (
				typeof window !== "undefined" &&
				window.isSecureContext &&
				navigator.clipboard?.writeText
			) {
				await navigator.clipboard.writeText(text);
				copied = true;
				if (timer) {
					clearTimeout(timer);
				}
				timer = setTimeout(() => {
					copied = false;
				}, timeout);
			}
		} catch {
			// Clipboard write failed or blocked
		}
	};

	const iconSize = $derived(size === "md" || variant === "ghost" ? 14 : 12);
	const resolvedAriaLabel = $derived(
		copied ? `${ariaLabel || label} - ${copiedLabel}` : ariaLabel || label
	);
	const resolvedTitle = $derived(title || ariaLabel || label);
</script>

{#if variant === "button"}
	<Button
		{size}
		disabled={disabled || !text}
		class="copy-button {className}"
		onclick={handleCopy}
		aria-label={resolvedAriaLabel}
		title={resolvedTitle}
	>
		{#snippet icon()}
			{#if copied}
				<CheckIcon size={iconSize} color="var(--steam-green)" />
			{:else}
				<CopyIcon size={iconSize} />
			{/if}
		{/snippet}
		{#if showLabel || (copied && showLabelOnCopied)}
			<span class:copied-text={copied}>{copied ? copiedLabel : label}</span>
		{/if}
	</Button>
{:else}
	<button
		type="button"
		class="copy-ghost-btn size-{size} {className}"
		class:copied
		disabled={disabled || !text}
		onclick={handleCopy}
		aria-label={resolvedAriaLabel}
		title={resolvedTitle}
	>
		{#if copied}
			<CheckIcon size={iconSize} color="var(--steam-green)" />
			{#if showLabelOnCopied}
				<span class="copied-text">{copiedLabel}</span>
			{/if}
		{:else}
			<CopyIcon size={iconSize} />
			{#if showLabel}
				<span>{label}</span>
			{/if}
		{/if}
	</button>
{/if}

<style>
	.copied-text {
		color: var(--steam-green);
		font-weight: bold;
	}

	.copy-ghost-btn {
		background: transparent;
		border: none;
		padding: 0.25rem 0.375rem;
		min-width: 1.75rem;
		min-height: 1.75rem;
		cursor: pointer;
		color: var(--steam-accent);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.25rem;
		line-height: 1;
		border-radius: 2px;
		touch-action: manipulation;
		font-family: var(--steam-font-sans);
		font-size: var(--steam-fs-xs);
		box-sizing: border-box;
	}

	.copy-ghost-btn:hover:not(:disabled),
	.copy-ghost-btn:active:not(:disabled) {
		color: white;
	}

	.copy-ghost-btn.copied {
		color: var(--steam-green);
	}

	.copy-ghost-btn:disabled {
		opacity: 0.5;
		cursor: default;
	}
</style>
