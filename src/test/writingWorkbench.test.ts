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
    assert.ok(workbench.treeBlocks.some((block) => (
      block.type === "opening"
      && block.focusTitle === "雨夜倒计时"
      && block.nextAction.includes("目标、钩子、冲突")
      && block.href === "/projects/p1#outline-tree"
    )));
    assert.ok(workbench.treeBlocks.some((block) => (
      block.type === "leaf"
      && block.focusTitle === "第一章 雨夜系统"
      && block.href === "/projects/p1/chapters/c1#chapter-editor"
      && block.nextAction.includes("章节钩子")
    )));
    assert.ok(workbench.treeBlocks.some((block) => (
      block.type === "ending"
      && block.focusTitle === "结尾未定义"
      && block.nextAction.includes("先写结尾")
    )));
    assert.equal(workbench.chapterFocus.nextChapter?.id, "c1");
    assert.equal(workbench.chapterFocus.hookStatus, "fail");
    assert.ok(workbench.characterFocus.nextAction.includes("人物弧光"));
    assert.equal(workbench.contextFocus.status, "fail");
    assert.equal(workbench.contextFocus.sourceCounts.characters, 1);
    assert.equal(workbench.contextFocus.sourceCounts.worldEntries, 0);
    assert.ok(workbench.contextFocus.warnings.some((warning) => warning.includes("平台土壤")));
    assert.equal(workbench.contextFocus.recallCards.length, 4);
    assert.ok(workbench.contextFocus.recallCards.some((card) => (
      card.id === "characters"
      && card.status === "warn"
      && card.nextAction.includes("人物真正需求")
    )));
    assert.ok(workbench.contextFocus.recallCards.some((card) => (
      card.id === "world"
      && card.status === "fail"
      && card.nextAction.includes("模型凭感觉")
    )));
    assert.ok(workbench.modelFocus.nextRoutes.some((route) => route.task.includes("开头钩子")));
    assert.ok(workbench.quickLinks.some((link) => link.href === "/projects/p1#outline-tree"));
    assert.equal(new Set(workbench.quickLinks.map((link) => link.href)).size, workbench.quickLinks.length);
    assert.ok(workbench.quickFixes.some((fix) => fix.kind === "chapter_hook" && fix.endpoint === "/api/chapters/c1"));
    assert.ok(workbench.quickFixes.some((fix) => fix.kind === "character_seed" && fix.endpoint === "/api/projects/p1/characters"));
    assert.ok(workbench.quickFixes.some((fix) => (
      fix.kind === "story_line_seed"
      && fix.endpoint === "/api/projects/p1/story-lines"
      && fix.payload.kind === "plot_thread"
      && fix.payload.startChapterId === "c1"
    )));
    assert.ok(workbench.quickFixes.some((fix) => (
      fix.kind === "foreshadow_seed"
      && fix.endpoint === "/api/projects/p1/story-lines"
      && fix.payload.setupChapterId === "c1"
      && fix.payload.notes.includes("雨夜危机")
    )));
    assert.ok(workbench.quickFixes.some((fix) => fix.kind === "world_seed" && fix.payload.type === "platform_soil"));
    assert.ok(workbench.modelActions.some((action) => action.kind === "opening_diagnostic" && action.method === "GET"));
    assert.ok(workbench.modelActions.some((action) => action.kind === "chapter_draft" && action.endpoint === "/api/ai/tasks/chapter-draft"));
    assert.ok(workbench.modelActions.some((action) => action.kind === "chapter_review" && action.payload.chapterId === "c1"));
    assert.ok(workbench.modelActions.some((action) => (
      action.kind === "first_three_rewrite"
      && action.endpoint === "/api/projects/p1/first-three-rewrite/generate"
      && action.disabledReason?.includes("前三章")
    )));
    assert.equal(workbench.startSoil.status, "fail");
    assert.equal(workbench.startSoil.assets.length, 7);
    assert.ok(workbench.startSoil.assets.some((asset) => asset.id === "opening-hook" && asset.status === "fail"));
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
    assert.ok(workbench.treeBlocks.some((block) => (
      block.type === "soil"
      && block.focusTitle === "万象体系"
      && block.href === "/projects/p2#world-bible"
      && block.nextAction.includes("平台土壤")
    )));
    assert.ok(workbench.treeBlocks.some((block) => (
      block.type === "leaf"
      && block.href === "/projects/p2#create-chapter"
      && block.nextAction.includes("创建第一章")
    )));
    assert.ok(workbench.characterFocus.nextAction.includes("主角人物卡"));
    assert.ok(workbench.quickFixes.some((fix) => fix.kind === "character_seed"));
    assert.ok(workbench.quickFixes.some((fix) => (
      fix.kind === "story_line_seed"
      && fix.payload.kind === "plot_thread"
      && fix.payload.startChapterId === ""
    )));
    assert.ok(workbench.quickFixes.some((fix) => (
      fix.kind === "foreshadow_seed"
      && fix.payload.setupChapterId === ""
      && fix.payload.notes.includes("废脉少年")
    )));
    assert.ok(!workbench.quickFixes.some((fix) => fix.kind === "world_seed"));
    assert.ok(workbench.modelActions.every((action) => action.disabledReason));
    assert.ok(workbench.modelActions.some((action) => action.disabledReason?.includes("先创建第一章")));
    assert.ok(workbench.modelActions.some((action) => action.disabledReason?.includes("先创建前三章")));
    assert.ok(workbench.contextFocus.summary.includes("设定 1"));
    assert.ok(workbench.contextFocus.recallCards.some((card) => (
      card.id === "history"
      && card.status === "pass"
      && card.detail.includes("无需历史章节")
    )));
    assert.equal(workbench.modelTimeline.emptyState, "还没有模型执行记录。");
  });

  await t.test("surfaces latest unadopted candidate revisions before more writing", () => {
    const baseInput = {
      project: {
        id: "p-candidate",
        title: "候选稿项目",
        genre: "都市逆袭",
        sellingPoint: "主角用一次选择改写人生。",
        targetPlatformName: "番茄小说",
        targetWordCount: 300000,
        currentWordCount: 1800,
      },
      chapters: [
        {
          id: "candidate-chapter",
          title: "第一章 旧雨夜",
          order: 1,
          status: "draft",
          wordCount: 1800,
          content: "当前正文仍然是旧版本。",
          hook: "主角在雨夜接到最后通牒。",
          conflict: "救人和自保只能选一个。",
          cliffhanger: "系统提示这不是第一次失败。",
        },
      ],
      outlineNodes: [],
      characters: [],
      worldEntries: [],
      gateDispatchTasks: [
        {
          dispatchKey: "first-three-adoption:p-candidate:candidate-chapter:latest-candidate:review",
          stage: "start_first_three_review",
          state: "assigned",
          title: "第 1 章采纳后重新审稿",
          detail: "新正文需要重新审稿。",
          actionLabel: "重新审稿",
          href: "/projects/p-candidate/chapters/candidate-chapter#chapter-workflow",
          evidence: ["采纳版本：latest-candidate"],
          acceptanceCriteria: ["新正文已完成章节审稿"],
          completionEvidence: "",
          reviewLatestAt: "2026-07-03T03:00:00.000Z",
        },
        {
          dispatchKey: "first-three-adoption:p-candidate:candidate-chapter:latest-candidate:publish-check",
          stage: "start_publish_finalize",
          state: "queued",
          title: "第 1 章采纳后发布质检",
          detail: "审稿后回发布质检。",
          actionLabel: "回发布质检",
          href: "/projects/p-candidate#platform-export",
          evidence: ["采纳版本：latest-candidate"],
          acceptanceCriteria: ["发布包质检已刷新"],
          completionEvidence: "",
          reviewLatestAt: "2026-07-03T03:01:00.000Z",
        },
      ],
      aiTasks: [],
    };
    const workbench = buildWritingWorkbench({
      ...baseInput,
      chapterRevisions: [
        {
          id: "older-candidate",
          chapterId: "candidate-chapter",
          source: "ai_draft_candidate",
          sourceTaskId: "task-old",
          title: "第一章 老候选",
          content: "旧候选内容。",
          wordCount: 1700,
          notes: "较早候选。",
          createdAt: "2026-07-03T01:00:00.000Z",
        },
        {
          id: "latest-candidate",
          chapterId: "candidate-chapter",
          source: "first_three_rewrite_candidate",
          sourceTaskId: "task-new",
          title: "第一章 新候选",
          content: "新候选内容，开头更快。",
          wordCount: 1900,
          notes: "前三章改写候选。",
          createdAt: "2026-07-03T02:00:00.000Z",
        },
      ],
    });

    assert.equal(workbench.pendingCandidates.length, 1);
    assert.equal(workbench.pendingCandidates[0].id, "latest-candidate");
    assert.equal(workbench.pendingCandidates[0].sourceLabel, "前三章改写候选");
    assert.equal(workbench.pendingCandidates[0].href, "/projects/p-candidate/chapters/candidate-chapter#chapter-revisions");
    assert.equal(workbench.firstThreeAdoption.status, "pending");
    assert.equal(workbench.firstThreeAdoption.pendingCount, 1);
    assert.equal(workbench.firstThreeAdoption.actionLabel, "进入采纳");
    assert.equal(workbench.firstThreeAdoption.href, "/projects/p-candidate/chapters/candidate-chapter#chapter-revisions");
    assert.deepEqual(workbench.firstThreeAdoption.followupChain.map((step) => step.label), ["重新审稿", "发布质检"]);
    assert.equal(workbench.firstThreeAdoption.followupChain[0].status, "warn");
    assert.equal(workbench.firstThreeAdoption.followupChain[1].status, "fail");
    assert.equal(workbench.heroAction.label, "采纳前三章");
    assert.ok(workbench.heroAction.reason.includes("采纳后正文才会真正更新"));
    assert.ok(workbench.chapterFocus.nextAction.includes("待确认"));
    assert.equal(workbench.quickLinks[0].label, "待采纳");

    const adoptedWorkbench = buildWritingWorkbench({
      ...baseInput,
      chapters: [
        {
          ...baseInput.chapters[0],
          title: "第一章 新候选",
          content: "新候选内容，开头更快。",
          wordCount: 1900,
        },
      ],
      chapterRevisions: [
        {
          id: "adopted-candidate",
          chapterId: "candidate-chapter",
          source: "first_three_rewrite_candidate",
          sourceTaskId: "task-new",
          title: "第一章 新候选",
          content: "新候选内容，开头更快。",
          wordCount: 1900,
          notes: "已经采纳的候选。",
          createdAt: "2026-07-03T02:00:00.000Z",
        },
      ],
    });

    assert.equal(adoptedWorkbench.pendingCandidates.length, 0);
    assert.notEqual(adoptedWorkbench.heroAction.label, "采纳前三章");
  });

  await t.test("surfaces project start soil and enables first-three generation", () => {
    const workbench = buildWritingWorkbench({
      project: {
        id: "p-soil",
        title: "夜雨系统",
        genre: "都市系统",
        sellingPoint: "雨夜危机中觉醒系统。",
        targetPlatformName: "番茄小说",
        targetWordCount: 300000,
        currentWordCount: 5400,
      },
      chapters: [1, 2, 3].map((order) => ({
        id: `soil-c${order}`,
        title: `第 ${order} 章`,
        order,
        status: "draft",
        wordCount: 1800,
        hook: `第 ${order} 章开头危机`,
        conflict: `第 ${order} 章选择冲突`,
        cliffhanger: `第 ${order} 章章末追读`,
      })),
      outlineNodes: [],
      characters: [],
      worldEntries: [
        { id: "w-tactic", type: "platform_soil", title: "首轮平台打法：番茄小说", content: "状态：历史可复用\n打法：首章先给不可逆危机。" },
        { id: "w-hook", type: "platform_soil", title: "开局钩子土壤：番茄小说", content: "平台：番茄小说\n首屏承诺：第一屏给危机。" },
        { id: "w-three", type: "platform_soil", title: "前三章节奏土壤：番茄小说", content: "平台：番茄小说\n目标：前三章完成钩子、规则证明、第一次升级。" },
        { id: "w-arc", type: "platform_soil", title: "人物弧光土壤：番茄小说", content: "平台：番茄小说\n主角：林晚（主角）" },
        { id: "w-tree", type: "platform_soil", title: "大树结构土壤：番茄小说", content: "平台：番茄小说\n开头：雨夜倒计时。" },
        { id: "w-avoid", type: "platform_soil", title: "平台避坑清单：番茄小说", content: "平台：番茄小说\n风险摘要：不要慢热。" },
        { id: "w-model", type: "platform_soil", title: "模型分工土壤：番茄小说", content: "平台：番茄小说\n任务：正文初稿\n首选：DeepSeek" },
      ],
      aiTasks: [],
    });

    assert.equal(workbench.startSoil.status, "pass");
    assert.ok(workbench.startSoil.summary.includes("开局土壤齐全"));
    assert.equal(workbench.startSoil.assets.every((asset) => asset.status === "pass"), true);
    assert.equal(workbench.startSoil.assets.find((asset) => asset.id === "model-route")?.detail, "任务：正文初稿");
    assert.equal(workbench.firstThreeAdoption.status, "clear");
    assert.equal(workbench.firstThreeAdoption.actionLabel, "查看前三章");
    assert.ok(workbench.quickLinks.some((link) => link.label === "开局土壤"));
    assert.ok(workbench.quickLinks.some((link) => link.href === "/projects/p-soil#first-three-rewrite"));
    const firstThreeAction = workbench.modelActions.find((action) => action.kind === "first_three_rewrite");
    assert.equal(firstThreeAction?.disabledReason, null);
    assert.deepEqual(firstThreeAction?.payload.chapterOrders, [1, 2, 3]);
    assert.equal(firstThreeAction?.refreshHref, "/projects/p-soil#first-three-rewrite");
  });

  await t.test("keeps recovered project starts in first-chapter sample mode", () => {
    const workbench = buildWritingWorkbench({
      project: {
        id: "p-recovery-soil",
        title: "夜雨系统",
        genre: "都市系统",
        sellingPoint: "雨夜危机中觉醒系统。",
        targetPlatformName: "番茄小说",
        targetWordCount: 300000,
        currentWordCount: 5400,
      },
      chapters: [1, 2, 3].map((order) => ({
        id: `recovery-c${order}`,
        title: `第 ${order} 章`,
        order,
        status: "draft",
        wordCount: 1800,
        hook: `第 ${order} 章开头危机`,
        conflict: `第 ${order} 章选择冲突`,
        cliffhanger: `第 ${order} 章章末追读`,
      })),
      outlineNodes: [],
      characters: [],
      worldEntries: [
        {
          id: "w-recovery-tactic",
          type: "platform_soil",
          title: "首轮平台打法：番茄小说",
          content: [
            "状态：恢复放量打法",
            "打法：上一轮恢复放量已过线，但新项目不能复制成功结论。",
            "验证动作：恢复放量打法只能作为参考，新项目先小样本复验成功率、质量分和失败样本。",
            "风险：新项目仍先跑小样本，不直接批量生成前三章。",
          ].join("\n"),
        },
      ],
      aiTasks: [],
    });

    const firstThreeAction = workbench.modelActions.find((action) => action.kind === "first_three_rewrite");

    assert.equal(firstThreeAction?.label, "生成首章小样本");
    assert.ok(firstThreeAction?.description.includes("恢复打法"));
    assert.deepEqual(firstThreeAction?.payload.chapterOrders, [1]);
    assert.equal(firstThreeAction?.disabledReason, null);
    assert.equal(firstThreeAction?.evidenceGate?.status, "sample_only");
    assert.deepEqual(firstThreeAction?.evidenceGate?.missing, ["成功率", "质量分", "失败样本", "放量结论"]);
    assert.ok(firstThreeAction?.evidenceGate?.detail.includes("还差"));
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

  await t.test("turns weak foreshadow cards into editable setup quick fixes", () => {
    const workbench = buildWritingWorkbench({
      project: {
        id: "p5",
        title: "旧约倒计时",
        genre: "悬疑都市",
        sellingPoint: "女主收到未来自己的死亡短信。",
        targetPlatformName: "番茄小说",
        targetWordCount: 300000,
        currentWordCount: 2000,
      },
      chapters: [
        {
          id: "c5",
          title: "第一章 死亡短信",
          order: 1,
          status: "draft",
          wordCount: 2000,
          hook: "凌晨三点，她收到来自明天的死亡短信。",
          conflict: "报警会暴露秘密，不报警就会按短信死去。",
          cliffhanger: "短信最后一行写着：不要相信你最亲近的人。",
        },
      ],
      outlineNodes: [],
      characters: [],
      worldEntries: [{ id: "w5", type: "platform_soil", title: "番茄土壤", content: "开篇危机要快，每章给选择、反转和章末钩子。" }],
      plotThreads: [{ id: "pt5", type: "main", title: "死亡短信主线", startChapterId: "c5", endChapterId: null, status: "active" }],
      foreshadows: [
        {
          id: "fs5",
          title: "短信发件人",
          setupChapterId: null,
          payoffChapterId: null,
          relatedCharacterIds: [],
          status: "planned",
          notes: "",
        },
      ],
      aiTasks: [],
    });

    assert.ok(workbench.contextFocus.warnings.some((warning) => warning.includes("伏笔缺少埋设说明")));
    assert.ok(workbench.quickFixes.some((fix) => (
      fix.kind === "foreshadow_seed"
      && fix.method === "PATCH"
      && fix.endpoint === "/api/foreshadows/fs5"
      && fix.payload.title === "短信发件人"
      && fix.payload.setupChapterId === "c5"
      && fix.payload.notes.includes("异常细节")
    )));
    assert.ok(!workbench.quickFixes.some((fix) => fix.kind === "story_line_seed"));
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
