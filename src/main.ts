import {
	type Menu,
	Plugin,
	sanitizeHTMLToDom,
	type TAbstractFile,
	TFile,
} from "obsidian";

import { ExplorerHidderSettingTab } from "./settings";
import {
	type ExplorerHidderSettings,
	DEFAULT_SETTINGS,
	type Hidden,
	RIBBON_ICON_OFF,
	RIBBON_ICON_ON,
} from "./interface";
import { ExplorerMenu } from "./explorer_menu";
import { RulesCompiler } from "./rules";
import i18next from "i18next";
import { resources, translationLanguage } from "./i18n";

export default class ExplorerHidder extends Plugin {
	settings!: ExplorerHidderSettings;
	snippets: Set<Hidden> = new Set();
	style: HTMLStyleElement | null = null;
	compiler: RulesCompiler | null = null;

	isAlreadyRegistered(path: string): Hidden | undefined {
		for (const s of this.snippets) {
			if (s.path === path && s.type !== "string") return s;
		}
		return undefined;
	}

	reloadIcon() {
		return {
			icon: this.settings.showAll ? RIBBON_ICON_OFF : RIBBON_ICON_ON,
			desc: this.settings.showAll ? i18next.t("hide.all") : i18next.t("show.all"),
		};
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
		const ribbonEye = this.addRibbonIcon(icon.name, desc, () => {
			this.settings.showAll = !this.settings.showAll;
			this.saveSettings();
			this.compiler?.reloadStyle();
			//update the icon and the desc using the HTML element
			const { icon, desc } = this.reloadIcon();
			ribbonEye.ariaLabel = desc;
			const oldIcon = ribbonEye.querySelector("svg");
			if (oldIcon) {
				oldIcon.remove();
				ribbonEye.appendChild(sanitizeHTMLToDom(icon.svg));
			}
		});
		const contextMenu = new ExplorerMenu(this);

		this.addSettingTab(new ExplorerHidderSettingTab(this.app, this));

		//add a button to add a new file or folder to hide
		this.registerEvent(
			this.app.workspace.on(
				"file-menu",
				(menu: Menu, file: TAbstractFile, source: string) => {
					menu.addSeparator();
					if (source === "more-options") {
						contextMenu.moreOptionsNav(menu, file);
						contextMenu.moreOptionsBookmarks(menu, file);
						return;
					}
					contextMenu.explorerMenu(menu, file);
				}
			)
		);

		this.registerEvent(
			this.app.workspace.on("files-menu", (menu: Menu, files: TAbstractFile[]) => {
				contextMenu.hideMultipleInExplorer(menu, files);
			})
		);

		this.registerEvent(
			this.app.workspace.on("layout-ready", async () => {
				await this.compiler?.enableStyle(this.settings.useSnippets);
			})
		);

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
				this.compiler?.reloadStyle();
			})
		);
		this.registerEvent(
			this.app.vault.on("delete", async (file) => {
				const isAlreadyInSet = this.isAlreadyRegistered(file.path);
				if (!isAlreadyInSet) return;
				this.snippets.delete(isAlreadyInSet);
				await this.saveSettings();
				this.compiler?.reloadStyle();
			})
		);
	}

	onunload() {
		console.log(`[${this.manifest.name}] unloaded`);
		this.style?.detach();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		this.snippets = new Set();

		//sometimes, set doesn't remove the duplicates, so we remove them manually based on the path
		const uniqueSnippets: Set<string> = new Set();
		for (const s of this.settings.snippets) {
			if (!uniqueSnippets.has(s.path)) {
				uniqueSnippets.add(s.path);
				this.snippets.add(s);
			}
		}
	}

	async saveSettings() {
		//prevent duplicate entries

		this.settings.snippets = Array.from(this.snippets);
		await this.saveData(this.settings);
	}
}
