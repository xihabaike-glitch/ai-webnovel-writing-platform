import assert from "node:assert/strict";
import test from "node:test";
import { buildProjectContextPack } from "../lib/projects/projectContextPack.ts";

const chapters = [
  {
    id: "chapter-1",
    order: 1,
    title: "雨夜系统",
    content: "林晚在雨夜救下陌生人，系统第一次亮起，提示奖励会带走一段记忆。",
    hook: "系统倒计时只剩十秒。",
    conflict: "救人会暴露自己的异常。",
    cliffhanger: "第二个任务指向失踪多年的父亲。",
    status: "draft",
  },
  {
    id: "chapter-2",
    order: 2,
    title: "记忆代价",
    content: "",
    hook: "林晚醒来发现手机里少了一段通话记录。",
    conflict: "追查系统会牵连妹妹。",
    cliffhanger: "黑伞人说出了系统编号。",
    status: "outline",
  },
];

test("buildProjectContextPack", async (t) => {
  await t.test("builds a prompt-ready recall pack from story soil", () => {
    const pack = buildProjectContextPack({
      currentChapterId: "chapter-2",
      chapters,
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
        {
          id: "world-2",
          type: "taboo",
          title: "系统禁忌",
          content: "不能连续无代价升级，不能公开说出系统编号，否则会触发追猎。",
        },
        {
          id: "world-3",
          type: "platform_soil",
          title: "番茄土壤",
          content: "每章前半段给危机，后半段给反击或新问题，章末留下追读钩子。",
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
          notes: "第一卷中段回收黑伞人的真实身份。",
        },
      ],
      plotThreads: [
        {
          id: "thread-1",
          type: "main",
          title: "系统来源追查",
          startChapterId: "chapter-1",
          endChapterId: null,
          status: "active",
        },
      ],
    });

    assert.equal(pack.status, "pass");
    assert.deepEqual(pack.sourceCounts, {
      characters: 1,
      worldEntries: 3,
      storyLines: 2,
      historyChapters: 1,
    });
    assert.ok(pack.promptBlock.includes("项目上下文召回包"));
    assert.ok(pack.promptBlock.includes("林晚"));
    assert.ok(pack.promptBlock.includes("系统任务规则"));
    assert.ok(pack.promptBlock.includes("黑伞人知道系统编号"));
    assert.ok(pack.promptBlock.includes("第 1 章 雨夜系统"));
    assert.equal(pack.recallCards.length, 4);
    assert.ok(pack.recallCards.every((card) => card.status === "pass"));
    assert.ok(pack.recallCards.some((card) => (
      card.id === "world"
      && card.headline === "世界观与平台土壤可召回"
      && card.nextAction.includes("系统规则")
    )));
    assert.ok(pack.recallCards.some((card) => (
      card.id === "history"
      && card.sourceCount === 1
      && card.detail.includes("第 1 章")
    )));
    assert.equal(pack.warnings.length, 0);
  });

  await t.test("builds an executable recall plan for the next chapter", () => {
    const pack = buildProjectContextPack({
      currentChapterId: "chapter-2",
      chapters,
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
        {
          id: "world-2",
          type: "platform_soil",
          title: "番茄土壤",
          content: "每章前半段给危机，后半段给反击或新问题，章末留下追读钩子。",
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
          notes: "下一章让黑伞人用编号施压，但不解释全部真相。",
        },
      ],
      plotThreads: [
        {
          id: "thread-1",
          type: "main",
          title: "系统来源追查",
          startChapterId: "chapter-1",
          endChapterId: null,
          status: "active",
        },
      ],
    });

    assert.equal(pack.recallPlan.status, "ready");
    assert.equal(pack.recallPlan.items.length, 4);
    assert.equal(pack.recallPlan.items[0].sourceType, "character");
    assert.equal(pack.recallPlan.items[0].priority, "must_use");
    assert.ok(pack.recallPlan.items[0].usage.includes("人物选择"));
    assert.ok(pack.recallPlan.items.some((item) => item.sourceType === "world" && item.usage.includes("规则边界")));
    assert.ok(pack.recallPlan.items.some((item) => item.sourceType === "foreshadow" && item.usage.includes("章末")));
    assert.ok(pack.recallPlan.items.some((item) => item.sourceType === "history" && item.promptLine.includes("第 1 章")));
    assert.ok(pack.recallPlan.promptBlock.includes("下一章召回计划"));
    assert.ok(pack.promptBlock.includes("下一章召回计划"));
  });

  await t.test("marks missing soil as actionable warnings", () => {
    const pack = buildProjectContextPack({
      currentChapterId: "chapter-2",
      chapters,
      characters: [],
      worldEntries: [],
      foreshadows: [],
      plotThreads: [],
    });

    assert.equal(pack.status, "fail");
    assert.ok(pack.warnings.some((warning) => warning.includes("缺少人物卡")));
    assert.ok(pack.warnings.some((warning) => warning.includes("缺少平台土壤")));
    assert.ok(pack.promptBlock.includes("缺口"));
    assert.ok(pack.recallCards.some((card) => (
      card.id === "characters"
      && card.status === "fail"
      && card.nextAction.includes("创建主角人物卡")
    )));
    assert.ok(pack.recallCards.some((card) => (
      card.id === "story_lines"
      && card.status === "fail"
      && card.nextAction.includes("补主线/支线")
    )));
  });
});
