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
		for (const build of builds) {
			counts.set(build.version, (counts.get(build.version) || 0) + 1);
		}
		return counts;
	});

	const formatLabel = (build: DepotBuild, isDuplicate: boolean): string => {
		const { version, crc32, date, versionStr, parentCrc, previousVersion } =
			build;
		const crcSuffix = isDuplicate && crc32 ? ` · ${crc32}` : "";
		const verDisplay = versionStr
			? `${versionStr} (v${version})`
			: `v${version}`;
		const isRoot =
			previousVersion === undefined && (!parentCrc || parentCrc === "00000000");
		let lineageTag = "";
		if (isRoot) {
			lineageTag = " [Root]";
		} else if (
			previousVersion !== undefined &&
			previousVersion !== version - 1
		) {
			lineageTag = ` [from v${previousVersion}]`;
		}
		const main = date
			? `${date} · ${verDisplay}${crcSuffix}${lineageTag}`
			: `${verDisplay}${crcSuffix}${lineageTag}`;

		return prefix ? `(${prefix}) ${main}` : main;
	};
</script>

<select
	{id}
	class="steam-select {className}"
	{value}
	onchange={(e) => onchange(Number(e.currentTarget.value))}
	aria-label={ariaLabel}
>
	{#each builds as build, idx (idx)}
		{@const isDuplicate = (versionCounts.get(build.version) || 0) > 1}
		{@const isDisabled = disabledIndex !== undefined && idx === disabledIndex}
		{@const suffix = isDisabled && disabledSuffix ? disabledSuffix : ""}
		<option value={idx} disabled={isDisabled}>
			{formatLabel(build, isDuplicate)}{suffix}
		</option>
	{/each}
</select>
