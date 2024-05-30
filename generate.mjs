import c from "ansi-colors";
import { Command } from "commander";
import ejs from "ejs";
import fs from "node:fs";
import path from "node:path";

c.theme({
	danger: c.red,
	dark: c.dim.gray,
	disabled: c.gray,
	em: c.italic,
	heading: c.bold.underline,
	info: c.cyan,
	muted: c.dim,
	primary: c.blue,
	strong: c.bold,
	success: c.green.bold,
	underline: c.underline,
	warning: c.yellow.underline,
});

const program = new Command();

program
	.description("Generate a new plugin")
	.option("-n, --name <name>", "Name of the plugin", "Sample Plugin")
	.option("-d, --description [description]", "Description of the plugin", "This is a sample plugin")
	.option("-a, --author <author>", "Author of the plugin", "Sample Author")
	.option("-ai, --author-url <author-url>", "Author URL", "")
	.option("-f, --funding-url [funding-url]", "Funding URL", undefined)
	.option("-m, --mobile-support", "Support mobile", true);

program.parse();	

const templateFiles = fs.readdirSync("./src", { withFileTypes: true, encoding: "utf-8", recursive: true});

const capitalize = (s) => {
	if (typeof s !== "string") return "";
	return s.charAt(0).toUpperCase() + s.slice(1);
};

const data = {
	name: program.opts().name || "Sample Plugin",
	id: program.opts().name.toLowerCase().replaceAll(" ", "-") || "sample-plugin",
	description: program.opts().description || "This is a sample plugin",
	interfaceName: capitalize(program.opts().name).replaceAll(" ", "") || "SamplePlugin",
	author: {
		url: program.opts().authorUrl || "",
		name: program.opts().author || "Sample Author",
	},
	isDesktopOnly: !!program.opts().desktopOnly || true,
};

if (program.opts().fundingUrl) {
	data.fundingUrl = program.opts().fundingUrl;
}

for (const files of templateFiles) {
	if (files.isFile()) {
		const pathFiles = path.join(files.path, files.name);
		
		const template = fs.readFileSync(pathFiles, { encoding: "utf-8" });
		const processedTemplate = ejs.render(template, {data});
		fs.writeFileSync(pathFiles, processedTemplate, { encoding: "utf-8" });
	}
}

const manifest = fs.readFileSync("./manifest.json", { encoding: "utf-8" });
const processedManifest = ejs.render(manifest, {data});
fs.writeFileSync("manifest.json", processedManifest, { encoding: "utf-8" });
fs.copyFileSync("manifest.json", "manifest-beta.json", { encoding: "utf-8" });


const readme = fs.readFileSync("./README.md", { encoding: "utf-8" });
const processedReadme = ejs.render(readme, {data});
fs.writeFileSync("README.md", processedReadme, { encoding: "utf-8" });

const ci = fs.readFileSync("./.github/workflows/ci.yml", { encoding: "utf-8" });
const processedCi = ejs.render(ci, {data});
fs.writeFileSync(".github/workflows/ci.yml", processedCi, { encoding: "utf-8" });

console.log(c.success("✅ Generated ") + c.info("all files"));