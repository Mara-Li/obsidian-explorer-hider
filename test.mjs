import fs from 'fs';
import path from 'path';

function readdirRecursiveSync(dir) {
    const results = [];

    function readDirRecursive(currentPath) {
        const entries = fs.readdirSync(currentPath, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(currentPath, entry.name);
            if (entry.isDirectory()) {
                readDirRecursive(fullPath);
            } else {
                results.push(entry);
            }
        }
    }

    readDirRecursive(dir);
    return results;
}
const templateFiles = readdirRecursiveSync('./src');
for (const file of templateFiles) {
	console.log(path.join(file.path, file.name));
}