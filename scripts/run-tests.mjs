import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const testRoots = ["src", "scripts"];
const excludedDirectoryNames = new Set([
  ".git",
  ".next",
  "build",
  "coverage",
  "dist",
  "generated",
  "node_modules",
  "temp",
  "tmp",
]);
const generatedOrTemporaryDirectoryPattern = /^(?:\.|__)?(?:generated|temp|tmp)(?:$|[-_.])/i;

function normalizePath(path) {
  return path.replaceAll("\\", "/");
}

function isExcludedDirectoryName(name) {
  return excludedDirectoryNames.has(name) || generatedOrTemporaryDirectoryPattern.test(name);
}

function hasExcludedDirectory(path) {
  return normalizePath(path)
    .split("/")
    .slice(0, -1)
    .some(isExcludedDirectoryName);
}

export function trackedTestFiles(paths) {
  return paths
    .map(normalizePath)
    .filter((path) => testRoots.some((root) => path.startsWith(`${root}/`)))
    .filter((path) => !hasExcludedDirectory(path))
    .filter((path) => path.endsWith(".test.ts"))
    .sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));
}

function collectTestFiles(directory, cwd, files) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!isExcludedDirectoryName(entry.name)) {
        collectTestFiles(entryPath, cwd, files);
      }
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".test.ts")) {
      files.push(normalizePath(relative(cwd, entryPath)));
    }
  }
}

export function discoverTestFiles({ cwd = process.cwd() } = {}) {
  const absoluteCwd = resolve(cwd);
  const files = [];

  for (const testRoot of testRoots) {
    const root = join(absoluteCwd, testRoot);
    try {
      collectTestFiles(root, absoluteCwd, files);
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
        continue;
      }
      throw error;
    }
  }

  return trackedTestFiles(files);
}

export function testCommandArgs(files) {
  return [
    "--import",
    "tsx",
    "--import",
    "./scripts/register-test-loader.mjs",
    "--test",
    ...files,
  ];
}

export function runTestFiles(files, { cwd = process.cwd(), runNode = spawnSync } = {}) {
  if (files.length === 0) return 0;

  const result = runNode(process.execPath, testCommandArgs(files), {
    cwd,
    env: process.env,
    shell: false,
    stdio: "inherit",
  });
  return result.status ?? 1;
}

function main() {
  try {
    const files = discoverTestFiles();
    if (files.length === 0) {
      console.error("No TypeScript test files found under src or scripts.");
    }
    process.exitCode = runTestFiles(files);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Unable to run TypeScript tests.");
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1])) {
  main();
}
