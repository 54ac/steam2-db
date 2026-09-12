import type { DepotItem, ManifestDiffSummary, ManifestBundle } from "../types";
import {
	fetchDepotBundle,
	extractManifestData,
	clearDepotBundleCache,
	getBundleKey
} from "../utils/manifestService";
import { getOrCalculateManifestDiff } from "../utils/diffEngine";
import { createAsyncLoader } from "./asyncLoader.svelte";

/**
 * Fetching dual manifest bundles and calculating build diffs.
 */
export const createManifestDiffLoader = (
	getDepot: () => DepotItem | null,
	getBuildIdxA: () => number,
	getBuildIdxB: () => number,
	getEnabled: () => boolean
) => {
	const depot = $derived(getDepot());
	const idxA = $derived(getBuildIdxA());
	const idxB = $derived(getBuildIdxB());
	const enabled = $derived(getEnabled());
	const totalBuilds = $derived(depot?.builds?.length || 0);
	const isActive = $derived(Boolean(enabled && depot && totalBuilds >= 2));

	const bundleKeyA = $derived.by(() => {
		if (!depot) {
			return "";
		}
		return getBundleKey(depot.id, idxA, totalBuilds);
	});
	const bundleKeyB = $derived.by(() => {
		if (!depot) {
			return "";
		}
		return getBundleKey(depot.id, idxB, totalBuilds);
	});
	const diffKey = $derived(`${bundleKeyA}_${bundleKeyB}`);

	const loader = createAsyncLoader<[ManifestBundle, ManifestBundle]>({
		key: () => diffKey,
		enabled: () => isActive,
		fetcher: (signal) =>
			Promise.all([
				fetchDepotBundle(depot!.id, idxA, totalBuilds, signal),
				fetchDepotBundle(depot!.id, idxB, totalBuilds, signal)
			]),
		errorMessage: "Failed to fetch manifest bundles for diff.",
		onRetry: () => {
			if (depot) {
				clearDepotBundleCache(depot.id);
			}
		}
	});

	const diffSummary = $derived.by<ManifestDiffSummary | null>(() => {
		if (!isActive || !loader.data || !depot) {
			return null;
		}
		const [bundleA, bundleB] = loader.data;
		const dataA = extractManifestData(depot, bundleA, idxA);
		const dataB = extractManifestData(depot, bundleB, idxB);
		if (!dataA?.files || !dataB?.files) {
			return null;
		}
		return getOrCalculateManifestDiff(
			depot.id,
			idxA,
			idxB,
			dataA.files,
			dataB.files
		);
	});

	return {
		get diffSummary() {
			return diffSummary;
		},
		get loading() {
			return loader.loading;
		},
		get error() {
			return loader.error;
		},
		retry: loader.retry
	};
};
