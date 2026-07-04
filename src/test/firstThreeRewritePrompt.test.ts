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
    assert.ok(prompt.systemPrompt.includes("大树结构"));
    assert.ok(prompt.userPrompt.includes("改稿处方"));
    assert.ok(prompt.userPrompt.includes("大树结构生产准则"));
    assert.ok(prompt.userPrompt.includes("前三章先形成追读链"));
    assert.ok(prompt.userPrompt.includes("人物弧光"));
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

  await t.test("includes project start tactic when available", () => {
    const tacticPrompt = buildFirstThreeRewritePrompt({
      projectTitle: "夜雨系统",
      genre: "都市系统",
      sellingPoint: "雨夜系统翻盘",
      platform: getPlatformProfile("fanqie"),
      startTactic: {
        title: "首轮平台打法：番茄小说",
        label: "历史观察",
        primaryTactic: "只复用小步重验流程，不复制成功结论。",
        openingMove: "先修前三章兑现，再用小步数据重验。",
        verificationMove: "等下一轮效果回填后再加码。",
        risk: "缺重验效果前不要扩大投放。",
      },
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

    assert.ok(tacticPrompt.userPrompt.includes("首轮平台打法"));
    assert.ok(tacticPrompt.userPrompt.includes("历史观察"));
    assert.ok(tacticPrompt.userPrompt.includes("只复用小步重验流程"));
    assert.ok(tacticPrompt.userPrompt.includes("等下一轮效果回填后再加码"));
  });

  await t.test("feeds platform knowledge into rewrite instructions", () => {
    const knowledgePrompt = buildFirstThreeRewritePrompt({
      projectTitle: "夜雨系统",
      genre: "都市系统",
      sellingPoint: "雨夜系统翻盘",
      platform: getPlatformProfile("fanqie"),
      platformKnowledge: {
        platformId: "fanqie",
        platformName: "番茄小说",
        status: "learned",
        confidence: 90,
        evidenceCount: 4,
        positiveCount: 1,
        negativeCount: 0,
        winningSignals: ["胜出标题：夜雨系统：倒计时重生", "追读率 +2%"],
        avoidSignals: ["别把系统规则解释太久"],
        tacticSummary: "番茄小说 已有可复用打法：第一屏压倒计时选择。",
        nextAction: "把胜出钩子写进前三章。",
      },
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

    assert.ok(knowledgePrompt.userPrompt.includes("平台知识库反哺"));
    assert.ok(knowledgePrompt.userPrompt.includes("第一屏压倒计时选择"));
    assert.ok(knowledgePrompt.userPrompt.includes("别把系统规则解释太久"));
  });

  await t.test("includes project context in first-three rewrite instructions", () => {
    const contextPrompt = buildFirstThreeRewritePrompt({
      projectTitle: "夜雨系统",
      genre: "都市系统",
      sellingPoint: "雨夜系统翻盘",
      platform: getPlatformProfile("fanqie"),
      projectContext: {
        status: "warn",
        summary: "上下文需要补强：人物 1，设定 2，线索 1，历史章节 1。",
        warnings: ["主线支线与伏笔：伏笔缺少埋设说明"],
        sourceCounts: {
          characters: 1,
          worldEntries: 2,
          storyLines: 1,
          historyChapters: 1,
        },
        blocks: [],
        promptBlock: [
          "项目上下文召回包：",
          "【人物弧光｜可用】",
          "- 林晚（主角）；欲望：查清系统来源；需求：学会承担代价；缺陷：总想独自解决；弧光：被系统推着走 -> 反过来定义规则",
          "【主线支线与伏笔｜需谨慎】",
          "- 剧情线：系统追猎；类型：主线；状态：推进中；有起点；缺终点",
        ].join("\n"),
      },
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

    assert.ok(contextPrompt.userPrompt.includes("上下文需要补强"));
    assert.ok(contextPrompt.userPrompt.includes("写作时优先补齐警告项"));
    assert.ok(contextPrompt.userPrompt.includes("项目上下文召回包"));
    assert.ok(contextPrompt.userPrompt.includes("林晚"));
    assert.ok(contextPrompt.userPrompt.includes("系统追猎"));
  });
});
