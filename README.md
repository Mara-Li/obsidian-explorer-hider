# Explorer Hider

I have, for years, a snippet named `Folder Hider` that does, basically, that:

```css
.nav-file [data-path="path/to/file.md"],
.nav-folder [data-path^="path/to/folder"] {
    display: none;
}
```

Hiding some files I doesn't want to see.

But, managing a snippet have some caveat:

- Renaming the file or the folder will break the snippet, and same for moving
- I need to know the entire path of the file or folder, including insensitive case
- I need to always edit the snippets if I want to hide a new file or folder
- Can't unhide individually (unless using a snippets for each files...)

So, I decided to create a plugin that will manage that for me!

## 🧰 Usage
### Hiding files/folders

To hide a file or a folder, you can right-click on the file/folder in the explorer and select `Hide << name >>`.

If `Always hide in bookmark` is enabled, the file/folder will be hidden in the bookmarks too when the command is used from the explorer.

> [!TIP]
> For folder, the rules will be `^=` (starts with) and for files `=` (exact match).

See [experimental](#experimental-file-menu-and-shortcuts) for more information about the bookmarks panel and the shortcuts.

### Display all or hide all

Using the "eye" ribbon button you can enable or disable all the rules.

- Show all will display all the hidden files/folders (ignoring the rules)
- Hide all will restore the older state (based on the hidden parameters).

## ⚙️ Configuration

The settings are divided in two parts:
- [General configuration](#general-configuration)
- [Creating new rules](#creating-new-rules)

It also display a list of all the rules, with the possibility to:
- Delete them
- Hide from explorer 
- Hide in the bookmarks

For [`string` rules](#creating-new-rules), you can also edit the attribute selector and the rules itself.

### General configuration

You can choose between to save the CSS in a snippets (in your `.obsidian/snippets` folder) or directly inject it in the page. Use this if, for example, you want to keep the folder hidden without using the plugin (for example when disabling or uninstalling it).

### Bookmarks

> [!warning] 
> The option will be disabled if the bookmarks plugin is not enabled.

You can choose to hide the files in the bookmarks panel too. 
This will hide the file in the bookmarks panel when the command is used from the explorer.

#### Experimental: file-menu and shortcuts

It is possible to add a button in the file-menu of the bookmarks panel, that allows to hiding file from bookmarks. But, this function have some caveat and bug.

1. You need to know that, at the moment, there is **no way** I could use the API for creating the file-menu, and I needed to use a workaround, that can cause some visual bug and weird behavior.
2. The HTML data of the bookmarks only display the path *in the bookmarks*, and not the real path. This path is needed to hide, so, in some condition, the bookmarks will be registered as a `string` and not a file (it mostly appear if the file is registered under a group). As a consequence, it won't be followed if the bookmarks is renamed or moved.
3. In the two exact same bookmarks exists (aka lead to the same files, even on different name), only one will be detected and hidden. If the same file is in two different group, the bug doesn't appear.


### Creating new rules

Using attribute selector, you can hide multiple file or folder at once. For example, to hide all the files in a folder, you can set `[startswith] <path>`. See [CSS attribute selectors](https://developer.mozilla.org/en-US/docs/Web/CSS/Attribute_selectors) for more information.

Each attributes correspond to:

| Attribute               | CSS    | Description                                                                                            |
| ----------------------- | ------ | ------------------------------------------------------------------------------------------------------ |
| Exact                   | `=`  | Exact match with the string                                                                            |
| Contains                | `*=` | Contains the string                                                                                    |
| Ends with               | `$=` | Ends with the string (suffixe)                                                                         |
| Starts with             | `^=` | Starts with (prefix)                                                                                   |
| List                    | `~=` | String is a whitespace separated list of words, one of which match exactly                             |
| Text followed by hiphen | `\|=` | The match can be on exactly the value or can begin with value immediately followed by a hyphen (`-`) |



## 📥 Installation

- [ ] From Obsidian's community plugins
- [X] Using BRAT with `https://github.com/Mara-Li/obsidian-explorer-hider`  
   → Or use the protocole by pasting it in your web browser: @`obsidian://brat?plugin=https://github.com/Mara-Li/obsidian-explorer-hider`
- [X] From the release page:
  - Download the latest release
  - Unzip `explorer-hider.zip` in `.obsidian/plugins/` path
  - In Obsidian settings, reload the plugin
  - Enable the plugin

### 🎼 Languages

- [X] English
- [X] French

To add a translation:

1. Fork the repository
2. Add the translation in the `src/i18n/locales` folder with the name of the language (ex: `fr.json`).
   - You can get your locale language from Obsidian using [obsidian translation](https://github.com/obsidianmd/obsidian-translations) or using the commands (in templater for example) : `<% tp.obsidian.moment.locale() %>`
   - Copy the content of the [`en.json`](./src/i18n/locales/en.json) file in the new file
   - Translate the content
3. Edit `i18n/i18next.ts` :
   - Add `import * as <lang> from "./locales/<lang>.json";`
   - Edit the `ressource` part with adding : `<lang> : {translation: <lang>}`
