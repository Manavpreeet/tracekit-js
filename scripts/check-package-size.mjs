import { readdir, stat } from "node:fs/promises";
import path from "node:path";

const packagesDirectory = new URL("../packages/", import.meta.url);
const packageNames = await readdir(packagesDirectory, { withFileTypes: true });
const rows = [];

for (const entry of packageNames) {
  if (!entry.isDirectory()) {
    continue;
  }

  const distDirectory = new URL(`../packages/${entry.name}/dist/`, import.meta.url);

  try {
    const files = await readdir(distDirectory);
    let totalBytes = 0;

    for (const file of files) {
      const fileStat = await stat(path.join(distDirectory.pathname, file));

      totalBytes += fileStat.size;
    }

    rows.push({
      package: entry.name,
      totalBytes
    });
  } catch {
    rows.push({
      package: entry.name,
      totalBytes: 0
    });
  }
}

rows.sort((left, right) => left.package.localeCompare(right.package));

console.log("TraceKit package sizes");
console.log(JSON.stringify(rows, null, 2));
