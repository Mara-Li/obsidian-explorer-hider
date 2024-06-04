# Explorer Hider

For years, I have used a snippet named `Folder Hider` that does basically this:

```css
.nav-file [data-path="path/to/file.md"],
.nav-folder-title[data-path^="path/to/folder"],
.nav-folder-title[data-path^="path/to/folder"] + .nav-folder-children{
    display: none;
}
```

This snippet hides files I don't want to see.

However, managing a snippet has some caveats:

- Renaming or moving the file or folder will break the snippet.
- I need to know the entire path of the file or folder, including case sensitivity.
- I have to constantly edit the snippets if I want to hide a new file or folder.
- It's not possible to unhide individually (unless using a separate snippet for each file).

So, I decided to create a plugin to manage this for me!

## 🧰 Usage
### Hiding files/folders

To hide a file or folder, you can right-click on the file/folder in the explorer and select `Hide << name >>`.

If `Always hide in bookmark` is enabled, the file/folder will also be hidden in the bookmarks when the command is used from the explorer.

> [!TIP]
> For folders, the rule will be `^=` (starts with) and for files `=` (exact match).

See [Experimental](#experimental-file-menu-and-shortcuts) for more information about the bookmarks panel and shortcuts.

### Display all or hide all

Using the "eye" ribbon button, you can enable or disable all the rules.

- Show all will display all the hidden files/folders (ignoring the rules).
- Hide all will restore the previous state (based on the hidden parameters).

## ⚙️ Configuration

The settings are divided into two parts:
- [General configuration](#general-configuration)
- [Creating new rules](#creating-new-rules)

It also displays a list of all the rules, with the option to:
- Delete them
- Hide from explorer 
- Hide in the bookmarks

For [`string` rules](#creating-new-rules), you can also edit the attribute selector and the rule itself.

### General configuration

You can choose to save the CSS in a snippet (in your `.obsidian/snippets` folder) or directly inject it into the page. Use this if, for example, you want to keep the folder hidden without using the plugin (for instance, when disabling or uninstalling it).

### Bookmarks

> [!warning] 
> This option will be disabled if the bookmarks plugin is not enabled.

You can choose to hide files in the bookmarks panel too. This will hide the file in the bookmarks panel when the command is used from the explorer.

#### Experimental: File-menu and shortcuts

It is possible to add a button in the file-menu of the bookmarks panel that allows hiding files from bookmarks. However, this feature has some caveats and bugs.

1. Currently, there is **no way** to use the API for creating the file-menu, so I had to use a workaround that can cause some visual bugs and weird behavior.
2. The HTML data of the bookmarks only displays the path *in the bookmarks*, not the real path. This path is needed to hide the file, so in some conditions, the bookmarks will be registered as a `string` and not a file (this mostly appears if the file is registered under a group). Consequently, it won't be followed if the bookmark is renamed or moved.
3. If two identical bookmarks exist (i.e., they lead to the same file, even with different names), only one will be detected and hidden. If the same file is in two different groups, the bug doesn't occur.

### Creating new rules

Using attribute selectors, you can hide multiple files or folders at once. For example, to hide all the files in a folder, you can set `[startswith] <path>`. See [CSS attribute selectors](https://developer.mozilla.org/en-US/docs/Web/CSS/Attribute_selectors) for more information.

Each attribute corresponds to:

| Attribute               | CSS    | Description                                                                                            |
| ----------------------- | ------ | ------------------------------------------------------------------------------------------------------ |
| Exact                   | `=`    | Exact match with the string                                                                            |
| Contains                | `*=`   | Contains the string                                                                                    |
| Ends with               | `$=`   | Ends with the string (suffix)                                                                          |
| Starts with             | `^=`   | Starts with the string (prefix)                                                                        |
| List                    | `~=`   | String is a whitespace-separated list of words, one of which matches exactly                           |
| Text followed by hyphen | `\|=`  | The match can be on exactly the value or can begin with the value immediately followed by a hyphen (`-`) |

## 📥 Installation

- [ ] From Obsidian's community plugins
- [X] Using BRAT with `https://github.com/Mara-Li/obsidian-explorer-hider`  
   → Or use the protocol by pasting it in your web browser: `obsidian://brat?plugin=https://github.com/Mara-Li/obsidian-explorer-hider`
- [X] From the release page:
  - Download the latest release
  - Unzip `explorer-hider.zip` in the `.obsidian/plugins/` path
  - In Obsidian settings, reload the plugin
  - Enable the plugin

### 🎼 Languages

- [X] English
- [X] French

To add a translation:

1. Fork the repository.
2. Add the translation in the `src/i18n/locales` folder with the name of the language (e.g., `fr.json`).
   - You can get your locale language from Obsidian using [obsidian translation](https://github.com/obsidianmd/obsidian-translations) or using commands (in templater, for example): `<% tp.obsidian.moment.locale() %>`
   - Copy the content of the [`en.json`](./src/i18n/locales/en.json) file into the new file.
   - Translate the content.
3. Edit `i18n/i18next.ts`:
   - Add `import * as <lang> from "./locales/<lang>.json";`
   - Edit the `resources` part by adding: `<lang>: {translation: <lang>}`