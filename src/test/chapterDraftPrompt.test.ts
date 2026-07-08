import test from "node:test";
import assert from "node:assert/strict";
import { buildChapterDraftPrompt } from "../lib/ai/buildChapterDraftPrompt.ts";
import { MockAdapter } from "../lib/model-gateway/mockAdapter.ts";
import { getPlatformProfile } from "../lib/platforms/platformProfiles.ts";
import { buildProjectContextPack } from "../lib/projects/projectContextPack.ts";

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
    assert.ok(prompt.systemPrompt.includes("大树结构"));
    assert.ok(prompt.userPrompt.includes("大树结构生产准则"));
    assert.ok(prompt.userPrompt.includes("开头与结尾先定"));
    assert.ok(prompt.userPrompt.includes("人物弧光"));
    assert.ok(prompt.userPrompt.includes("分支"));
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

  await t.test("includes project start tactic when available", () => {
    const tacticPrompt = buildChapterDraftPrompt({
      projectTitle: "夜雨系统",
      genre: "都市系统",
      sellingPoint: "雨夜系统翻盘",
      platform: getPlatformProfile("fanqie"),
      startTactic: {
        title: "首轮平台打法：番茄小说",
        label: "历史可复用",
        primaryTactic: "修复、复测、重验和效果回填已闭环。",
        openingMove: "先修标题简介标签和前三章兑现，再小步重验。",
        verificationMove: "记录首轮曝光、点击、收藏、追读。",
        risk: "不要直接放量。",
      },
      targetWords: 1200,
      chapter: {
        title: "第一章 雨夜系统",
        goal: "让主角遭遇不可逆事件。",
        hook: "系统倒计时只剩十秒。",
        conflict: "主角必须在逃跑和救人之间选择。",
        valueShift: "普通生活转向失控危机。",
        cliffhanger: "系统给出第二个选择。",
        content: "",
      },
    });

    assert.ok(tacticPrompt.userPrompt.includes("首轮平台打法"));
    assert.ok(tacticPrompt.userPrompt.includes("历史可复用"));
    assert.ok(tacticPrompt.userPrompt.includes("先修标题简介标签和前三章兑现"));
    assert.ok(tacticPrompt.userPrompt.includes("记录首轮曝光、点击、收藏、追读"));
  });

  await t.test("injects reusable start experience evidence into draft execution", () => {
    const tacticPrompt = buildChapterDraftPrompt({
      projectTitle: "夜雨系统",
      genre: "都市系统",
      sellingPoint: "雨夜系统翻盘",
      platform: getPlatformProfile("fanqie"),
      startTactic: {
        title: "首轮平台打法：番茄小说",
        label: "闭环交接",
        primaryTactic: "新书开局闭环打法已经进入首日流程。",
        openingMove: "第一段直接给倒计时和不可逆危机。",
        verificationMove: "记录首轮曝光、点击、收藏、追读。",
        risk: "不要直接放量。",
        firstDayActions: [
          "闭环复用：沿用已完成的新书开局三段交接。",
          "开头：第一段给不可逆危机。",
        ],
        avoidRules: ["不要直接放量，先做小样本。"],
        handoffEvidence: [
          "知识来源：番茄小说 正反馈经验已沉淀",
          "平台反哺：执行正反馈链",
        ],
      },
      targetWords: 1200,
      chapter: {
        title: "第一章 雨夜系统",
        goal: "让主角遭遇不可逆事件。",
        hook: "系统倒计时只剩十秒。",
        conflict: "主角必须在逃跑和救人之间选择。",
        valueShift: "普通生活转向失控危机。",
        cliffhanger: "系统给出第二个选择。",
        content: "",
      },
    });

    assert.ok(tacticPrompt.userPrompt.includes("开书经验执行摘要"));
    assert.ok(tacticPrompt.userPrompt.includes("知识来源：番茄小说"));
    assert.ok(tacticPrompt.userPrompt.includes("复制动作：闭环复用"));
    assert.ok(tacticPrompt.userPrompt.includes("不能踩：不要直接放量"));
    assert.ok(tacticPrompt.userPrompt.includes("最终交付归档强制执行"));
    assert.ok(tacticPrompt.userPrompt.includes("不允许忽略开书经验"));
    assert.ok(tacticPrompt.userPrompt.includes("初稿必须把复制动作写进正文事件"));
    assert.ok(tacticPrompt.userPrompt.includes("踩到不能踩边界"));
  });

  await t.test("includes project context recall when available", () => {
    const projectContext = buildProjectContextPack({
      currentChapterId: "chapter-2",
      chapters: [
        {
          id: "chapter-1",
          order: 1,
          title: "雨夜系统",
          content: "林晚在雨夜第一次触发系统。",
          hook: "系统倒计时只剩十秒。",
          conflict: "救人会暴露自己。",
          cliffhanger: "黑伞人出现。",
          status: "draft",
        },
        {
          id: "chapter-2",
          order: 2,
          title: "第二章",
          content: "",
          hook: "黑伞人说出系统编号。",
          conflict: "追查会牵连妹妹。",
          cliffhanger: "系统要求支付记忆。",
          status: "outline",
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
    const contextPrompt = buildChapterDraftPrompt({
      projectTitle: "夜雨系统",
      genre: "都市系统",
      sellingPoint: "雨夜系统翻盘",
      platform: getPlatformProfile("fanqie"),
      projectContext,
      targetWords: 1200,
      chapter: {
        title: "第二章",
        goal: "让主角意识到系统代价。",
        hook: "黑伞人说出系统编号。",
        conflict: "追查会牵连妹妹。",
        valueShift: "从被动逃生到主动追查。",
        cliffhanger: "系统要求支付记忆。",
        content: "",
      },
    });

    assert.ok(contextPrompt.userPrompt.includes("项目上下文召回包"));
    assert.ok(contextPrompt.userPrompt.includes("上下文缺口较大"));
    assert.ok(contextPrompt.userPrompt.includes("主线支线"));
    assert.ok(contextPrompt.userPrompt.includes("林晚"));
    assert.ok(contextPrompt.userPrompt.includes("系统规则"));
    assert.ok(contextPrompt.userPrompt.includes("第 1 章 雨夜系统"));
    assert.ok(contextPrompt.userPrompt.includes("不要写出与人物弧光"));
    assert.equal(contextPrompt.sourceContext?.status, "fail");
    assert.equal(contextPrompt.sourceContext?.sourceCounts.characters, 1);
    assert.ok(contextPrompt.sourceContext?.summary.includes("人物 1"));
  });

  await t.test("feeds story tree recheck experience into draft instructions", () => {
    const experiencePrompt = buildChapterDraftPrompt({
      projectTitle: "夜雨系统",
      genre: "都市系统",
      sellingPoint: "雨夜系统翻盘",
      platform: getPlatformProfile("fanqie"),
      storyTreeExperience: {
        summary: { total: 1, usable: 1, avoid: 0, watch: 0 },
        items: [],
        promptBlock: [
          "大树复检经验：",
          "- 可复用｜分支因果｜68 -> 78 分：分支因果：把支线改成主线压力的直接后果。",
        ].join("\n"),
      },
      targetWords: 1200,
      chapter: {
        title: "第三章",
        goal: "让支线反压主线。",
        hook: "黑伞人留下第二个编号。",
        conflict: "救妹妹会暴露系统。",
        valueShift: "从被动逃生到主动设局。",
        cliffhanger: "系统要求删除一段记忆。",
        content: "",
      },
    });

    assert.ok(experiencePrompt.userPrompt.includes("大树复检经验"));
    assert.ok(experiencePrompt.userPrompt.includes("可复用｜分支因果｜68 -> 78 分"));
    assert.ok(experiencePrompt.userPrompt.includes("把支线改成主线压力的直接后果"));
  });

  await t.test("feeds AI recovery evidence into draft instructions", () => {
    const recoveryPrompt = buildChapterDraftPrompt({
      projectTitle: "夜雨系统",
      genre: "都市系统",
      sellingPoint: "雨夜系统翻盘",
      platform: getPlatformProfile("fanqie"),
      aiRecoveryMemory: {
        promptBlock: [
          "AI 写审改恢复证据：",
          "- 最近恢复证据 · 恢复小批：平均质量：91；下一步：继续恢复小批。",
          "- 禁区：不要直接恢复大批量，不要弱化开头钩子和章末追读。",
        ].join("\n"),
      },
      targetWords: 1200,
      chapter: {
        title: "第四章",
        goal: "恢复后继续推进主线危机。",
        hook: "系统提示恢复批次只剩一次机会。",
        conflict: "主角必须在暴露路线和保住妹妹之间选择。",
        valueShift: "从冒险推进到谨慎反击。",
        cliffhanger: "恢复批次出现低分预警。",
        content: "",
      },
    });

    assert.ok(recoveryPrompt.userPrompt.includes("AI 写审改恢复证据"));
    assert.ok(recoveryPrompt.userPrompt.includes("平均质量：91"));
    assert.ok(recoveryPrompt.userPrompt.includes("不要直接恢复大批量"));
    assert.ok(recoveryPrompt.userPrompt.includes("恢复证据未清除前，初稿必须保留开头钩子、章末追读和小样本节奏"));
  });
});
