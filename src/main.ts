import { Notice, Plugin, TFile } from "obsidian";

import { ExplorerHidderSettingTab } from "./settings";
import { type ExplorerHidderSettings, DEFAULT_SETTINGS, type Hidden } from "./interface";

export default class ExplorerHidder extends Plugin {
	settings!: ExplorerHidderSettings;
	snippets: Set<Hidden> = new Set();
	style: HTMLStyleElement | null = null;

	reloadRibbonIcon(t: HTMLElement) {
		const icon = this.settings.showAll ? "eye-off" : "eye";
		const iconDesc = this.settings.showAll ? "Hide all" : "Show all";
		t.detach();
		//add a new ribbon icon
		const ribbonEye = this.addRibbonIcon(icon, iconDesc, () => {
			this.settings.showAll = !this.settings.showAll;
			this.saveSettings();
			this.reloadStyle();
			this.reloadRibbonIcon(ribbonEye);
		});
	}

	createRule(snippet: Hidden, isLast: boolean) {
		const { path, type, hidden, selector } = snippet;
		if (!hidden || this.settings.showAll) return;
		const comma = isLast ? "" : ",";
		const selectorChar = selector ? selector : "";
		const ruleType = type === "string" ? "" : `.nav-${type}-title`;
		return `${ruleType}[data-path${selectorChar}="${path}"]${comma} `;
	}

	createRuleForBookMarks(snippet: Hidden, isLast: boolean) {
		if (!this.settings.hideInBookmarks) return;
		const { path, hidden, selector } = snippet;
		if (!hidden || this.settings.showAll) return;
		const comma = isLast ? "" : ",";
		const selectorChar = selector ? selector : "";
		const removeExtension = path.replace(/\.[^/.]+$/, "");
		const ruleType = `.tree-item`;
		return `${ruleType}[data-path${selectorChar}="${removeExtension}"]${comma} `;
	}

	createStyle() {
		this.style = document.createElement("style");
		this.style.id = "explorer-hidder";
		this.style.setAttribute("type", "text/css");
		let rule = "";
		let bookmarksRule = "";
		this.snippets.forEach((snippet) => {
			const size = this.snippets.size - 1;
			const index = Array.from(this.snippets).indexOf(snippet);
			const useRule = this.createRule(snippet, index === size);
			const bookmarksRuleUse = this.createRuleForBookMarks(snippet, index === size);
			if (bookmarksRuleUse) bookmarksRule += bookmarksRuleUse;
			if (useRule) rule += useRule;
		});
		if (rule.length > 0) rule += "{ display: none; }";
		if (bookmarksRule.length > 0) bookmarksRule += "{ display: none; }";
		this.style.textContent = rule;
		this.style.textContent += bookmarksRule;
		// biome-ignore lint/correctness/noUndeclaredVariables: this is a global variable
		activeDocument.head.appendChild(this.style);
		this.app.workspace.trigger("css-change");
	}

	reloadStyle() {
		this.style?.detach();
		this.createStyle();
	}

	isAlreadyRegistered(path: string): Hidden | undefined {
		for (const s of this.snippets) {
			if (s.path === path) return s;
		}
		return undefined;
	}

	async onload() {
		console.log(`[${this.manifest.name}] loaded`);
		await this.loadSettings();
		this.snippets = new Set(this.settings.snippets);
		this.createStyle();
		const icon = this.settings.showAll ? "eye-off" : "eye";
		const iconDesc = this.settings.showAll ? "Hide all" : "Show all";
		// This creates an icon in the left ribbon.
		const ribbonEye = this.addRibbonIcon(icon, iconDesc, () => {
			this.settings.showAll = !this.settings.showAll;
			this.saveSettings();
			this.reloadStyle();
			//update the icon
			this.reloadRibbonIcon(ribbonEye);
		});

		this.addSettingTab(new ExplorerHidderSettingTab(this.app, this));

		//add a button to add a new file or folder to hide
		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, file) => {
				menu.addItem((item) => {
					const isAlreadyInSet = this.isAlreadyRegistered(file.path);
					if (isAlreadyInSet) {
						item
							.setTitle(`Show ${file instanceof TFile ? file.basename : file.name}`)
							.setIcon("eye")
							.onClick(async () => {
								this.snippets.delete(isAlreadyInSet);
								await this.saveSettings();
								this.reloadStyle();
							});
						return;
					}
					const name = file instanceof TFile ? file.basename : file.name;
					item
						.setTitle(`Hide ${name}`)
						.setIcon("eye-off")
						.onClick(async () => {
							const itemType = file instanceof TFile ? "file" : "folder";
							this.snippets.add({ path: file.path, type: itemType, hidden: true });
							await this.saveSettings();
							this.reloadStyle();
						});
				});
			})
		);
	}

	onunload() {
		console.log(`[${this.manifest.name}] unloaded`);
		this.style?.detach();
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
