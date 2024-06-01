import { type App, PluginSettingTab, Setting } from "obsidian";
import type ExplorerHidder from "./main";
import { AttributeSelector, type Hidden, type ExplorerHidderSettings } from "./interface";
import type { RulesCompiler } from "./rules";
import i18next from "i18next";

export class ExplorerHidderSettingTab extends PluginSettingTab {
	plugin: ExplorerHidder;
	settings: ExplorerHidderSettings;
	snippets: Set<Hidden>;
	compiler: RulesCompiler;

	constructor(app: App, plugin: ExplorerHidder) {
		super(app, plugin);
		this.plugin = plugin;
		this.settings = plugin.settings;
		this.snippets = plugin.snippets;
		this.compiler = plugin.compiler as RulesCompiler;
	}

	isAlreadyInSet(snippet: Hidden): boolean {
		for (const s of this.snippets) {
			if (s.path === snippet.path) {
				return true;
			}
		}
		return false;
	}

	disablePlusButton(snippet: Hidden): void {
		const addSnippets = document.querySelector(".add-snippet");
		if (!addSnippets) return;
		if (this.isAlreadyInSet(snippet) || snippet.path === "") {
			addSnippets.classList.add("is-disabled");
			addSnippets.ariaHidden = "true";
		} else {
			//remove class
			addSnippets.classList.remove("is-disabled");
			addSnippets.ariaHidden = "false";
		}
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.addClasses(["explorer-hidder"]);
		new Setting(containerEl)
			.setName(i18next.t("Use a css snippet"))
			.setDesc(i18next.t("snippetCSSInBg"))
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.useSnippets).onChange(async (value) => {
					this.plugin.settings.useSnippets = value;
					await this.plugin.saveSettings();
					await this.compiler.enableStyle(value);
				});
			});
		new Setting(containerEl)
			.setName(i18next.t("Always hide in bookmarks"))
			.setDesc(i18next.t("file-menu"))
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.alwaysHideInBookmarks)
					.onChange(async (value) => {
						this.plugin.settings.alwaysHideInBookmarks = value;
						await this.plugin.saveSettings();
					});
			});
		let temp: Hidden = {
			path: "",
			type: "string",
			selector: AttributeSelector.Exact,
			hiddenInNav: true,
			hiddenInBookmarks: true,
		};
		new Setting(containerEl).setHeading().setName(i18next.t("addNewSnippets"));

		new Setting(containerEl)
			.setClass("display-none")
			.addDropdown((dropdown) => {
				dropdown
					.addOption(AttributeSelector.Exact, i18next.t("Exact"))
					.addOption(AttributeSelector.Contains, i18next.t("Contains"))
					.addOption(AttributeSelector.EndsWith, i18next.t("Endswith"))
					.addOption(AttributeSelector.List, i18next.t("List"))
					.addOption(AttributeSelector.StartsWith, i18next.t("Startswith"))
					.addOption(AttributeSelector.Subcode, i18next.t("Subcode"))
					.setValue(temp.selector || AttributeSelector.Exact)
					.onChange((value) => {
						temp.selector = value as AttributeSelector;
					});
			})
			.addText((text) => {
				text
					.setPlaceholder(i18next.t("Path"))
					.setValue(temp.path)
					.onChange((value) => {
						temp.path = value;
						this.disablePlusButton(temp);
					});
				text.inputEl.addClass("width-100");
			})
			.addExtraButton((button) => {
				button
					.setIcon("plus")
					.onClick(async () => {
						if (this.isAlreadyInSet(temp) || temp.path === "") return;
						this.snippets.add({
							path: temp.path,
							type: temp.type,
							selector: temp.selector,
							hiddenInNav: true,
							hiddenInBookmarks: true,
						});
						await this.plugin.saveSettings();
						temp = {
							path: "",
							type: "string",
							selector: AttributeSelector.Exact,
							hiddenInNav: true,
							hiddenInBookmarks: true,
						};
						this.display();
					})
					.extraSettingsEl.addClass("add-snippet");
			});
		this.disablePlusButton(temp);
		new Setting(containerEl).setHeading().setName("Snippets");

		this.settings.snippets.forEach((snippet) => {
			const icon = {
				bookmark: "bookmark",
				nav: "file",
			};
			switch (snippet.type) {
				case "folder":
					icon.nav = snippet.hiddenInNav ? "folder" : "folder-x";
					icon.bookmark = snippet.hiddenInBookmarks ? "book-marked" : "book-x";
					break;
				case "file":
					icon.nav = snippet.hiddenInNav ? "file" : "file-x";
					icon.bookmark = snippet.hiddenInBookmarks ? "bookmark" : "bookmark-x";
					break;
				case "string":
					icon.nav = snippet.hiddenInNav ? "list" : "list-x";
					icon.bookmark = snippet.hiddenInBookmarks ? "eye" : "eye-off";
					break;
			}
			const rule = new Setting(containerEl)
				.setClass("display-none")
				.addExtraButton((button) => {
					button
						.setIcon(icon.nav)
						.setTooltip(
							snippet.hiddenInNav
								? i18next.t("show.explorer")
								: i18next.t("hide.explorer")
						)
						.onClick(async () => {
							snippet.hiddenInNav = !snippet.hiddenInNav;
							this.plugin.saveSettings();
							this.compiler.reloadStyle();
							this.display();
						});
				});
			if (snippet.type === "string") {
				rule.addDropdown((dropdown) => {
					dropdown
						.addOption(AttributeSelector.Exact, i18next.t("Exact"))
						.addOption(AttributeSelector.Contains, i18next.t("Contains"))
						.addOption(AttributeSelector.EndsWith, i18next.t("Endswith"))
						.addOption(AttributeSelector.List, i18next.t("List"))
						.addOption(AttributeSelector.StartsWith, i18next.t("Startswith"))
						.addOption(AttributeSelector.Subcode, i18next.t("Subcode"))
						.setValue(snippet.selector || AttributeSelector.Exact)
						.onChange((value) => {
							snippet.selector = value as AttributeSelector;
						});
				});
			}
			rule
				.addText((text) => {
					text
						.setValue(snippet.path)
						.setDisabled(snippet.type !== "string")
						.onChange((value) => {
							snippet.path = value;
							this.compiler.reloadStyle();
							this.plugin.saveSettings();
						});
					text.inputEl.addClasses(["width-100", "path"]);
				})
				.addExtraButton((button) => {
					button
						.setIcon(icon.bookmark)
						.setTooltip(
							snippet.hiddenInBookmarks
								? i18next.t("show.bookmarks")
								: i18next.t("hide.bookmarks")
						)
						.onClick(async () => {
							snippet.hiddenInBookmarks = !snippet.hiddenInBookmarks;
							this.plugin.saveSettings();
							this.compiler.reloadStyle();
							this.display();
						});
				})

				.addExtraButton((button) => {
					button
						.setIcon("trash")
						.setTooltip(i18next.t("Delete"))
						.onClick(async () => {
							this.snippets.delete(snippet);
							this.plugin.saveSettings();
							this.compiler.reloadStyle();
							this.display();
						});
				});
		});
	}
}
