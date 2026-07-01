import test from "node:test";
import assert from "node:assert/strict";
import { buildChapterSecondPassPrompt } from "../lib/ai/buildChapterSecondPassPrompt.ts";
import { MockAdapter } from "../lib/model-gateway/mockAdapter.ts";
import { getPlatformProfile } from "../lib/platforms/platformProfiles.ts";

const prompt = buildChapterSecondPassPrompt({
  projectTitle: "夜雨系统",
  genre: "都市系统",
  sellingPoint: "雨夜系统翻盘",
  platform: getPlatformProfile("fanqie"),
  instruction: "更像番茄，减少解释，章末更想点下一章。",
  mode: "platform_fit",
  targetWords: 1200,
  chapter: {
    title: "第一章 雨夜系统",
    content: "林晚推开门，系统提示音在雨夜响起。",
    goal: "让主角遭遇不可逆事件。",
    hook: "系统倒计时只剩十秒。",
    conflict: "主角必须在危险和逃避之间选择。",
    valueShift: "普通生活转向失控危机。",
    cliffhanger: "系统给出第一个选择。",
  },
});

test("buildChapterSecondPassPrompt", async (t) => {
  await t.test("builds executable second-pass rewrite instructions", () => {
    assert.ok(prompt.systemPrompt.includes("网文二改写手"));
    assert.ok(prompt.userPrompt.includes("作者指令：更像番茄"));
    assert.ok(prompt.userPrompt.includes("二改方向"));
    assert.ok(prompt.userPrompt.includes("只输出二改后的正文"));
    assert.ok(prompt.userPrompt.includes("当前正文"));
  });

  await t.test("mock adapter returns second-pass prose", async () => {
    const result = await new MockAdapter().generate({
      providerId: "mock",
      model: "mock-writer",
      systemPrompt: prompt.systemPrompt,
      userPrompt: prompt.userPrompt,
    });

    assert.ok(result.text.includes("系统倒计时只剩十秒"));
    assert.ok(result.text.includes("更像番茄"));
    assert.equal(result.text.trim().startsWith("{"), false);
  });
});
