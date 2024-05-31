import { type App, normalizePath } from "obsidian";
import type { ExplorerHidderSettings, Hidden } from "./interface";
import type ExplorerHidder from "./main";

export class RulesCompiler {
	plugin: ExplorerHidder;
	snippets: Set<Hidden>;
	settings: ExplorerHidderSettings;
	app: App;
	style: HTMLStyleElement | null;
	constructor(plugin: ExplorerHidder) {
		this.plugin = plugin;
		this.snippets = plugin.snippets;
		this.settings = plugin.settings;
		this.app = plugin.app;
		this.style = plugin.style;
	}

	createNavRule(snippet: Hidden, isLast: boolean) {
		const { path, type, hiddenInNav: hidden, selector } = snippet;
		if (!hidden || this.settings.showAll) return;
		const comma = isLast ? "" : ",";
		const selectorChar = selector ? selector : "";
		const ruleType = type === "string" ? "" : `.nav-${type}-title`;
		return `${ruleType}[data-path${selectorChar}="${path}"]${comma} `;
	}

	createRuleForBookMarks(snippet: Hidden, realName: string | undefined, isLast: boolean) {
		if (!snippet.hiddenInBookmarks) return;
		const { path, hiddenInBookmarks, selector } = snippet;
		if (!hiddenInBookmarks || this.settings.showAll) return;
		const comma = isLast ? "" : ",";
		const selectorChar = selector ? selector : "";
		const removeExtension = realName ? realName : path.replace(/\.(.*)$/, "");
		const ruleType = `.tree-item`;
		return `${ruleType}[data-path${selectorChar}="${removeExtension}"]${comma} `;
	}

	async createSnippetFile() {
		//use a file in `.obsidian/snippets` to hide files and folders instead of the background
		const obsidianDir = this.app.vault.configDir;
		const snippetsGeneratedFiles = normalizePath(
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
		const bookmarksPlugin = this.app.internalPlugins.getEnabledPluginById("bookmarks");
		if (!bookmarksPlugin) return "";
		const allBookMarksItem: {
			ctime: number;
			path: string;
			type: string;
			title?: string;
			//@ts-ignore
		}[] = bookmarksPlugin.items;
		filteredSnippets.forEach((snippet) => {
			const size = filteredSnippets.length - 1;
			const index = filteredSnippets.indexOf(snippet);
			//find by the path in the bookmarksItems
			const path = allBookMarksItem.find((item) => item.path === snippet.path);

			const useRule = this.createRuleForBookMarks(snippet, path?.title, index === size);
			if (useRule) rule += useRule;
		});
		if (rule.length > 0) rule += "{ display: none; }";
		console.log(rule);
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
}
