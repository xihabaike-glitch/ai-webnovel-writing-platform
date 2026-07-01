import test from "node:test";
import assert from "node:assert/strict";
import { buildChapterDraftPrompt } from "../lib/ai/buildChapterDraftPrompt.ts";
import { MockAdapter } from "../lib/model-gateway/mockAdapter.ts";
import { getPlatformProfile } from "../lib/platforms/platformProfiles.ts";

const prompt = buildChapterDraftPrompt({
  projectTitle: "夜雨系统",
  genre: "都市系统",
  sellingPoint: "雨夜系统翻盘",
  platform: getPlatformProfile("fanqie"),
  targetWords: 1200,
  chapter: {
    title: "第3章 开局：开头钩子",
    goal: "让主角遭遇不可逆事件。",
    hook: "系统倒计时只剩十秒。",
    conflict: "主角必须在逃跑和救人之间选择。",
    valueShift: "普通生活转向失控危机。",
    cliffhanger: "系统给出第二个选择。",
    content: "",
  },
});

test("buildChapterDraftPrompt", async (t) => {
  await t.test("includes platform rules and chapter card constraints", () => {
    assert.ok(prompt.systemPrompt.includes("正文初稿"));
    assert.ok(prompt.userPrompt.includes("番茄小说"));
    assert.ok(prompt.userPrompt.includes("平台风格模板"));
    assert.ok(prompt.userPrompt.includes("每 300-500 字"));
    assert.ok(prompt.userPrompt.includes("章节目标：让主角遭遇不可逆事件。"));
    assert.ok(prompt.userPrompt.includes("第一段必须进入事件现场"));
  });

  await t.test("mock adapter returns prose for draft generation", async () => {
    const result = await new MockAdapter().generate({
      providerId: "mock",
      model: "mock-writer",
      systemPrompt: prompt.systemPrompt,
      userPrompt: prompt.userPrompt,
    });

    assert.ok(result.text.includes("系统倒计时只剩十秒"));
    assert.ok(result.text.includes("主角必须在逃跑和救人之间选择"));
    assert.doesNotThrow(() => assert.notEqual(result.text.trim().startsWith("{"), true));
  });
});
