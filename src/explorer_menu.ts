import { type Menu, type MenuItem, type TAbstractFile, TFile, type App } from "obsidian";
import type { ExplorerHiderSettings, Hidden } from "./interface";
import type ExplorerHider from "./main";
import type { RulesCompiler } from "./rules";
import i18next from "i18next";

export class ExplorerMenu {
	settings: ExplorerHiderSettings;
	plugin: ExplorerHider;
	app: App;
	snippets: Set<Hidden>;
	compiler: RulesCompiler;
	constructor(plugin: ExplorerHider) {
		this.plugin = plugin;
		this.settings = plugin.settings;
		this.app = plugin.app;
		this.snippets = plugin.snippets;
		this.compiler = plugin.compiler as RulesCompiler;
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
					.setTitle(i18next.t("show.bookmarksWithName", { name }))
					.setIcon(icon.on)
					.onClick(async () => {
						isAlreadyInSet.hiddenInBookmarks = false;
						this.updateSnippet(isAlreadyInSet);
						await this.plugin.saveSettings();
						this.compiler.reloadStyle();
					});
				return;
			}
			item
				.setTitle(i18next.t("hide.bookmarksWithName", { name }))
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
		isAlreadyInSet: Hidden,
		nav?: boolean
	) {
		const title = nav
			? i18next.t("show.withName", { name })
			: i18next.t("show.explorerWithName", { name });
		return item
			.setTitle(title)
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
		isAlreadyInSet?: Hidden,
		nav?: boolean
	) {
		const itemType = file instanceof TFile ? "file" : "folder";
		const name = file instanceof TFile ? file.basename : file.name;
		const title = nav
			? i18next.t("hide.withName", { name })
			: i18next.t("hide.explorerWithName", { name });
		item
			.setTitle(title)
			.setIcon(icon.off)
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

	hideMultipleInExplorer(menu: Menu, files: TAbstractFile[]) {
		const isAlreadyInSet = files.map((file) =>
			this.plugin.isAlreadyRegistered(file.path)
		);
		const hidden = isAlreadyInSet.map((item) => item?.hiddenInNav);
		const icon = {
			off: "eye-off",
			on: "eye",
		};

		const allHidden = hidden.every((item) => item);
		menu.addItem((item) => {
			if (allHidden) {
				item
					.setTitle(i18next.t("show.multipleItems", { count: files.length }))
					.setIcon(icon.on)
					.onClick(async () => {
						files.forEach((file) => {
							const isAlreadyInSet = this.plugin.isAlreadyRegistered(file.path);
							isAlreadyInSet!.hiddenInNav = false;
							this.updateSnippet(isAlreadyInSet as Hidden);
						});
						await this.plugin.saveSettings();
						this.compiler.reloadStyle();
					});
			} else {
				item
					.setTitle(i18next.t("hide.multipleItems", { count: files.length }))
					.setIcon(icon.off)
					.onClick(async () => {
						files.forEach((file) => {
							const isAlreadyInSet = this.plugin.isAlreadyRegistered(file.path);
							const itemType = file instanceof TFile ? "file" : "folder";
							if (isAlreadyInSet) this.snippets.delete(isAlreadyInSet);
							this.snippets.add({
								path: file.path,
								type: itemType,
								hiddenInNav: true,
								hiddenInBookmarks: isAlreadyInSet
									? isAlreadyInSet.hiddenInBookmarks
									: this.settings.alwaysHideInBookmarks,
							});
						});
						await this.plugin.saveSettings();
						this.compiler.reloadStyle();
					});
			}
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
				this.showInExplorer(item, icon, name, isAlreadyInSet, true);
				return;
			}
			this.hideInExplorer(item, icon, file, isAlreadyInSet, true);
		});
	}
}
