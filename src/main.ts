import { Notice, Plugin } from "obsidian";

import { ExplorerHidderSettingTab } from "./settings";
import { type ExplorerHidderSettings, DEFAULT_SETTINGS, type Hidden } from "./interface";

export default class ExplorerHidder extends Plugin {
	settings!: ExplorerHidderSettings;
	snippets: Set<Hidden> = new Set();

	async onload() {
		console.log(`[${this.manifest.name}] loaded`);
		await this.loadSettings();
		this.snippets = new Set(this.settings.snippets);

		const icon = this.settings.hideAll ? "eye" : "eye-closed";
		const iconDesc = this.settings.hideAll ? "Show all" : "Hide all";
		// This creates an icon in the left ribbon.
		this.addRibbonIcon(icon, iconDesc, (_evt: MouseEvent) => {
			new Notice("This is a notice!");
		});

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText("Status Bar Text");

		// This adds a simple command that can be triggered anywhere

		this.addSettingTab(new ExplorerHidderSettingTab(this.app, this));
	}

	onunload() {
		console.log(`[${this.manifest.name}] unloaded`);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		//convert the set into an array
		this.settings.snippets = Array.from(this.snippets);
		await this.saveData(this.settings);
	}
}
