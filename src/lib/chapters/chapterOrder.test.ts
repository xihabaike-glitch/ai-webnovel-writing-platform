import assert from "node:assert/strict";
import test from "node:test";
import { ChapterOrderConflictError, nextChapterOrder } from "./chapterOrder.ts";

test("allocates the next chapter order from the current maximum", () => {
  assert.equal(nextChapterOrder(null), 1);
  assert.equal(nextChapterOrder(7), 8);
});

test("exposes a stable conflict error after exhausted allocation retries", () => {
  const error = new ChapterOrderConflictError();
  assert.equal(error.name, "ChapterOrderConflictError");
  assert.match(error.message, /chapter order/i);
});
