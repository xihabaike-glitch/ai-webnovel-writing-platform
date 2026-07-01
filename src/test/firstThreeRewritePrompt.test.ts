import test from "node:test";
import assert from "node:assert/strict";
import { buildFirstThreeRewritePrompt } from "../lib/ai/buildFirstThreeRewritePrompt.ts";
import { MockAdapter } from "../lib/model-gateway/mockAdapter.ts";
import { getPlatformProfile } from "../lib/platforms/platformProfiles.ts";
import type { ChapterRewritePlan } from "../lib/projects/firstThreeRewrite.ts";

const plan: ChapterRewritePlan = {
  chapterId: "chapter-1",
  order: 1,
  title: "第一章 雨夜系统",
  role: "开口章：异常事件、不可逆选择、第一处爽点",
  priority: "high",
  currentProblem: "开头没有可见钩子。",
  rewriteTarget: "第一屏给出选择和代价。",
  coldOpen: "系统倒计时只剩十秒，门后有人求救。",
  keep: ["保留雨夜系统", "保留救人选择"],
  cut: ["删掉不影响选择和代价的背景说明。"],
  add: ["补一个章末新问题。"],
  ending: "结尾让系统给出第二个更糟的任务。",
  expectedEffect: "提高首章读完率。",
};

const prompt = buildFirstThreeRewritePrompt({
  projectTitle: "夜雨系统",
  genre: "都市系统",
  sellingPoint: "雨夜系统翻盘",
  platform: getPlatformProfile("fanqie"),
  targetWords: 1600,
  chapter: {
    order: 1,
    title: "第一章 雨夜系统",
    content: "林晚推开门，系统提示音在雨夜响起。",
    goal: "让主角遭遇不可逆事件。",
    hook: "雨夜、系统、门后未知风险。",
    conflict: "主角必须在危险和逃避之间选择。",
    valueShift: "普通生活转向失控危机。",
    cliffhanger: "系统给出第一个选择。",
  },
  plan,
});

test("buildFirstThreeRewritePrompt", async (t) => {
  await t.test("turns the rewrite plan into executable model instructions", () => {
    assert.ok(prompt.systemPrompt.includes("网文改稿写手"));
    assert.ok(prompt.userPrompt.includes("改稿处方"));
    assert.ok(prompt.userPrompt.includes("必须保留"));
    assert.ok(prompt.userPrompt.includes("必须删除或压缩"));
    assert.ok(prompt.userPrompt.includes("必须补写"));
    assert.ok(prompt.userPrompt.includes("只输出正文"));
  });

  await t.test("mock adapter returns rewritten prose", async () => {
    const result = await new MockAdapter().generate({
      providerId: "mock",
      model: "mock-writer",
      systemPrompt: prompt.systemPrompt,
      userPrompt: prompt.userPrompt,
    });

    assert.ok(result.text.includes("系统倒计时只剩十秒"));
    assert.ok(result.text.includes("第一章 雨夜系统"));
    assert.equal(result.text.trim().startsWith("{"), false);
  });
});
