import { type App, PluginSettingTab, Setting } from "obsidian";
import type ExplorerHidder from "./main";
import { AttributeSelector, type Hidden, type ExplorerHidderSettings } from "./interface";

export class ExplorerHidderSettingTab extends PluginSettingTab {
	plugin: ExplorerHidder;
	settings: ExplorerHidderSettings;
	snippets: Set<Hidden>;

	constructor(app: App, plugin: ExplorerHidder) {
		super(app, plugin);
		this.plugin = plugin;
		this.settings = plugin.settings;
		this.snippets = plugin.snippets;
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
			.setName("Use a css snippet")
			.setDesc(
				"Let the plugin use a css snippet to hide files and folders, instead of in the background."
			)
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.useSnippets).onChange(async (value) => {
					this.plugin.settings.useSnippets = value;
					await this.plugin.saveSettings();
					await this.plugin.enableStyle(value);
				});
			});

		new Setting(containerEl)
			.setName("Hide in bookmarks")
			.setDesc("Hide files and folders in the bookmarks section.")
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.hideInBookmarks).onChange((value) => {
					this.plugin.settings.hideInBookmarks = value;
					this.plugin.saveSettings();
					this.plugin.reloadStyle();
				});
			});

		new Setting(containerEl).setHeading().setName("Snippets");
		let temp: Hidden = {
			path: "",
			type: "string",
			selector: AttributeSelector.Exact,
			hidden: true,
		};
		const addSnippets = new Setting(containerEl)
			.setClass("display-none")
			.addDropdown((dropdown) => {
				dropdown
					.addOption(AttributeSelector.Exact, "Exact")
					.addOption(AttributeSelector.Contains, "Contains")
					.addOption(AttributeSelector.EndsWith, "Ends with")
					.addOption(AttributeSelector.List, "List")
					.addOption(AttributeSelector.StartsWith, "Starts with")
					.addOption(AttributeSelector.Subcode, "Subcode")
					.setValue(temp.selector || AttributeSelector.Exact)
					.onChange((value) => {
						temp.selector = value as AttributeSelector;
					});
			})
			.addText((text) => {
				text
					.setPlaceholder("Path")
					.setValue(temp.path)
					.onChange((value) => {
						temp.path = value;
						this.disablePlusButton(temp);
					});
				text.inputEl.addClass("width-100");
			});

		addSnippets.addExtraButton((button) => {
			button
				.setIcon("plus")
				.setDisabled(temp.path === "" || this.isAlreadyInSet(temp))
				.onClick(async () => {
					if (this.isAlreadyInSet(temp) || temp.path === "") return;
					this.snippets.add({
						path: temp.path,
						type: temp.type,
						selector: temp.selector,
						hidden: true,
					});
					await this.plugin.saveSettings();
					temp = {
						path: "",
						type: "string",
						selector: AttributeSelector.Exact,
						hidden: true,
					};
					this.display();
				})
				.extraSettingsEl.addClass("add-snippet");
		});

		this.settings.snippets.forEach((snippet) => {
			new Setting(containerEl)
				.setClass("display-none")
				.addText((text) => {
					text.setValue(snippet.path).onChange((value) => {
						snippet.path = value;
						this.plugin.saveSettings();
					});
					text.inputEl.addClass("width-100");
				})
				.addToggle((toggle) => {
					toggle
						.setValue(snippet.hidden)
						.setTooltip("Display the file/folder in the explorer.")
						.onChange(async (value) => {
							snippet.hidden = value;
							await this.plugin.saveSettings();
							this.plugin.reloadStyle();
						});
				})
				.addExtraButton((button) => {
					button.setIcon("trash").onClick(async () => {
						this.snippets.delete(snippet);
						this.plugin.saveSettings();
						this.display();
					});
				});
		});
	}
}
