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

export const RIBBON_ICON_OFF = {
	name: "eye-off",
	svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-eye-off"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>',
};

export const RIBBON_ICON_ON = {
	name: "eye",
	svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-eye"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>',
};
