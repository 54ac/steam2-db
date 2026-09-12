import { SvelteMap } from "svelte/reactivity";
import type { FileSearchResponse, FileSearchResult } from "../types";

const MAX_SEARCH_CACHE = 100;
const clientSearchCache = new SvelteMap<string, FileSearchResponse>();

const cacheSearchResult = (res: FileSearchResponse): void => {
	if (!res.query) {
		return;
	}
	if (clientSearchCache.size >= MAX_SEARCH_CACHE) {
		const firstKey = clientSearchCache.keys().next().value;
		if (firstKey) {
			clientSearchCache.delete(firstKey);
		}
	}
	clientSearchCache.set(res.query.toLowerCase(), res);
};

const getDebounceMs = (length: number): number => {
	if (length === 1) {
		return 300;
	}
	if (length === 2) {
		return 250;
	}
	return 200;
};

/**
 * Managing the off-thread binary trigram search worker lifecycle, debouncing, in-flight cancellation, and result caching.
 */
export const createFileSearch = (
	getQuery: () => string,
	getEnabled: () => boolean
) => {
	let worker: Worker | null = null;
	let nextReqId = 1;
	let activeReqId = 0;
	let lastDispatchedQuery = "";

	let workerResponse = $state.raw<FileSearchResponse | null>(null);
	let isWorkerActive = $state(false);
	let searchError = $state<string | null>(null);

	const trimmedQuery = $derived(getQuery().trim().toLowerCase());
	const enabled = $derived(getEnabled());

	$effect(() => {
		if (typeof Worker === "undefined") {
			return;
		}

		worker = new Worker(
			// eslint-disable-next-line svelte/prefer-svelte-reactivity -- Required literal for Vite worker bundling
			new URL("../workers/fileSearchWorker.ts", import.meta.url),
			{ type: "module" }
		);

		worker.onmessage = (e: MessageEvent) => {
			const data = e.data;
			if (data.id !== activeReqId) {
				return;
			}
			isWorkerActive = false;
			if (data.error) {
				searchError = data.error;
				return;
			}
			searchError = null;
			cacheSearchResult(data);
			workerResponse = data;
		};

		return () => {
			worker?.terminate();
			worker = null;
		};
	});

	$effect(() => {
		const q = trimmedQuery;
		const isEn = enabled;

		// Abort in-flight worker job immediately on new keystroke
		worker?.postMessage({ type: "abort" });

		if (!isEn || !q) {
			activeReqId = 0;
			lastDispatchedQuery = "";
			isWorkerActive = false;
			return;
		}

		if (clientSearchCache.has(q) || q === lastDispatchedQuery) {
			return;
		}

		const reqId = nextReqId++;
		activeReqId = reqId;

		const debounceMs = getDebounceMs(q.length);
		const timer = setTimeout(() => {
			lastDispatchedQuery = q;
			isWorkerActive = true;
			worker?.postMessage({
				id: reqId,
				query: q
			});
		}, debounceMs);

		return () => {
			clearTimeout(timer);
		};
	});

	const currentResponse = $derived.by<FileSearchResponse | null>(() => {
		const q = trimmedQuery;
		if (!q) {
			return null;
		}
		const cached = clientSearchCache.get(q);
		if (cached) {
			return cached;
		}
		if (workerResponse?.query?.toLowerCase() === q) {
			return workerResponse;
		}
		return null;
	});

	const isPending = $derived(
		Boolean(trimmedQuery) &&
			!clientSearchCache.has(trimmedQuery) &&
			workerResponse?.query?.toLowerCase() !== trimmedQuery
	);

	const isSearching = $derived(
		enabled && Boolean(trimmedQuery) && (isPending || isWorkerActive)
	);

	const results = $derived<FileSearchResult[]>(currentResponse?.matches || []);

	return {
		get results() {
			return results;
		},
		get isSearching() {
			return isSearching;
		},
		get searchError() {
			return searchError;
		}
	};
};
