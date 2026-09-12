import type { DepotItem, ManifestData, ManifestBundle } from "../types";
import {
	fetchDepotBundle,
	extractManifestData,
	clearDepotBundleCache,
	getBundleKey
} from "../utils/manifestService";
import { createAsyncLoader } from "./asyncLoader.svelte";

/**
 * Fetching, decompressing, and caching manifest bundles.
 */
export const createManifestLoader = (
	getDepot: () => DepotItem | null,
	getBuildIndex: () => number
) => {
	const depot = $derived(getDepot());
	const buildIndex = $derived(getBuildIndex());
	const totalBuilds = $derived(depot?.builds?.length || 0);
	const isEnabled = $derived(Boolean(depot && totalBuilds > 0));
	const bundleKey = $derived.by(() => {
		if (!depot) {
			return "";
		}
		return getBundleKey(depot.id, buildIndex, totalBuilds);
	});

	const loader = createAsyncLoader<ManifestBundle>({
		key: () => bundleKey,
		enabled: () => isEnabled,
		fetcher: (signal) =>
			fetchDepotBundle(depot!.id, buildIndex, totalBuilds, signal),
		errorMessage: "Manifest filelist not available.",
		onRetry: () => {
			if (depot) {
				clearDepotBundleCache(depot.id);
			}
		}
	});

	const manifestData = $derived.by<ManifestData | null>(() => {
		if (!isEnabled || !depot || !loader.data) {
			return null;
		}
		return extractManifestData(depot, loader.data, buildIndex);
	});

	return {
		get manifestData() {
			return manifestData;
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
