import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("client review pipeline uses the pure review-result module", async () => {
  const source = await readFile(new URL("./batchReviewPipeline.ts", import.meta.url), "utf8");

  assert.match(source, /from "\.\/chapterReviewResult\.ts"/);
  assert.doesNotMatch(source, /from "\.\/chapterReviewGeneration\.ts"/);
});
