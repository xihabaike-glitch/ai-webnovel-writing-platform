import assert from "node:assert/strict";
import test from "node:test";
import { buildWritingWorkbench } from "../lib/projects/writingWorkbench.ts";

test("buildWritingWorkbench", async (t) => {
  await t.test("turns scattered project assets into an author-facing workbench", () => {
    const workbench = buildWritingWorkbench({
      project: {
        id: "p1",
        title: "夜雨系统",
        genre: "都市系统",
        sellingPoint: "雨夜危机中觉醒系统，主角用选择翻盘。",
        targetPlatformName: "番茄小说",
        targetWordCount: 300000,
        currentWordCount: 2600,
      },
      chapters: [
        {
          id: "c1",
          title: "第一章 雨夜系统",
          order: 1,
          status: "draft",
          wordCount: 2600,
          hook: "",
          conflict: "主角必须在自保和救人之间选择。",
          cliffhanger: "系统提示：第一个选择已经失败过一次。",
        },
      ],
      outlineNodes: [
        {
          id: "o1",
          type: "opening",
          title: "雨夜倒计时",
          goal: "用危机打开故事。",
          hook: "",
          conflict: "救人与自保冲突。",
          valueShift: "普通人被系统拖入局。",
          status: "draft",
        },
        {
          id: "o2",
          type: "trunk",
          title: "选择系统真相",
          goal: "主角查清系统来源。",
          hook: "奖励来自未来的自己。",
          conflict: "越查越被系统反制。",
          valueShift: "从被动做任务到主动设局。",
          status: "outline",
        },
        {
          id: "o3",
          type: "branch",
          title: "债主线",
          goal: "",
          hook: "",
          conflict: "",
          valueShift: "",
          status: "outline",
        },
      ],
      characters: [
        {
          id: "char1",
          name: "林晚",
          role: "主角",
          desire: "查清系统真相",
          need: "",
          flaw: "习惯逃避冲突",
          arcStart: "被系统推着走",
          arcEnd: "",
          relationshipNotes: "",
        },
      ],
      worldEntries: [],
      aiTasks: [
        {
          id: "task1",
          taskType: "chapter_draft",
          status: "failed",
          model: "deepseek-chat",
          createdAt: "2026-07-03T00:00:00.000Z",
        },
      ],
    });

    assert.equal(workbench.projectTitle, "夜雨系统");
    assert.equal(workbench.summary.targetPlatformName, "番茄小说");
    assert.ok(workbench.summary.maturityScore < 70);
    assert.equal(workbench.heroAction.label, "修开头钩子");
    assert.equal(workbench.heroAction.href, "/projects/p1/chapters/c1#chapter-editor");
    assert.ok(workbench.treeBlocks.some((block) => block.type === "ending" && block.status === "fail"));
    assert.ok(workbench.treeBlocks.some((block) => block.type === "soil" && block.status === "fail"));
    assert.equal(workbench.chapterFocus.nextChapter?.id, "c1");
    assert.equal(workbench.chapterFocus.hookStatus, "fail");
    assert.ok(workbench.characterFocus.nextAction.includes("人物弧光"));
    assert.ok(workbench.modelFocus.nextRoutes.some((route) => route.task.includes("开头钩子")));
    assert.ok(workbench.quickLinks.some((link) => link.href === "/projects/p1#outline-tree"));
  });

  await t.test("recommends creating a chapter when the project has only structure", () => {
    const workbench = buildWritingWorkbench({
      project: {
        id: "p2",
        title: "万象归墟",
        genre: "玄幻升级",
        sellingPoint: "废脉少年重建万象大道。",
        targetPlatformName: "起点中文网",
        targetWordCount: 1000000,
        currentWordCount: 0,
      },
      chapters: [],
      outlineNodes: [
        {
          id: "root",
          type: "root",
          title: "万象归墟",
          goal: "总控整本书。",
          hook: "废脉验骨时发现旧纪元骨纹。",
          conflict: "宗族压迫与旧纪元力量反噬。",
          valueShift: "废脉少年成为开道者。",
          status: "ready",
        },
      ],
      characters: [],
      worldEntries: [{ id: "w1", type: "system_rule", title: "万象体系", content: "骨纹、脉火、象台、归墟。" }],
      aiTasks: [],
    });

    assert.equal(workbench.heroAction.label, "创建第一章");
    assert.equal(workbench.heroAction.href, "/projects/p2#create-chapter");
    assert.equal(workbench.chapterFocus.nextChapter, null);
    assert.ok(workbench.characterFocus.nextAction.includes("主角人物卡"));
  });
});
