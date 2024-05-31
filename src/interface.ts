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
}

export interface ExplorerHidderSettings {
	useSnippets: boolean;
	snippets: Hidden[];
	showAll: boolean;
}

export const DEFAULT_SETTINGS: ExplorerHidderSettings = {
	useSnippets: false,
	showAll: false,
	snippets: [],
};
