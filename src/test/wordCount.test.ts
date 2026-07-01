import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { countWords } from "../lib/text/wordCount.ts";

describe("countWords", () => {
  it("counts Chinese characters and English words", () => {
    assert.equal(countWords("林晚推开门。The system started."), 8);
  });

  it("ignores whitespace and punctuation", () => {
    assert.equal(countWords("  她、停下。  "), 3);
  });
});
