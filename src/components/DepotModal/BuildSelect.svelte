<script lang="ts">
	import { SvelteMap } from "svelte/reactivity";
	import type { DepotBuild } from "../../types";

	interface Props {
		id: string;
		builds: DepotBuild[];
		value: number;
		onchange: (idx: number) => void;
		disabledIndex?: number;
		disabledSuffix?: string;
		prefix?: string;
		ariaLabel?: string;
		class?: string;
	}

	let {
		id,
		builds,
		value,
		onchange,
		disabledIndex,
		disabledSuffix = "",
		prefix,
		ariaLabel = "Select manifest build version",
		class: className = ""
	}: Props = $props();

	const versionCounts = $derived.by(() => {
		const counts = new SvelteMap<number, number>();
		for (let i = 0; i < builds.length; i++) {
			const v = builds[i].v;
			counts.set(v, (counts.get(v) || 0) + 1);
		}
		return counts;
	});

	const formatLabel = (build: DepotBuild, isDup: boolean): string => {
		const crcSuffix = isDup && build.c ? ` · ${build.c}` : "";
		const crcParen = isDup && build.c ? ` (${build.c})` : "";
		const main = build.d
			? `${build.d} (v${build.v}${crcSuffix})`
			: `Build ${build.v}${crcParen}`;
		return prefix ? `(${prefix}) ${main}` : main;
	};

	const handleChange = (e: Event) => {
		const target = e.target as HTMLSelectElement;
		onchange(parseInt(target.value, 10));
	};
</script>

<select
	{id}
	class="steam-select {className}"
	{value}
	onchange={handleChange}
	aria-label={ariaLabel}
>
	{#each builds as b, idx (idx)}
		{@const isDup = (versionCounts.get(b.v) || 0) > 1}
		{@const isDisabled = disabledIndex !== undefined && idx === disabledIndex}
		{@const suffix = isDisabled && disabledSuffix ? disabledSuffix : ""}
		<option value={idx} disabled={isDisabled}>
			{formatLabel(b, isDup)}{suffix}
		</option>
	{/each}
</select>
