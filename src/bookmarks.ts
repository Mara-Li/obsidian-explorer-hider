import i18next from "i18next";
import { setIcon } from "obsidian";
import type { BookmarksPluginInstance } from "obsidian-typings";
import {
	AttributeSelector,
	type BookmarkInternalData,
	type ExplorerHiderSettings,
	type Hidden,
	type Items,
} from "./interface";
import type ExplorerHider from "./main";

export class Bookmarks {
	plugin: ExplorerHider;
	settings: ExplorerHiderSettings;
	bookmarksPlugin: BookmarksPluginInstance;
	// biome-ignore lint/correctness/noUndeclaredVariables: obsidian global variable
	activeDocument: Document = activeDocument;

	constructor(plugin: ExplorerHider, bookMarks: BookmarksPluginInstance) {
		this.plugin = plugin;
		this.settings = plugin.settings;
		this.bookmarksPlugin = bookMarks;
	}

	getBookmarksPanel() {
		const panels = this.activeDocument.querySelectorAll(".tree-item:has(.bookmark)");
		if (!panels.length) return;
		return panels;
	}

	getBookmarkInSettings(bookmark?: BookmarkInternalData | string): Hidden | undefined {
		if (!bookmark) return;
		for (const snippet of this.plugin.snippets) {
			if (typeof bookmark === "string" && snippet.path === bookmark) return snippet;
			else if (typeof bookmark === "string") continue;
			else if (snippet.type === "string") continue;
			if (snippet.path === bookmark.path || snippet.path === bookmark.title)
				return snippet;
		}
		return;
	}

	findBookmarkInItems(
		items: BookmarkInternalData[],
		name: string
	): BookmarkInternalData | null {
		for (const item of items) {
			if (item.title === name) return item;
			if (item.path === name) return item;
			if (item.path?.includes(name)) return item;
			if (item.items) {
				const found = this.findBookmarkInItems(item.items, name);
				if (found) return found;
			}
		}
		return null;
	}

	getTargetBookMarkData(name?: string) {
		if (!name) return;
		const allBookMarksItem =
			this.bookmarksPlugin.getBookmarks() as BookmarkInternalData[];
		//if group => file will be in items[] as array! Wee need to recursively search
		for (const bookmark of allBookMarksItem) {
			if (bookmark.title === name || bookmark.path === name) return bookmark;
			if (bookmark.items && bookmark.items.length > 0) {
				const found = this.findBookmarkInItems(bookmark.items, name);
				if (found) return found;
			}
		}
		return name;
	}

	targetIcon(target: HTMLElement) {
		//if only is svg
		if (target.tagName === "svg") {
			const parent = target.parentElement;
			if (parent) return parent.parentElement;
		} else if (target.tagName === "path") {
			return target.parentElement?.parentElement?.parentElement;
		} else if (target.classList.contains("tree-item-icon")) {
			return target.parentElement;
		}
	}

	bookmarkType(bookmark: BookmarkInternalData | string): Items {
		if (typeof bookmark === "string") return "string";
		if (bookmark.type === "file") return "file";
		if (bookmark.type === "folder") return "folder";
		return "string";
	}

	async addButtonToPanel() {
		this.plugin.registerDomEvent(this.activeDocument, "contextmenu", async (event) => {
			const target = event.target as HTMLElement;
			const iconize = this.targetIcon(target);
			if (
				!(
					target.classList.contains("bookmark") ||
					target.classList.contains("tree-item-inner-text") ||
					iconize?.classList.contains("bookmark")
				)
			) {
				return;
			}
			//context menu of bookmark is opened
			//create a new button
			const bookmarkName = this.getBookmarkName(target, iconize);
			const bookmarkData: BookmarkInternalData | undefined | string =
				this.getTargetBookMarkData(bookmarkName);
			if (!bookmarkData) {
				console.error("[HIDER] bookmark data not found.");
				return;
			}

			const isAlreadyInSet = this.getBookmarkInSettings(bookmarkData);
			const button = isAlreadyInSet?.hiddenInBookmarks
				? await this.displayBookmarkButton(bookmarkData, isAlreadyInSet)
				: await this.hideBookmarkButton(bookmarkData, isAlreadyInSet);

			//add event on hover
			button.addEventListener("mouseover", () => {
				this.activeDocument.querySelectorAll(".selected").forEach((el) => {
					el.classList.remove("selected");
				});
				button.classList.add("selected");
			});
			//remove the class on mouse out
			button.addEventListener("mouseout", () => {
				button.classList.remove("selected");
			});

			setTimeout(() => {
				const openedMenu = this.activeDocument.querySelectorAll(".menu-scroll");
				if (!openedMenu) return;
				for (const menu of openedMenu) {
					const separator = menu.querySelector(".menu-separator.explorer-hider");
					if (separator) separator.remove();
					menu.createDiv({ cls: "menu-separator explorer-hider" });
					menu.appendChild(button);
				}
			}, 2);
			//clear
			this.removeButtonFromPanel();
		});
	}

	targetParents(target: HTMLElement) {
		if (target.classList.contains("tree-item-inner-text")) {
			return target.parentElement?.parentElement?.parentElement;
		}
		return target.parentElement;
	}

	getBookmarkName(target: HTMLElement, iconize?: HTMLElement | null) {
		const targetParents = this.targetParents(target);
		let bookmarkName = iconize
			? iconize.parentElement?.getAttribute("data-path")
			: targetParents?.getAttribute("data-path");
		if (!bookmarkName) {
			//use old method
			bookmarkName = iconize
				? iconize.find(".tree-item-inner")?.getText()
				: target.getText();
		}
		if (bookmarkName.length === 0) {
			console.error("[HIDER] bookmark name is empty");
			return;
		}
		return bookmarkName;
	}

	async hideBookmarkButton(
		bookmarkData: BookmarkInternalData | string,
		isAlreadyInSet?: Hidden
	) {
		const button = this.activeDocument.createElement("button");

		button.addClasses(["bookmark-button", "menu-item", "tappable"]);
		const svg = button.createDiv({ cls: ["menu-item-icon"] });
		setIcon(svg, "eye-off");
		const pathName =
			typeof bookmarkData === "string"
				? bookmarkData
				: (bookmarkData.path ?? bookmarkData.title ?? "");
		const title = typeof bookmarkData === "string" ? undefined : bookmarkData.title;
		const name = button.createDiv({
			text: i18next.t("hide.bookmarksWithName", {
				name: pathName,
			}),
			cls: ["bookmark-name", "menu-item-title"],
		});
		const type = this.bookmarkType(bookmarkData);
		const selector =
			(isAlreadyInSet?.selector ?? type === "string")
				? AttributeSelector.StartsWith
				: undefined;
		button.appendChild(name);
		button.addEventListener("click", async () => {
			const newSnippet: Hidden = {
				path: pathName,
				type,
				hiddenInNav: isAlreadyInSet ? isAlreadyInSet.hiddenInNav : false,
				hiddenInBookmarks: true,
				selector,
				title: isAlreadyInSet?.title ?? title,
			};
			this.plugin.compiler?.updateSnippet(newSnippet, isAlreadyInSet);
			await this.plugin.saveSettings();
			await this.plugin.compiler?.reloadStyle();
		});
		return button;
	}

	async displayBookmarkButton(
		bookmarkData: BookmarkInternalData | string,
		isAlreadyInSet: Hidden
	) {
		const button = this.activeDocument.createElement("button");
		button.addClasses(["bookmark-button", "menu-item", "tappable"]);
		const svg = button.createDiv({ cls: ["menu-item-icon"] });
		setIcon(svg, "eye");
		const pathName =
			typeof bookmarkData === "string"
				? bookmarkData
				: (bookmarkData.path ?? bookmarkData.title ?? "");
		const title = typeof bookmarkData === "string" ? undefined : bookmarkData.title;
		const name = button.createDiv({
			text: i18next.t("show.bookmarksWithName", {
				name: pathName,
			}),
			cls: ["bookmark-name", "menu-item-title"],
		});
		const type = this.bookmarkType(bookmarkData);
		const selector =
			(isAlreadyInSet.selector ?? type === "string")
				? AttributeSelector.StartsWith
				: undefined;
		button.appendChild(name);
		button.addEventListener("click", async () => {
			const newSnippet: Hidden = {
				path: pathName,
				type,
				hiddenInNav: isAlreadyInSet.hiddenInNav ?? false,
				hiddenInBookmarks: false,
				selector,
				title: isAlreadyInSet.title ?? title,
			};
			this.plugin.compiler.updateSnippet(newSnippet, isAlreadyInSet);
			await this.plugin.saveSettings();
			await this.plugin.compiler?.reloadStyle();
		});
		return button;
	}

	recursiveDataPath(children: BookmarkInternalData[], path: string) {
		//get all items in bookmarkData
		for (const item of children) {
			if (item.title) {
				path += `${item.title}/`;
			}
			if (item.items) {
				this.recursiveDataPath(item.items, path);
			}
		}
		return path;
	}

	removeButtonFromPanel() {
		//remove the button from the context Menu
		this.plugin.registerDomEvent(this.activeDocument, "contextmenu", async (event) => {
			const target = event.target as HTMLElement;
			const iconize = this.targetIcon(target);
			//@ts-ignore
			if (
				!(
					target.classList.contains("bookmark") ||
					target.classList.contains("tree-item-inner-text") ||
					iconize?.classList.contains("bookmark")
				)
			) {
				return;
			}
			//remove the button
			const openedMenu = this.activeDocument.querySelectorAll(".menu");
			if (!openedMenu) return;
			for (const menu of openedMenu) {
				const button = menu.querySelector(".bookmark-button");
				if (button) button.remove();
				const separator = menu.querySelector(".menu-separator.explorer-hider");
				if (separator) separator.remove();
			}
		});
	}
}
