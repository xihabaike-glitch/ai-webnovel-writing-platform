import assert from "node:assert/strict";
import test from "node:test";
import { validateStoryLineReferences } from "./storyLineReferences.ts";

test("rejects story-line references outside the target project", () => {
  assert.throws(() => validateStoryLineReferences({
    chapterIds: ["chapter-in-project", "chapter-in-another-project"],
    characterIds: ["character-in-project", "character-in-another-project"],
    existingChapterIds: ["chapter-in-project"],
    existingCharacterIds: ["character-in-project"],
  }), /Invalid story-line references/);
});

test("accepts story-line references owned by the target project", () => {
  assert.doesNotThrow(() => validateStoryLineReferences({
    chapterIds: ["chapter-1", "chapter-2"],
    characterIds: ["character-1"],
    existingChapterIds: ["chapter-1", "chapter-2"],
    existingCharacterIds: ["character-1"],
  }));
});
