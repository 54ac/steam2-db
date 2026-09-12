export interface DepotBuild {
	v: number;
	d: string;
	c?: string;
}

export interface AppSummary {
	appId: number;
	name: string;
}

export interface AppRecord {
	appId: number;
	name: string;
	releaseDate?: string;
	developer?: string;
	publisher?: string;
	depots: number[];
}

export interface DepotItem {
	id: number;
	appId?: number;
	game?: string;
	depot?: string;
	dev?: string;
	pub?: string;
	minDate?: string;
	maxDate?: string;
	releaseDate?: string;
	dumpSize: number;
	datCount?: number;
	blobCount?: number;
	builds?: DepotBuild[];
	mountedApps?: AppSummary[];
}

export interface AppGroup {
	appId: number;
	game: string;
	isNamed: boolean;
	dev?: string;
	releaseDate?: string;
	minDate?: string;
	maxDate?: string;
	dumpSize: number;
	datCount: number;
	blobCount: number;
	depots: DepotItem[];
}

export interface CatalogStats {
	totalDepots: number;
	named: number;
	multiBuilds: number;
	singleBuild: number;
	preRelease: number;
	totalDumpBytes: number;
	withoutManifests: number;
}

export interface AppStats {
	total: number;
	multi: number;
	single: number;
}

export type ViewMode = "depot" | "app" | "file";
export type DepotFilter = "all" | "multi" | "single" | "pre_release";
export type AppFilter = "all" | "multi" | "single";
export type SortField =
	| "id"
	| "name"
	| "game"
	| "release_date"
	| "build_date"
	| "discrepancy"
	| "size"
	| "builds";
export type SortOrder = "asc" | "desc";
export type ModalTab = "files" | "hashes" | "diff";

export interface ManifestFile {
	p: string;
	s: number;
	c?: number | string;
}

export interface DumpFile {
	name: string;
	size: number;
	date?: string;
	crc?: string;
	sha256?: string;
}

export interface ManifestBundleEntry {
	files?: ManifestFile[];
	dumpFiles?: DumpFile[];
}

export type ManifestBundle = Record<string | number, ManifestBundleEntry>;

export interface ManifestData {
	depotId: number;
	version: number;
	crc32?: string;
	files: ManifestFile[];
	dumpFiles: DumpFile[];
}

export type DiffStatus = "added" | "modified" | "removed" | "unchanged";

export interface FileDiffEntry {
	path: string;
	status: DiffStatus;
	sizeA?: number;
	sizeB?: number;
	sizeDiff?: number;
	crcA?: number | string;
	crcB?: number | string;
}

export interface ManifestDiffSummary {
	addedCount: number;
	modifiedCount: number;
	removedCount: number;
	unchangedCount: number;
	netSizeDiff: number;
	entries: FileDiffEntry[];
}

export type DiffFilterMode =
	"all" | "changed" | "added" | "modified" | "removed";

export interface FileSearchDepot {
	depotId: number;
	buildMaskLow: number;
	buildMaskHigh: number;
	builds: number[];
}

export interface FileSearchResult {
	filename: string;
	fileId: number;
	depots: FileSearchDepot[];
}

export interface MatchedFileItem {
	filename: string;
	fileId: number;
	builds: number[];
}

export interface DepotFileMatchRow {
	depotId: number;
	depot?: DepotItem;
	files: MatchedFileItem[];
}

export interface FileSearchResponse {
	query: string;
	total: number;
	matches: FileSearchResult[];
	elapsedMs: number;
}
