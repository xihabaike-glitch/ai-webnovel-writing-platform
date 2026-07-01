import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildChapterUpdatePayload } from "../lib/chapters/chapterPayload.ts";

describe("buildChapterUpdatePayload", () => {
  it("trims chapter card fields while preserving manuscript content", () => {
    const payload = buildChapterUpdatePayload({
      title: " 第一章 雨夜系统 ",
      content: "  正文需要保留作者输入的空格  ",
      goal: " 启动危机 ",
      hook: " 门后有未知风险 ",
      conflict: " 逃避或面对 ",
      valueShift: " 平静到失控 ",
      cliffhanger: " 系统出现 ",
      status: "draft",
    });

    assert.equal(payload.title, "第一章 雨夜系统");
    assert.equal(payload.content, "  正文需要保留作者输入的空格  ");
    assert.equal(payload.goal, "启动危机");
    assert.equal(payload.cliffhanger, "系统出现");
  });
});

