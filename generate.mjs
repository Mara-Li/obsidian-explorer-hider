import c from "ansi-colors";
import ejs from "ejs";
import fs from "node:fs";
import path from "node:path";
import prompts from "prompts";
import licenses from "spdx-license-list/full.js";
import { getLicense } from "license";
import packageJson from "./package.json" assert { type: "json" };
const { dim, reset } = c;
import { execa } from "execa";
import gitUserName from "git-user-name";

const capitalize = (s) => {
	if (typeof s !== "string") return "";
	return s.charAt(0).toUpperCase() + s.slice(1);
};
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
const defaultPluginID = process
	.cwd()
	.split(path.sep)
	.pop()
	.toLowerCase()
	.replaceAll(" ", "-")
	.replace(/-?obsidian-?/, "");

const answer = await prompts(
	[
		{
			type: () => "text",
			name: "id",
			message: `Enter the plugin ID ${reset("(lowercase, no spaces)")}`,
			initial: defaultPluginID,
			format: (value) =>
				value.toLowerCase().replaceAll(" ", "-").toLowerCase(),
			validate: (value) =>
				value.length > 0 ? true : "Please enter a valid plugin ID",
		},
		{
			type: "text",
			name: "name",
			message: "Enter the plugin name",
			initial: (prev) =>
				prev
					.replace("obsidian-plugin", "")
					.split("-")
					.filter((word) => word.length > 0)
					.map((word) => capitalize(word))
					.join(" "),
		},
		{
			type: "text",
			name: "description",
			message: "Enter the plugin description",
		},
		{
			type: "text",
			name: "author",
			message: "Enter the author name",
			initial: gitUserName(),
		},
		{
			type: "text",
			name: "authorUrl",
			message: "Enter the author URL",
		},
		{
			type: "confirm",
			name: "desktopOnly",
			message: "Is this plugin desktop-only?",
		},
		{
			type: "text",
			name: "fundingUrl",
			message: "Enter the funding URL",
		},
		{
			type: "autocomplete",
			name: "license",
			message: `Choose a license ${reset(
				dim("(type to filter, ↑ or ↓ to navigate)")
			)}`,
			initial: "MIT",
			choices: Object.entries(licenses).map(([id, license]) => {
				return {
					value: id,
					title: license.name,
					description: (license.osiApproved && "OSI Approved") || "",
				};
			}),
		},
	],
	{
		onCancel: () => {
			console.log(c.warning("❌ Generation cancelled"));
			process.exit(0);
		},
	}
);

const templateFiles = fs.readdirSync("./src", {
	withFileTypes: true,
	encoding: "utf-8",
	recursive: true,
});

const data = {
	name: answer.name || "Sample Plugin",
	id: answer.id || "sample-plugin",
	description: answer.description || "This is a sample plugin",
	interfaceName: answer.name.replaceAll(" ", "") || "SamplePlugin",
	author: {
		url: answer.authorUrl || "",
		name: answer.author || "Sample Author",
	},
	isDesktopOnly: !!answer.desktopOnly || false,
};

if (answer.fundingUrl) {
	data.fundingUrl = answer.fundingUrl;
}

for (const files of templateFiles) {
	if (files.isFile()) {
		const pathFiles = path.join(files.path, files.name);

		const template = fs.readFileSync(pathFiles, { encoding: "utf-8" });
		const processedTemplate = ejs.render(template, { data });
		fs.writeFileSync(pathFiles, processedTemplate, { encoding: "utf-8" });
	}
}

const manifest = fs.readFileSync("./manifest.json", { encoding: "utf-8" });
const processedManifest = ejs.render(manifest, { data });
fs.writeFileSync("manifest.json", processedManifest, { encoding: "utf-8" });

const license = getLicense(answer.license, {
	author: data.author.name,
	year: new Date().getFullYear(),
});
fs.writeFileSync("LICENSE", license, { encoding: "utf-8" });
fs.writeFileSync("manifest-beta.json", processedManifest, {
	encoding: "utf-8",
});

const readme = fs.readFileSync("./README.md", { encoding: "utf-8" });
const processedReadme = ejs.render(readme, { data });
fs.writeFileSync(
	"README.md",
	processedReadme.replace(
		"{{TEMPLATE_PLACEHOLDER LOCALE}}",
		"<% tp.obsidian.moment.locale() %>"
	),
	{ encoding: "utf-8" }
);

const ci = fs.readFileSync("./.github/workflows/ci.yaml", {
	encoding: "utf-8",
});
const processedCi = ejs.render(ci, { data });
fs.writeFileSync(".github/workflows/ci.yaml", processedCi, {
	encoding: "utf-8",
});

console.log(c.success("✅ Generated ") + c.info("all files"));

//update package.json
packageJson.author = data.author.name;
packageJson.name = data.id;
packageJson.license = answer.license;
packageJson.description = data.description;
delete packageJson.scripts.generate;
delete packageJson.devDependencies["@types/ejs"];
delete packageJson.dependencies.ejs;
delete packageJson.dependencies.prompts;
delete packageJson.dependencies["spdx-license-list"];
delete packageJson.dependencies.execa;
delete packageJson.dependencies.license;
delete packageJson.dependencies["git-user-name"];
fs.writeFileSync("package.json", JSON.stringify(packageJson, null, 2), {
	encoding: "utf-8",
});
//detect if yarn or npm or pnpm

if (fs.existsSync("yarn.lock")) {
	console.log(c.info("Detected yarn, running yarn install"));
	await execa("yarn", ["install"]);
} else if (fs.existsSync("package-lock.json")) {
	console.log(c.info("Detected npm, running npm install"));
	await execa("npm", ["install"]);
} else if (fs.existsSync("pnpm-lock.yaml")) {
	console.log(c.info("Detected pnpm, running pnpm install"));
	await execa("pnpm", ["install"]);
} else {
	console.log(
		c.warning(
			"No package manager detected, please run yarn/npm/pnpm install"
		)
	);
}
console.log(c.success("✅ Installed dependencies"));
//delete this files
fs.unlinkSync("generate.mjs");
