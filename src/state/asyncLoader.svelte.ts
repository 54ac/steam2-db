/**
 * Loader for keyed asynchronous operations with cancellation, loading state, error capture, and manual retry.
 */
export const createAsyncLoader = <T>(options: {
	key: () => string;
	enabled: () => boolean;
	fetcher: (signal: AbortSignal) => Promise<T>;
	errorMessage?: string;
	onRetry?: () => void;
}) => {
	let retryCount = $state(0);
	let loadedKey = $state("");
	let dataState = $state.raw<T | null>(null);
	let errorState = $state<string | null>(null);

	const isEnabled = $derived(options.enabled());
	const baseKey = $derived(options.key());
	const currentKey = $derived(
		isEnabled && baseKey ? `${baseKey}_r${retryCount}` : ""
	);

	const loading = $derived(
		Boolean(isEnabled && currentKey && loadedKey !== currentKey)
	);
	const error = $derived(loadedKey === currentKey ? errorState : null);
	const data = $derived(loadedKey === currentKey ? dataState : null);

	$effect(() => {
		if (!isEnabled || !currentKey) {
			loadedKey = "";
			dataState = null;
			errorState = null;
			return;
		}

		errorState = null;
		const reqKey = currentKey;
		const controller = new AbortController();

		options
			.fetcher(controller.signal)
			.then((result) => {
				if (controller.signal.aborted) {
					return;
				}
				loadedKey = reqKey;
				dataState = result;
				errorState = null;
			})
			.catch((err: unknown) => {
				if (controller.signal.aborted) {
					return;
				}
				loadedKey = reqKey;
				dataState = null;
				errorState =
					err instanceof Error
						? err.message
						: (options.errorMessage ?? "Failed to load data.");
			});

		return () => {
			controller.abort();
		};
	});

	const retry = () => {
		options.onRetry?.();
		retryCount++;
	};

	return {
		get data() {
			return data;
		},
		get loading() {
			return loading;
		},
		get error() {
			return error;
		},
		retry
	};
};
