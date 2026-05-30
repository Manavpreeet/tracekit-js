import { mkdir, readdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(currentDirectory, "..");
const packagesDirectory = resolve(workspaceRoot, "packages");
const outputDirectory = resolve(workspaceRoot, ".pack");
const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

await rm(outputDirectory, { force: true, recursive: true });
await mkdir(outputDirectory, { recursive: true });

const packageEntries = await readdir(packagesDirectory, { withFileTypes: true });

for (const entry of packageEntries) {
  if (!entry.isDirectory()) {
    continue;
  }

  const packageDirectory = resolve(packagesDirectory, entry.name);

  execFileSync(
    pnpmCommand,
    ["pack", "--pack-destination", outputDirectory],
    {
      cwd: packageDirectory,
      stdio: "inherit"
    }
  );
}
