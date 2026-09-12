import type { DepotItem } from "../types";

/**
 * Formats a raw byte count into human-readable binary units.
 */
export const formatBytes = (bytes?: number, fallback = "0 B"): string => {
	if (!bytes || !Number.isFinite(bytes) || bytes <= 0) {
		return fallback;
	}
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB", "TB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${(bytes / k ** i).toFixed(2)} ${sizes[i]}`;
};

/**
 * Normalizes and formats an ISO or Steam2 build timestamp for table/modal display.
 */
export const formatBuildDate = (dateStr?: string): string => {
	if (!dateStr) {
		return "—";
	}
	if (dateStr.includes("+")) {
		return dateStr.split("+")[0].replace("T", " ").slice(0, 16);
	}
	return dateStr.slice(0, 16);
};

/**
 * Parses and formats a PICS, CSV, or Wikidata release date string into standard ISO format (YYYY-MM-DD).
 */
export const formatReleaseDate = (dateStr?: string): string => {
	if (!dateStr) {
		return "—";
	}
	const str = String(dateStr).trim();
	if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
		return str;
	}
	if (/^\d{4}$/.test(str)) {
		return `${str}-01-01`;
	}
	const ts = Date.parse(str);
	if (!isNaN(ts)) {
		const d = new Date(ts);
		const y = d.getUTCFullYear();
		if (y >= 1970 && y <= 2100) {
			const m = String(d.getUTCMonth() + 1).padStart(2, "0");
			const day = String(d.getUTCDate()).padStart(2, "0");
			return `${y}-${m}-${day}`;
		}
	}
	return str;
};

/**
 * Cleans and deduplicates semicolon/comma-separated developer names.
 */
export const formatDeveloper = (devStr?: string): string => {
	if (!devStr) {
		return "";
	}
	return devStr
		.split(/[,;]+/)
		.map((s) => s.trim())
		.filter(Boolean)
		.join(", ");
};

/**
 * Returns the earliest available build date for a depot or app group item.
 */
export const getEarliestDate = (item: {
	minDate?: string;
	maxDate?: string;
}): string | undefined => item.minDate || item.maxDate;

/**
 * Summarizes an array of version numbers into contiguous compressed ranges (e.g. "v0–v3, v5").
 */
export const formatBuildRanges = (builds?: number[]): string => {
	if (!builds || builds.length === 0) {
		return "—";
	}
	const sorted = [...builds].sort((a, b) => a - b);
	const ranges: string[] = [];
	let start = sorted[0];
	let end = sorted[0];

	for (let i = 1; i < sorted.length; i++) {
		if (sorted[i] === end + 1) {
			end = sorted[i];
		} else {
			ranges.push(start === end ? `v${start}` : `v${start}–v${end}`);
			start = sorted[i];
			end = sorted[i];
		}
	}
	ranges.push(start === end ? `v${start}` : `v${start}–v${end}`);

	if (ranges.length > 3) {
		return `${ranges.slice(0, 2).join(", ")}, ... (+${ranges.length - 2} more)`;
	}
	return ranges.join(", ");
};

/**
 * Calculates the calendar day delta between a manifest build date and official retail launch.
 */
export const getReleaseDelta = (
	buildDateStr?: string,
	releaseDateStr?: string
): {
	days: number | null;
	label: string;
	isPreRelease: boolean;
	isPostRelease: boolean;
} => {
	if (!buildDateStr || !releaseDateStr) {
		return {
			days: null,
			label: "—",
			isPreRelease: false,
			isPostRelease: false
		};
	}
	const normRelease = formatReleaseDate(releaseDateStr);
	if (normRelease === "—") {
		return {
			days: null,
			label: "—",
			isPreRelease: false,
			isPostRelease: false
		};
	}
	const bTime = Date.parse(buildDateStr.substring(0, 10));
	const rTime = Date.parse(normRelease.substring(0, 10));
	if (isNaN(bTime) || isNaN(rTime)) {
		return {
			days: null,
			label: "—",
			isPreRelease: false,
			isPostRelease: false
		};
	}
	const days = Math.round((bTime - rTime) / (1000 * 60 * 60 * 24));
	if (days < 0) {
		return {
			days,
			label: `${days}d`,
			isPreRelease: true,
			isPostRelease: false
		};
	} else if (days > 0) {
		return {
			days,
			label: `+${days}d`,
			isPreRelease: false,
			isPostRelease: true
		};
	}
	return { days: 0, label: "0d", isPreRelease: false, isPostRelease: false };
};

/**
 * Determines whether a depot name is a generic role title (data, content, main, etc.).
 */
export const isGenericDepotName = (name?: string | null): boolean => {
	const raw = (name || "").trim().toLowerCase();
	return (
		raw === "data" || raw === "pc data" || raw === "content" || raw === "main"
	);
};

/**
 * Resolves context-aware display names for a depot, properly qualifying generic depot titles.
 */
export const getDepotDisplayName = (depot: {
	id: number;
	appId?: number | null;
	depot?: string | null;
	game?: string | null;
}): { primaryTitle: string; subtitle?: string; chipName: string } => {
	const rawDepot = depot.depot?.trim() || "";
	const rawGame = depot.game?.trim() || "";

	if (!rawDepot && !rawGame) {
		return { primaryTitle: "—", chipName: `Depot ${depot.id}` };
	}

	const isGeneric = isGenericDepotName(rawDepot);

	if (isGeneric && rawGame) {
		const roleName = rawDepot.charAt(0).toUpperCase() + rawDepot.slice(1);
		return {
			primaryTitle: `${rawGame} ${roleName}`,
			subtitle: rawGame,
			chipName: roleName
		};
	}

	if (rawDepot) {
		return {
			primaryTitle: rawDepot,
			subtitle:
				rawGame && rawGame.toLowerCase() !== rawDepot.toLowerCase()
					? rawGame
					: undefined,
			chipName: rawDepot
		};
	}

	return {
		primaryTitle: rawGame,
		chipName: rawGame
	};
};

/**
 * Constructs the browser tab title for an open depot properties view.
 */
export const getDepotPageTitle = (
	depot: DepotItem | null,
	buildIdx = 0
): string => {
	if (!depot) {
		return "Steam2 Browser";
	}
	const { primaryTitle } = getDepotDisplayName(depot);
	const build = depot.builds?.[buildIdx]?.date || "";
	const buildSuffix = build && build !== "—" ? ` (${build})` : "";
	return `Steam2 Browser: ${primaryTitle}${buildSuffix}`;
};

/**
 * Sanitizes replacement characters in filenames with underscores.
 */
export const cleanFilename = (fn?: string): string => {
	if (!fn || !fn.includes("\uFFFD")) {
		return fn || "";
	}
	return fn.replace(/\uFFFD+/g, "_");
};

/**
 * Shared case-insensitive numeric collator for consistent localized string
 * sorting across catalog, diff, and file-match tables.
 */
export const collator = new Intl.Collator(undefined, {
	numeric: true,
	sensitivity: "base"
});

/**
 * Triggers an action callback when the user presses Enter or Space.
 */
export const onActionKey = (e: KeyboardEvent, action: () => void): void => {
	if (e.key === "Enter" || e.key === " ") {
		e.preventDefault();
		action();
	}
};
