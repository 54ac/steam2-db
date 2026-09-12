export const GITHUB_URL = "https://github.com/54ac/steam2-db";

// Used for sharding requests
export const BUILDS_PER_CHUNK = 25;
export const MANIFEST_SHARD = 1000;

// Total number of all files to avoid config.json request
export const TOTAL_ARCHIVE_FILES = 4153600;

// Table rows
export const PAGE_SIZE = 50;

export const DISCLAIMER_TEXT =
	"Historical index for research & preservation only. No copyrighted files hosted.";

export interface ViewModeOption {
	id: "depot" | "app" | "file";
	label: string;
	title: string;
}

export const VIEW_MODE_OPTIONS: ViewModeOption[] = [
	{ id: "depot", label: "DEPOTS", title: "Browse individual depots" },
	{ id: "app", label: "APPS", title: "Group depots by App ID" },
	{ id: "file", label: "FILES", title: "Global file search" }
];
