import assert from "node:assert/strict";
import test from "node:test";
import * as firstDayWorkflowView from "../lib/projects/firstDayWorkflowView.ts";
import {
  buildFirstDayDispatchCompletionTemplate,
  buildFirstDayDispatchDesk,
  buildFirstDayDispatchCompletionHint,
  buildFirstDayDispatchCardInlineAction,
  buildFirstDayDispatchUpdateSummary,
  buildFirstDayDispatchAiExecutionNotice,
  buildFirstDayExecutionRiskNotice,
  buildFirstDayExecutionReceiptFollowupPrompt,
  buildFirstDayExecutionSafetyBanner,
  buildFirstDayHandoffGateCta,
  buildFirstDayPostDispatchCompletionPrompt,
  buildFirstDayDispatchCenterHref,
  buildFirstDayReturnToAcceptanceHref,
  buildFirstDayReturnedEvidenceAcceptanceState,
  buildFirstDayRouteRepairReturnNotice,
  buildFirstDayReceiptCompletionAction,
  buildFirstDayReceiptCompletionEvidence,
  buildFirstDayStepView,
  completeFirstDayDispatchStep,
  resolveFirstDayDispatchFocus,
  validateFirstDayDispatchCompletionEvidence,
} from "../lib/projects/firstDayWorkflowView.ts";

test("buildFirstDayStepView separates task center acceptance evidence", () => {
  const view = buildFirstDayStepView({
    id: "skeleton",
    label: "搭建大树骨架",
    status: "done",
    owner: "策划",
    evidence: "0 个大纲节点，0 张章节卡。 任务中心已验收：首日骨架派单已完成，开头结尾主干分支土壤都已经复核。",
    instruction: "确认开头、结尾、主干、分支、叶片和土壤都已经生成。",
    actionLabel: "看项目总控",
    href: "/projects/project-1#project-control",
  });

  assert.equal(view.primaryEvidence, "0 个大纲节点，0 张章节卡。");
  assert.equal(view.acceptanceLabel, "任务中心验收");
  assert.equal(view.acceptanceEvidence, "首日骨架派单已完成，开头结尾主干分支土壤都已经复核。");
  assert.equal(view.hasTaskAcceptance, true);
});

test("buildFirstDayStepView keeps normal evidence unchanged", () => {
  const view = buildFirstDayStepView({
    id: "opening-hook",
    label: "确认开头钩子",
    status: "active",
    owner: "作者",
    evidence: "第一章：天降系统。钩子：主角被迫当天逆袭。",
    instruction: "补完整开头冲突。",
    actionLabel: "打开第一章",
    href: "/projects/project-1/chapters/chapter-1",
  });

  assert.equal(view.primaryEvidence, "第一章：天降系统。钩子：主角被迫当天逆袭。");
  assert.equal(view.acceptanceEvidence, null);
  assert.equal(view.hasTaskAcceptance, false);
});

test("buildFirstDayDispatchEvidenceChips surfaces handoff knowledge sources", () => {
  const chips = firstDayWorkflowView.buildFirstDayDispatchEvidenceChips({
    dispatchKey: "first-day-handoff:project-1:opening",
    dueLabel: "今天小样本验证",
    title: "夜雨系统 · 经验开书交接：开头打法",
    acceptanceCriteria: ["交接动作已落地：开头：第一段给倒计时。"],
    evidence: [
      "交接类型：复用交接",
      "知识来源：番茄小说 正反馈经验已沉淀",
      "平台反哺：执行正反馈链",
      "避坑边界：不要直接放量，先做小样本。",
    ],
    completionEvidence: "",
  });

  assert.ok(chips.some((chip) => chip.includes("知识来源：番茄小说")));
  assert.ok(chips.some((chip) => chip.includes("平台反哺")));
  assert.ok(chips.some((chip) => chip.includes("避坑")));
});

test("buildFirstDayReceiptCompletionAction only allows successful receipts with enough evidence", () => {
  const hidden = buildFirstDayReceiptCompletionAction({
    receipt: { success: false, completionEvidence: "" },
    completionEvidence: "",
    hasDispatch: true,
    isCompleting: false,
  });
  const missingDispatch = buildFirstDayReceiptCompletionAction({
    receipt: { success: true, completionEvidence: "第一章正文已生成并写回章节。" },
    completionEvidence: "第一章正文已生成并写回章节。",
    hasDispatch: false,
    isCompleting: false,
  });
  const thinEvidence = buildFirstDayReceiptCompletionAction({
    receipt: { success: true, completionEvidence: "已完成" },
    completionEvidence: "已完成",
    hasDispatch: true,
    isCompleting: false,
  });
  const ready = buildFirstDayReceiptCompletionAction({
    receipt: { success: true, completionEvidence: "第一章正文已生成并写回章节。" },
    completionEvidence: "第一章正文已生成并写回章节。",
    hasDispatch: true,
    isCompleting: false,
  });

  assert.equal(hidden.visible, false);
  assert.equal(missingDispatch.visible, true);
  assert.equal(missingDispatch.canComplete, false);
  assert.ok(missingDispatch.reason.includes("派到任务中心"));
  assert.equal(thinEvidence.canComplete, false);
  assert.ok(thinEvidence.reason.includes("至少 8 个字"));
  assert.equal(ready.visible, true);
  assert.equal(ready.canComplete, true);
  assert.equal(ready.label, "验收并进入下一步");
});

test("buildFirstDayReceiptCompletionEvidence derives an acceptance draft from AI receipts", () => {
  const direct = buildFirstDayReceiptCompletionEvidence({
    receipt: {
      success: true,
      summary: "第一章初稿已写回。",
      writeBackTarget: "第一章",
      nextAction: "检查正文后完成派单验收。",
      completionEvidence: "第一章正文已生成并写回，钩子和章末追读已按验收线检查。",
      detailItems: [],
    },
    fallbackEvidence: "套用模板。",
    currentEvidence: "",
  });
  const fallback = buildFirstDayReceiptCompletionEvidence({
    receipt: {
      success: true,
      summary: "人物和设定支撑已落库。",
      writeBackTarget: "作品资料",
      nextAction: "检查资料卡后完成派单验收。",
      completionEvidence: "",
      detailItems: [],
    },
    fallbackEvidence: "人物和设定支撑已生成并落库，可以进入第一章初稿。",
    currentEvidence: "",
  });
  const summarized = buildFirstDayReceiptCompletionEvidence({
    receipt: {
      success: true,
      summary: "第一章审稿已完成。",
      writeBackTarget: "AI 任务审稿记录",
      nextAction: "按审稿问题做二改。",
      completionEvidence: "",
      detailItems: [],
    },
    fallbackEvidence: "",
    currentEvidence: "",
  });
  const failed = buildFirstDayReceiptCompletionEvidence({
    receipt: {
      success: false,
      summary: "AI 执行未完成。",
      writeBackTarget: "未写回",
      nextAction: "修复模型路线后重试。",
      completionEvidence: "",
      detailItems: [],
    },
    fallbackEvidence: "不应使用的模板。",
    currentEvidence: "保留人工正在写的验收依据。",
  });

  assert.equal(direct, "第一章正文已生成并写回，钩子和章末追读已按验收线检查。");
  assert.equal(fallback, "人物和设定支撑已生成并落库，可以进入第一章初稿。");
  assert.ok(summarized.includes("第一章审稿已完成"));
  assert.ok(summarized.includes("写回：AI 任务审稿记录"));
  assert.equal(failed, "保留人工正在写的验收依据。");
});

test("buildFirstDayExecutionReceiptFollowupPrompt routes successful AI execution to dispatch acceptance", () => {
  const ready = buildFirstDayExecutionReceiptFollowupPrompt({
    receipt: {
      success: true,
      summary: "第一章初稿已写回：第一章 雨夜系统，当前 2200 字。",
      writeBackTarget: "第一章 雨夜系统",
      nextAction: "检查正文后完成派单验收，再进入第一章审稿。",
      completionEvidence: "第一章正文已生成并写回，钩子和章末追读已按验收线检查。",
      detailItems: [],
    },
    completionAction: {
      visible: true,
      canComplete: true,
      label: "验收并进入下一步",
      reason: "AI 回执已生成验收依据，可以直接验收当前首日派单。",
    },
    fallbackStepLabel: "第一章初稿",
  });
  const thinEvidence = buildFirstDayExecutionReceiptFollowupPrompt({
    receipt: {
      success: true,
      summary: "人物和设定支撑已落库。",
      writeBackTarget: "作品资料",
      nextAction: "检查资料卡后完成派单验收。",
      completionEvidence: "",
      detailItems: [],
    },
    completionAction: {
      visible: true,
      canComplete: false,
      label: "验收并进入下一步",
      reason: "验收依据至少 8 个字，先补齐证据。",
    },
    fallbackStepLabel: "人物设定支撑",
  });
  const failed = buildFirstDayExecutionReceiptFollowupPrompt({
    receipt: {
      success: false,
      summary: "AI 执行未完成：模型超时。",
      writeBackTarget: "未写回",
      nextAction: "修复模型路线、预算或素材问题后重试当前节点。",
      completionEvidence: "",
      detailItems: ["模型超时"],
    },
    completionAction: {
      visible: false,
      canComplete: false,
      label: "验收并进入下一步",
      reason: "",
    },
    fallbackStepLabel: "第一章初稿",
  });

  assert.equal(ready.message, "第一章初稿已写回：第一章 雨夜系统，当前 2200 字。 下一步：检查正文后完成派单验收，再进入第一章审稿。");
  assert.equal(ready.action, "complete_current_dispatch");
  assert.equal(ready.actionLabel, "验收并进入下一步");
  assert.equal(thinEvidence.action, undefined);
  assert.ok(thinEvidence.message.includes("验收依据至少 8 个字"));
  assert.equal(failed.action, undefined);
  assert.ok(failed.message.includes("修复模型路线、预算或素材问题后重试当前节点"));
});

test("buildFirstDayExecutionRiskNotice surfaces blocked and watch modes", () => {
  const blocked = buildFirstDayExecutionRiskNotice({
    riskLevel: "blocked",
    riskLabel: "复盘止损",
    riskPriorityBoost: 16,
    riskDueLabel: "今天止损验证",
    owner: "AI",
    acceptanceCriteria: ["写清恢复条件", "只验证一个变量"],
    missingEvidence: ["缺少恢复条件"],
  });
  const watch = buildFirstDayExecutionRiskNotice({
    riskLevel: "watch",
    riskLabel: "验收观察",
    riskPriorityBoost: 8,
    riskDueLabel: "今天小样本验证",
    owner: "作者",
    acceptanceCriteria: ["写清首轮通过线"],
    missingEvidence: ["缺少小样本口径"],
  });
  const standard = buildFirstDayExecutionRiskNotice({
    riskLevel: "standard",
    riskLabel: "标准",
    riskPriorityBoost: 0,
    riskDueLabel: "今天收口",
    owner: "AI",
    acceptanceCriteria: [],
    missingEvidence: [],
  });

  assert.equal(blocked.visible, true);
  assert.equal(blocked.headline, "止损验证模式");
  assert.ok(blocked.detail.includes("只验证恢复条件"));
  assert.ok(blocked.badges.includes("今天止损验证"));
  assert.ok(blocked.badges.includes("优先级 +16"));
  assert.equal(watch.visible, true);
  assert.equal(watch.headline, "小样本验证模式");
  assert.ok(watch.detail.includes("观察期"));
  assert.ok(watch.badges.includes("今天小样本验证"));
  assert.equal(standard.visible, false);
});

test("buildFirstDayExecutionSafetyBanner prioritizes route, handoff, and risk warnings", () => {
  const routeBlocked = buildFirstDayExecutionSafetyBanner({
    routeBlockMessage: "当前节点还没有可用模型路线。",
    executionBlockMessage: null,
    handoffGateCta: null,
    riskNotice: null,
    nextStepLabel: "第一章审稿",
    routeRepairHref: "/settings/models?focus=first-day-route&projectId=project-1",
  });
  const handoffPending = buildFirstDayExecutionSafetyBanner({
    routeBlockMessage: null,
    executionBlockMessage: null,
    handoffGateCta: {
      visible: true,
      status: "pending",
      headline: "交接闸门未闭环",
      detail: "下一步：验收口径 · 写清首轮通过线。",
      primaryAction: "link",
      primaryLabel: "去任务中心补交接",
      primaryHref: "/dispatch",
      secondaryLabel: "查看交接进度",
      secondaryHref: "#first-day-workflow",
      badges: ["1/3", "等待：验收口径"],
    },
    riskNotice: null,
    nextStepLabel: "第一章审稿",
    workflowHref: "#first-day-workflow",
  });
  const watchRisk = buildFirstDayExecutionSafetyBanner({
    routeBlockMessage: null,
    executionBlockMessage: null,
    handoffGateCta: {
      visible: true,
      status: "closed",
      headline: "交接闸门已闭环",
      detail: "可以继续生产。",
      primaryAction: "execute_current_step",
      primaryLabel: "继续审稿",
      primaryHref: "/projects/project-1",
      secondaryLabel: "查看派单中心",
      secondaryHref: "/dispatch",
      badges: ["3/3", "可继续生产"],
    },
    riskNotice: {
      visible: true,
      level: "watch",
      label: "观察",
      headline: "小样本验证模式",
      detail: "先跑首轮样本和复查证据，通过后再扩大。",
      badges: ["今天小样本验证"],
    },
    nextStepLabel: "第一章审稿",
    gateReviewHref: "/gate?focus=first-day-risk",
  });
  const ready = buildFirstDayExecutionSafetyBanner({
    routeBlockMessage: null,
    executionBlockMessage: null,
    handoffGateCta: null,
    riskNotice: null,
    nextStepLabel: "第一章审稿",
    workflowHref: "#first-day-workflow",
  });

  assert.equal(routeBlocked.level, "blocked");
  assert.equal(routeBlocked.headline, "连续执行已阻断");
  assert.ok(routeBlocked.detail.includes("当前节点还没有可用模型路线"));
  assert.equal(routeBlocked.primaryLabel, "去模型配置");
  assert.equal(routeBlocked.primaryHref, "/settings/models?focus=first-day-route&projectId=project-1");
  assert.equal(handoffPending.level, "blocked");
  assert.equal(handoffPending.headline, "先补交接闸门");
  assert.ok(handoffPending.badges.includes("等待：验收口径"));
  assert.equal(handoffPending.primaryLabel, "去任务中心补交接");
  assert.equal(handoffPending.primaryHref, "/dispatch");
  assert.equal(handoffPending.secondaryLabel, "查看交接进度");
  assert.equal(handoffPending.secondaryHref, "#first-day-workflow");
  assert.equal(watchRisk.level, "watch");
  assert.equal(watchRisk.headline, "小样本验证模式");
  assert.equal(watchRisk.primaryLabel, "回总闸门复查");
  assert.equal(watchRisk.primaryHref, "/gate?focus=first-day-risk");
  assert.equal(ready.level, "ready");
  assert.ok(ready.detail.includes("第一章审稿"));
  assert.equal(ready.primaryLabel, "查看当前节点");
  assert.equal(ready.primaryHref, "#first-day-workflow");
});

test("buildFirstDayDispatchDesk highlights the next first-day task", () => {
  const desk = buildFirstDayDispatchDesk([
    {
      databaseId: "db-1",
      dispatchKey: "first-day:project-1:first-review",
      id: "first-day:project-1:first-review",
      projectId: "project-1",
      platformId: "fanqie",
      platformName: "番茄小说",
      stage: "start_first_three_review",
      state: "assigned",
      priorityScore: 70,
      ownerRole: "AI",
      title: "夜雨系统 · 第一章审稿",
      detail: "AI 先当毒舌审稿编辑。",
      dueLabel: "今天收口",
      actionLabel: "去审稿",
      href: "/projects/project-1/chapters/chapter-1",
      acceptanceCriteria: ["第一章已有结构化审稿结果"],
      evidence: ["缺少第一章成功审稿任务"],
      sourceReceiptId: null,
      completionEvidence: "",
      reviewLatestAt: "2026-01-01T00:00:00.000Z",
      assignedAt: "2026-01-01T00:00:00.000Z",
      completedAt: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    {
      databaseId: "db-2",
      dispatchKey: "first-day:project-1:first-draft",
      id: "first-day:project-1:first-draft",
      projectId: "project-1",
      platformId: "fanqie",
      platformName: "番茄小说",
      stage: "start_first_three_review",
      state: "completed",
      priorityScore: 80,
      ownerRole: "AI",
      title: "夜雨系统 · 生成第一章正文",
      detail: "AI 接手第一章初稿。",
      dueLabel: "今天收口",
      actionLabel: "生成第一章",
      href: "/projects/project-1/chapters/chapter-1",
      acceptanceCriteria: ["第一章正文已生成并写回章节"],
      evidence: [],
      sourceReceiptId: null,
      completionEvidence: "第一章正文已生成并写回章节。",
      reviewLatestAt: "2026-01-01T00:00:00.000Z",
      assignedAt: "2026-01-01T00:00:00.000Z",
      completedAt: "2026-01-01T00:10:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:10:00.000Z",
    },
  ]);

  assert.equal(desk.summary.total, 2);
  assert.equal(desk.summary.active, 1);
  assert.equal(desk.summary.completed, 1);
  assert.equal(desk.nextTask?.stepId, "first-review");
  assert.equal(desk.nextTask?.stepLabel, "第一章审稿");
  assert.equal(desk.nextTask?.dueLabel, "今天收口");
  assert.equal(desk.nextTask?.firstDayHref, "/projects/project-1?firstDayLaunch=1&nextStep=first-review#first-day-workflow");
  assert.equal(desk.nextTask?.continuation.kind, "first_day_ai");
  assert.equal(desk.nextTask?.continuation.label, "直接执行 AI");
  assert.equal(desk.nextTask?.continuation.endpoint, "/api/projects/project-1/first-day-workflow");
  assert.ok(desk.nextTask?.continuation.hint.includes("执行后回项目验收"));
  assert.ok(desk.nextTask?.completionTemplate.includes("第一章审稿已完成"));
  assert.ok(desk.nextActions[0].includes("第一章审稿"));
});

test("buildFirstDayDispatchDesk surfaces gate review when first-day cards are closed", () => {
  const desk = buildFirstDayDispatchDesk([
    {
      databaseId: "db-1",
      dispatchKey: "first-day:project-1:first-review",
      id: "first-day:project-1:first-review",
      projectId: "project-1",
      platformId: "fanqie",
      platformName: "番茄小说",
      stage: "start_first_three_review",
      state: "completed",
      priorityScore: 70,
      ownerRole: "AI",
      title: "夜雨系统 · 第一章审稿",
      detail: "AI 先当毒舌审稿编辑。",
      dueLabel: "今天收口",
      actionLabel: "去审稿",
      href: "/projects/project-1/chapters/chapter-1",
      acceptanceCriteria: ["第一章已有结构化审稿结果"],
      evidence: [],
      sourceReceiptId: null,
      completionEvidence: "第一章审稿已完成，钩子、爽点和章末追读点已经复查。",
      reviewLatestAt: "2026-01-01T00:00:00.000Z",
      assignedAt: "2026-01-01T00:00:00.000Z",
      completedAt: "2026-01-01T00:10:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:10:00.000Z",
    },
    {
      databaseId: "db-2",
      dispatchKey: "first-day:project-1:publish-precheck",
      id: "first-day:project-1:publish-precheck",
      projectId: "project-1",
      platformId: "fanqie",
      platformName: "番茄小说",
      stage: "submission_package_precheck",
      state: "completed",
      priorityScore: 60,
      ownerRole: "运营",
      title: "夜雨系统 · 平台包预检",
      detail: "检查标题、简介、标签、样章和平台适配。",
      dueLabel: "今天收口",
      actionLabel: "检查平台包",
      href: "/projects/project-1#platform-export",
      acceptanceCriteria: ["平台包已完成预检"],
      evidence: [],
      sourceReceiptId: null,
      completionEvidence: "平台包预检已完成，标题、简介、标签、样章和风险项都已经复查。",
      reviewLatestAt: "2026-01-01T00:00:00.000Z",
      assignedAt: "2026-01-01T00:00:00.000Z",
      completedAt: "2026-01-01T00:20:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:20:00.000Z",
    },
  ]);

  assert.equal(desk.summary.active, 0);
  assert.equal(desk.nextTask, null);
  assert.equal(desk.completionGateCta.visible, true);
  assert.equal(desk.completionGateCta.headline, "首日链路已收口");
  assert.ok(desk.completionGateCta.detail.includes("回总闸门复查放行"));
  assert.equal(desk.completionGateCta.primaryLabel, "回总闸门复查");
  assert.equal(desk.completionGateCta.primaryHref, "/gate?focus=first-day-complete");
  assert.ok(desk.completionGateCta.badges.includes("进入批量前复查"));
});

test("buildFirstDayDispatchCardInlineAction exposes AI execution on active first-day cards", () => {
  const baseTask = {
    databaseId: "db-1",
    dispatchKey: "first-day:project-1:first-review",
    id: "first-day:project-1:first-review",
    projectId: "project-1",
    platformId: "fanqie",
    platformName: "番茄小说",
    stage: "start_first_three_review",
    state: "assigned" as const,
    priorityScore: 70,
    ownerRole: "AI",
    title: "夜雨系统 · 第一章审稿",
    detail: "AI 先当毒舌审稿编辑。",
    dueLabel: "今天收口",
    actionLabel: "去审稿",
    href: "/projects/project-1/chapters/chapter-1",
    acceptanceCriteria: ["第一章已有结构化审稿结果"],
    evidence: ["缺少第一章成功审稿任务"],
    sourceReceiptId: null,
    completionEvidence: "",
    reviewLatestAt: "2026-01-01T00:00:00.000Z",
    assignedAt: "2026-01-01T00:00:00.000Z",
    completedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
  const desk = buildFirstDayDispatchDesk([
    baseTask,
    {
      ...baseTask,
      databaseId: "db-2",
      dispatchKey: "first-day:project-1:publish-precheck",
      id: "first-day:project-1:publish-precheck",
      ownerRole: "运营",
      title: "夜雨系统 · 平台包预检",
    },
    {
      ...baseTask,
      databaseId: "db-3",
      dispatchKey: "first-day:project-1:first-rewrite",
      id: "first-day:project-1:first-rewrite",
      state: "completed",
      title: "夜雨系统 · 第一章二改",
    },
  ]);

  const aiAction = buildFirstDayDispatchCardInlineAction(desk.cards[0]);
  const manualAction = buildFirstDayDispatchCardInlineAction(desk.cards[1]);
  const completedAction = buildFirstDayDispatchCardInlineAction(desk.cards[2]);

  assert.equal(aiAction.visible, true);
  assert.equal(aiAction.label, "直接执行 AI");
  assert.equal(aiAction.href, "/projects/project-1?firstDayLaunch=1&nextStep=first-review#first-day-workflow");
  assert.deepEqual(aiAction.execution, {
    kind: "first_day_ai",
    endpoint: "/api/projects/project-1/first-day-workflow",
    dispatchKey: "first-day:project-1:first-review",
  });
  assert.equal(manualAction.visible, false);
  assert.equal(completedAction.visible, false);
});

test("buildFirstDayDispatchDesk keeps recovered watch state visible", () => {
  const desk = buildFirstDayDispatchDesk([
    {
      databaseId: "db-1",
      dispatchKey: "first-day:project-1:risk-recovery",
      id: "first-day:project-1:risk-recovery",
      projectId: "project-1",
      platformId: "qimao",
      platformName: "七猫小说",
      stage: "start_first_three_review",
      state: "completed",
      priorityScore: 96,
      ownerRole: "策划",
      title: "夜雨系统 · 止损恢复验证",
      detail: "先证明入口卖点已经改掉。",
      dueLabel: "今天止损验证",
      actionLabel: "做恢复验证",
      href: "/projects/project-1#first-day-workflow",
      acceptanceCriteria: ["恢复条件已写清"],
      evidence: ["缺少止损恢复条件"],
      sourceReceiptId: null,
      completionEvidence: "恢复条件已写清，入口卖点已重做，只验证一个变量。",
      reviewLatestAt: "2026-01-01T00:00:00.000Z",
      assignedAt: "2026-01-01T00:00:00.000Z",
      completedAt: "2026-01-01T00:10:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:10:00.000Z",
    },
    {
      databaseId: "db-2",
      dispatchKey: "first-day:project-1:first-draft",
      id: "first-day:project-1:first-draft",
      projectId: "project-1",
      platformId: "qimao",
      platformName: "七猫小说",
      stage: "start_first_three_review",
      state: "assigned",
      priorityScore: 88,
      ownerRole: "AI",
      title: "夜雨系统 · 恢复观察 · 生成第一章正文",
      detail: "恢复后先跑小样本。",
      dueLabel: "今天小样本验证",
      actionLabel: "生成小样本",
      href: "/projects/project-1/chapters/chapter-1",
      acceptanceCriteria: ["写清首轮小样本通过线"],
      evidence: ["缺少观察平台首轮小样本验证口径"],
      sourceReceiptId: null,
      completionEvidence: "",
      reviewLatestAt: "2026-01-01T00:00:00.000Z",
      assignedAt: "2026-01-01T00:11:00.000Z",
      completedAt: null,
      createdAt: "2026-01-01T00:11:00.000Z",
      updatedAt: "2026-01-01T00:11:00.000Z",
    },
  ]);

  assert.equal(desk.nextTask?.stepId, "first-draft");
  assert.ok(desk.nextActions[0].includes("恢复观察小样本"));
  assert.ok(desk.nextActions[0].includes("不要批量放大"));
  assert.ok(desk.nextTask?.completionHint?.includes("放量闸门"));
  assert.ok(desk.nextTask?.evidenceChips.includes("缺成功率"));
  assert.ok(desk.nextTask?.evidenceChips.includes("缺质量分"));
  assert.ok(desk.nextTask?.evidenceChips.includes("缺失败样本"));
  assert.ok(desk.nextTask?.evidenceChips.includes("缺放量结论"));
});

test("buildFirstDayHandoffGateCta makes handoff gate state actionable", () => {
  const pending = buildFirstDayHandoffGateCta({
    projectId: "project-1",
    progress: {
      visible: true,
      label: "恢复放量交接",
      headline: "开书交接执行进度",
      detail: "把打法拆给三类角色。",
      completedCount: 1,
      totalCount: 3,
      progressPercent: 33,
      nextAction: "下一步：验收口径 · 写清首轮通过线。",
      evidence: [],
      items: [
        { id: "opening", label: "开头打法", ownerRole: "开头编辑", status: "done", action: "开头", target: "首屏", evidence: "已完成", href: "/projects/project-1#first-day-workflow" },
        { id: "verification", label: "验收口径", ownerRole: "审稿编辑", status: "active", action: "验收", target: "前三章", evidence: "等待任务中心回写完成证据。", href: "/projects/project-1#first-day-workflow" },
        { id: "platform-package", label: "平台包装", ownerRole: "平台运营", status: "locked", action: "平台包", target: "回收", evidence: "等待任务中心回写完成证据。", href: "/projects/project-1#platform-export" },
      ],
    },
    nextStep: {
      label: "生成第一章正文",
      actionLabel: "生成正文",
      href: "/projects/project-1#first-day-workflow",
    },
  });
  const closed = buildFirstDayHandoffGateCta({
    projectId: "project-1",
    progress: {
      visible: true,
      label: "闭环交接",
      headline: "闭环打法执行进度",
      detail: "三段交接都已经完成。",
      completedCount: 3,
      totalCount: 3,
      progressPercent: 100,
      nextAction: "三段交接已闭环，可以继续看首日工作流和平台数据回收。",
      evidence: ["平台包装：标题、简介、标签已完成"],
      items: [
        { id: "opening", label: "开头打法", ownerRole: "开头编辑", status: "done", action: "开头", target: "首屏", evidence: "已完成", href: "/projects/project-1#first-day-workflow" },
        { id: "verification", label: "验收口径", ownerRole: "审稿编辑", status: "done", action: "验收", target: "前三章", evidence: "已完成", href: "/projects/project-1#first-day-workflow" },
        { id: "platform-package", label: "平台包装", ownerRole: "平台运营", status: "done", action: "平台包", target: "回收", evidence: "已完成", href: "/projects/project-1#platform-export" },
      ],
    },
    nextStep: {
      label: "首轮审稿",
      actionLabel: "继续审稿",
      href: "/projects/project-1?firstDayLaunch=1&nextStep=first-review#first-day-workflow",
    },
  });
  const executableClosed = buildFirstDayHandoffGateCta({
    projectId: "project-1",
    progress: {
      visible: true,
      label: "闭环交接",
      headline: "闭环打法执行进度",
      detail: "三段交接都已经完成。",
      completedCount: 3,
      totalCount: 3,
      progressPercent: 100,
      nextAction: "三段交接已闭环，可以继续看首日工作流和平台数据回收。",
      evidence: ["平台包装：标题、简介、标签已完成"],
      items: [
        { id: "opening", label: "开头打法", ownerRole: "开头编辑", status: "done", action: "开头", target: "首屏", evidence: "已完成", href: "/projects/project-1#first-day-workflow" },
        { id: "verification", label: "验收口径", ownerRole: "审稿编辑", status: "done", action: "验收", target: "前三章", evidence: "已完成", href: "/projects/project-1#first-day-workflow" },
        { id: "platform-package", label: "平台包装", ownerRole: "平台运营", status: "done", action: "平台包", target: "回收", evidence: "已完成", href: "/projects/project-1#platform-export" },
      ],
    },
    nextStep: {
      label: "首轮审稿",
      actionLabel: "继续审稿",
      href: "/projects/project-1?firstDayLaunch=1&nextStep=first-review#first-day-workflow",
    },
    canExecuteCurrentStep: true,
  });

  assert.equal(pending?.status, "pending");
  assert.equal(pending?.headline, "交接闸门未闭环");
  assert.equal(pending?.primaryAction, "link");
  assert.equal(pending?.primaryLabel, "去任务中心补交接");
  assert.equal(pending?.primaryHref, "/dispatch?firstDayProject=project-1#first-day-dispatch");
  assert.ok(pending?.badges.includes("等待：验收口径"));
  assert.equal(closed?.status, "closed");
  assert.equal(closed?.headline, "交接闸门已闭环");
  assert.equal(closed?.primaryAction, "link");
  assert.equal(closed?.primaryLabel, "继续审稿");
  assert.equal(closed?.primaryHref, "/projects/project-1?firstDayLaunch=1&nextStep=first-review#first-day-workflow");
  assert.ok(closed?.badges.includes("可继续生产"));
  assert.equal(executableClosed?.status, "closed");
  assert.equal(executableClosed?.primaryAction, "execute_current_step");
  assert.equal(executableClosed?.primaryLabel, "继续审稿");
});

test("resolveFirstDayDispatchFocus locates gate handoff targets", () => {
  const tasks = [
    {
      databaseId: "db-1",
      dispatchKey: "first-day:project-1:publish-precheck",
      id: "first-day:project-1:publish-precheck",
      projectId: "project-1",
      platformId: "fanqie",
      platformName: "番茄小说",
      stage: "publish_precheck",
      state: "completed" as const,
      priorityScore: 60,
      ownerRole: "运营",
      title: "夜雨系统 · 平台包预检",
      detail: "补齐发布包验收证据。",
      dueLabel: "今天收口",
      actionLabel: "补交接验收",
      href: "/projects/project-1#first-day-workflow",
      acceptanceCriteria: ["执行开书交接动作：第一段给倒计时"],
      evidence: [],
      sourceReceiptId: null,
      completionEvidence: "首日平台包预检已完成。",
      reviewLatestAt: "2026-01-01T00:00:00.000Z",
      assignedAt: "2026-01-01T00:00:00.000Z",
      completedAt: "2026-01-01T00:20:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:20:00.000Z",
    },
    {
      databaseId: "db-2",
      dispatchKey: "first-day:project-2:first-review",
      id: "first-day:project-2:first-review",
      projectId: "project-2",
      platformId: "qimao",
      platformName: "七猫小说",
      stage: "start_first_three_review",
      state: "assigned" as const,
      priorityScore: 80,
      ownerRole: "AI",
      title: "山海账本 · 第一章审稿",
      detail: "先收口审稿。",
      dueLabel: "今天收口",
      actionLabel: "去审稿",
      href: "/projects/project-2/chapters/chapter-1",
      acceptanceCriteria: ["第一章已有结构化审稿结果"],
      evidence: [],
      sourceReceiptId: null,
      completionEvidence: "",
      reviewLatestAt: "2026-01-01T00:00:00.000Z",
      assignedAt: "2026-01-01T00:00:00.000Z",
      completedAt: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ];

  const exact = resolveFirstDayDispatchFocus(tasks, {
    projectId: "project-1",
    stepId: "publish-precheck",
  });
  const fallback = resolveFirstDayDispatchFocus(tasks, {
    projectId: "project-2",
    stepId: "publish-precheck",
  });

  assert.equal(exact.requested, true);
  assert.equal(exact.matchedBy, "project_step");
  assert.equal(exact.card?.dispatchKey, "first-day:project-1:publish-precheck");
  assert.ok(exact.message.includes("补这张卡"));
  assert.equal(fallback.matchedBy, "project_active");
  assert.equal(fallback.card?.dispatchKey, "first-day:project-2:first-review");
  assert.ok(fallback.message.includes("当前首日卡"));
});

test("buildFirstDayDispatchUpdateSummary explains risk recovery handoff", () => {
  const summary = buildFirstDayDispatchUpdateSummary({
    task: {
      dispatchKey: "first-day:project-1:risk-recovery",
      state: "completed",
      title: "夜雨系统 · 止损恢复验证",
      completionEvidence: "恢复条件已写清，入口卖点已重做，只验证一个变量。",
      href: "/projects/project-1#first-day-workflow",
    },
    followUpTasks: [
      {
        dispatchKey: "first-day:project-1:first-draft",
        projectId: "project-1",
        title: "夜雨系统 · 恢复观察 · 生成第一章正文",
        actionLabel: "生成小样本",
        href: "/projects/project-1/chapters/chapter-1",
        dueLabel: "今天小样本验证",
        state: "assigned",
      },
    ],
  });

  assert.equal(summary.visible, true);
  assert.equal(summary.status, "risk_recovered");
  assert.equal(summary.title, "止损已解除，进入恢复观察");
  assert.ok(summary.detail.includes("下一张首日卡是「第一章初稿」"));
  assert.ok(summary.detail.includes("不要放量"));
  assert.equal(summary.actionLabel, "生成小样本");
  assert.equal(summary.href, "/projects/project-1?firstDayLaunch=1&nextStep=first-draft#first-day-workflow");
  assert.ok(summary.badges.includes("转入观察小样本"));
});

test("buildFirstDayDispatchUpdateSummary promotes executable AI follow-up", () => {
  const summary = buildFirstDayDispatchUpdateSummary({
    task: {
      dispatchKey: "first-day:project-1:first-draft",
      state: "completed",
      title: "夜雨系统 · 生成第一章正文",
      completionEvidence: "第一章初稿已完成，钩子、冲突和章节末追读点都有落地证据。",
      href: "/projects/project-1/chapters/chapter-1",
    },
    followUpTasks: [
      {
        dispatchKey: "first-day:project-1:first-review",
        projectId: "project-1",
        title: "夜雨系统 · 首轮审稿",
        actionLabel: "去审稿",
        href: "/projects/project-1/chapters/chapter-1",
        dueLabel: "今天审完",
        state: "assigned",
      },
    ],
    executionPlan: {
      executable: true,
    },
  });

  assert.equal(summary.visible, true);
  assert.equal(summary.status, "advanced");
  assert.equal(summary.actionLabel, "继续 AI 执行");
  assert.equal(summary.href, "/projects/project-1?firstDayLaunch=1&nextStep=first-review#first-day-workflow");
  assert.deepEqual(summary.actionExecution, {
    kind: "first_day_ai",
    endpoint: "/api/projects/project-1/first-day-workflow",
    dispatchKey: "first-day:project-1:first-review",
  });
  assert.ok(summary.detail.includes("下一张首日卡是「第一章审稿」"));
  assert.ok(summary.badges.includes("AI 可继续"));
});

test("buildFirstDayReturnToAcceptanceHref carries execution evidence back to the project", () => {
  const href = buildFirstDayReturnToAcceptanceHref({
    href: "/projects/project-1?firstDayLaunch=1&nextStep=first-review#first-day-workflow",
    completionEvidence: "第一章审稿已完成：钩子、爽点和章末追读点已经复查。",
  });

  assert.equal(
    href,
    "/projects/project-1?firstDayLaunch=1&nextStep=first-review&firstDayEvidence=%E7%AC%AC%E4%B8%80%E7%AB%A0%E5%AE%A1%E7%A8%BF%E5%B7%B2%E5%AE%8C%E6%88%90%EF%BC%9A%E9%92%A9%E5%AD%90%E3%80%81%E7%88%BD%E7%82%B9%E5%92%8C%E7%AB%A0%E6%9C%AB%E8%BF%BD%E8%AF%BB%E7%82%B9%E5%B7%B2%E7%BB%8F%E5%A4%8D%E6%9F%A5%E3%80%82#first-day-workflow",
  );
});

test("buildFirstDayDispatchCenterHref targets the next first-day dispatch card", () => {
  assert.equal(
    buildFirstDayDispatchCenterHref({
      projectId: "project-1",
      dispatchKey: "first-day:project-1:publish-precheck",
    }),
    "/dispatch?firstDayProject=project-1&step=publish-precheck#first-day-dispatch",
  );
  assert.equal(
    buildFirstDayDispatchCenterHref({
      projectId: "project-1",
      stepId: "first-review",
      source: "real-sample",
      gaps: ["首章样本还缺审稿成功记录。", "审稿、二改或平台预检还缺派单回执和人工验收。"],
    }),
    "/dispatch?firstDayProject=project-1&step=first-review&source=real-sample&gap=%E9%A6%96%E7%AB%A0%E6%A0%B7%E6%9C%AC%E8%BF%98%E7%BC%BA%E5%AE%A1%E7%A8%BF%E6%88%90%E5%8A%9F%E8%AE%B0%E5%BD%95%E3%80%82&gap=%E5%AE%A1%E7%A8%BF%E3%80%81%E4%BA%8C%E6%94%B9%E6%88%96%E5%B9%B3%E5%8F%B0%E9%A2%84%E6%A3%80%E8%BF%98%E7%BC%BA%E6%B4%BE%E5%8D%95%E5%9B%9E%E6%89%A7%E5%92%8C%E4%BA%BA%E5%B7%A5%E9%AA%8C%E6%94%B6%E3%80%82#first-day-dispatch",
  );
});

test("resolveFirstDayDispatchFocus builds a real sample acceptance draft from project gaps", () => {
  const focus = resolveFirstDayDispatchFocus([
    {
      dispatchKey: "first-day:project-1:first-review",
      id: "first-day:project-1:first-review",
      databaseId: "",
      projectId: "project-1",
      platformId: "fanqie",
      platformName: "番茄小说",
      stage: "project_start",
      state: "assigned",
      priorityScore: 80,
      ownerRole: "AI",
      title: "夜雨系统 · 审稿第一章",
      detail: "补齐第一章审稿。",
      dueLabel: "今天",
      actionLabel: "审稿第一章",
      href: "/projects/project-1#first-day-workflow",
      acceptanceCriteria: ["第一章审稿已完成并列出钩子、爽点和章末追读问题。"],
      evidence: ["缺少第一章成功审稿任务"],
      sourceReceiptId: null,
      completionEvidence: "",
      reviewLatestAt: "2026-01-01T00:00:00.000Z",
      assignedAt: null,
      completedAt: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ], {
    projectId: "project-1",
    stepId: "first-review",
    source: "real-sample",
    gaps: ["首章样本还缺审稿成功记录。", "审稿、二改或平台预检还缺派单回执和人工验收。"],
  });

  assert.equal(focus.matchedBy, "project_step");
  assert.ok(focus.message.includes("真实样本验收"));
  assert.ok(focus.completionTemplate?.includes("真实样本验收来源"));
  assert.ok(focus.completionTemplate?.includes("首章样本还缺审稿成功记录"));
  assert.ok(focus.completionTemplate?.includes("第一章审稿已完成"));
});

test("resolveFirstDayDispatchFocus does not hijack another project when real sample card is missing", () => {
  const focus = resolveFirstDayDispatchFocus([
    {
      dispatchKey: "first-day:project-2:first-draft",
      id: "first-day:project-2:first-draft",
      databaseId: "",
      projectId: "project-2",
      platformId: "fanqie",
      platformName: "番茄小说",
      stage: "project_start",
      state: "assigned",
      priorityScore: 80,
      ownerRole: "AI",
      title: "别的项目 · 生成第一章",
      detail: "不是当前项目。",
      dueLabel: "今天",
      actionLabel: "生成第一章",
      href: "/projects/project-2#first-day-workflow",
      acceptanceCriteria: ["第一章正文已生成并写回章节。"],
      evidence: ["缺少第一章正文。"],
      sourceReceiptId: null,
      completionEvidence: "",
      reviewLatestAt: "2026-01-01T00:00:00.000Z",
      assignedAt: null,
      completedAt: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ], {
    projectId: "project-1",
    stepId: "publish-precheck",
    source: "real-sample",
    gaps: ["审稿、二改或平台预检还缺派单回执和人工验收。"],
  });

  assert.equal(focus.card, null);
  assert.equal(focus.matchedBy, "none");
  assert.ok(focus.message.includes("真实样本验收"));
  assert.ok(focus.message.includes("没有找到这本书的首日派单卡"));
});

test("buildRealSampleMissingDispatch creates a first-day dispatch from project gaps", async () => {
  const { buildRealSampleMissingDispatch } = await import("../lib/projects/firstDayWorkflowView.ts");
  const dispatch = buildRealSampleMissingDispatch({
    projectId: "project-1",
    projectTitle: "夜雨系统",
    platformId: "fanqie",
    platformName: "番茄小说",
    stepId: "publish-precheck",
    gaps: ["审稿、二改或平台预检还缺派单回执和人工验收。"],
    createdAt: "2026-01-01T00:00:00.000Z",
  });

  assert.equal(dispatch.id, "first-day:project-1:publish-precheck");
  assert.equal(dispatch.platformId, "fanqie");
  assert.equal(dispatch.platformName, "番茄小说");
  assert.equal(dispatch.stage, "start_platform_package");
  assert.equal(dispatch.state, "assigned");
  assert.equal(dispatch.ownerRole, "平台运营");
  assert.ok(dispatch.title.includes("夜雨系统"));
  assert.ok(dispatch.title.includes("平台包预检"));
  assert.ok(dispatch.detail.includes("真实样本验收"));
  assert.ok(dispatch.acceptanceCriteria.some((item) => item.includes("标题、简介、标签")));
  assert.ok(dispatch.evidence.some((item) => item.includes("审稿、二改或平台预检还缺派单回执")));
  assert.equal(dispatch.href, "/projects/project-1?firstDayLaunch=1&nextStep=publish-precheck#first-day-workflow");
});

test("buildFirstDayDispatchAiExecutionNotice explains current-page acceptance", () => {
  const notice = buildFirstDayDispatchAiExecutionNotice({
    summary: "第一章审稿已完成",
    nextAction: "回写验收依据",
    completionEvidence: "第一章审稿已完成：钩子、爽点和章末追读点已经复查。",
    canCompleteInDispatch: true,
    dispatchKey: "first-day:project-1:first-review",
  });

  assert.equal(notice.message, "首日 AI 已执行：第一章审稿已完成。下一步：回写验收依据。验收依据已填入当前派单卡，可以直接在派单中心标记完成。");
  assert.equal(notice.actionLabel, "当前页验收");
  assert.equal(notice.canCompleteInDispatch, true);
  assert.equal(notice.focusDispatchKey, "first-day:project-1:first-review");
  assert.equal(notice.focusMessage, "AI 执行证据已填入，检查后可以标记完成。");
});

test("buildFirstDayReturnedEvidenceAcceptanceState focuses a completable returned receipt", () => {
  const state = buildFirstDayReturnedEvidenceAcceptanceState({
    completionEvidence: "第一章审稿已完成：钩子、爽点和章末追读点已经复查。",
    hasDispatch: true,
  });

  assert.equal(state.visible, true);
  assert.equal(state.shouldFocusAcceptance, true);
  assert.equal(state.canComplete, true);
  assert.equal(state.message, "已带回首日 AI 执行证据，验收依据已填好。检查后可以点击「完成当前派单」。");
  assert.equal(state.buttonHint, "当前证据已满足验收字数，可以直接验收。");
  assert.equal(state.primaryActionLabel, "完成当前派单");
  assert.equal(state.primaryActionDisabled, false);
});

test("buildFirstDayReturnedEvidenceAcceptanceState highlights cleared watch sample evidence", () => {
  const state = buildFirstDayReturnedEvidenceAcceptanceState({
    completionEvidence: [
      "小样本验证已完成：",
      "通过线：成功率 100%，质量分 86。",
      "不可接受项：无失败样本。",
      "复查证据：AI 任务 task-1。",
      "成功率：100%",
      "质量分：86",
      "失败样本：0",
      "放量结论：通过，可以恢复后续初稿批次。",
    ].join("\n"),
    hasDispatch: true,
    dispatchKey: "first-day:project-1:first-draft",
    dueLabel: "今天小样本验证",
    title: "恢复观察小样本",
    acceptanceCriteria: ["写清通过线", "写清不可接受项", "写清复查证据", "写清成功率、质量分、失败样本和放量结论"],
    evidence: ["观察小样本验收"],
  });

  assert.equal(state.canComplete, true);
  assert.ok(state.buttonHint.includes("解除观察闸门"));
  assert.equal(state.primaryActionLabel, "验收并解除观察闸门");
});

test("buildFirstDayReturnedEvidenceAcceptanceState blocks thin real-sample platform backfill", () => {
  const dispatch = firstDayWorkflowView.buildRealSampleMissingDispatch({
    projectId: "project-1",
    projectTitle: "夜雨系统",
    platformId: "fanqie",
    platformName: "番茄小说",
    stepId: "publish-precheck",
    gaps: ["首日扩展小批已过线，请补曝光、点击、收藏、追读和质量证据。"],
    createdAt: "2026-01-01T00:00:00.000Z",
  });
  const state = buildFirstDayReturnedEvidenceAcceptanceState({
    completionEvidence: "平台包预检已完成，标题、简介、标签和样章都已复查。",
    hasDispatch: true,
    dispatchKey: dispatch.id,
    dueLabel: dispatch.dueLabel,
    title: dispatch.title,
    acceptanceCriteria: dispatch.acceptanceCriteria,
    evidence: dispatch.evidence,
  });

  assert.equal(state.visible, true);
  assert.equal(state.canComplete, false);
  assert.equal(state.primaryActionLabel, "补足验收依据");
  assert.equal(state.primaryActionDisabled, true);
  assert.ok(state.buttonHint.includes("曝光、点击、收藏、追读"));
});

test("buildFirstDayDispatchUpdateSummary explains watch sample scale-up status", () => {
  const cleared = buildFirstDayDispatchUpdateSummary({
    task: {
      dispatchKey: "first-day:project-1:first-draft",
      state: "completed",
      title: "夜雨系统 · 小样本验证 · 生成第一章正文",
      completionEvidence: [
        "小样本验证已完成：",
        "通过线：成功率 100%，质量分 86，失败样本 0 个。",
        "不可接受项：未出现失败、质量低于 80、备用命中或成本异常。",
        "复查证据：AI 任务 task-1；章节 第一章。",
        "放量结论：通过，可以恢复后续初稿批次。",
      ].join("\n"),
      href: "/projects/project-1/chapters/chapter-1",
    },
  });
  const blocked = buildFirstDayDispatchUpdateSummary({
    task: {
      dispatchKey: "first-day:project-1:first-draft",
      state: "completed",
      title: "夜雨系统 · 小样本验证 · 生成第一章正文",
      completionEvidence: [
        "小样本验证已完成：",
        "通过线：成功率 100%，质量 72。",
        "不可接受项：存在质量低于 80，暂不放量。",
        "复查证据：AI 任务 task-1；章节 第一章。",
        "放量结论：未通过，继续停留观察并修复后再测。",
      ].join("\n"),
      href: "/projects/project-1/chapters/chapter-1",
    },
  });
  const missingMetrics = buildFirstDayDispatchUpdateSummary({
    task: {
      dispatchKey: "first-day:project-1:first-draft",
      state: "completed",
      title: "夜雨系统 · 小样本验证 · 生成第一章正文",
      completionEvidence: [
        "小样本验证已完成：",
        "通过线：成功率 100%，质量分 86。",
        "不可接受项：未出现失败、质量低于 80、备用命中或成本异常。",
        "复查证据：AI 任务 task-1；章节 第一章。",
        "放量结论：通过，可以恢复后续初稿批次。",
      ].join("\n"),
      href: "/projects/project-1/chapters/chapter-1",
    },
  });

  assert.equal(cleared.status, "watch_cleared");
  assert.equal(cleared.title, "小样本已过线，放量闸门已解除");
  assert.equal(cleared.actionLabel, "回任务队列恢复小批");
  assert.equal(cleared.href, "/tasks#recommended-batch");
  assert.ok(cleared.detail.includes("回任务队列"));
  assert.ok(cleared.detail.includes("谨慎放量"));
  assert.ok(cleared.badges.includes("放量闸门解除"));
  assert.equal(blocked.status, "watch_blocked");
  assert.equal(blocked.title, "小样本未过线，继续观察");
  assert.equal(blocked.actionLabel, "回总闸门复查");
  assert.equal(blocked.href, "/gate");
  assert.ok(blocked.detail.includes("总闸门确认卡点仍关闭"));
  assert.ok(blocked.detail.includes("修问题复测"));
  assert.ok(blocked.badges.includes("禁止批量放大"));
  assert.equal(missingMetrics.status, "watch_blocked");
  assert.ok(missingMetrics.detail.includes("缺少成功率、质量分或失败样本"));
});

test("buildFirstDayDispatchUpdateSummary routes closed first-day work back to gate", () => {
  const summary = buildFirstDayDispatchUpdateSummary({
    task: {
      dispatchKey: "first-day:project-1:publish-precheck",
      state: "completed",
      title: "夜雨系统 · 平台包预检",
      completionEvidence: "平台包预检已完成，标题、简介、标签、卖点、样章和首轮数据回收口径已整理。",
      href: "/projects/project-1#first-day-workflow",
    },
  });

  assert.equal(summary.visible, true);
  assert.equal(summary.status, "completed");
  assert.equal(summary.title, "首日派单已收口");
  assert.equal(summary.actionLabel, "回总闸门复查");
  assert.equal(summary.href, "/gate");
  assert.ok(summary.detail.includes("放行批量生产"));
  assert.ok(summary.badges.includes("复查放行"));
});

test("buildFirstDayDispatchUpdateSummary routes handoff completion back to tasks", () => {
  const summary = buildFirstDayDispatchUpdateSummary({
    task: {
      dispatchKey: "first-day-handoff:project-1:platform-package",
      state: "completed",
      title: "夜雨系统 · 经验开书交接：平台回收",
      completionEvidence: "避坑边界已确认：不要直接放量；平台回收口径已写清标题、简介、标签和追读。",
      href: "/projects/project-1#platform-export",
    },
  });

  assert.equal(summary.visible, true);
  assert.equal(summary.title, "平台回收交接已回写");
  assert.equal(summary.actionLabel, "回任务队列复查");
  assert.equal(summary.href, "/tasks");
  assert.ok(summary.detail.includes("首日闸门"));
  assert.ok(summary.badges.includes("证据回写"));
});

test("buildFirstDayPostDispatchCompletionPrompt offers direct AI continuation when next step is executable", () => {
  const ready = buildFirstDayPostDispatchCompletionPrompt({
    completedTitle: "第一章初稿",
    updateSummary: null,
    nextStep: {
      label: "第一章审稿",
      owner: "AI",
      actionLabel: "AI 执行当前节点",
      href: "#first-day-workflow",
      dispatchHref: "/dispatch?firstDayProject=project-1&step=first-review#first-day-dispatch",
      dispatchKey: "first-day:project-1:first-review",
    },
    executionPlan: {
      executable: true,
    },
  });
  const manualStep = buildFirstDayPostDispatchCompletionPrompt({
    completedTitle: "第一章二改",
    updateSummary: {
      visible: true,
      status: "advanced",
      title: "首日节点已推进",
      detail: "「第一章二改」已验收，下一张首日卡是「平台包预检」。",
      actionLabel: "检查平台包",
      href: "/projects/project-1#platform-export",
      badges: [],
    },
    nextStep: {
      label: "平台包预检",
      owner: "运营",
      actionLabel: "检查平台包",
      href: "/projects/project-1#platform-export",
      dispatchHref: "/dispatch?firstDayProject=project-1&step=publish-precheck#first-day-dispatch",
      dispatchKey: "first-day:project-1:publish-precheck",
    },
    executionPlan: {
      executable: false,
      blockedReason: "当前首日节点暂不支持自动执行。",
    },
  });
  const completed = buildFirstDayPostDispatchCompletionPrompt({
    completedTitle: "平台包预检",
    updateSummary: {
      visible: true,
      status: "completed",
      title: "首日工作流已收口",
      detail: "可以进入后续生产。",
      actionLabel: "看任务队列",
      href: "/tasks",
      badges: [],
    },
    nextStep: {
      label: "平台包预检",
      owner: "运营",
      actionLabel: "检查平台包",
      href: "/projects/project-1#platform-export",
    },
    executionPlan: {
      executable: false,
      blockedReason: "当前首日节点暂不支持自动执行。",
    },
  });

  assert.equal(ready.message, "已完成当前派单：第一章初稿。下一步「第一章审稿」已准备好，可以继续让 AI 执行。");
  assert.equal(ready.action, "execute_current_step");
  assert.equal(ready.actionLabel, "继续 AI 执行");
  assert.equal(ready.secondaryActionLabel, "看下一张派单卡");
  assert.equal(ready.secondaryActionHref, "/dispatch?firstDayProject=project-1&step=first-review#first-day-dispatch");
  assert.equal(ready.focusDispatchKey, "first-day:project-1:first-review");
  assert.equal(ready.focusMessage, "下一张首日派单卡已就绪，可以继续推进。");
  assert.equal(manualStep.message, "首日节点已推进：「第一章二改」已验收，下一张首日卡是「平台包预检」。");
  assert.equal(manualStep.action, "open_next_step");
  assert.equal(manualStep.actionLabel, "检查平台包");
  assert.equal(manualStep.actionHref, "/projects/project-1#platform-export");
  assert.equal(manualStep.secondaryActionLabel, "回派单中心看下一张卡");
  assert.equal(manualStep.secondaryActionHref, "/dispatch?firstDayProject=project-1&step=publish-precheck#first-day-dispatch");
  assert.equal(manualStep.focusDispatchKey, "first-day:project-1:publish-precheck");
  assert.equal(manualStep.focusMessage, "下一张首日派单卡已就绪，可以继续推进。");
  assert.equal(completed.message, "首日工作流已收口：可以进入后续生产。");
  assert.equal(completed.action, "open_next_step");
  assert.equal(completed.actionLabel, "看任务队列");
  assert.equal(completed.actionHref, "/tasks");
});

test("buildFirstDayRouteRepairReturnNotice only offers AI continuation when route and plan are executable", () => {
  const ready = buildFirstDayRouteRepairReturnNotice({
    taskLabel: "章节审稿",
    routeBlockMessage: null,
    executionPlan: {
      executable: true,
    },
  });
  const routeStillBlocked = buildFirstDayRouteRepairReturnNotice({
    taskLabel: "正文初稿",
    routeBlockMessage: "当前节点「正文初稿」仍在使用 Mock 兜底，不能直接 AI 执行。",
    executionPlan: {
      executable: true,
    },
  });
  const planStillBlocked = buildFirstDayRouteRepairReturnNotice({
    taskLabel: "人工确认",
    routeBlockMessage: null,
    executionPlan: {
      executable: false,
      blockedReason: "当前首日节点暂不支持自动执行。",
    },
  });

  assert.equal(ready.message, "已刷新首日模型路线：章节审稿路线就绪，可以继续执行当前节点。");
  assert.equal(ready.action, "execute_current_step");
  assert.equal(routeStillBlocked.message, "已刷新首日模型路线：当前节点「正文初稿」仍在使用 Mock 兜底，不能直接 AI 执行。");
  assert.equal(routeStillBlocked.action, undefined);
  assert.equal(planStillBlocked.message, "已刷新首日模型路线：人工确认路线就绪；但当前首日节点暂不支持自动执行。");
  assert.equal(planStillBlocked.action, undefined);
});

test("buildFirstDayDispatchCompletionTemplate covers first-day step types", () => {
  assert.ok(buildFirstDayDispatchCompletionTemplate({
    dispatchKey: "first-day:project-1:first-draft",
    acceptanceCriteria: [],
  }).includes("第一章正文已生成"));
  const handoffTemplate = buildFirstDayDispatchCompletionTemplate({
    dispatchKey: "first-day:project-1:first-draft",
    acceptanceCriteria: [
      "第一章正文已生成并写回章节",
      "执行开书交接动作：开头：第一段给倒计时。",
      "避开交接边界：不要直接放量，先做小样本。",
    ],
    evidence: ["知识来源：番茄小说 正反馈经验已沉淀", "平台反哺：执行正反馈链"],
  });
  assert.ok(handoffTemplate.includes("交接动作已落地：开头：第一段给倒计时。"));
  assert.ok(handoffTemplate.includes("避坑边界已确认：不要直接放量，先做小样本。"));
  assert.ok(handoffTemplate.includes("知识来源：番茄小说 正反馈经验已沉淀"));
  assert.ok(handoffTemplate.includes("平台反哺：执行正反馈链"));
  assert.ok(buildFirstDayDispatchCompletionTemplate({
    dispatchKey: "first-day:project-1:first-draft",
    dueLabel: "今天止损验证",
    title: "夜雨系统 · 止损验证 · 生成第一章正文",
    acceptanceCriteria: ["写清本次恢复条件：入口卖点、前三章兑现或平台匹配度至少改掉一项。"],
    evidence: ["缺少避坑平台恢复条件确认。"],
  }).includes("恢复条件"));
  assert.ok(buildFirstDayDispatchCompletionTemplate({
    dispatchKey: "first-day:project-1:first-draft",
    dueLabel: "今天小样本验证",
    title: "夜雨系统 · 小样本验证 · 生成第一章正文",
    acceptanceCriteria: ["写清首轮小样本通过线和不可接受项。"],
    evidence: ["缺少观察平台首轮小样本验证口径。"],
  }).includes("通过线"));
  assert.ok(buildFirstDayDispatchCompletionTemplate({
    dispatchKey: "first-day:project-1:first-draft",
    dueLabel: "今天小样本验证",
    title: "夜雨系统 · 小样本验证 · 生成第一章正文",
    acceptanceCriteria: ["写清首轮小样本通过线和不可接受项。"],
    evidence: ["缺少观察平台首轮小样本验证口径。"],
  }).includes("放量结论"));
  const sampleCompletionTemplate = buildFirstDayDispatchCompletionTemplate({
    dispatchKey: "first-day:project-1:first-draft",
    dueLabel: "今天小样本验证",
    title: "夜雨系统 · 小样本验证 · 生成第一章正文",
    acceptanceCriteria: ["写清首轮小样本通过线和不可接受项。"],
    evidence: ["缺少观察平台首轮小样本验证口径。"],
  });
  assert.ok(sampleCompletionTemplate.includes("成功率"));
  assert.ok(sampleCompletionTemplate.includes("质量分"));
  assert.ok(sampleCompletionTemplate.includes("失败样本"));
  assert.ok(sampleCompletionTemplate.includes("放量结论"));
  assert.ok(buildFirstDayDispatchCompletionTemplate({
    dispatchKey: "first-day:project-1:publish-precheck",
    acceptanceCriteria: [],
  }).includes("平台包预检已完成"));
  assert.ok(buildFirstDayDispatchCompletionTemplate({
    dispatchKey: "first-day-handoff:project-1:opening",
    acceptanceCriteria: [],
  }).includes("第一章首屏"));
  assert.ok(buildFirstDayDispatchCompletionTemplate({
    dispatchKey: "first-day-handoff:project-1:verification",
    acceptanceCriteria: [],
  }).includes("通过线"));
  assert.ok(buildFirstDayDispatchCompletionTemplate({
    dispatchKey: "first-day-handoff:project-1:platform-package",
    acceptanceCriteria: [],
  }).includes("平台回收口径"));
  assert.ok(buildFirstDayDispatchCompletionTemplate({
    dispatchKey: "first-day:project-1:risk-recovery",
    acceptanceCriteria: [],
  }).includes("止损恢复条件已写清"));
  assert.equal(buildFirstDayDispatchCompletionTemplate({
    dispatchKey: "manual",
    acceptanceCriteria: ["完成当前动作"],
  }), "");
});

test("buildFirstDayDispatchCompletionTemplate builds role-specific recovery handoff evidence", () => {
  const recoveryCriteria = [
    "恢复放量小样本只进入第一章首屏验证，不直接扩成批量生产。",
    "恢复放量首轮只看小样本，不把任务完成误判为可复用放量结论。",
    "恢复放量平台包必须先回收小样本曝光、点击、收藏、追读。",
  ];
  const openingTemplate = buildFirstDayDispatchCompletionTemplate({
    dispatchKey: "first-day-handoff:project-1:opening",
    acceptanceCriteria: recoveryCriteria,
  });
  const verificationTemplate = buildFirstDayDispatchCompletionTemplate({
    dispatchKey: "first-day-handoff:project-1:verification",
    acceptanceCriteria: recoveryCriteria,
  });
  const platformTemplate = buildFirstDayDispatchCompletionTemplate({
    dispatchKey: "first-day-handoff:project-1:platform-package",
    acceptanceCriteria: recoveryCriteria,
  });

  assert.ok(openingTemplate.includes("开头编辑交付"));
  assert.ok(openingTemplate.includes("首屏钩子"));
  assert.ok(verificationTemplate.includes("审稿编辑交付"));
  assert.ok(verificationTemplate.includes("前三章"));
  assert.ok(platformTemplate.includes("平台运营交付"));
  assert.ok(platformTemplate.includes("标题"));
  assert.equal(validateFirstDayDispatchCompletionEvidence({
    dispatchKey: "first-day-handoff:project-1:opening",
    acceptanceCriteria: recoveryCriteria,
    completionEvidence: openingTemplate,
  }).valid, true);
  assert.equal(validateFirstDayDispatchCompletionEvidence({
    dispatchKey: "first-day-handoff:project-1:verification",
    acceptanceCriteria: recoveryCriteria,
    completionEvidence: verificationTemplate,
  }).valid, true);
  assert.equal(validateFirstDayDispatchCompletionEvidence({
    dispatchKey: "first-day-handoff:project-1:platform-package",
    acceptanceCriteria: recoveryCriteria,
    completionEvidence: platformTemplate,
  }).valid, true);
});

test("buildFirstDayDispatchCompletionHint explains scale gates", () => {
  const hint = buildFirstDayDispatchCompletionHint({
    dispatchKey: "first-day:project-1:first-draft",
    dueLabel: "今天小样本验证",
    title: "夜雨系统 · 小样本验证 · 生成第一章正文",
    acceptanceCriteria: ["写清首轮小样本通过线和不可接受项。"],
    evidence: ["缺少观察平台首轮小样本验证口径。"],
  });
  const recoveryHint = buildFirstDayDispatchCompletionHint({
    dispatchKey: "first-day:project-1:risk-recovery",
    acceptanceCriteria: [],
  });

  assert.ok(hint?.includes("放量闸门"));
  assert.ok(hint?.includes("通过线、不可接受项、复查证据和放量结论"));
  assert.ok(recoveryHint?.includes("恢复观察小样本"));
  assert.ok(buildFirstDayDispatchCompletionHint({
    dispatchKey: "first-day-handoff:project-1:opening",
    acceptanceCriteria: [],
  })?.includes("第一章首屏"));
});

test("validateFirstDayDispatchCompletionEvidence enforces risky first-day evidence", () => {
  const blockedThin = validateFirstDayDispatchCompletionEvidence({
    dispatchKey: "first-day:project-1:first-draft",
    dueLabel: "今天止损验证",
    title: "夜雨系统 · 止损验证 · 生成第一章正文",
    acceptanceCriteria: ["写清本次恢复条件：入口卖点、前三章兑现或平台匹配度至少改掉一项。"],
    evidence: ["缺少避坑平台恢复条件确认。"],
    completionEvidence: "已经全部处理完成，可以继续下一步。",
  });
  const blockedReady = validateFirstDayDispatchCompletionEvidence({
    dispatchKey: "first-day:project-1:first-draft",
    dueLabel: "今天止损验证",
    title: "夜雨系统 · 止损验证 · 生成第一章正文",
    acceptanceCriteria: ["写清本次恢复条件：入口卖点、前三章兑现或平台匹配度至少改掉一项。"],
    evidence: ["缺少避坑平台恢复条件确认。"],
    completionEvidence: "恢复条件已写清：入口卖点已重做，前三章兑现问题已列出。",
  });
  const watchThin = validateFirstDayDispatchCompletionEvidence({
    dispatchKey: "first-day:project-1:first-draft",
    dueLabel: "今天小样本验证",
    title: "夜雨系统 · 小样本验证 · 生成第一章正文",
    acceptanceCriteria: ["写清首轮小样本通过线和不可接受项。"],
    evidence: ["缺少观察平台首轮小样本验证口径。"],
    completionEvidence: "已经全部处理完成，可以继续下一步。",
  });
  const watchMissingEvidence = validateFirstDayDispatchCompletionEvidence({
    dispatchKey: "first-day:project-1:first-draft",
    dueLabel: "今天小样本验证",
    title: "夜雨系统 · 小样本验证 · 生成第一章正文",
    acceptanceCriteria: ["写清首轮小样本通过线和不可接受项。"],
    evidence: ["缺少观察平台首轮小样本验证口径。"],
    completionEvidence: "小样本首轮通过线已写清，不可接受项已补齐。",
  });
  const watchMissingMetrics = validateFirstDayDispatchCompletionEvidence({
    dispatchKey: "first-day:project-1:first-draft",
    dueLabel: "今天小样本验证",
    title: "夜雨系统 · 小样本验证 · 生成第一章正文",
    acceptanceCriteria: ["写清首轮小样本通过线和不可接受项。"],
    evidence: ["缺少观察平台首轮小样本验证口径。"],
    completionEvidence: [
      "小样本验证已完成：",
      "通过线：成功率 100%，质量分 86。",
      "不可接受项：未出现失败、质量低于 80、备用命中或成本异常。",
      "复查证据：AI 任务 task-1；章节 第一章。",
      "放量结论：通过，可以恢复后续初稿批次。",
    ].join("\n"),
  });
  const watchReady = validateFirstDayDispatchCompletionEvidence({
    dispatchKey: "first-day:project-1:first-draft",
    dueLabel: "今天小样本验证",
    title: "夜雨系统 · 小样本验证 · 生成第一章正文",
    acceptanceCriteria: ["写清首轮小样本通过线和不可接受项。"],
    evidence: ["缺少观察平台首轮小样本验证口径。"],
    completionEvidence: [
      "小样本验证已完成：",
      "通过线：成功率 100%，质量分 86，失败样本 0 个。",
      "不可接受项：未出现失败、质量低于 80、备用命中或成本异常。",
      "复查证据：AI 任务 task-1；章节 第一章。",
      "放量结论：通过，可以恢复后续初稿批次。",
    ].join("\n"),
  });
  const handoffMissingAction = validateFirstDayDispatchCompletionEvidence({
    dispatchKey: "first-day:project-1:first-draft",
    acceptanceCriteria: [
      "第一章正文已生成并写回章节",
      "执行开书交接动作：开头：第一段给倒计时。",
      "避开交接边界：不要直接放量，先保留首轮验证。",
    ],
    completionEvidence: "第一章正文已生成并写回章节，可以进入审稿。",
  });
  const handoffMissingAvoid = validateFirstDayDispatchCompletionEvidence({
    dispatchKey: "first-day:project-1:first-draft",
    acceptanceCriteria: [
      "第一章正文已生成并写回章节",
      "执行开书交接动作：开头：第一段给倒计时。",
      "避开交接边界：不要直接放量，先保留首轮验证。",
    ],
    completionEvidence: "交接动作已落地：开头第一段给倒计时，可以进入审稿。",
  });
  const handoffReady = validateFirstDayDispatchCompletionEvidence({
    dispatchKey: "first-day:project-1:first-draft",
    acceptanceCriteria: [
      "第一章正文已生成并写回章节",
      "执行开书交接动作：开头：第一段给倒计时。",
      "避开交接边界：不要直接放量，先保留首轮验证。",
    ],
    evidence: ["知识来源：番茄小说 正反馈经验已沉淀", "平台反哺：执行正反馈链"],
    completionEvidence: "交接动作已落地：开头第一段给倒计时。避坑边界已确认：不要直接放量，先保留首轮验证。",
  });
  const handoffWithSourceReady = validateFirstDayDispatchCompletionEvidence({
    dispatchKey: "first-day:project-1:first-draft",
    acceptanceCriteria: [
      "第一章正文已生成并写回章节",
      "执行开书交接动作：开头：第一段给倒计时。",
      "避开交接边界：不要直接放量，先保留首轮验证。",
    ],
    evidence: ["知识来源：番茄小说 正反馈经验已沉淀", "平台反哺：执行正反馈链"],
    completionEvidence: "知识来源：番茄小说 正反馈经验已沉淀。平台反哺：执行正反馈链。交接动作已落地：开头第一段给倒计时。避坑边界已确认：不要直接放量，先保留首轮验证。",
  });
  const openingHandoffThin = validateFirstDayDispatchCompletionEvidence({
    dispatchKey: "first-day-handoff:project-1:opening",
    acceptanceCriteria: [],
    completionEvidence: "已经处理完成，可以继续。",
  });
  const openingHandoffReady = validateFirstDayDispatchCompletionEvidence({
    dispatchKey: "first-day-handoff:project-1:opening",
    acceptanceCriteria: [],
    completionEvidence: "交接动作已落地：开头第一段给倒计时，首屏危机和追读问题已写清。",
  });
  const verificationHandoffThin = validateFirstDayDispatchCompletionEvidence({
    dispatchKey: "first-day-handoff:project-1:verification",
    acceptanceCriteria: [],
    completionEvidence: "验证动作已经设置完成。",
  });
  const verificationHandoffReady = validateFirstDayDispatchCompletionEvidence({
    dispatchKey: "first-day-handoff:project-1:verification",
    acceptanceCriteria: [],
    completionEvidence: "通过线已写清，不可接受项已列出，复查证据入口已保存。",
  });
  const packageHandoffThin = validateFirstDayDispatchCompletionEvidence({
    dispatchKey: "first-day-handoff:project-1:platform-package",
    acceptanceCriteria: [],
    completionEvidence: "平台包已经处理完成。",
  });
  const packageHandoffReady = validateFirstDayDispatchCompletionEvidence({
    dispatchKey: "first-day-handoff:project-1:platform-package",
    acceptanceCriteria: [],
    completionEvidence: "避坑边界已确认：不要直接放量；平台回收口径已写清标题、简介、标签、样章、曝光、点击、收藏和追读。",
  });

  assert.equal(blockedThin.valid, false);
  assert.equal(blockedThin.level, "blocked");
  assert.ok(blockedThin.error?.includes("恢复条件"));
  assert.equal(blockedReady.valid, true);
  assert.equal(watchThin.valid, false);
  assert.equal(watchThin.level, "watch");
  assert.ok(watchThin.error?.includes("小样本验证"));
  assert.equal(watchMissingEvidence.valid, false);
  assert.ok(watchMissingEvidence.error?.includes("复查证据"));
  assert.equal(watchMissingMetrics.valid, false);
  assert.ok(watchMissingMetrics.error?.includes("失败样本"));
  assert.equal(watchReady.valid, true);
  assert.equal(handoffMissingAction.valid, false);
  assert.ok(handoffMissingAction.error?.includes("交接动作"));
  assert.equal(handoffMissingAvoid.valid, false);
  assert.ok(handoffMissingAvoid.error?.includes("避坑边界"));
  assert.equal(handoffReady.valid, false);
  assert.ok(handoffReady.error?.includes("知识来源"));
  assert.equal(handoffWithSourceReady.valid, true);
  assert.equal(openingHandoffThin.valid, false);
  assert.ok(openingHandoffThin.error?.includes("开头打法交接"));
  assert.equal(openingHandoffReady.valid, true);
  assert.equal(verificationHandoffThin.valid, false);
  assert.ok(verificationHandoffThin.error?.includes("通过线"));
  assert.equal(verificationHandoffReady.valid, true);
  assert.equal(packageHandoffThin.valid, false);
  assert.ok(packageHandoffThin.error?.includes("平台回收交接"));
  assert.equal(packageHandoffReady.valid, true);
});

test("completeFirstDayDispatchStep completes the matching task center dispatch", async () => {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return new Response(JSON.stringify({
      task: {
        dispatchKey: "first-day:project-1:first-draft",
        state: "completed",
        completionEvidence: "第一章正文已经生成并写回章节，作者已确认可以进入审稿。",
      },
      followUpTasks: [],
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;

  try {
    const result = await completeFirstDayDispatchStep(
      "project-1",
      "first-draft",
      "第一章正文已经生成并写回章节，作者已确认可以进入审稿。",
    );

    assert.equal(result.task.dispatchKey, "first-day:project-1:first-draft");
    assert.equal(result.task.state, "completed");
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "/api/gate/dispatch-tasks");
    assert.equal(calls[0].init.method, "PATCH");
    assert.deepEqual(JSON.parse(String(calls[0].init.body)), {
      dispatchKey: "first-day:project-1:first-draft",
      state: "completed",
      completionEvidence: "第一章正文已经生成并写回章节，作者已确认可以进入审稿。",
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("completeFirstDayDispatchStep rejects risky completion evidence before calling the api", async () => {
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = (async () => {
    called = true;
    return new Response("{}", { status: 200 });
  }) as typeof fetch;

  try {
    await assert.rejects(
      completeFirstDayDispatchStep("project-1", "first-draft", "已经全部处理完成，可以继续下一步。", {
        dueLabel: "今天止损验证",
        title: "夜雨系统 · 止损验证 · 生成第一章正文",
        acceptanceCriteria: ["写清本次恢复条件：入口卖点、前三章兑现或平台匹配度至少改掉一项。"],
        evidence: ["缺少避坑平台恢复条件确认。"],
      }),
      /止损验证派单必须写清恢复条件/,
    );
    assert.equal(called, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("completeFirstDayDispatchStep rejects thin acceptance evidence before calling the api", async () => {
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = (async () => {
    called = true;
    return new Response("{}", { status: 200 });
  }) as typeof fetch;

  try {
    await assert.rejects(
      completeFirstDayDispatchStep("project-1", "first-draft", "已完成"),
      /完成派单前，请写清楚完成依据，至少 8 个字。/,
    );
    assert.equal(called, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
