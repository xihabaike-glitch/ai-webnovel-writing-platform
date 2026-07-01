import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { exportProjectMarkdown } from "../lib/export/markdown.ts";

describe("exportProjectMarkdown", () => {
  it("exports project title and ordered chapters by order field", () => {
    const markdown = exportProjectMarkdown({
      title: "夜雨系统",
      chapters: [
        { order: 2, title: "第二章", content: "她回头。" },
        { order: 1, title: "第一章", content: "门开了。" },
      ],
    });

    assert.match(markdown, /# 夜雨系统/);
    assert.match(markdown, /## 第一章/);
    assert.equal(markdown.indexOf("## 第一章") < markdown.indexOf("## 第二章"), true);
  });
});

