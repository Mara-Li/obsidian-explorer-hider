import { Plugin, TFile } from "obsidian";

import { ExplorerHidderSettingTab } from "./settings";
import { type ExplorerHidderSettings, DEFAULT_SETTINGS, type Hidden } from "./interface";
import { normalize } from "path";

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

	createNavRule(snippet: Hidden, isLast: boolean) {
		const { path, type, hiddenInNav: hidden, selector } = snippet;
		if (!hidden || this.settings.showAll) return;
		const comma = isLast ? "" : ",";
		const selectorChar = selector ? selector : "";
		const ruleType = type === "string" ? "" : `.nav-${type}-title`;
		return `${ruleType}[data-path${selectorChar}="${path}"]${comma} `;
	}

	createRuleForBookMarks(snippet: Hidden, isLast: boolean) {
		if (!snippet.hiddenInBookmarks) return;
		const { path, hiddenInBookmarks, selector } = snippet;
		if (!hiddenInBookmarks || this.settings.showAll) return;
		const comma = isLast ? "" : ",";
		const selectorChar = selector ? selector : "";
		const removeExtension = path.replace(/\.[^/.]+$/, "");
		const ruleType = `.tree-item`;
		return `${ruleType}[data-path${selectorChar}="${removeExtension}"]${comma} `;
	}

	async createSnippetFile() {
		//use a file in `.obsidian/snippets` to hide files and folders instead of the background
		const obsidianDir = this.app.vault.configDir;
		const snippetsGeneratedFiles = normalize(
			`${obsidianDir}/snippets/generated.explorer-hidder.css`
		);
		const rules = `/* This file is generated by the Explorer Hidder plugin. Do not edit it manually. */\n${this.createRules()}`;
		await this.app.vault.adapter.write(snippetsGeneratedFiles, rules);
	}

	compileNavRules() {
		let rule = "";
		const filteredSnippets = Array.from(this.snippets).filter((s) => s.hiddenInNav);
		filteredSnippets.forEach((snippet) => {
			const size = filteredSnippets.length - 1;
			const index = filteredSnippets.indexOf(snippet);
			const useRule = this.createNavRule(snippet, index === size);
			if (useRule) rule += useRule;
		});
		if (rule.length > 0) rule += "{ display: none; }";
		return rule;
	}

	compileBookmarksRules() {
		let rule = "";
		const filteredSnippets = Array.from(this.snippets).filter((s) => s.hiddenInBookmarks);
		filteredSnippets.forEach((snippet) => {
			const size = filteredSnippets.length - 1;
			const index = filteredSnippets.indexOf(snippet);
			const useRule = this.createRuleForBookMarks(snippet, index === size);
			if (useRule) rule += useRule;
		});
		if (rule.length > 0) rule += "{ display: none; }";
		return rule;
	}

	createRules() {
		return `${this.compileNavRules()}\n${this.compileBookmarksRules()}`;
	}

	createDocumentStyle() {
		this.style = document.createElement("style");
		this.style.id = "explorer-hidder";
		this.style.setAttribute("type", "text/css");
		this.style.textContent = this.createRules();
		// biome-ignore lint/correctness/noUndeclaredVariables: this is a global variable
		activeDocument.head.appendChild(this.style);
	}

	async enableStyle(toFile: boolean = false) {
		if (toFile) {
			//create the snippets file if not exist
			await this.createSnippetFile();
			this.app.customCss.setCssEnabledStatus(`generated.explorer-hidder`, true);
			//we need to wait a little to wait for obsidian to load the file & enable it before disabling the style
			// biome-ignore lint/correctness/noUndeclaredVariables: Obsidian global function
			await sleep(500);
			this.style?.detach();
		} else {
			this.app.customCss.setCssEnabledStatus(`generated.explorer-hidder`, false);
			this.style?.detach();
			this.createDocumentStyle();
		}
		this.app.workspace.trigger("css-change");
	}

	reloadStyle() {
		this.style?.detach();
		if (this.settings.useSnippets) this.createSnippetFile();
		else this.createDocumentStyle();

		this.app.workspace.trigger("css-change");
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
		await this.enableStyle(this.settings.useSnippets);
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
							this.snippets.add({
								path: file.path,
								type: itemType,
								hiddenInNav: true,
								hiddenInBookmarks: true,
							});
							await this.saveSettings();
							this.reloadStyle();
						});
				});
			})
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
				this.reloadStyle();
			})
		);
		this.registerEvent(
			this.app.vault.on("delete", async (file) => {
				const isAlreadyInSet = this.isAlreadyRegistered(file.path);
				if (!isAlreadyInSet) return;
				this.snippets.delete(isAlreadyInSet);
				await this.saveSettings();
				this.reloadStyle();
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
