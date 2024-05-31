import { type Menu, type MenuItem, type TAbstractFile, TFile, type App } from "obsidian";
import type { ExplorerHidderSettings, Hidden } from "./interface";
import type ExplorerHidder from "./main";
import type { RulesCompiler } from "./rules";

export class ExplorerMenu {
	settings: ExplorerHidderSettings;
	plugin: ExplorerHidder;
	app: App;
	snippets: Set<Hidden>;
	compiler: RulesCompiler;
	constructor(plugin: ExplorerHidder, ruleCompiler: RulesCompiler) {
		this.plugin = plugin;
		this.settings = plugin.settings;
		this.app = plugin.app;
		this.snippets = plugin.snippets;
		this.compiler = ruleCompiler;
	}
	updateSnippet(snippet: Hidden) {
		this.snippets.delete(snippet);
		this.snippets.add(snippet);
	}

	moreOptionsBookmarks(menu: Menu, file: TAbstractFile) {
		const isAlreadyInSet = this.plugin.isAlreadyRegistered(file.path);
		const hidden = isAlreadyInSet?.hiddenInBookmarks;
		const icon = {
			off: "bookmark-x",
			on: "bookmark",
		};
		const name = file instanceof TFile ? file.basename : file.name;
		menu.addItem((item) => {
			if (isAlreadyInSet && hidden) {
				item
					.setTitle(`Show « ${name} » in the bookmarks`)
					.setIcon(icon.on)
					.onClick(async () => {
						isAlreadyInSet.hiddenInBookmarks = false;
						this.updateSnippet(isAlreadyInSet);
						console.log("update");
						await this.plugin.saveSettings();
						this.compiler.reloadStyle();
					});
				return;
			}
			item
				.setTitle(`Hide « ${name} » in the bookmarks`)
				.setIcon(icon.off)
				.onClick(async () => {
					const itemType = file instanceof TFile ? "file" : "folder";
					if (isAlreadyInSet) this.snippets.delete(isAlreadyInSet);
					this.snippets.add({
						path: file.path,
						type: itemType,
						hiddenInNav: isAlreadyInSet ? isAlreadyInSet.hiddenInNav : false,
						hiddenInBookmarks: true,
					});
					await this.plugin.saveSettings();
					this.compiler.reloadStyle();
				});
		});
	}

	moreOptionsNav(menu: Menu, file: TAbstractFile) {
		const isAlreadyInSet = this.plugin.isAlreadyRegistered(file.path);
		const hidden = isAlreadyInSet?.hiddenInNav;
		const icon = {
			off: "eye-off",
			on: "eye",
		};
		const name = file instanceof TFile ? file.basename : file.name;
		menu.addItem((item) => {
			if (isAlreadyInSet && hidden) {
				this.showInExplorer(item, icon, name, isAlreadyInSet);
				return;
			}
			this.hideInExplorer(item, icon, file, isAlreadyInSet);
		});
	}

	showInExplorer(
		item: MenuItem,
		icon: { off: string; on: string },
		name: string,
		isAlreadyInSet: Hidden
	) {
		return item
			.setTitle(`Show « ${name} » in the explorer`)
			.setIcon(icon.on)
			.onClick(async () => {
				isAlreadyInSet.hiddenInNav = false;
				this.updateSnippet(isAlreadyInSet);
				await this.plugin.saveSettings();
				this.compiler.reloadStyle();
			});
	}

	hideInExplorer(
		item: MenuItem,
		icon: { off: string; on: string },
		file: TAbstractFile,
		isAlreadyInSet?: Hidden
	) {
		const itemType = file instanceof TFile ? "file" : "folder";
		const name = file instanceof TFile ? file.basename : file.name;
		item
			.setTitle(`Hide « ${name} » in the explorer`)
			.setIcon(icon.on)
			.onClick(async () => {
				if (isAlreadyInSet) this.snippets.delete(isAlreadyInSet);
				this.snippets.add({
					path: file.path,
					type: itemType,
					hiddenInNav: true,
					hiddenInBookmarks: isAlreadyInSet
						? isAlreadyInSet.hiddenInBookmarks
						: this.settings.alwaysHideInBookmarks,
				});
				await this.plugin.saveSettings();
				this.compiler.reloadStyle();
			});
	}

	explorerMenu(menu: Menu, file: TAbstractFile) {
		const isAlreadyInSet = this.plugin.isAlreadyRegistered(file.path);
		const hidden = isAlreadyInSet?.hiddenInNav;
		const icon = {
			off: "eye-off",
			on: "eye",
		};
		const name = file instanceof TFile ? file.basename : file.name;
		menu.addItem((item) => {
			if (isAlreadyInSet && hidden) {
				this.showInExplorer(item, icon, name, isAlreadyInSet);
				return;
			}

			this.hideInExplorer(item, icon, file, isAlreadyInSet);
		});
	}
}
