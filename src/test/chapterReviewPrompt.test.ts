import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildChapterReviewPrompt } from "../lib/ai/buildChapterReviewPrompt.ts";
import { getPlatformProfile } from "../lib/platforms/platformProfiles.ts";
import { buildProjectContextPack } from "../lib/projects/projectContextPack.ts";

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

  it("includes project context recall and continuity audit instruction", () => {
    const projectContext = buildProjectContextPack({
      currentChapterId: "chapter-2",
      chapters: [
        {
          id: "chapter-1",
          order: 1,
          title: "雨夜系统",
          content: "林晚第一次使用系统，代价是失去一段记忆。",
          hook: "系统倒计时只剩十秒。",
          conflict: "救人会暴露自己。",
          cliffhanger: "黑伞人出现。",
          status: "draft",
        },
        {
          id: "chapter-2",
          order: 2,
          title: "第二章",
          content: "林晚推开门。",
          hook: "黑伞人说出系统编号。",
          conflict: "追查会牵连妹妹。",
          cliffhanger: "系统要求支付记忆。",
          status: "draft",
        },
      ],
      characters: [{
        id: "character-1",
        name: "林晚",
        role: "主角",
        desire: "查清系统来源",
        need: "学会承担代价",
        flaw: "总想独自解决",
        arcStart: "被系统推着走",
        arcEnd: "反过来定义规则",
        relationshipNotes: "妹妹是软肋。",
      }],
      worldEntries: [
        { id: "w1", type: "system_rule", title: "系统规则", content: "奖励必须伴随记忆代价，不能无成本升级。" },
        { id: "w2", type: "taboo", title: "禁忌", content: "不能公开说出系统编号，否则触发追猎。" },
        { id: "w3", type: "platform_soil", title: "番茄土壤", content: "每章前半段给危机，后半段给反击或新问题。" },
      ],
      foreshadows: [],
      plotThreads: [],
    });
    const prompt = buildChapterReviewPrompt({
      projectTitle: "夜雨系统",
      platform: getPlatformProfile("fanqie"),
      projectContext,
      chapter: {
        title: "第二章",
        content: "林晚推开门。",
        goal: "让主角意识到系统代价。",
        hook: "黑伞人说出系统编号。",
        conflict: "追查会牵连妹妹。",
        valueShift: "从被动逃生到主动追查。",
        cliffhanger: "系统要求支付记忆。",
      },
    });

    assert.match(prompt.userPrompt, /项目上下文召回包/);
    assert.match(prompt.userPrompt, /系统规则/);
    assert.match(prompt.userPrompt, /第 1 章 雨夜系统/);
    assert.match(prompt.userPrompt, /continuity/);
    assert.match(prompt.userPrompt, /context_fit/);
    assert.equal(prompt.sourceContext?.sourceCounts.characters, 1);
    assert.ok(prompt.sourceContext?.summary.includes("设定 3"));
  });
});
