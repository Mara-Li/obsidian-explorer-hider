import type {BookmarkItem} from "obsidian-typings";

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
	fromObsidian?:boolean;
}

export const parent = Symbol("parent");

export type BookmarkInternalData = BookmarkItem & {
	path?: string;
	title?: string;
	items?: BookmarkInternalData[];
	[parent]?: BookmarkInternalData | null;
};

export interface ExplorerHiderSettings {
	useSnippets: boolean;
	compatSpf: boolean;
	snippets: Hidden[];
	showAll: boolean;
	alwaysHideInBookmarks: boolean;
	buttonInContextBookmark: boolean;
	obsidianExclude?: boolean;
}

export const DEFAULT_SETTINGS: ExplorerHiderSettings = {
	useSnippets: false,
	compatSpf: false,
	showAll: false,
	snippets: [],
	alwaysHideInBookmarks: false,
	buttonInContextBookmark: false,
};
