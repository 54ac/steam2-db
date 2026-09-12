import type { ManifestBundle, ManifestData, DepotItem } from "../types";
import { formatBytes } from "./formatters";
import { BUILDS_PER_CHUNK, MANIFEST_SHARD } from "../constants";

const bundleCache = new Map<string, ManifestBundle>();

const manifestDataCache = new Map<string, ManifestData>();

/**
 * Invalidates and purges all cached manifest bundles and versions for a given depot.
 */
export const clearDepotBundleCache = (depotId: number): void => {
	for (const key of bundleCache.keys()) {
		if (key === String(depotId) || key.startsWith(`${depotId}_`)) {
			bundleCache.delete(key);
		}
	}
	for (const key of manifestDataCache.keys()) {
		if (key.startsWith(`${depotId}_`)) {
			manifestDataCache.delete(key);
		}
	}
};

/**
 * Triggers a browser download of text content as a .txt file.
 */
export const downloadTextFile = (filename: string, lines: string[]): void => {
	const blob = new Blob([lines.join("\n")], {
		type: "text/plain;charset=utf-8"
	});
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
};

/**
 * Resolves chunked bundle cache/filename key for a given depot build.
 */
export const getBundleKey = (
	depotId: number,
	buildIndex: number,
	totalBuilds: number
): string => {
	const chunkIndex = Math.floor(buildIndex / BUILDS_PER_CHUNK);
	return totalBuilds > BUILDS_PER_CHUNK
		? `${depotId}_p${chunkIndex}`
		: `${depotId}`;
};

/**
 * Downloads and transparently decompresses a chunked manifest gzip bundle.
 * Supports native Web Streams DecompressionStream.
 */
export const fetchDepotBundle = async (
	depotId: number,
	buildIndex: number,
	totalBuilds: number,
	signal?: AbortSignal
): Promise<ManifestBundle> => {
	const bundleKey = getBundleKey(depotId, buildIndex, totalBuilds);

	if (bundleCache.has(bundleKey)) {
		return bundleCache.get(bundleKey)!;
	}

	const shard = Math.floor(depotId / MANIFEST_SHARD);
	const manifestUrl = `/manifests/${shard}/${bundleKey}.json.gz`;
	const res = await fetch(manifestUrl, { signal });
	if (!res.ok) {
		throw new Error(`HTTP ${res.status}: Manifest filelist not found.`);
	}

	let bundleData: ManifestBundle;
	const rawBlob = await res.blob();

	try {
		const text = await rawBlob.text();
		bundleData = JSON.parse(text) as ManifestBundle;
	} catch {
		if (typeof DecompressionStream !== "undefined") {
			const ds = new DecompressionStream("gzip");
			const stream = rawBlob.stream().pipeThrough(ds);
			const decompressedText = await new Response(stream).text();
			bundleData = JSON.parse(decompressedText) as ManifestBundle;
		} else {
			throw new Error("Unable to decompress manifest in this browser.");
		}
	}

	bundleCache.set(bundleKey, bundleData);
	return bundleData;
};

/**
 * Extracts and formats a specific version's manifest filelist and dump metadata from a bundle.
 */
export const extractManifestData = (
	depot: DepotItem,
	bundle: ManifestBundle | null,
	buildIndex: number
): ManifestData | null => {
	if (!bundle) {
		return null;
	}
	const availableBuilds = depot.builds || [];
	const currentBuild = availableBuilds[buildIndex] || availableBuilds[0];
	if (!currentBuild) {
		return null;
	}

	const buildKey = currentBuild.c
		? `${currentBuild.v}_${currentBuild.c}`
		: String(currentBuild.v);
	const cacheKey = `${depot.id}_${buildKey}`;
	if (manifestDataCache.has(cacheKey)) {
		return manifestDataCache.get(cacheKey)!;
	}

	const versionManifest = bundle[buildKey] || bundle[currentBuild.v];
	if (!versionManifest) {
		return null;
	}

	const data: ManifestData = {
		depotId: depot.id,
		version: currentBuild.v,
		crc32: currentBuild.c,
		files: versionManifest.files || [],
		dumpFiles: versionManifest.dumpFiles || []
	};

	manifestDataCache.set(cacheKey, data);
	return data;
};

/**
 * Generates and triggers a client-side file download of the manifest filelist as a tab-delimited text file.
 */
export const exportManifestAsTxt = (
	depot: DepotItem,
	manifestData: ManifestData,
	buildIndex: number
): void => {
	if (!manifestData.files || manifestData.files.length === 0) {
		return;
	}

	// Manifest text file format
	const lines = [
		`Depot: ${depot.depot || depot.game || depot.id}`,
		`Depot ID: ${depot.id}`,
		`Parent App ID: ${depot.appId || depot.id}`,
		`Build Date: ${depot.builds?.[buildIndex]?.d || "Unknown"}`,
		`Total Files: ${manifestData.files.length}`,
		"----------------------------------------",
		...manifestData.files.map((f) => `${f.p}\t${formatBytes(f.s)}`)
	];

	downloadTextFile(`depot_${depot.id}_build_${buildIndex}_filelist.txt`, lines);
};
