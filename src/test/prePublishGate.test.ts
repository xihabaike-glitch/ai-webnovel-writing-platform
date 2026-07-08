import test from "node:test";
import assert from "node:assert/strict";
import { buildPrePublishGate, buildPrePublishGateFocusNotice, type PrePublishGateProject } from "../lib/projects/prePublishGate.ts";

const finalChapters = [1, 2, 3].map((order) => ({
  id: `chapter-${order}`,
  order,
  title: `第${order}夜`,
  content: `第${order}夜，林晚被系统逼到绝境，她必须在倒计时结束前完成选择。`,
  wordCount: 2600,
  goal: "让主角完成高压选择。",
  hook: `第${order}夜开局就出现倒计时。`,
  conflict: "主角必须在救人与自保之间选择。",
  valueShift: "主角从被动挨打转为主动反击。",
  cliffhanger: "系统弹出隐藏任务。",
  status: "final",
}));

const passedReviews = finalChapters.map((chapter, index) => ({
  id: `review-${chapter.id}`,
  chapterId: chapter.id,
  taskType: "chapter_review",
  status: "succeeded",
  outputText: JSON.stringify({ score: 92 - index, shouldSecondPass: false }),
  errorMessage: null,
  createdAt: `2026-01-0${index + 1}T00:00:00.000Z`,
  inputTokens: 1000,
  outputTokens: 500,
  costUsd: 0.01,
}));

const passedSecondPasses = finalChapters.map((chapter, index) => ({
  id: `second-pass-${chapter.id}`,
  chapterId: chapter.id,
  taskType: "chapter_second_pass",
  status: "succeeded",
  outputText: JSON.stringify({ score: 94 - index, changes: ["强化钩子", "压缩解释"] }),
  errorMessage: null,
  createdAt: `2026-01-0${index + 1}T01:00:00.000Z`,
  inputTokens: 1000,
  outputTokens: 500,
  costUsd: 0.01,
}));

const readySubmissionAsset = {
  id: "asset-ready-fanqie",
  platformId: "fanqie",
  platformName: "番茄小说",
  title: "夜雨系统：倒计时翻盘",
  logline: "林晚在雨夜绑定倒计时系统，每一次选择都把绝境打成反杀爽点，并逼近旧案真相。",
  synopsis: "林晚在雨夜绑定倒计时系统，每一次选择都牵动生死、复仇和旧案真相。她必须把系统惩罚反手变成翻盘筹码，在连续任务里救人、反杀、追查背叛者，并把所有敌人拖回雨夜审判。前三章用倒计时危机、隐藏任务和旧案线索连续推进，适合快节奏平台测试首轮留存。",
  overseasSynopsis: "Night Rain System follows Lin Wan through deadly timed choices and revenge.",
  tags: ["系统", "重生", "强爽点"],
  note: "总闸门 ready 样本。",
  source: "manual",
  updatedAt: "2026-01-07T08:00:00.000Z",
};

function firstDayCompleteDispatches(projectId: string) {
  return [{
    dispatchKey: `first-day:${projectId}:publish-precheck`,
    state: "completed",
    completionEvidence: "首日平台包预检已完成，标题、简介、标签、卖点、样章和风险清单已验收。",
  }];
}

function exportSnapshot(input: {
  id: string;
  isBaseline?: boolean;
  baselineLockedAt?: string | null;
  readinessPercent: number;
  chapterCount: number;
  wordCount: number;
  contentHash?: string;
  createdAt: string;
}) {
  return {
    id: input.id,
    packageKind: "full",
    format: "markdown",
    title: "夜雨系统",
    fileName: `${input.id}.md`,
    contentType: "text/markdown",
    fileSize: 1000,
    contentHash: input.contentHash ?? input.id.padEnd(64, "a").slice(0, 64),
    readinessStatus: "ready",
    readinessPercent: input.readinessPercent,
    chapterCount: input.chapterCount,
    wordCount: input.wordCount,
    notes: "",
    isBaseline: input.isBaseline,
    baselineLockedAt: input.baselineLockedAt ?? null,
    createdAt: input.createdAt,
  };
}

const finalDeliveryAuditItems = [
  ["publish-package", "发布包", "#platform-export"],
  ["submission-asset", "投稿材料", "#submission-package"],
  ["sample-chapters", "前三章样章", "#publish-chapters"],
  ["publish-baseline", "发布基准", "#package-version-history"],
  ["real-effect", "真实效果", "#publish-effect-panel"],
  ["strategy-review", "策略复盘", "#platform-strategy-ranking"],
] as const;

function finalDeliveryAudits(projectId: string, platformId = "fanqie") {
  return finalDeliveryAuditItems.map(([itemId, label, href], index) => ({
    actionId: `final-delivery:${platformId}:${itemId}`,
    executionType: "manual",
    status: "succeeded",
    succeededCount: 1,
    failedCount: 0,
    taskId: null,
    platformId,
    label: `回写${label}交付回执`,
    message: [
      `交付项：${label}`,
      "当前状态：已交付",
      `证据：${label}已交付。`,
      `产物位置：${href}`,
      "人工验收：通过 / 退回，并写明理由。",
      `下一步：查看${label}`,
      "停手线：缺产物位置、人工验收或下一步判断，不允许回总闸门标记闭环。",
    ].join("\n"),
    payload: JSON.stringify({ projectId }),
    createdAt: `2026-01-12T00:00:0${index}.000Z`,
  }));
}

const readyProject: PrePublishGateProject = {
  id: "project-ready",
  title: "夜雨系统",
  targetPlatform: "fanqie",
  targetWordCount: 300000,
  currentWordCount: 30000,
  genre: "都市系统",
  sellingPoint: "雨夜危机中觉醒系统，主角用一次次选择翻盘。",
  chapters: finalChapters,
  aiTasks: [
    ...passedReviews,
    ...passedSecondPasses,
    {
      id: "asset-optimize-1",
      chapterId: null,
      taskType: "platform_submission_asset_optimize",
      status: "succeeded",
      inputSnapshot: JSON.stringify({ platformId: "fanqie" }),
      outputText: JSON.stringify({ variants: [{ strategy: "强钩子爽点版" }, { strategy: "主线悬疑版" }, { strategy: "情绪复仇版" }] }),
      errorMessage: null,
      createdAt: "2026-01-07T07:00:00.000Z",
      inputTokens: 1000,
      outputTokens: 500,
      costUsd: 0.01,
    },
  ],
  gateDispatchTasks: firstDayCompleteDispatches("project-ready"),
  gateActionAudits: finalDeliveryAudits("project-ready"),
  submissionAssets: [readySubmissionAsset],
};

const blockedProject: PrePublishGateProject = {
  ...readyProject,
  id: "project-blocked",
  currentWordCount: 9000,
  chapters: finalChapters.map((chapter) => ({ ...chapter, status: "draft" })),
  aiTasks: [],
  gateDispatchTasks: firstDayCompleteDispatches("project-blocked"),
};

const handoffBlockedProject: PrePublishGateProject = {
  ...readyProject,
  id: "project-handoff-blocked",
  worldEntries: [{
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
      "避坑边界：不要直接放量，先做小样本。",
    ].join("\n"),
  }],
  gateDispatchTasks: [{
    dispatchKey: "first-day:project-handoff-blocked:publish-precheck",
    state: "completed",
    completionEvidence: "首日平台包预检已完成，标题、简介、标签、卖点、样章和风险清单已验收。",
  }],
};

test("buildPrePublishGate", async (t) => {
  await t.test("allows launch when package, queue, failures, and strategy are clean", () => {
    const gate = buildPrePublishGate({
      projects: [readyProject],
      failureTasks: [],
      batchHistory: [],
    });

    assert.equal(gate.status, "ready");
    assert.equal(gate.label, "可以发布");
    assert.equal(gate.overview.readyPackages, 1);
    assert.equal(gate.overview.runnableTasks, 0);
    assert.ok(gate.score >= 85);
    assert.ok(gate.items.every((item) => item.status === "pass"));
    assert.equal(gate.projectStatuses[0].platformId, "fanqie");
    assert.equal(gate.projectStatuses[0].wordCount, 7800);
    assert.ok(gate.projectStatuses[0].downloadHref?.includes("format=markdown"));
    assert.ok(gate.projectStatuses[0].downloadHref?.includes("platformId=fanqie"));
    assert.ok(gate.priorityActions.some((action) => action.label === "导出平台发布包"));
    assert.equal(gate.releaseAction?.label, "进入发布闭环");
    assert.equal(gate.releaseAction?.href, "#gate-export-package");
    assert.ok(gate.releaseAction?.detail.includes("采纳一个投稿资产候选"));
    assert.equal(gate.pmFocus.status, "ready");
    assert.equal(gate.pmFocus.actionLabel, gate.releaseAction?.label);
    assert.equal(gate.pmFocus.actionHref, gate.releaseAction?.href);
    assert.ok(gate.pmFocus.headline.includes("进入发布闭环"));
    assert.ok(gate.pmFocus.detail.includes(gate.releaseAction?.detail ?? ""));
    assert.ok(gate.pmFocus.scopeLabel.includes("8/8 核心平台已完成"));
    assert.ok(gate.pmFocus.scopeLabel.includes("剩余 10 个平台不再添加"));
    assert.equal(gate.pmFocus.pipelineActionLabel, "核对项目流水线");
    assert.equal(gate.pmFocus.pipelineActionHref, "/projects#pipeline-projects");
    assert.ok(gate.pmFocus.pipelineValidationHint.includes("放量前"));
    assert.ok(gate.pmFocus.pipelineValidationHint.includes("样本"));
    assert.ok(gate.pmFocus.pipelineValidationHint.includes("复查"));
    assert.ok(gate.pmFocus.pipelineValidationHint.includes("失败修复"));
    assert.ok(gate.pmFocus.pipelineValidationHint.includes("发布包"));
    assert.equal(gate.realPipelineFinalReview.outcome, "pass");
    assert.equal(gate.realPipelineFinalReview.outcomeLabel, "通过");
    assert.ok(gate.realPipelineFinalReview.headline.includes("真实作品流水线终检通过"));
    assert.ok(gate.realPipelineFinalReview.detail.includes("项目验收单、失败复盘、模型岗位和发布包"));
    assert.equal(gate.realPipelineFinalReview.primaryActionHref, "#gate-export-package");
    assert.ok(gate.realPipelineFinalReview.evidence.some((line) => line.includes("夜雨系统")));
    assert.ok(gate.realPipelineFinalReview.passSignals.some((line) => line.includes("项目验收单通过")));
    assert.equal(gate.finalDeliveryRelease.status, "ready");
    assert.equal(gate.finalDeliveryRelease.actionLabel, "正式放行交付包");
    assert.equal(gate.finalDeliveryRelease.actionHref, "#pipeline-final-review");
    assert.equal(gate.finalDeliveryRelease.projectCount, 1);
    assert.equal(gate.finalDeliveryRelease.completedReceiptCount, 6);
    assert.ok(gate.finalDeliveryRelease.headline.includes("最终交付正式放行"));
    assert.ok(gate.finalDeliveryRelease.pmVerdict.includes("可以交付"));
    assert.ok(gate.finalDeliveryRelease.evidence.some((line) => line.includes("最终交付已闭环")));
    assert.ok(gate.finalDeliveryRelease.evidence.some((line) => line.includes("真实作品流水线终检通过")));
  });

  await t.test("blocks launch when final delivery receipts are missing", () => {
    const gate = buildPrePublishGate({
      projects: [{ ...readyProject, gateActionAudits: [] }],
      failureTasks: [],
      batchHistory: [],
    });
    const finalDeliveryItem = gate.items.find((item) => item.id === "final-delivery");

    assert.equal(gate.status, "blocked");
    assert.equal(gate.label, "暂不发布");
    assert.equal(finalDeliveryItem?.status, "block");
    assert.equal(finalDeliveryItem?.actionLabel, "写回最终交付回执");
    assert.equal(gate.releaseAction?.label, "先解除阻塞：写回最终交付回执");
    const releaseHref = new URL(gate.releaseAction?.href ?? "", "http://localhost");
    const releaseGateReturn = new URL(releaseHref.searchParams.get("gateReturn") ?? "", "http://localhost");

    assert.equal(releaseHref.pathname, "/projects/project-ready");
    assert.equal(releaseHref.searchParams.get("finalDeliveryFocus"), "publish-package");
    assert.equal(releaseHref.hash, "#platform-export");
    assert.equal(releaseGateReturn.pathname, "/gate");
    assert.equal(releaseGateReturn.searchParams.get("focus"), "action-recheck");
    assert.equal(releaseGateReturn.searchParams.get("projectId"), "project-ready");
    assert.equal(releaseGateReturn.searchParams.get("actionId"), "final-delivery:project-ready");
    assert.equal(releaseGateReturn.searchParams.get("source"), "final-delivery-receipt");
    assert.equal(releaseGateReturn.hash, "#gate-focus-notice");
    assert.equal(gate.realPipelineFinalReview.outcome, "repair");
    assert.ok(gate.realPipelineFinalReview.repairSignals.some((line) => line.includes("最终交付")));
  });

  await t.test("focuses the first blocked final delivery receipt from the gate", () => {
    const audits = finalDeliveryAudits("project-ready").map((audit) => audit.actionId.endsWith(":real-effect")
      ? { ...audit, message: audit.message.replace("当前状态：已交付", "当前状态：阻塞") }
      : audit);
    const gate = buildPrePublishGate({
      projects: [{ ...readyProject, gateActionAudits: audits }],
      failureTasks: [],
      batchHistory: [],
    });
    const finalDeliveryItem = gate.items.find((item) => item.id === "final-delivery");
    const finalDeliveryHref = new URL(finalDeliveryItem?.href ?? "", "http://localhost");
    const releaseHref = new URL(gate.releaseAction?.href ?? "", "http://localhost");

    assert.equal(finalDeliveryItem?.status, "block");
    assert.equal(finalDeliveryHref.pathname, "/projects/project-ready");
    assert.equal(finalDeliveryHref.searchParams.get("finalDeliveryFocus"), "real-effect");
    assert.equal(new URL(finalDeliveryHref.searchParams.get("gateReturn") ?? "", "http://localhost").searchParams.get("actionId"), "final-delivery:project-ready");
    assert.equal(releaseHref.searchParams.get("finalDeliveryFocus"), "real-effect");
    assert.equal(releaseHref.searchParams.get("gateReturn"), finalDeliveryHref.searchParams.get("gateReturn"));
  });

  await t.test("blocks launch when model writing roles are missing", () => {
    const gate = buildPrePublishGate({
      projects: [readyProject],
      failureTasks: [],
      batchHistory: [],
      modelRoleBlocker: {
        tone: "blocked",
        title: "模型编辑部缺岗",
        detail: "4 个岗位还没可用模型。先补 Claude / DeepSeek / Kimi / GPT 的职责分工。",
        actionLabel: "去配置模型岗位",
        actionHref: "/settings/models?focus=model-role-matrix#model-role-matrix",
      },
    });

    const modelItem = gate.items.find((item) => item.id === "model-roles");

    assert.equal(gate.status, "blocked");
    assert.equal(modelItem?.status, "block");
    assert.equal(modelItem?.actionLabel, "去配置模型岗位");
    assert.equal(gate.releaseAction?.href, "/settings/models?focus=model-role-matrix#model-role-matrix");
    assert.equal(gate.pmFocus.status, "blocked");
    assert.ok(gate.pmFocus.headline.includes("模型"));
    assert.equal(gate.realPipelineFinalReview.outcome, "hold_batch");
    assert.equal(gate.realPipelineFinalReview.outcomeLabel, "暂停批量");
    assert.ok(gate.realPipelineFinalReview.headline.includes("暂停批量"));
    assert.ok(gate.realPipelineFinalReview.holdBatchSignals.some((line) => line.includes("模型岗位")));
    assert.equal(gate.realPipelineFinalReview.primaryActionHref, "/settings/models?focus=model-role-matrix#model-role-matrix");
  });

  await t.test("sends incomplete real sample receipts back to repair", () => {
    const gate = buildPrePublishGate({
      projects: [blockedProject],
      failureTasks: [],
      batchHistory: [],
    });

    assert.equal(gate.realPipelineFinalReview.outcome, "repair");
    assert.equal(gate.realPipelineFinalReview.outcomeLabel, "退回修复");
    assert.ok(gate.realPipelineFinalReview.headline.includes("退回修复"));
    assert.ok(gate.realPipelineFinalReview.repairSignals.some((line) => line.includes("项目验收单")));
    assert.ok(gate.realPipelineFinalReview.primaryActionHref.startsWith("/projects"));
  });

  await t.test("focuses first-day completion as a gate release notice", () => {
    const gate = buildPrePublishGate({
      projects: [readyProject],
      failureTasks: [],
      batchHistory: [],
    });
    const notice = buildPrePublishGateFocusNotice({
      focus: "first-day-complete",
      projectId: "project-ready",
      gate,
    });

    assert.equal(notice.visible, true);
    assert.equal(notice.tone, "ready");
    assert.equal(notice.headline, "首日链路已放行");
    assert.ok(notice.detail.includes("总闸门当前可放行"));
    assert.equal(notice.primaryLabel, "进入发布闭环");
    assert.equal(notice.primaryHref, "#gate-export-package");
    assert.ok(notice.badges.includes("首日链路通过"));
    assert.ok(notice.badges.includes("作品：夜雨系统"));
    assert.ok(notice.detail.includes("夜雨系统"));
  });

  await t.test("focuses first-day completion on executable small-batch production", () => {
    const gate = buildPrePublishGate({
      projects: [readyProject],
      failureTasks: [],
      batchHistory: [],
    });
    const queueLink = {
      id: "queue:next",
      label: "打开任务队列",
      detail: "夜雨系统 · 第四章 · 有 1 个任务可继续处理。",
      href: "/tasks#recommended-batch",
      tone: "review" as const,
      execution: null,
    };
    const smallBatchAction = {
      id: "strategy",
      label: "批量审稿 1 个",
      detail: "夜雨系统 · 第四章 · 先跑 1 个小批样本。",
      href: "/tasks#recommended-batch",
      tone: "primary" as const,
      execution: {
        type: "recommended_batch" as const,
        strategyId: "standard" as const,
      },
    };
    const notice = buildPrePublishGateFocusNotice({
      focus: "first-day-complete",
      gate: {
        ...gate,
        status: "needs_repair",
        priorityActions: [queueLink, smallBatchAction],
        releaseAction: queueLink,
      },
    });

    assert.equal(notice.visible, true);
    assert.equal(notice.tone, "ready");
    assert.equal(notice.headline, "首日链路已放行，可以执行小批生产");
    assert.equal(notice.primaryLabel, "批量审稿 1 个");
    assert.equal(notice.primaryHref, "/tasks#recommended-batch");
    assert.equal(notice.primaryAction?.execution?.type, "recommended_batch");
    assert.ok(notice.detail.includes("先跑推荐小批"));
    assert.ok(notice.badges.includes("一键小批生产"));
  });

  await t.test("focuses first-day completion on the target project's own next action", () => {
    const gate = buildPrePublishGate({
      projects: [readyProject],
      failureTasks: [],
      batchHistory: [],
    });
    const globalAction = {
      id: "repair:other-project",
      label: "修其他作品",
      detail: "别的作品 · 这个动作不该劫持当前作品。",
      href: "/projects/other-project#platform-export",
      tone: "repair" as const,
      execution: {
        type: "publish_repair" as const,
        projectId: "other-project",
        kind: "run_second_pass" as const,
        detail: "别的作品需要二改。",
      },
    };
    const targetAction = {
      id: "repair:project-ready",
      label: "修夜雨系统发布包",
      detail: "夜雨系统 · 先修当前作品的发布包。",
      href: "/projects/project-ready#platform-export",
      tone: "repair" as const,
      execution: {
        type: "publish_repair" as const,
        projectId: "project-ready",
        kind: "open_submission_package" as const,
        detail: "夜雨系统需要补发布包。",
      },
    };
    const notice = buildPrePublishGateFocusNotice({
      focus: "first-day-complete",
      projectId: "project-ready",
      gate: {
        ...gate,
        status: "needs_repair",
        priorityActions: [globalAction, targetAction],
        releaseAction: globalAction,
      },
    });

    assert.equal(notice.primaryLabel, "修夜雨系统发布包");
    assert.equal(notice.primaryHref, "/projects/project-ready#platform-export");
    assert.ok(notice.detail.includes("夜雨系统"));
    assert.equal(notice.detail.includes("别的作品"), false);
  });

  await t.test("focuses action recheck on the same blocker when it remains open", () => {
    const gate = buildPrePublishGate({
      projects: [readyProject],
      failureTasks: [],
      batchHistory: [],
    });
    const acceptanceAction = {
      id: "project-acceptance:project-ready",
      label: "执行二改",
      detail: "夜雨系统 · 单本作品验收单仍缺首章二改证据。",
      href: "/projects/project-ready#ai-pipeline",
      tone: "repair" as const,
      execution: {
        type: "publish_repair" as const,
        projectId: "project-ready",
        kind: "run_second_pass" as const,
        chapterId: "chapter-1",
        detail: "缺首章二改证据。",
      },
    };
    const notice = buildPrePublishGateFocusNotice({
      focus: "action-recheck",
      actionId: "project-acceptance:project-ready",
      gate: {
        ...gate,
        status: "blocked",
        priorityActions: [acceptanceAction],
        releaseAction: acceptanceAction,
      },
    });

    assert.equal(notice.visible, true);
    assert.equal(notice.tone, "blocked");
    assert.equal(notice.headline, "上次动作后仍有阻塞");
    assert.equal(notice.primaryAction?.id, "project-acceptance:project-ready");
    assert.ok(notice.detail.includes("单本作品验收单"));
    assert.ok(notice.badges.includes("继续处理同一动作"));
  });

  await t.test("focuses action recheck on the next gate blocker after the previous action clears", () => {
    const gate = buildPrePublishGate({
      projects: [readyProject],
      failureTasks: [],
      batchHistory: [],
    });
    const nextAction = {
      id: "queue:next",
      label: "补任务队列",
      detail: "夜雨系统 · 还有任务队列阻塞，先补完成依据。",
      href: "/tasks?view=blocked",
      tone: "repair" as const,
      execution: null,
    };
    const notice = buildPrePublishGateFocusNotice({
      focus: "action-recheck",
      actionId: "project-acceptance:project-ready",
      gate: {
        ...gate,
        status: "blocked",
        priorityActions: [nextAction],
        releaseAction: nextAction,
      },
    });

    assert.equal(notice.visible, true);
    assert.equal(notice.tone, "review");
    assert.equal(notice.headline, "上次动作已清除，继续下一个阻塞");
    assert.equal(notice.primaryLabel, "补任务队列");
    assert.equal(notice.primaryHref, "/tasks?view=blocked");
    assert.ok(notice.detail.includes("夜雨系统"));
    assert.ok(notice.badges.includes("上次动作已清除"));
  });

  await t.test("summarizes project acceptance recheck progress after dispatch evidence is returned", () => {
    const gate = buildPrePublishGate({
      projects: [{
        ...readyProject,
        id: "project-recheck-progress",
        title: "复检回填作品",
        aiTasks: [
          passedReviews[0],
          passedSecondPasses[0],
        ],
        gateDispatchTasks: [{
          dispatchKey: "first-day:project-recheck-progress:publish-precheck",
          state: "completed",
          completionEvidence: "派单中心已补齐首日平台包预检：标题、简介、标签、样章风险清单均已人工验收。",
        }, {
          dispatchKey: "project-acceptance-next:project-recheck-progress:publish_package",
          state: "completed",
          completionEvidence: [
            "复检分流补证据模板",
            "完成项：已补齐番茄发布包标题、简介、标签和前三章样章",
            "产物链接/位置：/projects/project-recheck-progress#platform-export",
            "人工验收：通过",
            "回总闸门复检结论：验收缺口已解除",
          ].join("\n"),
        }],
        chapters: finalChapters.slice(0, 2),
      }],
      failureTasks: [],
      batchHistory: [],
    });
    const notice = buildPrePublishGateFocusNotice({
      focus: "action-recheck",
      actionId: "project-acceptance:project-recheck-progress",
      gate,
    });

    assert.equal(notice.visible, true);
    assert.equal(notice.recheckSummary?.title, "复检回填作品 · 项目验收单回填");
    assert.equal(notice.recheckSummary?.completedSteps, 6);
    assert.equal(notice.recheckSummary?.totalSteps, 6);
    assert.equal(notice.recheckSummary?.currentStepLabel, "发布包");
    assert.equal(notice.recheckSummary?.statusLabel, "验收单通过");
    assert.equal(notice.recheckSummary?.recheckVerdict.tone, "cleared");
    assert.equal(notice.recheckSummary?.recheckVerdict.label, "验收缺口已解除");
    assert.ok(notice.recheckSummary?.recheckVerdict.detail.includes("已补 6/6 步"));
    assert.equal(notice.recheckSummary?.nextStep.tone, "release");
    assert.ok(notice.recheckSummary?.nextStep.label.includes("补前三章"));
    assert.ok(notice.recheckSummary?.nextStep.detail.includes("验收缺口已解除"));
    assert.ok(notice.recheckSummary?.completedEvidence.some((line) => line.includes("首日派单已有完成依据")));
    assert.ok(notice.recheckSummary?.latestEvidence?.includes("派单中心已补齐首日平台包预检"));
    assert.equal(notice.recheckSummary?.latestRecheckReceipt?.dispatchKey, "project-acceptance-next:project-recheck-progress:publish_package");
    assert.ok(notice.recheckSummary?.latestRecheckReceipt?.evidence.includes("验收缺口已解除"));
    assert.deepEqual(notice.recheckSummary?.closedItems, ["发布包"]);
    assert.equal(notice.recheckSummary?.nextDispatch, null);
    assert.ok(notice.detail.includes("已完成 6/6 步"));
  });

  await t.test("routes cleared acceptance rechecks to the release action", () => {
    const gate = buildPrePublishGate({
      projects: [readyProject],
      failureTasks: [],
      batchHistory: [],
    });
    const notice = buildPrePublishGateFocusNotice({
      focus: "action-recheck",
      actionId: "project-acceptance:project-ready",
      gate,
    });

    assert.equal(notice.visible, true);
    assert.equal(notice.recheckSummary?.recheckVerdict.tone, "cleared");
    assert.equal(notice.recheckSummary?.nextStep.tone, "release");
    assert.equal(notice.recheckSummary?.nextStep.label, "进入发布闭环");
    assert.equal(notice.recheckSummary?.nextStep.href, "#gate-export-package");
    assert.ok(notice.recheckSummary?.nextStep.detail.includes("验收缺口已解除"));
    assert.equal(notice.recheckSummary?.nextDispatch, null);
  });

  await t.test("routes project acceptance recheck to role dispatch closure when role evidence is incomplete", () => {
    const gate = buildPrePublishGate({
      projects: [{
        ...readyProject,
        id: "project-recheck-role",
        gateDispatchTasks: [
          {
            dispatchKey: "first-day:project-recheck-role:publish-precheck",
            state: "completed",
            completionEvidence: "首日平台包预检已完成，标题、简介、标签、卖点、样章和风险清单已验收。",
          },
          {
            dispatchKey: "role-intent:project-recheck-role:story-structure:structure_editor",
            state: "completed",
            completionEvidence: "结构主编完成人物弧光、主线支线、开头钩子和结尾回收复查。",
          },
        ],
      }],
      failureTasks: [],
      batchHistory: [],
    });
    const notice = buildPrePublishGateFocusNotice({
      focus: "action-recheck",
      actionId: "project-acceptance:project-recheck-role",
      gate,
    });

    assert.equal(notice.visible, true);
    assert.equal(notice.recheckSummary?.completedSteps, 5);
    assert.equal(notice.recheckSummary?.totalSteps, 7);
    assert.equal(notice.recheckSummary?.currentStepLabel, "角色闭环");
    assert.equal(notice.recheckSummary?.roleClosureProgress?.completedRoles, 1);
    assert.equal(notice.recheckSummary?.roleClosureProgress?.totalRoles, 3);
    assert.deepEqual(notice.recheckSummary?.roleClosureProgress?.completedLabels, ["结构主编"]);
    assert.deepEqual(notice.recheckSummary?.roleClosureProgress?.missingLabels, ["资料官", "平台包装"]);
    assert.ok(notice.recheckSummary?.roleClosureProgress?.headline.includes("角色闭环 1/3"));
    assert.ok(notice.recheckSummary?.roleClosureProgress?.lanes.find((lane) => lane.label === "结构主编")?.evidence.includes("结构主编完成"));
    assert.equal(notice.recheckSummary?.roleClosureProgress?.lanes.find((lane) => lane.label === "资料官")?.status, "missing");
    assert.equal(notice.recheckSummary?.nextDispatch?.id, "project-acceptance-next:project-recheck-role:role_dispatch");
    assert.equal(notice.recheckSummary?.nextDispatch?.stage, "start_role_dispatch_closure");
    assert.equal(notice.recheckSummary?.nextDispatch?.ownerRole, "角色验收负责人");
    assert.ok(notice.recheckSummary?.nextDispatch?.title.includes("补角色派单闭环"));
    assert.ok(notice.recheckSummary?.nextDispatch?.detail.includes("资料官"));
    assert.deepEqual(
      notice.recheckSummary?.nextDispatches.map((dispatch) => dispatch.id),
      [
        "role-intent:project-recheck-role:context-recall:context_librarian",
        "role-intent:project-recheck-role:platform-export:overseas_packager",
      ],
    );
    assert.deepEqual(
      notice.recheckSummary?.nextDispatches.map((dispatch) => dispatch.ownerRole),
      ["长上下文资料官", "海外投稿包装编辑"],
    );
    assert.ok(notice.recheckSummary?.nextDispatches[0]?.href.includes("/projects/project-recheck-role#context-recall"));
    assert.ok(notice.recheckSummary?.nextDispatches[1]?.acceptanceCriteria.some((item) => item.includes("WebNovel")));
  });

  await t.test("uses role closure recheck receipts to reduce gate blockers", () => {
    const gate = buildPrePublishGate({
      projects: [{
        ...readyProject,
        id: "project-recheck-role-receipt",
        gateDispatchTasks: [
          {
            dispatchKey: "first-day:project-recheck-role-receipt:publish-precheck",
            state: "completed",
            completionEvidence: "首日平台包预检已完成，标题、简介、标签、卖点、样章和风险清单已验收。",
          },
          {
            dispatchKey: "role-intent:project-recheck-role-receipt:story-structure:structure_editor",
            state: "completed",
            completionEvidence: "结构主编完成人物弧光、主线支线、开头钩子和结尾回收复查。",
          },
          {
            dispatchKey: "project-acceptance-next:project-recheck-role-receipt:role_dispatch",
            state: "completed",
            completionEvidence: [
              "复检分流补证据模板",
              "完成项：已补齐资料官和平台包装角色闭环",
              "产物链接/位置：/projects/project-recheck-role-receipt#context-recall；/projects/project-recheck-role-receipt#platform-export",
              "人工验收：通过",
              "回总闸门复检结论：验收缺口已解除",
            ].join("\n"),
          },
        ],
      }],
      failureTasks: [],
      batchHistory: [],
    });
    const notice = buildPrePublishGateFocusNotice({
      focus: "action-recheck",
      actionId: "project-acceptance:project-recheck-role-receipt",
      gate,
    });

    assert.equal(notice.visible, true);
    assert.equal(notice.recheckSummary?.recheckVerdict.tone, "cleared");
    assert.equal(notice.recheckSummary?.roleClosureProgress?.completedRoles, 3);
    assert.deepEqual(notice.recheckSummary?.roleClosureProgress?.missingLabels, []);
    assert.deepEqual(notice.recheckSummary?.closedItems, ["资料官", "平台包装"]);
    assert.equal(notice.recheckSummary?.nextDispatch, null);
    assert.ok(notice.recheckSummary?.latestRecheckReceipt?.evidence.includes("资料官和平台包装"));
  });

  await t.test("shows first-three adoption closure progress in action recheck", () => {
    const gate = buildPrePublishGate({
      projects: [{
        ...readyProject,
        id: "project-recheck-adoption",
        gateDispatchTasks: [
          ...firstDayCompleteDispatches("project-recheck-adoption"),
          {
            dispatchKey: "first-three-adoption:project-recheck-adoption:chapter-1:revision-1:review",
            state: "completed",
            completionEvidence: "采纳后重新审稿已完成：第 1 章《第1夜》，任务 review-1，审稿分 91，问题 0 个。",
          },
          {
            dispatchKey: "first-three-adoption:project-recheck-adoption:chapter-1:revision-1:publish-check",
            state: "assigned",
            completionEvidence: "",
            title: "第 1 章采纳后发布质检",
            detail: "重新审稿后回发布包刷新质检。",
            actionLabel: "回发布质检",
            href: "/projects/project-recheck-adoption#platform-export",
          },
        ],
      }],
      failureTasks: [],
      batchHistory: [],
    });
    const notice = buildPrePublishGateFocusNotice({
      focus: "action-recheck",
      actionId: "project-acceptance:project-recheck-adoption",
      gate,
    });

    assert.equal(notice.visible, true);
    assert.equal(notice.recheckSummary?.firstThreeAdoptionProgress?.totalTimelines, 1);
    assert.equal(notice.recheckSummary?.firstThreeAdoptionProgress?.completedTimelines, 0);
    assert.equal(notice.recheckSummary?.firstThreeAdoptionProgress?.blockedTimelines, 1);
    assert.ok(notice.recheckSummary?.firstThreeAdoptionProgress?.headline.includes("采纳后续 0/1"));
    assert.ok(notice.recheckSummary?.firstThreeAdoptionProgress?.detail.includes("仍阻塞 1 条"));
    assert.equal(notice.recheckSummary?.firstThreeAdoptionProgress?.lanes[0]?.status, "blocked");
    assert.equal(notice.recheckSummary?.firstThreeAdoptionProgress?.lanes[0]?.nextActionLabel, "回发布质检");
    assert.ok(notice.recheckSummary?.firstThreeAdoptionProgress?.lanes[0]?.detail.includes("发布质检"));
  });

  await t.test("orders action recheck blockers with the current gate blocker first", () => {
    const gate = buildPrePublishGate({
      projects: [{
        ...readyProject,
        id: "project-recheck-blockers",
        title: "复检卡点作品",
        aiTasks: [],
        gateDispatchTasks: [],
      }],
      failureTasks: [],
      batchHistory: [],
    });
    const notice = buildPrePublishGateFocusNotice({
      focus: "action-recheck",
      actionId: "project-acceptance:project-recheck-blockers",
      gate,
    });

    assert.equal(notice.recheckSummary?.remainingBlockers[0]?.label, "审稿");
    assert.equal(notice.recheckSummary?.remainingBlockers[0]?.priorityLabel, "优先处理");
    assert.equal(notice.recheckSummary?.remainingBlockers[0]?.status, "current");
    assert.equal(notice.recheckSummary?.remainingBlockers[0]?.actionLabel, "处理审稿");
    assert.ok(notice.recheckSummary?.remainingBlockers[0]?.href.startsWith("/projects?gateReturn="));
    assert.ok(notice.recheckSummary?.remainingBlockers[0]?.href.endsWith("#pipeline-projects"));
    assert.ok(decodeURIComponent(notice.recheckSummary?.remainingBlockers[0]?.href ?? "").includes("/gate?focus=action-recheck&actionId=project-acceptance:project-recheck-blockers#gate-focus-notice"));
    assert.ok(notice.recheckSummary?.remainingBlockers[0]?.evidence.includes("首章还缺审稿成功记录"));
    assert.ok(notice.recheckSummary?.remainingBlockers.find((item) => item.label === "二改")?.href.includes("gateReturn="));
    assert.ok(notice.recheckSummary?.remainingBlockers.find((item) => item.label === "派单回执")?.href.startsWith("/dispatch?firstDayProject=project-recheck-blockers"));
    assert.ok(notice.recheckSummary?.remainingBlockers.find((item) => item.label === "派单回执")?.href.includes("gateReturn="));
    assert.ok(notice.recheckSummary?.remainingBlockers.find((item) => item.label === "发布包")?.href.includes("gateReturn="));
    assert.deepEqual(
      notice.recheckSummary?.remainingBlockers.slice(1).map((item) => item.priorityLabel),
      ["后续卡点", "后续卡点", "后续卡点"],
    );
    assert.deepEqual(
      notice.recheckSummary?.remainingBlockers.map((item) => item.label),
      ["审稿", "二改", "派单回执", "发布包"],
    );
    assert.deepEqual(
      notice.recheckSummary?.blockerGroups.map((group) => group.label),
      ["当前必须处理", "后续观察"],
    );
    assert.deepEqual(
      notice.recheckSummary?.blockerGroups.map((group) => group.items.map((item) => item.label)),
      [["审稿"], ["二改", "派单回执", "发布包"]],
    );
    assert.ok(notice.recheckSummary?.blockerGroups[0]?.detail.includes("先处理"));
    assert.ok(notice.recheckSummary?.blockerGroups[1]?.detail.includes("不要提前跳"));
  });

  await t.test("blocks launch when first-day handoff evidence is missing", () => {
    const gate = buildPrePublishGate({
      projects: [handoffBlockedProject],
      failureTasks: [],
      batchHistory: [],
    });
    const queueItem = gate.items.find((item) => item.id === "task-queue");
    const queueAction = gate.priorityActions.find((action) => action.id === "queue:next");

    assert.equal(gate.status, "blocked");
    assert.equal(queueItem?.status, "block");
    assert.ok(queueItem?.detail.includes("首日闸门"));
    assert.ok(queueItem?.detail.includes("补交接验收"));
    assert.equal(queueAction?.label, "补交接验收");
    assert.ok(queueAction?.detail.includes("开书交接证据"));
    assert.equal(gate.releaseAction?.label, "先解除阻塞：补交接验收");
    assert.equal(gate.releaseAction?.href, "/dispatch?firstDayProject=project-handoff-blocked&step=publish-precheck#first-day-dispatch");
  });

  await t.test("links project acceptance sheet blockers back into the gate", () => {
    const gate = buildPrePublishGate({
      projects: [{
        ...readyProject,
        id: "project-acceptance-blocked",
        title: "验收缺二改",
        aiTasks: passedReviews.slice(0, 1),
        gateDispatchTasks: [],
      }],
      failureTasks: [],
      batchHistory: [],
    });
    const project = gate.projectStatuses[0];
    const acceptanceItem = gate.items.find((item) => item.id === "project-acceptance");

    assert.equal(project.acceptanceSheetGate.status, "block");
    assert.equal(project.acceptanceSheetGate.currentStepId, "second_pass");
    assert.equal(project.acceptanceSheetGate.repairMode, "executable");
    assert.ok(project.acceptanceSheetGate.executionHint.includes("可一键修复"));
    assert.ok(project.acceptanceSheetGate.detail.includes("二改"));
    assert.equal(project.acceptanceSheetGate.runbookStep.stepId, "sample_draft");
    assert.ok(project.acceptanceSheetGate.runbookStep.title.includes("首章样本"));
    assert.ok(project.acceptanceSheetGate.runbookStep.sampleAction.includes("首章样本"));
    assert.ok(project.acceptanceSheetGate.runbookStep.proofToCapture.includes("人工采用"));
    assert.ok(project.acceptanceSheetGate.runbookStep.rollbackIfWeak.includes("二改"));
    assert.ok(project.acceptanceSheetGate.receiptTemplate.some((line) => line.includes("完成项：二改")));
    assert.ok(project.acceptanceSheetGate.receiptTemplate.some((line) => line.includes("回总闸门复检结论")));
    assert.ok(project.acceptanceSheetGate.dispatchDraftHref.startsWith("/dispatch?"));
    assert.ok(decodeURIComponent(project.acceptanceSheetGate.dispatchDraftHref).includes("完成「二改」证据"));
    assert.equal(project.acceptanceSheetGate.href, "/projects#pipeline-projects");
    assert.equal(project.nextAction, project.acceptanceSheetGate.actionLabel);
    assert.equal(project.href, project.acceptanceSheetGate.href);
    assert.equal(acceptanceItem?.status, "block");
    assert.ok(acceptanceItem?.detail.includes("验收缺二改"));
    assert.equal(gate.priorityActions[0].id, "project-acceptance:project-acceptance-blocked");
    assert.equal(gate.priorityActions[0].label, project.acceptanceSheetGate.actionLabel);
    assert.ok(gate.priorityActions[0].detail.includes("可一键修复"));
    assert.equal(gate.priorityActions[0].href, "/projects#pipeline-projects");
    assert.equal(gate.priorityActions[0].execution?.type, "publish_repair");
    assert.equal(gate.priorityActions[0].execution?.kind, "run_second_pass");
  });

  await t.test("marks acceptance dispatch receipt blockers as manual evidence repair", () => {
    const gate = buildPrePublishGate({
      projects: [{
        ...readyProject,
        id: "project-dispatch-receipt-blocked",
        title: "验收缺派单回执",
        aiTasks: [
          passedReviews[0],
          passedSecondPasses[0],
        ],
        gateDispatchTasks: [],
      }],
      failureTasks: [],
      batchHistory: [],
    });
    const project = gate.projectStatuses[0];

    assert.equal(project.acceptanceSheetGate.status, "block");
    assert.equal(project.acceptanceSheetGate.currentStepId, "dispatch_receipt");
    assert.equal(project.acceptanceSheetGate.repairMode, "dispatch");
    assert.ok(project.acceptanceSheetGate.executionHint.includes("派单中心"));
    assert.equal(project.acceptanceSheetGate.runbookStep.stepId, "task_dispatch");
    assert.ok(project.acceptanceSheetGate.runbookStep.proofToCapture.includes("派单回执"));
    assert.equal(project.acceptanceSheetGate.href, "/dispatch?firstDayProject=project-dispatch-receipt-blocked&step=publish-precheck#first-day-dispatch");
    assert.equal(gate.priorityActions[0].id, "project-acceptance:project-dispatch-receipt-blocked");
    assert.ok(gate.priorityActions[0].detail.includes("派单中心"));
    assert.equal(gate.priorityActions[0].execution, null);
  });

  await t.test("focuses first-day completion blockers before release", () => {
    const gate = buildPrePublishGate({
      projects: [handoffBlockedProject],
      failureTasks: [],
      batchHistory: [],
    });
    const notice = buildPrePublishGateFocusNotice({
      focus: "first-day-complete",
      gate,
    });

    assert.equal(notice.visible, true);
    assert.equal(notice.tone, "blocked");
    assert.equal(notice.headline, "首日放行仍被阻塞");
    assert.ok(notice.detail.includes("开书交接证据"));
    assert.equal(notice.primaryLabel, "先解除阻塞：补交接验收");
    assert.equal(notice.primaryHref, "/dispatch?firstDayProject=project-handoff-blocked&step=publish-precheck#first-day-dispatch");
    assert.ok(notice.badges.includes("先补首日证据"));
  });

  await t.test("blocks launch when export version center detects baseline regression", () => {
    const gate = buildPrePublishGate({
      projects: [{
        ...readyProject,
        exportPackageSnapshots: [
          exportSnapshot({
            id: "latest-regressed",
            readinessPercent: 82,
            chapterCount: 2,
            wordCount: 6000,
            contentHash: "b".repeat(64),
            createdAt: "2026-07-05T05:00:00.000Z",
          }),
          exportSnapshot({
            id: "locked-baseline",
            isBaseline: true,
            baselineLockedAt: "2026-07-05T04:00:00.000Z",
            readinessPercent: 92,
            chapterCount: 3,
            wordCount: 9000,
            contentHash: "a".repeat(64),
            createdAt: "2026-07-05T04:00:00.000Z",
          }),
        ],
      }],
      failureTasks: [],
      batchHistory: [],
    });
    const exportItem = gate.items.find((item) => item.id === "export-version");

    assert.equal(gate.status, "blocked");
    assert.equal(gate.projectStatuses[0].status, "needs_repair");
    assert.equal(gate.projectStatuses[0].downloadHref, null);
    assert.equal(gate.projectStatuses[0].exportVersionGate.status, "block");
    assert.equal(gate.projectStatuses[0].exportVersionGate.decisionStatus, "risk");
    assert.deepEqual(gate.projectStatuses[0].exportVersionGate.repairActions.map((action) => action.label), [
      "重导最新包",
      "保留旧基准",
      "打开版本中心",
    ]);
    assert.ok(gate.projectStatuses[0].exportVersionGate.repairActions[0].href.endsWith("#export-history"));
    assert.deepEqual(gate.projectStatuses[0].exportVersionGate.repairActions[0].execution, {
      type: "regenerate_snapshot",
      snapshotId: "latest-regressed",
    });
    assert.ok(gate.projectStatuses[0].exportVersionGate.repairActions[1].href.endsWith("#export-baseline-timeline"));
    assert.equal(gate.projectStatuses[0].exportVersionGate.repairActions[1].execution, null);
    assert.equal(gate.projectStatuses[0].href, "/projects/project-ready/exports");
    assert.equal(exportItem?.status, "block");
    assert.ok(exportItem?.detail.includes("回退风险"));
    assert.equal(gate.releaseAction?.href, "/projects/project-ready/exports");
  });

  await t.test("surfaces export version receipts for gate recheck", () => {
    const gate = buildPrePublishGate({
      projects: [{
        ...readyProject,
        gateActionAudits: [
          ...finalDeliveryAudits("project-ready"),
          {
          actionId: "export-version:project-ready:regenerate_snapshot",
          executionType: "export_version",
          status: "succeeded",
          succeededCount: 1,
          failedCount: 0,
          taskId: "latest-regressed",
          platformId: "export_version",
          label: "重导最新包",
          message: "夜雨系统 已按导出快照重新生成。",
          createdAt: "2026-07-05T05:05:00.000Z",
          },
        ],
        exportPackageSnapshots: [
          exportSnapshot({
            id: "latest-regressed",
            readinessPercent: 82,
            chapterCount: 2,
            wordCount: 6000,
            contentHash: "b".repeat(64),
            createdAt: "2026-07-05T05:00:00.000Z",
          }),
          exportSnapshot({
            id: "locked-baseline",
            isBaseline: true,
            baselineLockedAt: "2026-07-05T04:00:00.000Z",
            readinessPercent: 92,
            chapterCount: 3,
            wordCount: 9000,
            contentHash: "a".repeat(64),
            createdAt: "2026-07-05T04:00:00.000Z",
          }),
        ],
      }],
      failureTasks: [],
      batchHistory: [],
    });
    const receiptReview = gate.projectStatuses[0].exportVersionGate.receiptReview;

    assert.equal(receiptReview.status, "handled");
    assert.equal(receiptReview.label, "重导最新包");
    assert.equal(receiptReview.actionLabel, "复检总闸门");
    assert.equal(receiptReview.href, "/gate#gate-export-package");
    assert.ok(receiptReview.detail.includes("重新生成"));
  });

  await t.test("warns launch when export version center recommends replacing baseline", () => {
    const gate = buildPrePublishGate({
      projects: [{
        ...readyProject,
        exportPackageSnapshots: [
          exportSnapshot({
            id: "latest-better",
            readinessPercent: 96,
            chapterCount: 4,
            wordCount: 12000,
            contentHash: "b".repeat(64),
            createdAt: "2026-07-05T05:00:00.000Z",
          }),
          exportSnapshot({
            id: "locked-baseline",
            isBaseline: true,
            baselineLockedAt: "2026-07-05T04:00:00.000Z",
            readinessPercent: 88,
            chapterCount: 3,
            wordCount: 9000,
            contentHash: "a".repeat(64),
            createdAt: "2026-07-05T04:00:00.000Z",
          }),
        ],
      }],
      failureTasks: [],
      batchHistory: [],
    });
    const exportItem = gate.items.find((item) => item.id === "export-version");

    assert.equal(gate.status, "needs_repair");
    assert.equal(gate.projectStatuses[0].status, "ready");
    assert.ok(gate.projectStatuses[0].downloadHref);
    assert.equal(gate.projectStatuses[0].exportVersionGate.status, "warn");
    assert.equal(gate.projectStatuses[0].exportVersionGate.decisionStatus, "replace");
    assert.equal(gate.projectStatuses[0].exportVersionGate.repairActions[0].label, "替换为新基准");
    assert.ok(gate.projectStatuses[0].exportVersionGate.repairActions[0].href.endsWith("#export-baseline-decision"));
    assert.deepEqual(gate.projectStatuses[0].exportVersionGate.repairActions[0].execution, {
      type: "lock_baseline",
      snapshotId: "latest-better",
    });
    assert.equal(exportItem?.status, "warn");
  });

  await t.test("blocks launch while first-three adoption follow-ups are unfinished", () => {
    const gate = buildPrePublishGate({
      projects: [{
        ...readyProject,
        gateDispatchTasks: [
          ...firstDayCompleteDispatches("project-ready"),
          {
            dispatchKey: "first-three-adoption:project-ready:chapter-1:revision-1:review",
            state: "assigned",
            completionEvidence: "",
            title: "第 1 章采纳后重新审稿",
            detail: "采纳后的新正文需要重新审稿。",
            actionLabel: "重新审稿",
            href: "/projects/project-ready/chapters/chapter-1#chapter-workflow",
          },
          {
            dispatchKey: "first-three-adoption:project-ready:chapter-1:revision-1:publish-check",
            platformId: "fanqie",
            state: "queued",
            completionEvidence: "",
            title: "第 1 章采纳后发布质检",
            detail: "重新审稿后回发布包刷新质检。",
            actionLabel: "回发布质检",
            href: "/projects/project-ready#platform-export",
          },
        ],
      }],
      failureTasks: [],
      batchHistory: [],
    });
    const adoptionItem = gate.items.find((item) => item.id === "first-three-adoption-loop");

    assert.equal(gate.status, "blocked");
    assert.equal(gate.firstThreeAdoptionClosure.status, "block");
    assert.equal(gate.firstThreeAdoptionClosure.total, 2);
    assert.equal(gate.firstThreeAdoptionClosure.pending, 2);
    assert.equal(gate.firstThreeAdoptionClosure.reviewPending, 1);
    assert.equal(gate.firstThreeAdoptionClosure.publishPending, 1);
    assert.equal(gate.firstThreeAdoptionClosure.executableReviewCount, 1);
    assert.equal(gate.firstThreeAdoptionClosure.executablePublishCheckCount, 1);
    assert.equal(gate.firstThreeAdoptionClosure.repairQueue.length, 2);
    assert.equal(gate.firstThreeAdoptionClosure.repairQueue[0].followupItemId, "first-three-adoption:project-ready:chapter-1:revision-1:review");
    assert.equal(gate.firstThreeAdoptionClosure.repairQueue[0].actionLabel, "重新审稿");
    assert.ok(gate.firstThreeAdoptionClosure.repairQueue[0].detail.includes("旧审稿不能继续当发布通行证"));
    assert.equal(gate.firstThreeAdoptionClosure.repairQueue[1].actionLabel, "回发布质检");
    assert.equal(gate.firstThreeAdoptionClosure.items[0].href, "/projects/project-ready/chapters/chapter-1#chapter-workflow");
    assert.deepEqual(gate.firstThreeAdoptionClosure.items[0].execution, { type: "chapter_review", chapterId: "chapter-1" });
    assert.deepEqual(gate.firstThreeAdoptionClosure.items[1].execution, { type: "publish_check", projectId: "project-ready", platformId: "fanqie" });
    assert.equal(gate.firstThreeAdoptionClosure.timelines.length, 1);
    assert.equal(gate.firstThreeAdoptionClosure.timelines[0].status, "block");
    assert.deepEqual(gate.firstThreeAdoptionClosure.timelines[0].steps.map((step) => step.status), ["pass", "block", "block", "waiting"]);
    assert.deepEqual(gate.firstThreeAdoptionClosure.timelines[0].steps.map((step) => step.followupItemId), [
      null,
      "first-three-adoption:project-ready:chapter-1:revision-1:review",
      "first-three-adoption:project-ready:chapter-1:revision-1:publish-check",
      null,
    ]);
    assert.equal(gate.firstThreeAdoptionClosure.timelines[0].nextActionLabel, "重新审稿");
    assert.equal(adoptionItem?.status, "block");
    assert.ok(adoptionItem?.detail.includes("正文变更后不能沿用旧审稿"));
    assert.ok(adoptionItem?.detail.includes("下一条：夜雨系统 · 第 1 章采纳后重新审稿"));
    assert.equal(adoptionItem?.href, "/projects/project-ready/chapters/chapter-1#chapter-workflow");
    assert.ok(gate.priorityActions.some((action) => action.id.includes(":review") && action.label === "重新审稿"));
    assert.equal(gate.priorityActions[0].id, "adoption-followup:first-three-adoption:project-ready:chapter-1:revision-1:review");
    assert.deepEqual(gate.priorityActions[0].execution, {
      type: "first_three_adoption",
      itemId: "first-three-adoption:project-ready:chapter-1:revision-1:review",
      title: "第 1 章采纳后重新审稿",
      execution: { type: "chapter_review", chapterId: "chapter-1" },
    });
    assert.equal(gate.releaseAction?.label, "先解除阻塞：重新审稿");
  });

  await t.test("blocks launch while ordinary chapter adoption follow-ups are unfinished", () => {
    const gate = buildPrePublishGate({
      projects: [{
        ...readyProject,
        gateDispatchTasks: [
          ...firstDayCompleteDispatches("project-ready"),
          {
            dispatchKey: "chapter-adoption:project-ready:chapter-4:revision-draft:review",
            state: "completed",
            completionEvidence: "采纳后重新审稿已完成：第 4 章《追杀反转》，审稿分 89，问题 1 个。",
            title: "第 4 章采纳后重新审稿",
            detail: "采纳后的新正文需要重新审稿。",
            actionLabel: "重新审稿",
            href: "/projects/project-ready/chapters/chapter-4#chapter-workflow",
          },
          {
            dispatchKey: "chapter-adoption:project-ready:chapter-4:revision-draft:second-pass",
            state: "assigned",
            completionEvidence: "",
            title: "第 4 章采纳后启动二改",
            detail: "按采纳后审稿问题启动二改。",
            actionLabel: "启动二改",
            href: "/projects/project-ready/chapters/chapter-4#chapter-second-pass",
          },
          {
            dispatchKey: "chapter-adoption:project-ready:chapter-4:revision-second-pass:publish-check",
            platformId: "fanqie",
            state: "queued",
            completionEvidence: "",
            title: "第 4 章采纳后发布质检",
            detail: "二改采纳后回发布包刷新质检。",
            actionLabel: "回发布质检",
            href: "/projects/project-ready#platform-export",
          },
        ],
      }],
      failureTasks: [],
      batchHistory: [],
    });
    const adoptionItem = gate.items.find((item) => item.id === "first-three-adoption-loop");
    const notice = buildPrePublishGateFocusNotice({
      focus: "action-recheck",
      actionId: "project-acceptance:project-ready",
      gate,
    });

    assert.equal(gate.status, "blocked");
    assert.equal(gate.firstThreeAdoptionClosure.total, 3);
    assert.equal(gate.firstThreeAdoptionClosure.completed, 1);
    assert.equal(gate.firstThreeAdoptionClosure.pending, 2);
    assert.equal(gate.firstThreeAdoptionClosure.repairQueue[0].followupItemId, "chapter-adoption:project-ready:chapter-4:revision-draft:second-pass");
    assert.equal(gate.firstThreeAdoptionClosure.repairQueue[0].actionLabel, "启动二改");
    assert.deepEqual(gate.firstThreeAdoptionClosure.timelines[0].steps.map((step) => step.label), ["候选已采纳", "重新审稿", "启动二改", "发布质检", "发布放行"]);
    assert.deepEqual(gate.firstThreeAdoptionClosure.timelines[0].steps.map((step) => step.status), ["pass", "pass", "block", "waiting", "waiting"]);
    assert.equal(gate.firstThreeAdoptionClosure.timelines[0].nextActionLabel, "启动二改");
    assert.ok(adoptionItem?.detail.includes("下一条：夜雨系统 · 第 4 章采纳后启动二改"));
    assert.equal(notice.recheckSummary?.firstThreeAdoptionProgress?.totalTimelines, 1);
    assert.equal(notice.recheckSummary?.firstThreeAdoptionProgress?.lanes[0]?.nextActionLabel, "启动二改");
  });

  await t.test("adds executable gate action for adoption publish checks", () => {
    const gate = buildPrePublishGate({
      projects: [{
        ...readyProject,
        gateDispatchTasks: [
          ...firstDayCompleteDispatches("project-ready"),
          {
            dispatchKey: "first-three-adoption:project-ready:chapter-1:revision-1:review",
            state: "completed",
            completionEvidence: "采纳后重新审稿已完成：审稿分 91，问题 0 个。",
          },
          {
            dispatchKey: "first-three-adoption:project-ready:chapter-1:revision-1:publish-check",
            platformId: "fanqie",
            state: "assigned",
            completionEvidence: "",
            title: "第 1 章采纳后发布质检",
            detail: "重新审稿后回发布包刷新质检。",
            actionLabel: "回发布质检",
            href: "/projects/project-ready#platform-export",
          },
        ],
      }],
      failureTasks: [],
      batchHistory: [],
    });

    assert.equal(gate.priorityActions[0].label, "回发布质检");
    assert.deepEqual(gate.priorityActions[0].execution, {
      type: "first_three_adoption",
      itemId: "first-three-adoption:project-ready:chapter-1:revision-1:publish-check",
      title: "第 1 章采纳后发布质检",
      execution: { type: "publish_check", projectId: "project-ready", platformId: "fanqie" },
    });
  });

  await t.test("passes launch gate after first-three adoption review and publish check are closed", () => {
    const gate = buildPrePublishGate({
      projects: [{
        ...readyProject,
        gateDispatchTasks: [
          ...firstDayCompleteDispatches("project-ready"),
          {
            dispatchKey: "first-three-adoption:project-ready:chapter-1:revision-1:review",
            state: "completed",
            completionEvidence: "采纳后重新审稿已完成：第 1 章《第1夜》，任务 review-1，审稿分 91，问题 0 个。",
          },
          {
            dispatchKey: "first-three-adoption:project-ready:chapter-1:revision-1:publish-check",
            state: "completed",
            completionEvidence: "采纳后发布质检已刷新：番茄小说 发布包版本 snapshot-1，质检 92 分，可导出。",
          },
        ],
      }],
      failureTasks: [],
      batchHistory: [],
    });
    const adoptionItem = gate.items.find((item) => item.id === "first-three-adoption-loop");

    assert.equal(gate.status, "ready");
    assert.equal(gate.firstThreeAdoptionClosure.status, "pass");
    assert.equal(gate.firstThreeAdoptionClosure.completed, 2);
    assert.equal(gate.firstThreeAdoptionClosure.repairQueue.length, 0);
    assert.equal(gate.firstThreeAdoptionClosure.items[1].evidence.includes("发布质检已刷新"), true);
    assert.deepEqual(gate.firstThreeAdoptionClosure.timelines[0].steps.map((step) => step.status), ["pass", "pass", "pass", "pass"]);
    assert.equal(gate.firstThreeAdoptionClosure.timelines[0].completedSteps, 4);
    assert.equal(gate.firstThreeAdoptionClosure.timelines[0].nextActionLabel, "刷新总闸门");
    assert.equal(adoptionItem?.status, "pass");
    assert.ok(adoptionItem?.detail.includes("已验收 2 个采纳后续任务"));
    assert.ok(gate.items.every((item) => item.status === "pass"));
  });

  await t.test("uses recommended batch receipts as first-three adoption closure evidence", () => {
    const reviewDispatchKey = "first-three-adoption:project-ready:chapter-1:revision-1:review";
    const gate = buildPrePublishGate({
      projects: [{
        ...readyProject,
        gateDispatchTasks: [
          ...firstDayCompleteDispatches("project-ready"),
          {
            dispatchKey: reviewDispatchKey,
            state: "assigned",
            completionEvidence: "",
            title: "第 1 章采纳后重新审稿",
            detail: "采纳后的新正文需要重新审稿。",
            actionLabel: "重新审稿",
            href: "/projects/project-ready/chapters/chapter-1#chapter-workflow",
          },
          {
            dispatchKey: "first-three-adoption:project-ready:chapter-1:revision-1:publish-check",
            state: "completed",
            completionEvidence: "采纳后发布质检已刷新：番茄小说 发布包版本 snapshot-1，质检 92 分，可导出。",
          },
        ],
        gateActionAudits: [
          ...finalDeliveryAudits("project-ready"),
          {
          actionId: "recommended-batch:standard:review:project-ready",
          executionType: "recommended_batch",
          status: "succeeded",
          succeededCount: 1,
          failedCount: 0,
          taskId: "review-task-1",
          platformId: "fanqie",
          label: "沉淀批量审稿 1 个经验",
          message: "推荐批次完成：成功 1，失败 0。",
          createdAt: "2026-01-09T00:00:00.000Z",
          payload: JSON.stringify({
            plan: {
              actionLabel: "批量审稿 1 个",
              category: "review",
              adoptionFollowupCount: 1,
              adoptionFollowupItemIds: [`project-ready:adoption-followup:${reviewDispatchKey}`],
            },
            results: [{ status: "succeeded", taskId: "review-task-1", chapterId: "chapter-1" }],
            routeEffectSummary: { successRatePercent: 100, knownCostUsd: 0.01, averageQualityScore: 91 },
            batchReceipt: { status: "continue", headline: "采纳闭环批量审稿通过" },
          }),
          },
        ],
      }],
      failureTasks: [],
      batchHistory: [],
    });
    const reviewItem = gate.firstThreeAdoptionClosure.items.find((item) => item.id === reviewDispatchKey);

    assert.equal(gate.status, "ready");
    assert.equal(gate.firstThreeAdoptionClosure.status, "pass");
    assert.equal(gate.firstThreeAdoptionClosure.receiptEvidence, 1);
    assert.equal(reviewItem?.status, "pass");
    assert.ok(reviewItem?.evidence.includes("任务中心批量回执已验收"));
    assert.ok(gate.firstThreeAdoptionClosure.detail.includes("1 个来自任务中心批量回执"));
  });

  await t.test("keeps failed recommended batch receipts in the adoption repair queue", () => {
    const reviewDispatchKey = "first-three-adoption:project-ready:chapter-1:revision-1:review";
    const gate = buildPrePublishGate({
      projects: [{
        ...readyProject,
        gateDispatchTasks: [
          ...firstDayCompleteDispatches("project-ready"),
          {
            dispatchKey: reviewDispatchKey,
            state: "assigned",
            completionEvidence: "",
            title: "第 1 章采纳后重新审稿",
            detail: "采纳后的新正文需要重新审稿。",
            actionLabel: "重新审稿",
            href: "/projects/project-ready/chapters/chapter-1#chapter-workflow",
          },
          {
            dispatchKey: "first-three-adoption:project-ready:chapter-1:revision-1:publish-check",
            state: "completed",
            completionEvidence: "采纳后发布质检已刷新：番茄小说 发布包版本 snapshot-1，质检 92 分，可导出。",
          },
        ],
        gateActionAudits: [
          ...finalDeliveryAudits("project-ready"),
          {
          actionId: "recommended-batch:standard:review:project-ready",
          executionType: "recommended_batch",
          status: "failed",
          succeededCount: 0,
          failedCount: 1,
          taskId: "review-task-1",
          platformId: "fanqie",
          label: "沉淀批量审稿 1 个经验",
          message: "推荐批次完成：成功 0，失败 1。",
          createdAt: "2026-01-09T00:00:00.000Z",
          payload: JSON.stringify({
            plan: {
              actionLabel: "批量审稿 1 个",
              category: "review",
              adoptionFollowupCount: 1,
              adoptionFollowupItemIds: [`project-ready:adoption-followup:${reviewDispatchKey}`],
            },
            results: [{
              status: "failed",
              taskId: "review-task-1",
              chapterId: "chapter-1",
              chapterTitle: "第 1 章采纳后重新审稿",
              error: "模型超时",
            }],
            routeEffectSummary: { successRatePercent: 0, knownCostUsd: 0.01, averageQualityScore: null },
            batchReceipt: { status: "repair", headline: "批次有失败，先修再放大" },
          }),
          },
        ],
      }],
      failureTasks: [],
      batchHistory: [],
    });
    const reviewItem = gate.firstThreeAdoptionClosure.items.find((item) => item.id === reviewDispatchKey);
    const repair = gate.firstThreeAdoptionClosure.repairQueue[0];

    assert.equal(gate.status, "blocked");
    assert.equal(gate.firstThreeAdoptionClosure.status, "block");
    assert.equal(reviewItem?.status, "block");
    assert.ok(reviewItem?.evidence.includes("任务中心批量回执失败"));
    assert.ok(repair.detail.includes("模型超时"));
    assert.equal(repair.actionLabel, "重试/切模型");
    assert.equal(repair.href, "/settings/models");
    assert.equal(gate.priorityActions[0].execution, null);
    assert.equal(gate.releaseAction?.label, "先解除阻塞：重试/切模型");
  });

  await t.test("routes weak adoption batch quality to second pass repair", () => {
    const reviewDispatchKey = "first-three-adoption:project-ready:chapter-1:revision-1:review";
    const gate = buildPrePublishGate({
      projects: [{
        ...readyProject,
        gateDispatchTasks: [
          ...firstDayCompleteDispatches("project-ready"),
          {
            dispatchKey: reviewDispatchKey,
            state: "assigned",
            completionEvidence: "",
            title: "第 1 章采纳后重新审稿",
            detail: "采纳后的新正文需要重新审稿。",
            actionLabel: "重新审稿",
            href: "/projects/project-ready/chapters/chapter-1#chapter-workflow",
          },
          {
            dispatchKey: "first-three-adoption:project-ready:chapter-1:revision-1:publish-check",
            state: "completed",
            completionEvidence: "采纳后发布质检已刷新：番茄小说 发布包版本 snapshot-1，质检 92 分，可导出。",
          },
        ],
        gateActionAudits: [
          ...finalDeliveryAudits("project-ready"),
          {
          actionId: "recommended-batch:standard:review:project-ready",
          executionType: "recommended_batch",
          status: "succeeded",
          succeededCount: 1,
          failedCount: 0,
          taskId: "review-task-1",
          platformId: "fanqie",
          label: "沉淀批量审稿 1 个经验",
          message: "推荐批次完成：成功 1，失败 0。",
          createdAt: "2026-01-09T00:00:00.000Z",
          payload: JSON.stringify({
            plan: {
              actionLabel: "批量审稿 1 个",
              category: "review",
              adoptionFollowupCount: 1,
              adoptionFollowupItemIds: [`project-ready:adoption-followup:${reviewDispatchKey}`],
            },
            results: [{
              status: "succeeded",
              taskId: "review-task-1",
              chapterId: "chapter-1",
              chapterTitle: "第 1 章采纳后重新审稿",
            }],
            routeEffectSummary: { successRatePercent: 100, knownCostUsd: 0.01, averageQualityScore: 72 },
            batchReceipt: { status: "review_quality", headline: "质量不够，先二改或复审" },
          }),
          },
        ],
      }],
      failureTasks: [],
      batchHistory: [],
    });
    const repair = gate.firstThreeAdoptionClosure.repairQueue[0];

    assert.equal(gate.status, "blocked");
    assert.equal(repair.actionLabel, "进入二改");
    assert.equal(repair.href, "/projects/project-ready/chapters/chapter-1#chapter-second-pass");
    assert.ok(repair.detail.includes("先执行二改"));
    assert.equal(gate.priorityActions[0].execution, null);
  });

  await t.test("routes failed adoption publish checks to package repair", () => {
    const publishDispatchKey = "first-three-adoption:project-ready:chapter-1:revision-1:publish-check";
    const gate = buildPrePublishGate({
      projects: [{
        ...readyProject,
        gateDispatchTasks: [
          ...firstDayCompleteDispatches("project-ready"),
          {
            dispatchKey: "first-three-adoption:project-ready:chapter-1:revision-1:review",
            state: "completed",
            completionEvidence: "采纳后重新审稿已完成：审稿分 91，问题 0 个。",
          },
          {
            dispatchKey: publishDispatchKey,
            platformId: "fanqie",
            state: "assigned",
            completionEvidence: "",
            title: "第 1 章采纳后发布质检",
            detail: "重新审稿后回发布包刷新质检。",
            actionLabel: "回发布质检",
            href: "/projects/project-ready#platform-export",
          },
        ],
        gateActionAudits: [
          ...finalDeliveryAudits("project-ready"),
          {
          actionId: "recommended-batch:standard:export:project-ready",
          executionType: "recommended_batch",
          status: "failed",
          succeededCount: 0,
          failedCount: 1,
          taskId: "publish-task-1",
          platformId: "fanqie",
          label: "沉淀批量发布质检 1 个经验",
          message: "推荐批次完成：成功 0，失败 1。",
          createdAt: "2026-01-09T00:00:00.000Z",
          payload: JSON.stringify({
            plan: {
              actionLabel: "批量发布质检 1 个",
              category: "review",
              adoptionFollowupCount: 1,
              adoptionFollowupItemIds: [`project-ready:adoption-followup:${publishDispatchKey}`],
            },
            results: [{
              status: "failed",
              taskId: "publish-task-1",
              chapterId: "chapter-1",
              chapterTitle: "第 1 章采纳后发布质检",
              error: "发布包标题缺失",
            }],
            routeEffectSummary: { successRatePercent: 0, knownCostUsd: 0.01, averageQualityScore: null },
            batchReceipt: { status: "repair", headline: "批次有失败，先修再放大" },
          }),
          },
        ],
      }],
      failureTasks: [],
      batchHistory: [],
    });
    const repair = gate.firstThreeAdoptionClosure.repairQueue[0];

    assert.equal(gate.status, "blocked");
    assert.equal(repair.actionLabel, "修发布包");
    assert.equal(repair.href, "/projects/project-ready#platform-export");
    assert.ok(repair.detail.includes("回发布包修复"));
  });

  await t.test("surfaces missing adoption evidence as the next gate repair", () => {
    const gate = buildPrePublishGate({
      projects: [{
        ...readyProject,
        gateDispatchTasks: [
          ...firstDayCompleteDispatches("project-ready"),
          {
            dispatchKey: "first-three-adoption:project-ready:chapter-1:revision-1:review",
            state: "completed",
            completionEvidence: "",
            title: "第 1 章采纳后重新审稿",
            detail: "采纳后的新正文需要重新审稿。",
            actionLabel: "重新审稿",
            href: "/projects/project-ready/chapters/chapter-1#chapter-workflow",
          },
        ],
      }],
      failureTasks: [],
      batchHistory: [],
    });
    const adoptionItem = gate.items.find((item) => item.id === "first-three-adoption-loop");

    assert.equal(gate.status, "needs_repair");
    assert.equal(gate.firstThreeAdoptionClosure.status, "warn");
    assert.equal(gate.firstThreeAdoptionClosure.repairQueue[0].actionLabel, "补验收证据");
    assert.equal(adoptionItem?.actionLabel, "补验收证据");
    assert.ok(adoptionItem?.detail.includes("下一条：夜雨系统 · 第 1 章采纳后重新审稿"));
    assert.ok(adoptionItem?.detail.includes("验收证据不足"));
  });

  await t.test("blocks launch when publish package and failed tasks are unresolved", () => {
    const gate = buildPrePublishGate({
      projects: [blockedProject],
      failureTasks: [
        {
          id: "failed-1",
          projectId: "project-blocked",
          taskType: "chapter_review",
          model: "claude-sonnet",
          status: "failed",
          errorMessage: "401 unauthorized api key",
          createdAt: "2026-01-08T00:00:00.000Z",
          project: { title: "夜雨系统" },
          chapter: { title: "第一章" },
          modelProvider: { providerId: "anthropic", displayName: "Claude" },
        },
        {
          id: "failed-2",
          projectId: "project-blocked",
          taskType: "chapter_review",
          model: "deepseek-chat",
          status: "failed",
          errorMessage: "request timeout",
          createdAt: "2026-01-08T00:01:00.000Z",
          project: { title: "夜雨系统" },
          chapter: { title: "第二章" },
          modelProvider: { providerId: "deepseek", displayName: "DeepSeek" },
        },
      ],
      batchHistory: [],
    });

    assert.equal(gate.status, "blocked");
    assert.equal(gate.label, "暂不发布");
    assert.equal(gate.overview.readyPackages, 0);
    assert.equal(gate.overview.failureTasks, 2);
    assert.ok(gate.items.some((item) => item.id === "publish-package" && item.status === "block"));
    assert.ok(gate.items.some((item) => item.id === "ai-failures" && item.status === "block"));
    assert.ok(gate.priorityActions.some((action) => action.execution?.type === "publish_repair"));
    assert.ok(gate.priorityActions.some((action) => action.execution?.type === "retry_task" && action.execution.taskId === "failed-2"));
    assert.ok(gate.priorityActions.some((action) => action.href === "/failures"));
  });

  await t.test("routes unresolved model failures through the global repair batch", () => {
    const gate = buildPrePublishGate({
      projects: [readyProject],
      failureTasks: [
        {
          id: "config-failure",
          projectId: "project-ready",
          chapterId: "chapter-1",
          taskType: "chapter_review",
          model: "deepseek-chat",
          status: "failed",
          errorMessage: "API key missing",
          createdAt: "2026-01-08T00:00:00.000Z",
          project: { title: "夜雨系统" },
          chapter: { title: "第1夜" },
          modelProvider: { providerId: "deepseek", displayName: "DeepSeek" },
        },
        {
          id: "timeout-failure",
          projectId: "project-ready",
          chapterId: "chapter-2",
          taskType: "chapter_draft",
          model: "mock-writer",
          status: "failed",
          errorMessage: "Model request failed: 503 provider timeout",
          createdAt: "2026-01-08T00:01:00.000Z",
          project: { title: "夜雨系统" },
          chapter: { title: "第2夜" },
          modelProvider: { providerId: "mock", displayName: "Mock" },
        },
      ],
      batchHistory: [],
    });
    const failureItem = gate.items.find((item) => item.id === "ai-failures");

    assert.equal(gate.failureRepairBatch.status, "fix_config");
    assert.equal(gate.failureRepairBatch.summary.configFailures, 1);
    assert.equal(gate.failureRepairBatch.summary.retryableFailures, 1);
    assert.equal(failureItem?.status, "block");
    assert.equal(failureItem?.actionLabel, "去模型设置");
    assert.equal(failureItem?.href, "/settings/models");
    assert.match(failureItem?.detail ?? "", /先修配置/);
    assert.ok(gate.priorityActions.some((action) => action.id === "failure-repair-batch" && action.href === "/settings/models"));
    assert.ok(gate.priorityActions.some((action) => action.execution?.type === "retry_task" && action.execution.taskId === "timeout-failure"));
  });

  await t.test("summarizes publish effect metrics for launch review", () => {
    const gate = buildPrePublishGate({
      projects: [{
        ...readyProject,
        platformPublishMetrics: [
          {
            platformId: "fanqie",
            platformName: "番茄小说",
            views: 1200,
            clicks: 120,
            favorites: 72,
            follows: 36,
            comments: 8,
            paidReads: 3,
            editorFeedback: "标题方向可继续放大。",
            contractStatus: "pending",
            publishUrl: "https://example.com/book",
            notes: "首轮投放",
            snapshotDate: "2026-01-10T00:00:00.000Z",
          },
        ],
      }],
      failureTasks: [],
      batchHistory: [],
    });
    const review = gate.projectStatuses[0].effectReview;

    assert.equal(review.status, "promising");
    assert.equal(review.label, "可放大");
    assert.equal(review.records, 1);
    assert.equal(review.totalViews, 1200);
    assert.equal(review.clickRatePercent, 10);
    assert.equal(review.favoriteRatePercent, 6);
    assert.equal(review.followRatePercent, 3);
    assert.ok(review.verdict.includes("可追"));
    assert.ok(review.optimizationActions.some((action) => action.href === "/projects/project-ready#create-chapter"));
    assert.ok(review.optimizationActions.some((action) => action.execution === "open_target"));
  });

  await t.test("builds a closed-loop timeline from adopted assets, baselines, and publish effects", () => {
    const adoptedAsset = {
      id: "asset-version-1",
      platformId: "fanqie",
      platformName: "番茄小说",
      title: "夜雨系统：倒计时救人",
      logline: "林晚每次选择都在雨夜改命。",
      synopsis: "林晚被系统逼到绝境，必须用一次次高压选择翻盘。",
      overseasSynopsis: "A countdown system turns every rainy night into a life-or-death choice.",
      tags: ["系统", "都市", "逆袭"],
      note: "总闸门采纳",
      source: "ai_variant",
      auditScore: 92,
      auditStatus: "ready" as const,
      action: "adopt",
      sourceTaskId: "asset-optimize-1",
      strategy: "强钩子爽点版",
      createdAt: "2026-01-09T00:00:00.000Z",
    };
    const baseline = {
      id: "snapshot-1",
      platformId: "fanqie",
      platformName: "番茄小说",
      title: "夜雨系统",
      action: "snapshot",
      chapterCount: 3,
      wordCount: 7800,
      preflightScore: 92,
      canExport: true,
      createdAt: "2026-01-09T01:00:00.000Z",
    };
    const promisingMetric = {
      platformId: "fanqie",
      platformName: "番茄小说",
      views: 1200,
      clicks: 120,
      favorites: 72,
      follows: 36,
      comments: 8,
      paidReads: 3,
      editorFeedback: "标题方向可继续放大。",
      contractStatus: "pending",
      publishUrl: "https://example.com/book",
      notes: "首轮投放",
      snapshotDate: "2026-01-10T00:00:00.000Z",
    };

    const needsBaselineGate = buildPrePublishGate({
      projects: [{
        ...readyProject,
        submissionAssetVersions: [adoptedAsset],
      }],
      failureTasks: [],
      batchHistory: [],
    });
    assert.equal(needsBaselineGate.projectStatuses[0].loopTimeline.status, "needs_baseline");
    assert.ok(needsBaselineGate.projectStatuses[0].loopTimeline.items.some((item) => item.type === "asset"));
    assert.equal(needsBaselineGate.releaseAction?.label, "保存基准并下载");
    assert.equal(needsBaselineGate.releaseAction?.href, "#gate-export-package");
    assert.ok(needsBaselineGate.releaseAction?.detail.includes("保存当前发布包基准"));

    const scalingGate = buildPrePublishGate({
      projects: [{
        ...readyProject,
        submissionAssetVersions: [adoptedAsset],
        publishSnapshots: [baseline],
        platformPublishMetrics: [promisingMetric],
      }],
      failureTasks: [],
      batchHistory: [],
    });
    const timeline = scalingGate.projectStatuses[0].loopTimeline;

    assert.equal(timeline.status, "scaling");
    assert.deepEqual(timeline.items.map((item) => item.type), ["metric", "snapshot", "asset"]);
    assert.equal(timeline.actionHref, "/projects/project-ready#create-chapter");
  });

  await t.test("summarizes platform strategy across launch-gate projects", () => {
    const gate = buildPrePublishGate({
      projects: [
        {
          ...readyProject,
          platformPublishMetrics: [
            {
              platformId: "fanqie",
              platformName: "番茄小说",
              views: 1200,
              clicks: 120,
              favorites: 72,
              follows: 36,
              comments: 8,
              paidReads: 3,
              editorFeedback: "标题方向可继续放大。",
              contractStatus: "pending",
              publishUrl: "https://example.com/book",
              notes: "首轮投放",
              snapshotDate: "2026-01-10T00:00:00.000Z",
            },
          ],
        },
        {
          ...readyProject,
          id: "project-qimao-weak",
          targetPlatform: "qimao",
          gateDispatchTasks: firstDayCompleteDispatches("project-qimao-weak"),
          platformPublishMetrics: [
            {
              platformId: "qimao",
              platformName: "七猫",
              views: 1000,
              clicks: 20,
              favorites: 5,
              follows: 2,
              comments: 1,
              paidReads: 0,
              editorFeedback: "点击弱，前三章留存也弱。",
              contractStatus: "pending",
              publishUrl: "https://example.com/qimao-book",
              notes: "弱转化样本",
              snapshotDate: "2026-01-11T00:00:00.000Z",
            },
          ],
        },
      ],
      failureTasks: [],
      batchHistory: [],
    });
    const review = gate.strategyReview;
    const fanqie = review.platforms.find((item) => item.platformId === "fanqie");
    const qimao = review.platforms.find((item) => item.platformId === "qimao");

    assert.equal(review.totals.scale, 1);
    assert.equal(review.totals.repair, 1);
    assert.equal(review.primary?.platformId, "fanqie");
    assert.equal(fanqie?.recommendation, "scale");
    assert.equal(fanqie?.actionType, "open_target");
    assert.equal(fanqie?.href, "/projects/project-ready#create-chapter");
    assert.equal(qimao?.recommendation, "repair");
    assert.equal(qimao?.actionType, "rewrite_first_three");
    assert.equal(qimao?.actionLabel, "重写前三章");
    assert.ok(qimao?.nextAction.includes("先按弱项"));
  });

  await t.test("exposes executable second-round actions for weak publish effects", () => {
    const gate = buildPrePublishGate({
      projects: [{
        ...readyProject,
        platformPublishMetrics: [
          {
            platformId: "fanqie",
            platformName: "番茄小说",
            views: 1000,
            clicks: 20,
            favorites: 5,
            follows: 2,
            comments: 1,
            paidReads: 0,
            editorFeedback: "点击弱，前三章留存也弱。",
            contractStatus: "pending",
            publishUrl: "https://example.com/book",
            notes: "弱转化样本",
            snapshotDate: "2026-01-11T00:00:00.000Z",
          },
        ],
      }],
      failureTasks: [],
      batchHistory: [],
    });
    const actions = gate.projectStatuses[0].effectReview.optimizationActions;

    assert.equal(gate.projectStatuses[0].effectReview.status, "weak");
    assert.ok(actions.some((action) => action.execution === "generate_asset_variants"));
    assert.ok(actions.some((action) => action.execution === "rewrite_first_three"));
  });
});
