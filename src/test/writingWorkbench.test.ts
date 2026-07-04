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
          chapterId: "c1",
          inputSnapshot: "{}",
          createdAt: "2026-07-03T00:00:00.000Z",
        },
        {
          id: "task2",
          taskType: "chapter_review",
          status: "succeeded",
          model: "claude-sonnet",
          outputText: "节奏合格，但人物选择还可以更狠。",
          costUsd: 0.034,
          inputSnapshot: JSON.stringify({
            input: {
              sourceContext: {
                status: "warn",
                summary: "上下文需要补强：人物 1，设定 2，线索 1，历史章节 1。",
                warnings: ["世界观与平台土壤：缺少禁忌/限制"],
                sourceCounts: {
                  characters: 1,
                  worldEntries: 2,
                  storyLines: 1,
                  historyChapters: 1,
                },
              },
            },
          }),
          createdAt: "2026-07-03T00:05:00.000Z",
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
    assert.equal(workbench.contextFocus.status, "fail");
    assert.equal(workbench.contextFocus.sourceCounts.characters, 1);
    assert.equal(workbench.contextFocus.sourceCounts.worldEntries, 0);
    assert.ok(workbench.contextFocus.warnings.some((warning) => warning.includes("平台土壤")));
    assert.ok(workbench.modelFocus.nextRoutes.some((route) => route.task.includes("开头钩子")));
    assert.ok(workbench.quickLinks.some((link) => link.href === "/projects/p1#outline-tree"));
    assert.ok(workbench.quickFixes.some((fix) => fix.kind === "chapter_hook" && fix.endpoint === "/api/chapters/c1"));
    assert.ok(workbench.quickFixes.some((fix) => fix.kind === "character_seed" && fix.endpoint === "/api/projects/p1/characters"));
    assert.ok(workbench.quickFixes.some((fix) => (
      fix.kind === "story_line_seed"
      && fix.endpoint === "/api/projects/p1/story-lines"
      && fix.payload.kind === "plot_thread"
      && fix.payload.startChapterId === "c1"
    )));
    assert.ok(workbench.quickFixes.some((fix) => fix.kind === "world_seed" && fix.payload.type === "platform_soil"));
    assert.ok(workbench.modelActions.some((action) => action.kind === "opening_diagnostic" && action.method === "GET"));
    assert.ok(workbench.modelActions.some((action) => action.kind === "chapter_draft" && action.endpoint === "/api/ai/tasks/chapter-draft"));
    assert.ok(workbench.modelActions.some((action) => action.kind === "chapter_review" && action.payload.chapterId === "c1"));
    assert.equal(workbench.modelTimeline.totalRuns, 2);
    assert.equal(workbench.modelTimeline.items[0].id, "task2");
    assert.ok(workbench.modelTimeline.items[0].summary.includes("节奏合格"));
    assert.equal(workbench.modelTimeline.items[0].sourceContext?.status, "warn");
    assert.equal(workbench.modelTimeline.items[0].sourceContext?.sourceCounts.historyChapters, 1);
    assert.ok(workbench.modelTimeline.items[0].sourceContext?.warnings[0].includes("禁忌"));
    assert.ok(workbench.modelTimeline.items.some((item) => item.status === "failed" && item.nextAction.includes("复盘")));
    const failedItem = workbench.modelTimeline.items.find((item) => item.id === "task1");
    assert.equal(failedItem?.retryAction?.supported, true);
    assert.equal(failedItem?.retryAction?.endpoint, "/api/ai/tasks/task1/retry");
    assert.equal(failedItem?.retryAction?.label, "一键重试");
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
    assert.ok(workbench.quickFixes.some((fix) => fix.kind === "character_seed"));
    assert.ok(workbench.quickFixes.some((fix) => (
      fix.kind === "story_line_seed"
      && fix.payload.kind === "plot_thread"
      && fix.payload.startChapterId === ""
    )));
    assert.ok(!workbench.quickFixes.some((fix) => fix.kind === "world_seed"));
    assert.ok(workbench.modelActions.every((action) => action.disabledReason?.includes("先创建第一章")));
    assert.ok(workbench.contextFocus.summary.includes("设定 1"));
    assert.equal(workbench.modelTimeline.emptyState, "还没有模型执行记录。");
  });

  await t.test("explains failed timeline tasks that cannot be retried directly", () => {
    const workbench = buildWritingWorkbench({
      project: {
        id: "p3",
        title: "盐选反转",
        genre: "悬疑短篇",
        sellingPoint: "第一人称复仇反转。",
        targetPlatformName: "知乎盐选",
        targetWordCount: 10000,
        currentWordCount: 0,
      },
      chapters: [],
      outlineNodes: [],
      characters: [],
      worldEntries: [],
      aiTasks: [
        {
          id: "task3",
          taskType: "submission_package_optimize",
          status: "failed",
          model: "gpt-4.1",
          chapterId: null,
          inputSnapshot: "{}",
          errorMessage: "context too long",
          createdAt: "2026-07-03T01:00:00.000Z",
        },
      ],
    });

    const [item] = workbench.modelTimeline.items;
    assert.equal(item.retryAction?.supported, false);
    assert.equal(item.retryAction?.label, "回项目处理");
    assert.ok(item.retryAction?.reason.includes("没有绑定章节"));
  });

  await t.test("marks a failed timeline task as recovered by a later same-chapter success", () => {
    const workbench = buildWritingWorkbench({
      project: {
        id: "p4",
        title: "七猫保底文",
        genre: "年代逆袭",
        sellingPoint: "女主靠手艺翻身。",
        targetPlatformName: "七猫",
        targetWordCount: 500000,
        currentWordCount: 1800,
      },
      chapters: [
        {
          id: "c4",
          title: "第一章 回村",
          order: 1,
          status: "draft",
          wordCount: 1800,
          hook: "女主刚回村就被逼签下不平等欠条。",
          conflict: "保住母亲药钱和拒绝族亲压榨只能选一个。",
          cliffhanger: "她发现欠条背面藏着上一世的死亡日期。",
        },
      ],
      outlineNodes: [],
      characters: [],
      worldEntries: [],
      aiTasks: [
        {
          id: "failed-draft",
          taskType: "chapter_draft",
          status: "failed",
          model: "deepseek-chat",
          chapterId: "c4",
          inputSnapshot: "{}",
          errorMessage: "503 provider timeout",
          createdAt: "2026-07-03T02:00:00.000Z",
        },
        {
          id: "retry-draft",
          taskType: "chapter_draft",
          status: "succeeded",
          model: "deepseek-chat",
          chapterId: "c4",
          inputSnapshot: "{}",
          outputText: "重试后已生成第一章正文。",
          createdAt: "2026-07-03T02:04:00.000Z",
        },
      ],
    });

    const failedItem = workbench.modelTimeline.items.find((item) => item.id === "failed-draft");
    assert.equal(failedItem?.recovery.status, "recovered");
    assert.equal(failedItem?.recovery.recoveredByTaskId, "retry-draft");
    assert.ok(failedItem?.recovery.label.includes("已恢复"));
  });
});
