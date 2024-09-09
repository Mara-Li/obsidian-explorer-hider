import { type Menu, Plugin, type TAbstractFile, TFile, setIcon } from "obsidian";
import { around } from "monkey-around";

import { ExplorerHiderSettingTab } from "./settings";
import { type ExplorerHiderSettings, DEFAULT_SETTINGS, type Hidden } from "./interface";
import { ExplorerMenu } from "./explorer_menu";
import { RulesCompiler } from "./rules";
import i18next from "i18next";
import { resources, translationLanguage } from "./i18n";
import { Bookmarks } from "./bookmarks";

export default class ExplorerHider extends Plugin {
	settings!: ExplorerHiderSettings;
	snippets!: Set<Hidden>;
	style: HTMLStyleElement | null = null;
	compiler!: RulesCompiler;
	bookmarks: Bookmarks | null = null;
	activeMonkeys: Record<string, any> = {};

	isAlreadyRegistered(path: string): Hidden | undefined {
		for (const s of this.snippets) {
			if (s.path === path && s.type !== "string") return s;
		}
		return undefined;
	}

	reloadIcon() {
		return {
			icon: this.settings.showAll ? "eye-off" : "eye",
			desc: this.settings.showAll ? i18next.t("hide.all") : i18next.t("show.all"),
		};
	}
	/**
	 * To be honest, I don't know if it's useful. I think unload useless thinks when thinks are disabled is a good practice.
	 * But I don't know if it's necessary to do it for the bookmarks plugin.
	 * Also, I don't know if Monkey-around is the best way to do it or safe.
	 */
	monkeyPatch() {
		const bookmarksPlugin = this.app.internalPlugins.getPluginById("bookmarks");
		if (!bookmarksPlugin) return;
		this.activeMonkeys.enable = around(bookmarksPlugin.instance, {
			//@ts-ignore
			onUserEnable: (oldMethod) => {
				return () => {
					this.unloadBookmarks(); //prevent duplicate buttons
					this.loadBookmarks();
					oldMethod.apply(bookmarksPlugin.instance);
				};
			},
		});
		this.activeMonkeys.unload = around(bookmarksPlugin, {
			onunload: (oldMethod) => {
				return () => {
					this.unloadBookmarks();
					this.bookmarks = null;
					oldMethod.apply(bookmarksPlugin);
				};
			},
		});
	}
	
	

	async onload() {
		console.log(`[${this.manifest.name}] loaded`);
		await i18next.init({
			lng: translationLanguage,
			fallbackLng: "en",
			resources,
			returnNull: false,
			returnEmptyString: false,
		});
		await this.loadSettings();
		this.compiler = new RulesCompiler(this) as RulesCompiler;
		const { icon, desc } = this.reloadIcon();
		// This creates an icon in the left ribbon.
		const ribbonEye = this.addRibbonIcon(icon, desc, async () => {
			this.settings.showAll = !this.settings.showAll;
			await this.saveSettings();
			await this.compiler?.reloadStyle();
			//update the icon and the desc using the HTML element
			const { icon, desc } = this.reloadIcon();
			ribbonEye.ariaLabel = desc;
			setIcon(ribbonEye, icon);
		});
		const contextMenu = new ExplorerMenu(this);

		this.addSettingTab(new ExplorerHiderSettingTab(this.app, this));

		//add a button to add a new file or folder to hide
		this.registerEvent(
			this.app.workspace.on(
				"file-menu",
				(menu: Menu, file: TAbstractFile, source: string) => {
					menu.addSeparator();
					if (source === "more-options") {
						contextMenu.moreOptionsNav(menu, file);
						contextMenu.moreOptionsBookmarks(menu, file);
						menu.addSeparator();
						return;
					}
					contextMenu.explorerMenu(menu, file);
					menu.addSeparator();
				}
			)
		);

		this.registerEvent(
			this.app.workspace.on("files-menu", (menu: Menu, files: TAbstractFile[]) => {
				menu.addSeparator();
				contextMenu.hideMultipleInExplorer(menu, files);
				menu.addSeparator();
			})
		);
		this.registerEvent(
			this.app.workspace.on("layout-ready", async () => {
				await this.compiler?.enableStyle(this.settings.useSnippets);
				await this.loadBookmarks();
			})
		);
		if (!this.bookmarks && this.app.workspace.layoutReady) await this.loadBookmarks();

		await this.compiler.enableStyle(this.settings.useSnippets);
		//follow file renamed/moved to update the settings accordingly
		this.registerEvent(
			this.app.vault.on("rename", async (file, oldPath) => {
				const isAlreadyInSet = this.isAlreadyRegistered(oldPath);
				if (!isAlreadyInSet) return;

				this.snippets.delete(isAlreadyInSet);
				this.snippets.add({
					path: file.path,
					type: file instanceof TFile ? "file" : "folder",
					hiddenInNav: true,
					hiddenInBookmarks: true,
				});
				await this.saveSettings();
				await this.compiler?.reloadStyle(this.snippets);
			})
		);
		this.registerEvent(
			this.app.vault.on("delete", async (file) => {
				const isAlreadyInSet = this.isAlreadyRegistered(file.path);
				if (!isAlreadyInSet) return;
				this.snippets.delete(isAlreadyInSet);
				await this.saveSettings();
				await this.compiler?.reloadStyle(this.snippets);
			})
		);

		this.monkeyPatch();
	}

	async loadBookmarks() {
		if (!this.settings.buttonInContextBookmark) return;
		const bookmarksPlugin = this.app.internalPlugins.getEnabledPluginById("bookmarks");
		if (!bookmarksPlugin) {
			return;
		}
		this.bookmarks = new Bookmarks(this, bookmarksPlugin);
		await this.bookmarks.addButtonToPanel();
		console.log(`[${this.manifest.name}] loaded bookmarks`);
	}

	unloadBookmarks() {
		this.bookmarks?.removeButtonFromPanel();
		this.bookmarks = null;
	}

	onunload() {
		console.log(`[${this.manifest.name}] unloaded`);
		this.style?.detach();
		this.unloadBookmarks();
		for (const monkey of Object.values(this.activeMonkeys)) {
			monkey();
		}
		this.activeMonkeys = {};
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		this.snippets = new Set(this.settings.snippets);
	}
	
	convertObsidianToHidden(): Hidden[] {
		const userIgnoreFilters = this.app.vault.config.userIgnoreFilters;
		if (!this.settings.obsidianExclude || !userIgnoreFilters) return [];
		const snippets: Hidden[] = [];
		for (const exclude of userIgnoreFilters) {
			const type = exclude.endsWith("/") ? "folder" : "file";
			const hideInBookmarks = this.settings.alwaysHideInBookmarks && this.app.internalPlugins.getEnabledPluginById("bookmarks") !== null;
			snippets.push({
				path: exclude.replace(/\/$/, ""),
				type,
				hiddenInNav: true,
				hiddenInBookmarks: hideInBookmarks,
				fromObsidian: true,
			});
		}
		return snippets;
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
