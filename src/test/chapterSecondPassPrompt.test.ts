import test from "node:test";
import assert from "node:assert/strict";
import { buildChapterSecondPassPrompt } from "../lib/ai/buildChapterSecondPassPrompt.ts";
import { MockAdapter } from "../lib/model-gateway/mockAdapter.ts";
import { getPlatformProfile } from "../lib/platforms/platformProfiles.ts";
import { buildProjectContextPack } from "../lib/projects/projectContextPack.ts";

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

  await t.test("includes project start tactic when available", () => {
    const tacticPrompt = buildChapterSecondPassPrompt({
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
      instruction: "按平台策略重压开头。",
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

    assert.ok(tacticPrompt.userPrompt.includes("首轮平台打法"));
    assert.ok(tacticPrompt.userPrompt.includes("历史观察"));
    assert.ok(tacticPrompt.userPrompt.includes("先修前三章兑现"));
    assert.ok(tacticPrompt.userPrompt.includes("优先执行首轮平台打法"));
  });

  await t.test("includes project context recall plan when available", () => {
    const projectContext = buildProjectContextPack({
      currentChapterId: "chapter-2",
      chapters: [
        {
          id: "chapter-1",
          order: 1,
          title: "雨夜系统",
          content: "林晚在雨夜救人，系统要求她支付记忆代价。",
          hook: "系统倒计时只剩十秒。",
          conflict: "救人会暴露异常。",
          cliffhanger: "黑伞人说出了系统编号。",
          status: "draft",
        },
        {
          id: "chapter-2",
          order: 2,
          title: "记忆代价",
          content: "待二改正文。",
          hook: "手机里少了一段通话记录。",
          conflict: "追查系统会牵连妹妹。",
          cliffhanger: "黑伞人再次出现。",
          status: "draft",
        },
      ],
      characters: [
        {
          id: "character-1",
          name: "林晚",
          role: "主角",
          desire: "查清系统来源并保护妹妹",
          need: "学会主动选择并承担代价",
          flaw: "总想一个人扛下所有风险",
          arcStart: "被系统推着走",
          arcEnd: "反过来定义系统规则",
          relationshipNotes: "妹妹是软肋，黑伞人是压力源。",
        },
      ],
      worldEntries: [
        {
          id: "world-1",
          type: "system_rule",
          title: "系统任务规则",
          content: "系统只在高压选择时发布任务，每次奖励都必须支付记忆或关系代价。",
        },
      ],
      foreshadows: [
        {
          id: "foreshadow-1",
          title: "黑伞人知道系统编号",
          setupChapterId: "chapter-1",
          payoffChapterId: null,
          relatedCharacterIds: JSON.stringify(["character-1"]),
          status: "setup",
          notes: "二改时保留黑伞人的压迫感，不提前解释身份。",
        },
      ],
      plotThreads: [],
    });
    const contextPrompt = buildChapterSecondPassPrompt({
      projectTitle: "夜雨系统",
      genre: "都市系统",
      sellingPoint: "雨夜系统翻盘",
      platform: getPlatformProfile("fanqie"),
      projectContext,
      instruction: "二改时强化人物选择。",
      mode: "more_emotion",
      targetWords: 1200,
      chapter: {
        title: "第二章 记忆代价",
        content: "林晚发现手机里少了一段通话记录。",
        goal: "让主角意识到系统代价。",
        hook: "手机里少了一段通话记录。",
        conflict: "追查系统会牵连妹妹。",
        valueShift: "从怀疑转向主动追查。",
        cliffhanger: "黑伞人再次出现。",
      },
    });

    assert.ok(contextPrompt.userPrompt.includes("项目上下文召回包"));
    assert.ok(contextPrompt.userPrompt.includes("下一章召回计划"));
    assert.ok(contextPrompt.userPrompt.includes("林晚"));
    assert.ok(contextPrompt.userPrompt.includes("系统任务规则"));
    assert.ok(contextPrompt.userPrompt.includes("二改必须遵守项目上下文召回计划"));
  });

  await t.test("feeds AI recovery evidence into second-pass rewrite constraints", () => {
    const recoveryPrompt = buildChapterSecondPassPrompt({
      projectTitle: "夜雨系统",
      genre: "都市系统",
      sellingPoint: "雨夜系统翻盘",
      platform: getPlatformProfile("fanqie"),
      aiRecoveryMemory: {
        promptBlock: [
          "AI 写审改恢复证据：",
          "- 最近恢复证据 · 恢复小批：失败/成本：无失败，成本 $0.021。",
          "- 禁区：不要直接恢复大批量，不要弱化开头钩子和章末追读。",
        ].join("\n"),
      },
      instruction: "修掉恢复后可能复发的低分问题。",
      mode: "platform_fit",
      targetWords: 1200,
      chapter: {
        title: "第四章 恢复批次",
        content: "林晚推开门，系统提示音在雨夜响起。",
        goal: "验证恢复后的正文质量。",
        hook: "恢复批次只剩一次机会。",
        conflict: "主角必须在危险和逃避之间选择。",
        valueShift: "普通生活转向失控危机。",
        cliffhanger: "系统给出第一个选择。",
      },
    });

    assert.ok(recoveryPrompt.userPrompt.includes("AI 写审改恢复证据"));
    assert.ok(recoveryPrompt.userPrompt.includes("无失败，成本 $0.021"));
    assert.ok(recoveryPrompt.userPrompt.includes("不要直接恢复大批量"));
    assert.ok(recoveryPrompt.userPrompt.includes("二改必须优先修复恢复证据里暴露的问题"));
  });
});
