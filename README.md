# Explorer Hidder

I have, for years, a snippet named `Folder Hidder` that does, basically, that:
```css
.nav-file-title[data-path="path/to/file.md"],
.nav-folder-title[data-path="path/to/folder"] {
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

## ⚙️ Usage
### Configuration



## 📥 Installation

- [ ] From Obsidian's community plugins
- [x] Using BRAT with `https://github.com/Mara-Li/`
- [x] From the release page: 
    - Download the latest release
    - Unzip `explorer-hidder.zip` in `.obsidian/plugins/` path
    - In Obsidian settings, reload the plugin
    - Enable the plugin


### 🎼 Languages

- [x] English
- [ ] French

To add a translation:
1. Fork the repository
2. Add the translation in the `src/i18n/locales` folder with the name of the language (ex: `fr.json`). 
    - You can get your locale language from Obsidian using [obsidian translation](https://github.com/obsidianmd/obsidian-translations) or using the commands (in templater for example) : `<% tp.obsidian.moment.locale() %>`
    - Copy the content of the [`en.json`](./src/i18n/locales/en.json) file in the new file
    - Translate the content
3. Edit `i18n/i18next.ts` :
    - Add `import * as <lang> from "./locales/<lang>.json";`
    - Edit the `ressource` part with adding : `<lang> : {translation: <lang>}`

