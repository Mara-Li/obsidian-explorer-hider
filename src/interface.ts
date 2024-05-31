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
	hidden: boolean;
}

export interface ExplorerHidderSettings {
	useSnippets: boolean;
	snippets: Hidden[];
	hideInBookmarks: boolean;
	hideAll: boolean;
}

export const DEFAULT_SETTINGS: ExplorerHidderSettings = {
	useSnippets: false,
	hideAll: false,
	snippets: [],
	hideInBookmarks: true,
};
