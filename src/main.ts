import { type Menu, Plugin, type TAbstractFile, TFile } from "obsidian";

import { ExplorerHidderSettingTab } from "./settings";
import { type ExplorerHidderSettings, DEFAULT_SETTINGS, type Hidden } from "./interface";
import { ExplorerMenu } from "./explorer_menu";
import { RulesCompiler } from "./rules";
import i18next from "i18next";
import { resources, translationLanguage } from "./i18n";

export default class ExplorerHidder extends Plugin {
	settings!: ExplorerHidderSettings;
	snippets: Set<Hidden> = new Set();
	style: HTMLStyleElement | null = null;

	isAlreadyRegistered(path: string): Hidden | undefined {
		for (const s of this.snippets) {
			if (s.path === path && s.type !== "string") return s;
		}
		return undefined;
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
		const ruleCompiler = new RulesCompiler(this);
		await ruleCompiler.enableStyle(this.settings.useSnippets);
		const icon = this.settings.showAll ? "eye-off" : "eye";
		const iconDesc = this.settings.showAll ? "Hide all" : "Show all";
		// This creates an icon in the left ribbon.
		const ribbonEye = this.addRibbonIcon(icon, iconDesc, () => {
			this.settings.showAll = !this.settings.showAll;
			this.saveSettings();
			ruleCompiler.reloadStyle();
			//update the icon
			ruleCompiler.reloadRibbonIcon(ribbonEye);
		});
		const contextMenu = new ExplorerMenu(this, ruleCompiler);

		this.addSettingTab(new ExplorerHidderSettingTab(this.app, this, ruleCompiler));

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
				ruleCompiler.reloadStyle();
			})
		);
		this.registerEvent(
			this.app.vault.on("delete", async (file) => {
				const isAlreadyInSet = this.isAlreadyRegistered(file.path);
				if (!isAlreadyInSet) return;
				this.snippets.delete(isAlreadyInSet);
				await this.saveSettings();
				ruleCompiler.reloadStyle();
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
