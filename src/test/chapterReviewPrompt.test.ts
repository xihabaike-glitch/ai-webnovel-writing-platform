import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildChapterReviewPrompt } from "../lib/ai/buildChapterReviewPrompt.ts";
import { getPlatformProfile } from "../lib/platforms/platformProfiles.ts";

describe("buildChapterReviewPrompt", () => {
  it("includes platform review focus and chapter content", () => {
    const prompt = buildChapterReviewPrompt({
      projectTitle: "夜雨系统",
      platform: getPlatformProfile("fanqie"),
      chapter: {
        title: "第一章",
        content: "林晚推开门。",
        goal: "启动危机",
        hook: "门后有未知风险",
        conflict: "逃避或面对",
        valueShift: "平静到失控",
        cliffhanger: "系统出现",
      },
    });

    assert.match(prompt.systemPrompt, /只输出 JSON/);
    assert.match(prompt.userPrompt, /番茄小说/);
    assert.match(prompt.userPrompt, /爽点密度/);
    assert.match(prompt.userPrompt, /林晚推开门/);
  });

  it("includes project start tactic when available", () => {
    const prompt = buildChapterReviewPrompt({
      projectTitle: "夜雨系统",
      platform: getPlatformProfile("fanqie"),
      startTactic: {
        title: "首轮平台打法：番茄小说",
        label: "历史可复用",
        primaryTactic: "修复后重验打法已经闭环。",
        openingMove: "先修标题简介标签和前三章兑现，再小步重验。",
        verificationMove: "记录首轮曝光、点击、收藏、追读。",
        risk: "不要直接放量。",
      },
      chapter: {
        title: "第一章",
        content: "林晚推开门。",
        goal: "启动危机",
        hook: "门后有未知风险",
        conflict: "逃避或面对",
        valueShift: "平静到失控",
        cliffhanger: "系统出现",
      },
    });

    assert.match(prompt.userPrompt, /首轮平台打法/);
    assert.match(prompt.userPrompt, /历史可复用/);
    assert.match(prompt.userPrompt, /先修标题简介标签和前三章兑现/);
    assert.match(prompt.userPrompt, /start_tactic/);
  });
});
