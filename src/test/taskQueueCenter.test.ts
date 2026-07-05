import test from "node:test";
import assert from "node:assert/strict";
import { buildTaskQueueCenter, recommendedQueueActionLabel, type TaskQueueProject } from "../lib/projects/taskQueueCenter.ts";

const baseChapter = {
  id: "chapter-ready-draft",
  order: 1,
  title: "第一章 雨夜系统",
  content: "",
  wordCount: 0,
  goal: "让主角在雨夜被系统逼进不可逆选择。",
  hook: "系统倒计时只剩十秒，门外的人已经开始求救。",
  conflict: "主角必须在逃跑和救人之间选择，否则会失去唯一证据。",
  valueShift: "从普通生活转向失控危机，第一次意识到系统会索命。",
  cliffhanger: "系统刷新第二个任务：亲手交出证据。",
  status: "outline",
};

const project: TaskQueueProject = {
  id: "project-1",
  title: "夜雨系统",
  targetPlatform: "fanqie",
  targetWordCount: 300000,
  currentWordCount: 5000,
  genre: "都市系统",
  sellingPoint: "雨夜危机中觉醒系统，主角用一次次选择翻盘。",
  chapters: [
    baseChapter,
    {
      ...baseChapter,
      id: "chapter-review",
      order: 2,
      title: "第二章 第一次奖励",
      content: "已有正文",
      wordCount: 2200,
      status: "draft",
    },
    {
      ...baseChapter,
      id: "chapter-second-pass",
      order: 3,
      title: "第三章 反杀证据",
      content: "已有正文",
      wordCount: 2400,
      status: "revising",
    },
    {
      ...baseChapter,
      id: "chapter-blocked",
      order: 4,
      title: "第四章 缺卡",
      hook: "",
    },
  ],
  aiTasks: [
    {
      id: "review-weak",
      chapterId: "chapter-second-pass",
      taskType: "chapter_review",
      status: "succeeded",
      outputText: JSON.stringify({ score: 70, issues: [{ type: "hook", suggestion: "强化开头钩子。" }] }),
      errorMessage: null,
      createdAt: "2026-01-02T00:00:00.000Z",
    },
  ],
  worldEntries: [
    {
      type: "platform_soil",
      title: "首轮平台打法：番茄小说",
      content: "状态：模板推荐\n打法：首章先给不可逆危机，三章内连续兑现爽点。\n开头动作：第一段给倒计时。\n验证动作：批量前检查前三章追读。\n风险：解释过多会掉节奏。",
    },
  ],
};

function firstDayCompleteDispatches(projectId: string) {
  return [{
    dispatchKey: `first-day:${projectId}:publish-precheck`,
    state: "completed",
    completionEvidence: "首日平台包预检已完成，标题、简介、标签、卖点、样章和风险清单已验收。",
  }];
}

function publishReadyProject(overrides: Partial<TaskQueueProject> = {}): TaskQueueProject {
  const chapters = [1, 2, 3].map((order) => ({
    ...baseChapter,
    id: `ready-chapter-${order}`,
    order,
    title: `第${order}章 强钩子`,
    content: "主角开局被逼到绝境，系统倒计时不断压迫，他用连续选择完成反杀并留下章末悬念。",
    wordCount: 2200,
    status: "reviewed",
  }));
  return {
    ...project,
    chapters,
    aiTasks: chapters.map((chapter) => ({
      id: `review-${chapter.id}`,
      chapterId: chapter.id,
      taskType: "chapter_review",
      status: "succeeded",
      outputText: JSON.stringify({ score: 92, issues: [] }),
      errorMessage: null,
      createdAt: "2026-07-01T00:00:00.000Z",
    })),
    gateDispatchTasks: firstDayCompleteDispatches(project.id),
    ...overrides,
  };
}

const publishBaseline = {
  id: "snapshot-1",
  platformId: "fanqie",
  platformName: "番茄小说",
  title: "夜雨系统",
  action: "download",
  chapterCount: 3,
  wordCount: 6600,
  preflightScore: 92,
  canExport: true,
  createdAt: "2026-07-02T00:00:00.000Z",
};

function exportSnapshot(overrides: Partial<NonNullable<TaskQueueProject["exportPackageSnapshots"]>[number]> = {}) {
  return {
    id: "export-baseline",
    packageKind: "full",
    format: "markdown",
    title: "夜雨系统",
    fileName: "夜雨系统-完整资料包.md",
    contentType: "text/markdown; charset=utf-8",
    fileSize: 30000,
    contentHash: "baseline-hash",
    readinessStatus: "ready",
    readinessPercent: 96,
    chapterCount: 8,
    wordCount: 24000,
    notes: "完整资料包 · Markdown · 可交付",
    isBaseline: false,
    baselineLockedAt: null,
    createdAt: "2026-07-05T00:00:00.000Z",
    ...overrides,
  };
}

const adoptedAssetVersion = {
  id: "asset-version-adopted",
  platformId: "fanqie",
  platformName: "番茄小说",
  title: "夜雨系统：倒计时翻盘",
  logline: "系统每晚倒计时，主角用选择把危机打成连续翻盘爽点。",
  synopsis: "主角在雨夜绑定倒计时系统，每一次选择都牵动生死与复仇，必须把系统惩罚反手变成翻盘筹码。",
  overseasSynopsis: "Night Rain System follows deadly timed choices.",
  tags: ["系统", "重生", "强爽点"],
  note: "采纳 AI 候选。",
  source: "ai_variant",
  auditScore: 96,
  auditStatus: "ready" as const,
  action: "adopt",
  sourceTaskId: "asset-optimize-1",
  strategy: "强钩子爽点版",
  createdAt: "2026-07-05T00:00:00.000Z",
};

function handoffWorldEntries() {
  return [{
    type: "platform_soil",
    title: "首轮平台打法：番茄小说",
    content: [
      "状态：模板推荐",
      "打法：首章先给不可逆危机，三章内连续兑现爽点。",
      "开头动作：第一段给倒计时。",
      "验证动作：批量前检查前三章追读。",
      "风险：解释过多会掉节奏。",
      "交接状态：reuse",
      "交接标签：稳定加码",
      "交接说明：沿用番茄首章强钩子打法。",
      "首日动作：开头必须落地第一段倒计时。",
      "首日动作：验证前三章追读承诺是否兑现。",
      "避坑边界：不要直接放量，先做小样本。",
    ].join("\n"),
  }];
}

test("buildTaskQueueCenter", async (t) => {
  await t.test("collects cross-project draft, review, second-pass, export, and blocked tasks", () => {
    const queue = buildTaskQueueCenter([{ ...project, gateDispatchTasks: firstDayCompleteDispatches(project.id) }]);

    assert.equal(queue.overview.draftReady, 1);
    assert.equal(queue.overview.candidateReady, 0);
    assert.equal(queue.overview.reviewReady, 1);
    assert.equal(queue.overview.secondPassReady, 1);
    assert.equal(queue.overview.exportReady, 0);
    assert.equal(queue.overview.blockedCards, 2);
    assert.equal(queue.overview.firstDayBlocked, 0);
    assert.equal(queue.overview.publishBlocked, 1);
    assert.equal(queue.overview.chapterCardBlocked, 1);
    assert.equal(queue.overview.riskRecoveryBlocked, 0);
    assert.equal(queue.overview.watchScaleBlocked, 0);
    assert.equal(queue.overview.watchItems, 0);
    assert.equal(queue.overview.watchSampleOnly, 0);
    assert.equal(queue.overview.watchCleared, 0);
    assert.equal(queue.overview.totalItems, 5);
    assert.equal(queue.recommendedNext?.category, "review");
    assert.deepEqual(
      queue.items.map((item) => item.category),
      ["review", "second_pass", "draft", "blocked", "blocked"],
    );
    const publishBlocker = queue.items.find((item) => item.id.includes(":publish-repair:"));
    const cardBlocker = queue.items.find((item) => item.id.includes(":blocked:"));
    assert.ok(publishBlocker?.href.endsWith("#platform-export"));
    assert.equal(publishBlocker?.blockerType, "publish_repair");
    assert.equal(cardBlocker?.blockerType, "chapter_card");
    assert.ok(publishBlocker?.evidence.includes("先处理"));
    assert.equal(queue.recommendedNext?.strategyBasis?.label, "模板推荐");
    assert.ok(queue.items.every((item) => item.strategyBasis?.openingMove.includes("倒计时")));
  });

  await t.test("surfaces pending candidate revisions before automated production", () => {
    const queue = buildTaskQueueCenter([{
      ...project,
      gateDispatchTasks: firstDayCompleteDispatches(project.id),
      chapters: project.chapters.map((chapter) => (
        chapter.id === "chapter-review"
          ? {
            ...chapter,
            revisions: [
              {
                id: "candidate-latest",
                source: "chapter_second_pass_candidate",
                sourceTaskId: "task-second-pass",
                title: "第二章 第一次奖励候选",
                content: "二改候选正文，比当前稿节奏更快。",
                wordCount: 2300,
                notes: "二改候选。",
                createdAt: "2026-07-04T02:00:00.000Z",
              },
              {
                id: "candidate-old",
                source: "ai_draft_candidate",
                sourceTaskId: "task-draft",
                title: "第二章 旧候选",
                content: "旧候选正文。",
                wordCount: 2100,
                notes: "旧候选。",
                createdAt: "2026-07-04T01:00:00.000Z",
              },
            ],
          }
          : chapter
      )),
    }]);

    assert.equal(queue.overview.candidateReady, 1);
    assert.equal(queue.overview.totalItems, 6);
    assert.equal(queue.recommendedNext?.category, "candidate");
    assert.equal(queue.recommendedNext?.actionLabel, "处理候选稿");
    assert.equal(queue.recommendedNext?.href, "/projects/project-1/chapters/chapter-review#chapter-revisions");
    assert.ok(queue.recommendedNext?.evidence.includes("二改候选稿"));
    assert.deepEqual(
      queue.items.slice(0, 3).map((item) => item.category),
      ["candidate", "review", "second_pass"],
    );

    const adoptedQueue = buildTaskQueueCenter([{
      ...project,
      gateDispatchTasks: firstDayCompleteDispatches(project.id),
      chapters: project.chapters.map((chapter) => (
        chapter.id === "chapter-review"
          ? {
            ...chapter,
            title: "第二章 第一次奖励候选",
            content: "二改候选正文，比当前稿节奏更快。",
            wordCount: 2300,
            revisions: [
              {
                id: "candidate-adopted",
                source: "chapter_second_pass_candidate",
                sourceTaskId: "task-second-pass",
                title: "第二章 第一次奖励候选",
                content: "二改候选正文，比当前稿节奏更快。",
                wordCount: 2300,
                notes: "已采纳候选。",
                createdAt: "2026-07-04T02:00:00.000Z",
              },
            ],
          }
          : chapter
      )),
    }]);

    assert.equal(adoptedQueue.overview.candidateReady, 0);
    assert.notEqual(adoptedQueue.recommendedNext?.category, "candidate");
  });

  await t.test("promotes saved publish baselines into effect recovery tasks", () => {
    const queue = buildTaskQueueCenter([publishReadyProject({
      publishSnapshots: [publishBaseline],
      platformPublishMetrics: [],
    })]);

    assert.equal(queue.overview.effectReady, 1);
    assert.equal(queue.overview.exportReady, 1);
    assert.equal(queue.recommendedNext?.category, "effect");
    assert.equal(queue.recommendedNext?.actionLabel, "录入发布效果");
    assert.equal(queue.recommendedNext?.href, "/projects/project-1#publish-effect-panel");
    assert.equal(queue.recommendedNext?.effectAction?.execution, "open_target");
    assert.equal(queue.recommendedNext?.effectAction?.platformId, "fanqie");
    assert.ok(queue.recommendedNext?.evidence.includes("发布包已经保存过基准"));
  });

  await t.test("blocks export when the export version center reports regression risk", () => {
    const queue = buildTaskQueueCenter([publishReadyProject({
      exportPackageSnapshots: [
        exportSnapshot({
          id: "latest-regressed",
          readinessStatus: "blocked",
          readinessPercent: 60,
          chapterCount: 6,
          wordCount: 18000,
          contentHash: "regressed-hash",
          createdAt: "2026-07-05T02:00:00.000Z",
        }),
        exportSnapshot({
          id: "locked-baseline",
          isBaseline: true,
          baselineLockedAt: "2026-07-05T01:00:00.000Z",
          createdAt: "2026-07-05T01:00:00.000Z",
        }),
      ],
    })]);

    const versionItem = queue.items.find((entry) => entry.id === "project-1:export-version:risk");
    assert.equal(versionItem?.category, "blocked");
    assert.equal(versionItem?.blockerType, "export_version");
    assert.equal(versionItem?.actionLabel, "处理导出版本");
    assert.equal(queue.overview.exportVersionBlocked, 1);
    assert.ok(!queue.items.some((entry) => entry.id === "project-1:export:fanqie"));
  });

  await t.test("turns an export version receipt into a recheck queue item", () => {
    const queue = buildTaskQueueCenter([publishReadyProject({
      exportPackageSnapshots: [
        exportSnapshot({
          id: "latest-regressed",
          readinessStatus: "blocked",
          readinessPercent: 60,
          chapterCount: 6,
          wordCount: 18000,
          contentHash: "regressed-hash",
          createdAt: "2026-07-05T02:00:00.000Z",
        }),
        exportSnapshot({
          id: "locked-baseline",
          isBaseline: true,
          baselineLockedAt: "2026-07-05T01:00:00.000Z",
          createdAt: "2026-07-05T01:00:00.000Z",
        }),
      ],
      gateActionAudits: [{
        actionId: "export-version:project-1:regenerate_snapshot",
        executionType: "export_version",
        status: "succeeded",
        succeededCount: 1,
        failedCount: 0,
        taskId: "latest-regressed",
        platformId: "export_version",
        label: "重导最新包",
        message: "夜雨系统 已按导出快照重新生成。",
        createdAt: "2026-07-05T02:05:00.000Z",
      }],
    })]);

    const versionItem = queue.items.find((entry) => entry.id === "project-1:export-version:recheck");
    assert.equal(versionItem?.category, "export");
    assert.equal(versionItem?.sourceType, "export_version_recheck");
    assert.equal(versionItem?.actionLabel, "复检总闸门");
    assert.equal(versionItem?.href, "/gate#gate-export-package");
    assert.equal(queue.overview.exportVersionBlocked, 0);
  });

  await t.test("turns weak publish effects into next optimization work", () => {
    const queue = buildTaskQueueCenter([publishReadyProject({
      publishSnapshots: [publishBaseline],
      platformPublishMetrics: [{
        id: "metric-weak",
        platformId: "fanqie",
        platformName: "番茄小说",
        views: 1000,
        clicks: 30,
        favorites: 5,
        follows: 2,
        comments: 0,
        paidReads: 0,
        editorFeedback: "",
        contractStatus: "unknown",
        publishUrl: "",
        notes: "",
        snapshotDate: "2026-07-03T00:00:00.000Z",
      }],
    })]);

    assert.equal(queue.overview.effectReady, 1);
    assert.equal(queue.recommendedNext?.category, "effect");
    assert.equal(queue.recommendedNext?.actionLabel, "生成候选");
    assert.equal(queue.recommendedNext?.effectAction?.execution, "generate_asset_variants");
    assert.equal(queue.recommendedNext?.effectAction?.platformId, "fanqie");
    assert.ok(queue.recommendedNext?.evidence.includes("点击率"));
    assert.equal(queue.recommendedNext?.href, "/projects/project-1#submission-asset-editor");
  });

  await t.test("advances completed publish asset optimization into candidate adoption", () => {
    const queue = buildTaskQueueCenter([publishReadyProject({
      publishSnapshots: [publishBaseline],
      platformPublishMetrics: [{
        id: "metric-weak",
        platformId: "fanqie",
        platformName: "番茄小说",
        views: 1000,
        clicks: 30,
        favorites: 5,
        follows: 2,
        comments: 0,
        paidReads: 0,
        editorFeedback: "",
        contractStatus: "unknown",
        publishUrl: "",
        notes: "",
        snapshotDate: "2026-07-03T00:00:00.000Z",
      }],
      gateActionAudits: [{
        actionId: "platform-strategy:fanqie:generate_asset_variants",
        executionType: "platform_strategy",
        status: "succeeded",
        succeededCount: 3,
        platformId: "fanqie",
        createdAt: "2026-07-04T00:00:00.000Z",
      }],
    })]);

    assert.equal(queue.overview.effectReady, 1);
    assert.equal(queue.recommendedNext?.category, "effect");
    assert.equal(queue.recommendedNext?.actionLabel, "采纳候选");
    assert.equal(queue.recommendedNext?.effectAction?.execution, "open_target");
    assert.equal(queue.recommendedNext?.effectAction?.actionId, "adopt-generated-candidate");
    assert.ok(queue.recommendedNext?.evidence.includes("已生成候选"));
    assert.equal(queue.recommendedNext?.href, "/projects/project-1#submission-asset-editor");
  });

  await t.test("keeps recommending optimization when the action receipt is older than the latest effect", () => {
    const queue = buildTaskQueueCenter([publishReadyProject({
      publishSnapshots: [publishBaseline],
      platformPublishMetrics: [{
        id: "metric-weak",
        platformId: "fanqie",
        platformName: "番茄小说",
        views: 1000,
        clicks: 30,
        favorites: 5,
        follows: 2,
        comments: 0,
        paidReads: 0,
        editorFeedback: "",
        contractStatus: "unknown",
        publishUrl: "",
        notes: "",
        snapshotDate: "2026-07-03T00:00:00.000Z",
      }],
      gateActionAudits: [{
        actionId: "platform-strategy:fanqie:generate_asset_variants",
        executionType: "platform_strategy",
        status: "succeeded",
        succeededCount: 3,
        platformId: "fanqie",
        createdAt: "2026-07-02T00:00:00.000Z",
      }],
    })]);

    assert.equal(queue.recommendedNext?.category, "effect");
    assert.equal(queue.recommendedNext?.actionLabel, "生成候选");
    assert.equal(queue.recommendedNext?.effectAction?.execution, "generate_asset_variants");
  });

  await t.test("advances adopted asset candidates into a new publish baseline", () => {
    const queue = buildTaskQueueCenter([publishReadyProject({
      publishSnapshots: [publishBaseline],
      platformPublishMetrics: [{
        id: "metric-weak",
        platformId: "fanqie",
        platformName: "番茄小说",
        views: 1000,
        clicks: 30,
        favorites: 5,
        follows: 2,
        comments: 0,
        paidReads: 0,
        editorFeedback: "",
        contractStatus: "unknown",
        publishUrl: "",
        notes: "",
        snapshotDate: "2026-07-03T00:00:00.000Z",
      }],
      submissionAssetVersions: [adoptedAssetVersion],
      gateActionAudits: [{
        actionId: "platform-strategy:fanqie:generate_asset_variants",
        executionType: "platform_strategy",
        status: "succeeded",
        succeededCount: 3,
        taskId: "asset-optimize-1",
        platformId: "fanqie",
        createdAt: "2026-07-04T00:00:00.000Z",
      }],
    })]);

    assert.equal(queue.recommendedNext?.category, "effect");
    assert.equal(queue.recommendedNext?.actionLabel, "保存新基准");
    assert.equal(queue.recommendedNext?.effectAction?.execution, "open_target");
    assert.equal(queue.recommendedNext?.effectAction?.actionId, "save-adopted-baseline");
    assert.ok(queue.recommendedNext?.evidence.includes("已经采纳"));
    assert.equal(queue.recommendedNext?.href, "/projects/project-1#platform-export");
  });

  await t.test("advances a saved adopted baseline into the next effect record", () => {
    const queue = buildTaskQueueCenter([publishReadyProject({
      publishSnapshots: [
        {
          ...publishBaseline,
          id: "snapshot-new-baseline",
          action: "snapshot",
          createdAt: "2026-07-06T00:00:00.000Z",
        },
        publishBaseline,
      ],
      platformPublishMetrics: [{
        id: "metric-weak",
        platformId: "fanqie",
        platformName: "番茄小说",
        views: 1000,
        clicks: 30,
        favorites: 5,
        follows: 2,
        comments: 0,
        paidReads: 0,
        editorFeedback: "",
        contractStatus: "unknown",
        publishUrl: "",
        notes: "",
        snapshotDate: "2026-07-03T00:00:00.000Z",
      }],
      submissionAssetVersions: [adoptedAssetVersion],
      gateActionAudits: [{
        actionId: "platform-strategy:fanqie:generate_asset_variants",
        executionType: "platform_strategy",
        status: "succeeded",
        succeededCount: 3,
        taskId: "asset-optimize-1",
        platformId: "fanqie",
        createdAt: "2026-07-04T00:00:00.000Z",
      }],
    })]);

    assert.equal(queue.recommendedNext?.category, "effect");
    assert.equal(queue.recommendedNext?.actionLabel, "录入新效果");
    assert.equal(queue.recommendedNext?.effectAction?.execution, "open_target");
    assert.equal(queue.recommendedNext?.effectAction?.actionId, "collect-next-effect");
    assert.ok(queue.recommendedNext?.evidence.includes("新基准已保存"));
    assert.equal(queue.recommendedNext?.href, "/projects/project-1#publish-effect-panel");
  });

  await t.test("advances completed first-three rewrite into adoption review", () => {
    const queue = buildTaskQueueCenter([publishReadyProject({
      publishSnapshots: [publishBaseline],
      platformPublishMetrics: [{
        id: "metric-retention",
        platformId: "fanqie",
        platformName: "番茄小说",
        views: 1000,
        clicks: 80,
        favorites: 30,
        follows: 2,
        comments: 0,
        paidReads: 0,
        editorFeedback: "",
        contractStatus: "unknown",
        publishUrl: "",
        notes: "",
        snapshotDate: "2026-07-03T00:00:00.000Z",
      }],
      gateActionAudits: [{
        actionId: "platform-strategy:fanqie:rewrite_first_three",
        executionType: "platform_strategy",
        status: "succeeded",
        succeededCount: 3,
        platformId: "fanqie",
        createdAt: "2026-07-04T00:00:00.000Z",
      }],
    })]);

    assert.equal(queue.recommendedNext?.category, "effect");
    assert.equal(queue.recommendedNext?.actionLabel, "采纳改写");
    assert.equal(queue.recommendedNext?.effectAction?.execution, "open_target");
    assert.equal(queue.recommendedNext?.effectAction?.actionId, "adopt-first-three-rewrite");
    assert.equal(queue.recommendedNext?.href, "/projects/project-1#first-three-rewrite");
  });

  await t.test("blocks production behind the first-day completion gate", () => {
    const queue = buildTaskQueueCenter([project]);
    const gate = queue.items.find((item) => item.blockerType === "first_day_gate");

    assert.equal(queue.overview.draftReady, 0);
    assert.equal(queue.overview.reviewReady, 0);
    assert.equal(queue.overview.secondPassReady, 0);
    assert.equal(queue.overview.exportReady, 0);
    assert.equal(queue.overview.firstDayBlocked, 1);
    assert.equal(queue.overview.publishBlocked, 0);
    assert.equal(gate?.actionLabel, "完成首日链路");
    assert.ok(gate?.evidence.includes("平台包预检验收"));
    assert.equal(gate?.href, "/dispatch?firstDayProject=project-1&step=publish-precheck#first-day-dispatch");
    assert.equal(queue.recommendedNext?.blockerType, "first_day_gate");
  });

  await t.test("keeps the first-day gate closed when handoff evidence is missing", () => {
    const queue = buildTaskQueueCenter([{
      ...project,
      worldEntries: handoffWorldEntries(),
      gateDispatchTasks: firstDayCompleteDispatches(project.id),
    }]);
    const gate = queue.items.find((item) => item.blockerType === "first_day_gate");

    assert.equal(queue.overview.draftReady, 0);
    assert.equal(queue.overview.reviewReady, 0);
    assert.equal(queue.overview.secondPassReady, 0);
    assert.equal(queue.overview.firstDayBlocked, 1);
    assert.equal(gate?.actionLabel, "补交接验收");
    assert.equal(recommendedQueueActionLabel(queue.recommendedNext), "下一步：补交接验收");
    assert.ok(gate?.evidence.includes("开书交接证据"));
    assert.ok(gate?.evidence.includes("交接动作落地"));
    assert.ok(gate?.evidence.includes("避坑边界确认"));
    assert.equal(gate?.handoffGuidance?.label, "稳定加码");
    assert.ok(gate?.handoffGuidance?.detail?.includes("番茄首章强钩子"));
    assert.ok(gate?.handoffGuidance?.firstDayActions.some((action) => action.includes("倒计时")));
    assert.ok(gate?.handoffGuidance?.avoidRules.some((rule) => rule.includes("小样本")));
    assert.equal(gate?.href, "/dispatch?firstDayProject=project-1&step=publish-precheck#first-day-dispatch");
    assert.equal(queue.recommendedNext?.blockerType, "first_day_gate");
  });

  await t.test("surfaces first-day experience handoff dispatches as queue work", () => {
    const queue = buildTaskQueueCenter([{
      ...project,
      worldEntries: handoffWorldEntries(),
      gateDispatchTasks: [
        ...firstDayCompleteDispatches(project.id),
        {
          dispatchKey: "first-day-handoff:project-1:opening",
          stage: "start_opening_diagnostic",
          state: "assigned",
          title: "夜雨系统 · 经验开书交接：开头打法",
          detail: "把「稳定加码」拆到第一章首屏，先验证钩子、危机和追读问题。",
          actionLabel: "锁定开头打法",
          href: "/projects/project-1/chapters/chapter-ready-draft",
          completionEvidence: "",
        },
        {
          dispatchKey: "first-day-handoff:project-1:verification",
          stage: "start_first_three_review",
          state: "assigned",
          title: "夜雨系统 · 经验开书交接：首轮验收",
          detail: "把历史打法转成前三章验收标准，防止只复用结论、不复用证据。",
          actionLabel: "设置验收口径",
          href: "/projects/project-1/chapters/chapter-ready-draft",
          completionEvidence: "",
        },
        {
          dispatchKey: "first-day-handoff:project-1:platform-package",
          stage: "start_platform_package",
          state: "completed",
          title: "夜雨系统 · 经验开书交接：平台回收",
          detail: "把可复用经验落到标题、简介、标签、样章和首轮数据回收口径。",
          actionLabel: "准备平台回收",
          href: "/projects/project-1#platform-export",
          completionEvidence: "",
        },
      ],
    }]);
    const handoffs = queue.items.filter((item) => item.sourceType === "first_day_handoff");

    assert.equal(queue.overview.firstDayHandoffs, 3);
    assert.equal(handoffs.length, 3);
    assert.deepEqual(handoffs.map((item) => item.category), ["handoff", "handoff", "handoff"]);
    assert.deepEqual(handoffs.map((item) => item.actionLabel), ["补交接证据", "锁定开头打法", "设置验收口径"]);
    assert.ok(handoffs[0]?.sourceDetail?.includes("证据太薄"));
    assert.ok(handoffs.some((item) => item.sourceDetail?.includes("历史打法")));
    assert.ok(handoffs[0]?.handoffGuidance?.firstDayActions.some((action) => action.includes("倒计时")));
    assert.ok(handoffs[0]?.handoffGuidance?.avoidRules.some((rule) => rule.includes("小样本")));
    assert.equal(queue.recommendedNext?.sourceType, "first_day_handoff");
    assert.equal(recommendedQueueActionLabel(queue.recommendedNext), "下一步：补交接证据");
  });

  await t.test("surfaces recovery tactic experience follow-up dispatches as queue work", () => {
    const queue = buildTaskQueueCenter([{
      ...project,
      gateDispatchTasks: [
        ...firstDayCompleteDispatches(project.id),
        {
          dispatchKey: "fanqie:tactic_experience_followup:usable-recovery-scale:2026-01-01",
          stage: "scale_up",
          state: "queued",
          title: "番茄小说 恢复放量继续小样本",
          detail: "这条恢复放量经验只允许小步复用，继续跑小样本验证前三章兑现、平台反馈和追读信号。",
          actionLabel: "继续小样本",
          href: "/gate#platform-tactic-experience",
          completionEvidence: "",
        },
      ],
    }]);
    const followup = queue.items.find((item) => item.sourceType === "tactic_experience_followup");

    assert.equal(queue.overview.tacticExperienceFollowups, 1);
    assert.equal(followup?.category, "handoff");
    assert.equal(followup?.sourceLabel, "打法闭环");
    assert.ok(followup?.sourceDetail?.includes("恢复放量"));
    assert.ok(followup?.evidence.includes("继续跑小样本"));
    assert.equal(followup?.sourceDispatchKey, "fanqie:tactic_experience_followup:usable-recovery-scale:2026-01-01");
    assert.ok(followup?.completionEvidenceTemplate?.includes("加码范围："));
    assert.ok(followup?.completionEvidenceTemplate?.includes("风险边界："));
    assert.equal(followup?.actionLabel, "继续小样本");
    assert.equal(followup?.href, "/gate#platform-tactic-experience");
    assert.equal(queue.recommendedNext?.sourceType, "tactic_experience_followup");
    assert.equal(recommendedQueueActionLabel(queue.recommendedNext), "下一步：打法闭环 · 继续小样本");
  });

  await t.test("prefills recovery tactic follow-up evidence from the latest small-sample receipt", () => {
    const queue = buildTaskQueueCenter([{
      ...project,
      gateDispatchTasks: [
        ...firstDayCompleteDispatches(project.id),
        {
          dispatchKey: "fanqie:tactic_experience_followup:usable-recovery-scale:2026-01-01",
          stage: "scale_up",
          state: "queued",
          title: "番茄小说 恢复放量继续小样本",
          detail: "这条恢复放量经验只允许小步复用，继续跑小样本验证前三章兑现、平台反馈和追读信号。",
          actionLabel: "继续小样本",
          href: "/gate#platform-tactic-experience",
          completionEvidence: "",
        },
      ],
      gateActionAudits: [{
        actionId: "recommended-batch:conservative:draft:project-1",
        executionType: "recommended_batch",
        status: "succeeded",
        succeededCount: 2,
        failedCount: 0,
        taskId: "draft-task-2",
        platformId: "fanqie",
        label: "恢复放量小样本",
        createdAt: "2026-01-10T00:00:00.000Z",
        payload: JSON.stringify({
          batchReceipt: {
            status: "continue",
            completionEvidenceTemplate: [
              "小样本验证已完成：",
              "通过线：成功率 100%，质量 88，目标是成功率不低于 80%、质量不低于 80。",
              "不可接受项：未出现失败、质量低于 80、备用命中或成本异常。",
              "复查证据：AI 任务 draft-task-2、draft-task-3；章节 第二章、第三章；恢复放量稳定。",
              "放量结论：通过，可以恢复后续初稿批次。",
            ].join("\n"),
          },
        }),
      }],
    }]);
    const followup = queue.items.find((item) => item.sourceType === "tactic_experience_followup");

    assert.ok(followup?.completionEvidenceTemplate?.includes("加码范围：番茄小说 恢复放量继续小样本"));
    assert.ok(followup?.completionEvidenceTemplate?.includes("基准版本：最近小样本回执「恢复放量小样本」"));
    assert.ok(followup?.completionEvidenceTemplate?.includes("风险边界：只允许小步复用"));
    assert.ok(followup?.completionEvidenceTemplate?.includes("结论：继续小样本"));
    assert.ok(followup?.completionEvidenceTemplate?.includes("小样本验证已完成"));
    assert.equal(followup?.completionEvidenceTemplateSource, "最近小样本回执：恢复放量小样本");
  });

  await t.test("allows production when first-day evidence includes handoff closure", () => {
    const queue = buildTaskQueueCenter([{
      ...project,
      worldEntries: handoffWorldEntries(),
      gateDispatchTasks: [{
        dispatchKey: `first-day:${project.id}:publish-precheck`,
        state: "completed",
        completionEvidence: "首日平台包预检已完成。交接动作已落地：开头第一段倒计时完成。通过线已写清，前三章追读承诺必须兑现；不可接受项是慢热解释和卖点不兑现；复查证据入口已保存。平台回收口径已写清标题、简介、标签、样章、曝光、点击、收藏和追读。避坑边界已确认：不要直接放量，先做小样本。",
      }],
    }]);

    assert.equal(queue.overview.firstDayBlocked, 0);
    assert.equal(queue.overview.reviewReady, 1);
    assert.equal(queue.recommendedNext?.category, "review");
    assert.equal(recommendedQueueActionLabel(queue.recommendedNext), "下一步：审稿");
    assert.ok(queue.items.every((item) => item.actionLabel !== "补交接验收"));
    assert.ok(queue.recommendedNext?.handoffGuidance?.firstDayActions.some((action) => action.includes("追读承诺")));
    assert.ok(queue.recommendedNext?.handoffGuidance?.avoidRules.some((rule) => rule.includes("不要直接放量")));
  });

  await t.test("allows production when completed handoff dispatches carry closure evidence", () => {
    const queue = buildTaskQueueCenter([{
      ...project,
      worldEntries: handoffWorldEntries(),
      gateDispatchTasks: [
        ...firstDayCompleteDispatches(project.id),
        {
          dispatchKey: "first-day-handoff:project-1:opening",
          stage: "start_opening_diagnostic",
          state: "completed",
          title: "夜雨系统 · 经验开书交接：开头打法",
          detail: "把稳定加码拆到第一章首屏。",
          actionLabel: "锁定开头打法",
          href: "/projects/project-1/chapters/chapter-ready-draft",
          completionEvidence: "交接动作已落地：开头第一段倒计时完成，首日动作已写入第一章。",
        },
        {
          dispatchKey: "first-day-handoff:project-1:verification",
          stage: "start_first_three_review",
          state: "completed",
          title: "夜雨系统 · 经验开书交接：首轮验收",
          detail: "把历史打法转成前三章验收标准。",
          actionLabel: "设置验收口径",
          href: "/projects/project-1/chapters/chapter-ready-draft",
          completionEvidence: "验证动作已落地：通过线已写清，前三章追读承诺必须兑现；不可接受项是慢热解释和卖点不兑现；复查证据口径已保存。",
        },
        {
          dispatchKey: "first-day-handoff:project-1:platform-package",
          stage: "start_platform_package",
          state: "completed",
          title: "夜雨系统 · 经验开书交接：平台回收",
          detail: "把可复用经验落到标题、简介、标签、样章和首轮数据回收口径。",
          actionLabel: "准备平台回收",
          href: "/projects/project-1#platform-export",
          completionEvidence: "避坑边界已确认：不要直接放量，先做小样本；平台回收口径已写清。",
        },
      ],
    }]);

    assert.equal(queue.overview.firstDayBlocked, 0);
    assert.equal(queue.overview.firstDayHandoffs, 0);
    assert.equal(queue.overview.reviewReady, 1);
    assert.equal(queue.recommendedNext?.category, "review");
  });

  await t.test("keeps completed but weak handoff evidence in the queue", () => {
    const queue = buildTaskQueueCenter([{
      ...project,
      worldEntries: handoffWorldEntries(),
      gateDispatchTasks: [
        ...firstDayCompleteDispatches(project.id),
        {
          dispatchKey: "first-day-handoff:project-1:opening",
          stage: "start_opening_diagnostic",
          state: "completed",
          title: "夜雨系统 · 经验开书交接：开头打法",
          detail: "把稳定加码拆到第一章首屏。",
          actionLabel: "锁定开头打法",
          href: "/projects/project-1/chapters/chapter-ready-draft",
          completionEvidence: "交接动作已落地：开头第一段倒计时完成，首日动作已写入第一章。",
        },
        {
          dispatchKey: "first-day-handoff:project-1:verification",
          stage: "start_first_three_review",
          state: "completed",
          title: "夜雨系统 · 经验开书交接：首轮验收",
          detail: "把历史打法转成前三章验收标准。",
          actionLabel: "设置验收口径",
          href: "/projects/project-1/chapters/chapter-ready-draft",
          completionEvidence: "验证动作已落地：前三章追读承诺已列出，复查证据口径已保存。",
        },
        {
          dispatchKey: "first-day-handoff:project-1:platform-package",
          stage: "start_platform_package",
          state: "completed",
          title: "夜雨系统 · 经验开书交接：平台回收",
          detail: "把可复用经验落到标题、简介、标签、样章和首轮数据回收口径。",
          actionLabel: "准备平台回收",
          href: "/projects/project-1#platform-export",
          completionEvidence: "避坑边界已确认：不要直接放量，先做小样本；平台回收口径已写清。",
        },
      ],
    }]);
    const handoff = queue.items.find((item) => item.sourceType === "first_day_handoff");
    const gate = queue.items.find((item) => item.blockerType === "first_day_gate");

    assert.equal(queue.overview.firstDayBlocked, 1);
    assert.equal(queue.overview.firstDayHandoffs, 1);
    assert.equal(handoff?.actionLabel, "补交接证据");
    assert.ok(handoff?.sourceDetail?.includes("证据没过首日审计"));
    assert.ok(handoff?.evidence.includes("不可接受"));
    assert.ok(gate?.evidence.includes("薄弱交接证据重写"));
    assert.equal(queue.recommendedNext?.sourceType, "first_day_handoff");
  });

  await t.test("surfaces first-three adoption follow-up dispatches in the queue", () => {
    const queue = buildTaskQueueCenter([{
      ...project,
      gateDispatchTasks: [
        ...firstDayCompleteDispatches(project.id),
        {
          dispatchKey: "first-three-adoption:project-1:chapter-review:revision-1:review",
          stage: "start_first_three_review",
          state: "assigned",
          title: "第 2 章采纳后重新审稿",
          detail: "前三章改写候选已经写入正文，旧审稿不能继续当发布通行证。",
          actionLabel: "重新审稿",
          href: "/projects/project-1/chapters/chapter-review#chapter-workflow",
          completionEvidence: "",
        },
        {
          dispatchKey: "first-three-adoption:project-1:chapter-review:revision-1:publish-check",
          stage: "start_publish_finalize",
          state: "queued",
          title: "第 2 章采纳后发布质检",
          detail: "重新审稿后回发布质检，确认投稿包和新正文一致。",
          actionLabel: "回发布质检",
          href: "/projects/project-1#platform-export",
          completionEvidence: "",
        },
      ],
    }]);
    const reviewFollowup = queue.items.find((item) => item.id.includes(":revision-1:review"));
    const publishFollowup = queue.items.find((item) => item.id.includes(":revision-1:publish-check"));

    assert.equal(reviewFollowup?.category, "review");
    assert.equal(reviewFollowup?.sourceType, "first_three_adoption");
    assert.equal(reviewFollowup?.sourceLabel, "采纳闭环");
    assert.ok(reviewFollowup?.sourceDetail?.includes("旧审稿自动失效"));
    assert.equal(reviewFollowup?.executionChapterId, "chapter-review");
    assert.equal(reviewFollowup?.actionLabel, "重新审稿");
    assert.equal(reviewFollowup?.href, "/projects/project-1/chapters/chapter-review#chapter-workflow");
    assert.equal(publishFollowup?.category, "export");
    assert.equal(publishFollowup?.sourceType, "first_three_adoption");
    assert.ok(publishFollowup?.sourceDetail?.includes("刷新质检后再导出"));
    assert.equal(publishFollowup?.actionLabel, "回发布质检");
    assert.equal(publishFollowup?.href, "/projects/project-1#platform-export");
    assert.ok(queue.overview.reviewReady >= 1);
    assert.ok(queue.overview.exportReady >= 1);
    assert.equal(queue.overview.firstThreeAdoptionFollowups, 2);
  });

  await t.test("keeps completed first-three adoption follow-ups with missing evidence in the queue", () => {
    const queue = buildTaskQueueCenter([{
      ...project,
      gateDispatchTasks: [
        ...firstDayCompleteDispatches(project.id),
        {
          dispatchKey: "first-three-adoption:project-1:chapter-review:revision-1:review",
          stage: "start_first_three_review",
          state: "completed",
          title: "第 2 章采纳后重新审稿",
          detail: "采纳后的新正文需要重新审稿。",
          actionLabel: "重新审稿",
          href: "/projects/project-1/chapters/chapter-review#chapter-workflow",
          completionEvidence: "",
        },
      ],
    }]);
    const missingEvidence = queue.items.find((item) => item.id.includes(":revision-1:review"));

    assert.equal(missingEvidence?.category, "review");
    assert.equal(missingEvidence?.sourceType, "first_three_adoption");
    assert.ok(missingEvidence?.sourceDetail?.includes("验收证据没交齐"));
    assert.equal(missingEvidence?.actionLabel, "补验收证据");
    assert.equal(missingEvidence?.href, "/projects/project-1/chapters/chapter-review#chapter-workflow");
    assert.ok(missingEvidence?.evidence.includes("任务已标记完成，但缺少验收证据"));
    assert.equal(queue.recommendedNext?.id, missingEvidence?.id);
    assert.equal(recommendedQueueActionLabel(queue.recommendedNext), "下一步：采纳闭环 · 补验收证据");
  });

  await t.test("keeps failed adoption batch receipts in the queue with failure evidence", () => {
    const dispatchKey = "first-three-adoption:project-1:chapter-review:revision-1:review";
    const queue = buildTaskQueueCenter([{
      ...project,
      gateDispatchTasks: [
        ...firstDayCompleteDispatches(project.id),
        {
          dispatchKey,
          stage: "start_first_three_review",
          state: "assigned",
          title: "第 2 章采纳后重新审稿",
          detail: "采纳后的新正文需要重新审稿。",
          actionLabel: "重新审稿",
          href: "/projects/project-1/chapters/chapter-review#chapter-workflow",
          completionEvidence: "",
        },
      ],
      gateActionAudits: [{
        actionId: "recommended-batch:standard:review:project-1",
        executionType: "recommended_batch",
        status: "failed",
        succeededCount: 0,
        failedCount: 1,
        taskId: "review-task-1",
        platformId: "fanqie",
        createdAt: "2026-01-09T00:00:00.000Z",
        payload: JSON.stringify({
          plan: {
            actionLabel: "批量审稿 1 个",
            category: "review",
            adoptionFollowupCount: 1,
            adoptionFollowupItemIds: [`project-1:adoption-followup:${dispatchKey}`],
          },
          results: [{ status: "failed", taskId: "review-task-1", chapterId: "chapter-review", error: "模型超时" }],
          batchReceipt: { status: "repair", headline: "批次有失败，先修再放大" },
        }),
      }],
    }]);
    const failedFollowup = queue.items.find((item) => item.id.includes(":revision-1:review"));

    assert.equal(failedFollowup?.sourceType, "first_three_adoption");
    assert.ok(failedFollowup?.sourceDetail?.includes("批量执行失败"));
    assert.ok(failedFollowup?.evidence.includes("模型超时"));
    assert.equal(failedFollowup?.actionLabel, "重试/切模型");
    assert.equal(queue.recommendedNext?.id, failedFollowup?.id);
  });

  await t.test("routes weak adoption batch quality to second pass in the queue", () => {
    const dispatchKey = "first-three-adoption:project-1:chapter-review:revision-1:review";
    const queue = buildTaskQueueCenter([{
      ...project,
      gateDispatchTasks: [
        ...firstDayCompleteDispatches(project.id),
        {
          dispatchKey,
          stage: "start_first_three_review",
          state: "assigned",
          title: "第 2 章采纳后重新审稿",
          detail: "采纳后的新正文需要重新审稿。",
          actionLabel: "重新审稿",
          href: "/projects/project-1/chapters/chapter-review#chapter-workflow",
          completionEvidence: "",
        },
      ],
      gateActionAudits: [{
        actionId: "recommended-batch:standard:review:project-1",
        executionType: "recommended_batch",
        status: "succeeded",
        succeededCount: 1,
        failedCount: 0,
        taskId: "review-task-1",
        platformId: "fanqie",
        createdAt: "2026-01-09T00:00:00.000Z",
        payload: JSON.stringify({
          plan: {
            actionLabel: "批量审稿 1 个",
            category: "review",
            adoptionFollowupCount: 1,
            adoptionFollowupItemIds: [`project-1:adoption-followup:${dispatchKey}`],
          },
          results: [{ status: "succeeded", taskId: "review-task-1", chapterId: "chapter-review" }],
          batchReceipt: { status: "review_quality", headline: "质量不够，先二改或复审" },
        }),
      }],
    }]);
    const weakFollowup = queue.items.find((item) => item.id.includes(":revision-1:review"));

    assert.equal(weakFollowup?.sourceType, "first_three_adoption");
    assert.ok(weakFollowup?.evidence.includes("未达标"));
    assert.equal(weakFollowup?.actionLabel, "进入二改");
    assert.equal(queue.recommendedNext?.id, weakFollowup?.id);
  });

  await t.test("blocks risky first drafts behind recovery validation", () => {
    const blockedProject: TaskQueueProject = {
      ...project,
      id: "blocked-project",
      worldEntries: [
        {
          type: "platform_soil",
          title: "首轮平台打法：番茄小说",
          content: [
            "状态：历史避坑",
            "打法：旧样本首章解释过多，先重做入口卖点。",
            "开头动作：第一段给不可逆危机。",
            "验证动作：只看前三章兑现是否改掉。",
            "风险：没有恢复条件前不能放量。",
          ].join("\n"),
        },
      ],
    };
    const queue = buildTaskQueueCenter([blockedProject]);

    assert.equal(queue.overview.riskRecoveryBlocked, 1);
    assert.equal(queue.items.some((item) => item.category === "draft"), false);
    const recovery = queue.items.find((item) => item.blockerType === "risk_recovery");
    assert.equal(recovery?.riskLevel, "blocked");
    assert.equal(recovery?.actionLabel, "做恢复验证");
    assert.equal(recovery?.href, "/dispatch?firstDayProject=blocked-project&step=risk-recovery#first-day-dispatch");
    assert.ok(recovery?.evidence.includes("恢复条件"));
  });

  await t.test("applies third-round final outcomes to production scale gates", () => {
    const pauseProject: TaskQueueProject = {
      ...project,
      id: "third-pause-project",
      worldEntries: [
        {
          type: "platform_soil",
          title: "首轮平台打法：WebNovel",
          content: [
            "状态：三轮暂停",
            "打法：三轮后仍无有效转化，先归档暂停。",
            "开头动作：重写入口卖点和第一章读者承诺。",
            "验证动作：先写清恢复条件。",
            "风险：未证明恢复条件前不要硬冲。",
          ].join("\n"),
        },
      ],
    };
    const downgradeProject: TaskQueueProject = {
      ...project,
      id: "third-downgrade-project",
      chapters: [
        baseChapter,
        {
          ...baseChapter,
          id: "chapter-ready-draft-2",
          order: 2,
          title: "第二章 第二个样本",
        },
      ],
      aiTasks: [],
      worldEntries: [
        {
          type: "platform_soil",
          title: "首轮平台打法：七猫",
          content: [
            "状态：三轮降档",
            "打法：三轮后只能降档修复。",
            "开头动作：重修前三章兑现。",
            "验证动作：写清通过线、不可接受项和复查证据。",
            "风险：不能直接进入稳定加码。",
          ].join("\n"),
        },
      ],
    };
    const queue = buildTaskQueueCenter([pauseProject, downgradeProject]);
    const pauseRecovery = queue.items.find((item) => item.projectId === "third-pause-project" && item.blockerType === "risk_recovery");
    const downgradeGate = queue.items.find((item) => item.projectId === "third-downgrade-project" && item.blockerType === "first_day_gate");
    const downgradeScaleGate = queue.items.find((item) => item.projectId === "third-downgrade-project" && item.blockerType === "watch_scale_gate");

    assert.equal(pauseRecovery?.riskLevel, "blocked");
    assert.equal(pauseRecovery?.riskLabel, "三轮暂停");
    assert.equal(pauseRecovery?.actionLabel, "做恢复验证");
    assert.equal(downgradeGate?.riskLevel, "watch");
    assert.equal(downgradeGate?.riskLabel, "三轮降档");
    assert.equal(downgradeGate?.actionLabel, "完成小样本验收");
    assert.equal(downgradeScaleGate?.scaleGate, "sample_only");
    assert.ok(downgradeScaleGate?.evidence.includes("通过线、不可接受项、复查证据、成功率、质量分、失败样本和放量结论"));
  });

  await t.test("keeps watch projects as small-sample draft tasks", () => {
    const watchProject: TaskQueueProject = {
      ...project,
      id: "watch-project",
      chapters: [
        baseChapter,
        {
          ...baseChapter,
          id: "chapter-ready-draft-2",
          order: 2,
          title: "第二章 第二个样本",
        },
      ],
      aiTasks: [],
      worldEntries: [
        {
          type: "platform_soil",
          title: "首轮平台打法：番茄小说",
          content: [
            "状态：历史观察",
            "打法：先用第一章小样本验证读者反馈。",
            "开头动作：第一段给强冲突。",
            "验证动作：写清通过线和不可接受项。",
            "风险：观察期不要批量。",
          ].join("\n"),
        },
      ],
    };
    const queue = buildTaskQueueCenter([watchProject]);
    const drafts = queue.items.filter((item) => item.category === "draft");
    const gate = queue.items.find((item) => item.blockerType === "watch_scale_gate");
    const firstDayGate = queue.items.find((item) => item.blockerType === "first_day_gate");

    assert.equal(drafts.length, 0);
    assert.equal(queue.overview.firstDayBlocked, 1);
    assert.equal(queue.overview.watchScaleBlocked, 1);
    assert.equal(queue.overview.watchSampleOnly, 0);
    assert.equal(firstDayGate?.riskLevel, "watch");
    assert.equal(firstDayGate?.scaleGate, "sample_only");
    assert.equal(firstDayGate?.actionLabel, "完成小样本验收");
    assert.equal(firstDayGate?.href, "/dispatch?firstDayProject=watch-project&step=first-draft#first-day-dispatch");
    assert.equal(gate?.href, "/dispatch?firstDayProject=watch-project&step=first-draft#first-day-dispatch");
    assert.ok(firstDayGate?.evidence.includes("通过线"));
    assert.ok(gate?.evidence.includes("通过线、不可接受项、复查证据、成功率、质量分、失败样本和放量结论"));
  });

  await t.test("allows watch drafts to scale after sample acceptance evidence clears the gate", () => {
    const clearedProject: TaskQueueProject = {
      ...project,
      id: "watch-cleared-project",
      chapters: [
        baseChapter,
        {
          ...baseChapter,
          id: "chapter-ready-draft-2",
          order: 2,
          title: "第二章 第二个样本",
        },
      ],
      aiTasks: [],
      worldEntries: [
        {
          type: "platform_soil",
          title: "首轮平台打法：番茄小说",
          content: [
            "状态：历史观察",
            "打法：先用第一章小样本验证读者反馈。",
            "开头动作：第一段给强冲突。",
            "验证动作：写清通过线和不可接受项。",
            "风险：观察期不要批量。",
          ].join("\n"),
        },
      ],
      gateDispatchTasks: [
        {
          dispatchKey: "first-day:watch-cleared-project:first-draft",
          state: "completed",
          completionEvidence: [
            "小样本首轮通过线已写清，不可接受项和复查证据已补齐。",
            "成功率：100%",
            "质量分：86",
            "失败样本：0",
            "放量结论：通过，可以恢复后续初稿批次。",
          ].join("\n"),
        },
      ],
    };
    const queue = buildTaskQueueCenter([clearedProject]);
    const drafts = queue.items.filter((item) => item.category === "draft");

    assert.equal(drafts.length, 2);
    assert.equal(queue.overview.watchScaleBlocked, 0);
    assert.equal(queue.overview.firstDayBlocked, 0);
    assert.equal(queue.overview.watchSampleOnly, 0);
    assert.equal(queue.overview.watchCleared, 2);
    assert.ok(drafts.every((item) => item.scaleGate === "cleared"));
    assert.ok(drafts.every((item) => item.actionLabel === "生成初稿"));
    assert.ok(drafts.every((item) => item.riskNotice?.includes("小样本验收依据已过线")));
  });

  await t.test("keeps watch scale gate closed when sample evidence lacks structured metrics", () => {
    const missingMetricsProject: TaskQueueProject = {
      ...project,
      id: "watch-missing-metrics-project",
      chapters: [
        baseChapter,
        {
          ...baseChapter,
          id: "chapter-ready-draft-2",
          order: 2,
          title: "第二章 第二个样本",
        },
      ],
      aiTasks: [],
      worldEntries: [
        {
          type: "platform_soil",
          title: "首轮平台打法：番茄小说",
          content: [
            "状态：历史观察",
            "打法：先用第一章小样本验证读者反馈。",
            "开头动作：第一段给强冲突。",
            "验证动作：写清通过线和不可接受项。",
            "风险：观察期不要批量。",
          ].join("\n"),
        },
      ],
      gateDispatchTasks: [
        {
          dispatchKey: "first-day:watch-missing-metrics-project:first-draft",
          state: "completed",
          completionEvidence: "小样本首轮通过线已写清，不可接受项和复查证据已补齐。放量结论：通过，可以恢复后续初稿批次。",
        },
      ],
    };
    const queue = buildTaskQueueCenter([missingMetricsProject]);
    const drafts = queue.items.filter((item) => item.category === "draft");
    const gate = queue.items.find((item) => item.blockerType === "watch_scale_gate");
    const firstDayGate = queue.items.find((item) => item.blockerType === "first_day_gate");

    assert.equal(drafts.length, 0);
    assert.equal(queue.overview.firstDayBlocked, 1);
    assert.equal(queue.overview.watchScaleBlocked, 1);
    assert.equal(firstDayGate?.actionLabel, "完成小样本验收");
    assert.ok(firstDayGate?.evidence.includes("成功率"));
    assert.ok(firstDayGate?.evidence.includes("质量分"));
    assert.ok(firstDayGate?.evidence.includes("失败样本"));
    assert.ok(gate?.evidence.includes("成功率"));
    assert.equal(gate?.scaleGate, "sample_only");
  });

  await t.test("keeps the watch gate closed when sample evidence says not passed", () => {
    const notPassedProject: TaskQueueProject = {
      ...project,
      id: "watch-not-passed-project",
      chapters: [
        baseChapter,
        {
          ...baseChapter,
          id: "chapter-ready-draft-2",
          order: 2,
          title: "第二章 第二个样本",
        },
      ],
      aiTasks: [],
      worldEntries: [
        {
          type: "platform_soil",
          title: "首轮平台打法：番茄小说",
          content: [
            "状态：历史观察",
            "打法：先用第一章小样本验证读者反馈。",
            "开头动作：第一段给强冲突。",
            "验证动作：写清通过线和不可接受项。",
            "风险：观察期不要批量。",
          ].join("\n"),
        },
      ],
      gateDispatchTasks: [
        {
          dispatchKey: "first-day:watch-not-passed-project:first-draft",
          state: "completed",
          completionEvidence: [
            "小样本首轮通过线已写清，不可接受项和复查证据已补齐。",
            "成功率：100%",
            "质量分：86",
            "失败样本：0",
            "放量结论：未通过，继续停留观察。",
          ].join("\n"),
        },
      ],
    };
    const queue = buildTaskQueueCenter([notPassedProject]);
    const drafts = queue.items.filter((item) => item.category === "draft");
    const gate = queue.items.find((item) => item.blockerType === "watch_scale_gate");
    const firstDayGate = queue.items.find((item) => item.blockerType === "first_day_gate");

    assert.equal(drafts.length, 0);
    assert.equal(firstDayGate?.actionLabel, "完成小样本验收");
    assert.equal(firstDayGate?.href, "/dispatch?firstDayProject=watch-not-passed-project&step=first-draft#first-day-dispatch");
    assert.equal(gate?.scaleGate, "sample_only");
    assert.equal(gate?.href, "/dispatch?firstDayProject=watch-not-passed-project&step=first-draft#first-day-dispatch");
    assert.equal(queue.overview.firstDayBlocked, 1);
    assert.equal(queue.overview.watchScaleBlocked, 1);
    assert.equal(queue.overview.watchCleared, 0);
  });
});
