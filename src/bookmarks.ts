import { type InternalPluginInstance, sanitizeHTMLToDom } from "obsidian";
import {
	type Hidden,
	RIBBON_ICON_OFF,
	type ExplorerHiderSettings,
	type Items,
	RIBBON_ICON_ON,
	type BookmarkInternalData,
} from "./interface";
import type ExplorerHider from "./main";
import i18next from "i18next";

export class Bookmarks {
	plugin: ExplorerHider;
	settings: ExplorerHiderSettings;
	bookmarksPlugin: InternalPluginInstance;
	// biome-ignore lint/correctness/noUndeclaredVariables: obsidian global variable
	activeDocument: Document = activeDocument;

	constructor(plugin: ExplorerHider, bookMarks: InternalPluginInstance) {
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
		//@ts-ignore
		const allBookMarksItem = this.bookmarksPlugin.items;
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
			const openedMenu = this.activeDocument.querySelectorAll(".menu");
			if (!openedMenu) return;
			for (const menu of openedMenu) {
				menu.createDiv({ cls: ["menu-separator", "explorer-hider"] });
				menu.appendChild(button);
			}
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
		svg.appendChild(sanitizeHTMLToDom(RIBBON_ICON_OFF.svg));
		const pathName =
			typeof bookmarkData === "string"
				? bookmarkData
				: bookmarkData.path ?? bookmarkData.title ?? "";
		const title = typeof bookmarkData !== "string" ? bookmarkData.title : undefined;
		const name = button.createDiv({
			text: i18next.t("hide.bookmarksWithName", {
				name: pathName,
			}),
			cls: ["bookmark-name", "menu-item-title"],
		});
		button.appendChild(name);
		button.addEventListener("click", async () => {
			const type = this.bookmarkType(bookmarkData);

			if (isAlreadyInSet) this.plugin.snippets.delete(isAlreadyInSet);
			this.plugin.snippets.add({
				path: pathName,
				type,
				hiddenInNav: false,
				hiddenInBookmarks: true,
				selector: isAlreadyInSet?.selector,
				title: isAlreadyInSet?.title ?? title,
			});
			await this.plugin.saveSettings();
			this.plugin.compiler?.reloadStyle();
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
		svg.appendChild(sanitizeHTMLToDom(RIBBON_ICON_ON.svg));
		const pathName =
			typeof bookmarkData === "string"
				? bookmarkData
				: bookmarkData.path ?? bookmarkData.title ?? "";
		const title = typeof bookmarkData === "string" ? undefined : bookmarkData.title;
		const name = button.createDiv({
			text: i18next.t("show.bookmarksWithName", {
				name: pathName,
			}),
			cls: ["bookmark-name", "menu-item-title"],
		});
		button.appendChild(name);
		button.addEventListener("click", async () => {
			const type = this.bookmarkType(bookmarkData);
			this.plugin.snippets.delete(isAlreadyInSet);
			this.plugin.snippets.add({
				path: pathName,
				type,
				hiddenInNav: false,
				hiddenInBookmarks: false,
				selector: isAlreadyInSet.selector,
				title: isAlreadyInSet.title ?? title,
			});
			await this.plugin.saveSettings();
			this.plugin.compiler?.reloadStyle();
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
