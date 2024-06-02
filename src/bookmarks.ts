import { type InternalPluginInstance, sanitizeHTMLToDom } from "obsidian";
import {
	type Hidden,
	RIBBON_ICON_OFF,
	type ExplorerHiderSettings,
	type Items,
	RIBBON_ICON_ON,
} from "./interface";
import type ExplorerHider from "./main";
import i18next from "i18next";

type BookmarkInternalData = {
	ctime: number;
	path: string;
	type: string;
	title?: string;
	items?: BookmarkInternalData[];
};

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

	getBookmarkInSettings(bookmark?: BookmarkInternalData): Hidden | undefined {
		if (!bookmark) return;
		for (const snippet of this.plugin.snippets) {
			if (snippet.path === bookmark.path) return snippet;
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
			if (item.path.includes(name)) return item;
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
		const allBookMarksItem: BookmarkInternalData[] = this.bookmarksPlugin.items;
		//if group => file will be in items[] as array! Wee need to recursively search
		for (const bookmark of allBookMarksItem) {
			if (bookmark.title === name) return bookmark;
			if (bookmark.items && bookmark.items.length > 0) {
				const found = this.findBookmarkInItems(bookmark.items, name);
				if (found) return found;
			}
		}
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

	bookmarkType(bookmark: BookmarkInternalData): Items {
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
			const bookmarkData = this.getTargetBookMarkData(bookmarkName);
			if (!bookmarkData) {
				console.error("[HIDER] bookmark data not found");
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

	getBookmarkName(target: HTMLElement, iconize?: HTMLElement | null) {
		const bookmarkName = iconize
			? iconize.find(".tree-item-inner")?.getText()
			: target.getText();
		if (bookmarkName.length === 0) {
			console.error("[HIDER] bookmark name is empty");
			return;
		}
		return bookmarkName;
	}

	async hideBookmarkButton(bookmarkData: BookmarkInternalData, isAlreadyInSet?: Hidden) {
		const button = this.activeDocument.createElement("button");

		button.addClasses(["bookmark-button", "menu-item", "tappable"]);
		const svg = button.createDiv({ cls: ["menu-item-icon"] });
		svg.appendChild(sanitizeHTMLToDom(RIBBON_ICON_OFF.svg));
		const name = button.createDiv({
			text: i18next.t("hide.bookmarksWithName", {
				name: bookmarkData.title ?? bookmarkData.path,
			}),
			cls: ["bookmark-name", "menu-item-title"],
		});
		button.appendChild(name);
		button.addEventListener("click", async () => {
			await this.hideBookmark(bookmarkData, isAlreadyInSet);
		});
		return button;
	}

	async displayBookmarkButton(
		bookmarkData: BookmarkInternalData,
		isAlreadyInSet: Hidden
	) {
		const button = this.activeDocument.createElement("button");
		button.addClasses(["bookmark-button", "menu-item", "tappable"]);
		const svg = button.createDiv({ cls: ["menu-item-icon"] });
		svg.appendChild(sanitizeHTMLToDom(RIBBON_ICON_ON.svg));
		const name = button.createDiv({
			text: i18next.t("show.bookmarksWithName", {
				name: bookmarkData.title ?? bookmarkData.path,
			}),
			cls: ["bookmark-name", "menu-item-title"],
		});
		button.appendChild(name);
		button.addEventListener("click", async () => {
			this.plugin.snippets.delete(isAlreadyInSet);
			this.plugin.snippets.add({
				path: bookmarkData.path,
				type: this.bookmarkType(bookmarkData),
				hiddenInNav: false,
				hiddenInBookmarks: false,
			});
			await this.plugin.saveSettings();
			this.plugin.compiler?.reloadStyle();
		});
		return button;
	}

	async hideBookmark(bookmarkData: BookmarkInternalData, isAlreadyInSet?: Hidden) {
		if (isAlreadyInSet) this.plugin.snippets.delete(isAlreadyInSet);
		this.plugin.snippets.add({
			path: bookmarkData.path,
			type: this.bookmarkType(bookmarkData),
			hiddenInNav: false,
			hiddenInBookmarks: true,
		});
		await this.plugin.saveSettings();
		this.plugin.compiler?.reloadStyle();
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
