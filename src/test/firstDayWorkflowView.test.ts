import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFirstDayDispatchCompletionTemplate,
  buildFirstDayDispatchDesk,
  buildFirstDayDispatchCompletionHint,
  buildFirstDayDispatchUpdateSummary,
  buildFirstDayExecutionRiskNotice,
  buildFirstDayReceiptCompletionAction,
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
  assert.ok(desk.nextTask?.completionTemplate.includes("第一章审稿已完成"));
  assert.ok(desk.nextActions[0].includes("第一章审稿"));
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

test("buildFirstDayDispatchUpdateSummary explains watch sample scale-up status", () => {
  const cleared = buildFirstDayDispatchUpdateSummary({
    task: {
      dispatchKey: "first-day:project-1:first-draft",
      state: "completed",
      title: "夜雨系统 · 小样本验证 · 生成第一章正文",
      completionEvidence: [
        "小样本验证已完成：",
        "通过线：成功率 100%，质量 86。",
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

  assert.equal(cleared.status, "watch_cleared");
  assert.equal(cleared.title, "小样本已过线，放量闸门已解除");
  assert.equal(cleared.actionLabel, "回总闸门复查");
  assert.equal(cleared.href, "/gate");
  assert.ok(cleared.detail.includes("回总闸门复查"));
  assert.ok(cleared.detail.includes("谨慎放量"));
  assert.ok(cleared.badges.includes("放量闸门解除"));
  assert.equal(blocked.status, "watch_blocked");
  assert.equal(blocked.title, "小样本未过线，继续观察");
  assert.equal(blocked.actionLabel, "回总闸门复查");
  assert.equal(blocked.href, "/gate");
  assert.ok(blocked.detail.includes("总闸门确认卡点仍关闭"));
  assert.ok(blocked.detail.includes("修问题复测"));
  assert.ok(blocked.badges.includes("禁止批量放大"));
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
  });
  assert.ok(handoffTemplate.includes("交接动作已落地：开头：第一段给倒计时。"));
  assert.ok(handoffTemplate.includes("避坑边界已确认：不要直接放量，先做小样本。"));
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
  const watchReady = validateFirstDayDispatchCompletionEvidence({
    dispatchKey: "first-day:project-1:first-draft",
    dueLabel: "今天小样本验证",
    title: "夜雨系统 · 小样本验证 · 生成第一章正文",
    acceptanceCriteria: ["写清首轮小样本通过线和不可接受项。"],
    evidence: ["缺少观察平台首轮小样本验证口径。"],
    completionEvidence: "小样本首轮通过线已写清，不可接受项和复查证据已补齐。放量结论：通过，可以恢复后续初稿批次。",
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
    completionEvidence: "交接动作已落地：开头第一段给倒计时。避坑边界已确认：不要直接放量，先保留首轮验证。",
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
  assert.equal(watchReady.valid, true);
  assert.equal(handoffMissingAction.valid, false);
  assert.ok(handoffMissingAction.error?.includes("交接动作"));
  assert.equal(handoffMissingAvoid.valid, false);
  assert.ok(handoffMissingAvoid.error?.includes("避坑边界"));
  assert.equal(handoffReady.valid, true);
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
