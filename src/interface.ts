export type Items = "file" | "folder" | "string";

export enum AttributeSelector {
	List = "~",
	Subcode = "-",
	StartsWith = "^",
	EndsWith = "$",
	Contains = "*",
	Exact = "",
}

export interface Hidden {
	path: string;
	type: Items;
	selector?: AttributeSelector;
	hiddenInNav: boolean;
	hiddenInBookmarks: boolean;
	title?: string; //only used in bookmarks
}

export const parent = Symbol("parent");

export type BookmarkInternalData = {
	ctime: number;
	path?: string;
	type: string;
	title?: string;
	items?: BookmarkInternalData[];
	[parent]?: BookmarkInternalData | null;
};

export interface ExplorerHiderSettings {
	useSnippets: boolean;
	snippets: Hidden[];
	showAll: boolean;
	alwaysHideInBookmarks: boolean;
	buttonInContextBookmark: boolean;
}

export const DEFAULT_SETTINGS: ExplorerHiderSettings = {
	useSnippets: false,
	showAll: false,
	snippets: [],
	alwaysHideInBookmarks: false,
	buttonInContextBookmark: false,
};

