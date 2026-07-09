import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

async function routeFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return routeFiles(path);
    return entry.name === "route.ts" ? [path] : [];
  }));
  return files.flat();
}

test("every chapter generator API caller uses the shared HTTP error mapping", async () => {
  const callers: string[] = [];
  for (const file of await routeFiles(join(process.cwd(), "src/app/api"))) {
    const source = await readFile(file, "utf8");
    if (/\b(generateChapterDraft|reviewChapterDraft|generateChapterSecondPass)\s*\(/u.test(source)) {
      callers.push(file);
      assert.match(
        source,
        /\bmap(?:Batch)?ChapterGeneration(?:Error|Failure)\b/u,
        `${file} must map chapter generation domain errors through the shared helper`,
      );
    }
  }

  assert.equal(callers.length, 12);
});

test("first-three rewrite delegates task leases and terminal transitions to routed generation", async () => {
  const route = join(
    process.cwd(),
    "src/app/api/projects/[projectId]/first-three-rewrite/generate/route.ts",
  );
  const source = await readFile(route, "utf8");

  assert.match(source, /\brunRoutedGeneration\s*\(/u);
  assert.match(source, /\bmapChapterGeneration(?:Error|Failure)\b/u);
  assert.doesNotMatch(source, /prisma\.aiTask\.(?:create|update)\s*\(/u);
});
