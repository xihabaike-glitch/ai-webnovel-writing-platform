import assert from "node:assert/strict";
import test from "node:test";
import {
  buildTaskDebtCompletionFeedback,
  buildTaskDebtFocusChangeNotice,
  buildFailureRepairResumeBatchRecord,
  buildTaskDebtRecoveryBatchRecord,
} from "../lib/projects/taskDebtCompletionFeedback.ts";

test("buildTaskDebtCompletionFeedback explains first-day follow-up debt", () => {
  const feedback = buildTaskDebtCompletionFeedback({
    actionLabel: "完成首日链路",
    blockerType: "first_day_gate",
    previousDebtCount: 4,
    followUpTasks: [{
      dispatchKey: "first-day:project-1:first-draft",
      title: "首日小样本初稿",
      actionLabel: "继续小样本",
      href: "/dispatch?firstDayProject=project-1&step=first-draft#first-day-dispatch",
    }],
  });

  assert.equal(feedback.status, "needs_follow_up");
  assert.equal(feedback.message, "完成首日链路已回写，但清债还没结束：下一张首日卡是「首日小样本初稿」。先处理它，再回任务队列复查阻塞是否下降。");
  assert.equal(feedback.actionLabel, "继续小样本");
  assert.equal(feedback.href, "/dispatch?firstDayProject=project-1&step=first-draft#first-day-dispatch");
  assert.equal(feedback.autoFocusHref, "/tasks?view=blocked&debt=first_day_gate&cleared=first_day_gate&previousDebt=4#task-debt");
});

test("buildTaskDebtCompletionFeedback tells the user to verify the cleared debt count", () => {
  const feedback = buildTaskDebtCompletionFeedback({
    actionLabel: "完成小样本验收",
    blockerType: "watch_scale_gate",
    previousDebtCount: 2,
    knowledgeFeedbackWritten: true,
  });

  assert.equal(feedback.status, "cleared");
  assert.equal(feedback.message, "完成小样本验收已回写，已回灌到平台知识反馈。刷新后回到阻塞清债页确认该类型数量下降。");
  assert.equal(feedback.actionLabel, "复查阻塞清债");
  assert.equal(feedback.href, "/tasks?view=blocked&debt=watch_scale_gate&cleared=watch_scale_gate&previousDebt=2#task-debt");
  assert.equal(feedback.autoFocusHref, "/tasks?view=blocked&debt=watch_scale_gate&cleared=watch_scale_gate&previousDebt=2#task-debt");
});

test("buildTaskDebtFocusChangeNotice highlights reduced debt after refresh", () => {
  const notice = buildTaskDebtFocusChangeNotice({
    label: "首日闸门",
    previousDebtCount: 4,
    currentDebtCount: 3,
  });

  assert.equal(notice?.tone, "reduced");
  assert.equal(notice?.message, "刚回写首日闸门清债证据：提交前 4 个，现在 3 个，已减少 1 个。继续处理剩余阻塞。");
});

test("buildTaskDebtFocusChangeNotice recommends resumed production after a debt type is cleared", () => {
  const notice = buildTaskDebtFocusChangeNotice({
    label: "首日闸门",
    previousDebtCount: 2,
    currentDebtCount: 0,
    resumeActionLabel: "恢复生产：生成初稿",
    resumeActionHref: "/projects/project-1/chapters/chapter-ready-draft",
  });

  assert.equal(notice?.tone, "cleared");
  assert.equal(notice?.message, "刚回写首日闸门清债证据：提交前 2 个，现在已经清空。可以恢复后续生产。");
  assert.equal(notice?.actionLabel, "恢复生产：生成初稿");
  assert.equal(notice?.actionHref, "/projects/project-1/chapters/chapter-ready-draft");
});

test("buildTaskDebtFocusChangeNotice recommends a safe resume batch when execution gates allow it", () => {
  const notice = buildTaskDebtFocusChangeNotice({
    label: "首日闸门",
    previousDebtCount: 2,
    currentDebtCount: 0,
    resumeActionLabel: "恢复生产：生成初稿",
    resumeActionHref: "/projects/project-1/chapters/chapter-ready-draft",
    resumeBatch: {
      canRun: true,
      actionLabel: "批量初稿 2 个",
      detail: "夜雨系统 · 待生成 · 第一章、第二章",
      href: "/tasks#recommended-batch",
    },
  });

  assert.equal(notice?.actionLabel, "执行恢复小批：批量初稿 2 个");
  assert.equal(notice?.actionHref, "/tasks#recommended-batch");
  assert.equal(notice?.resumeBatchDetail, "夜雨系统 · 待生成 · 第一章、第二章");
});

test("buildTaskDebtFocusChangeNotice keeps the single resume action when the safe batch is blocked", () => {
  const notice = buildTaskDebtFocusChangeNotice({
    label: "首日闸门",
    previousDebtCount: 2,
    currentDebtCount: 0,
    resumeActionLabel: "恢复生产：生成初稿",
    resumeActionHref: "/projects/project-1/chapters/chapter-ready-draft",
    resumeBatch: {
      canRun: false,
      actionLabel: "批量初稿 2 个",
      detail: "候选稿未确认，先别跑批量。",
      href: "/tasks#recommended-batch",
    },
  });

  assert.equal(notice?.actionLabel, "恢复生产：生成初稿");
  assert.equal(notice?.actionHref, "/projects/project-1/chapters/chapter-ready-draft");
  assert.equal(notice?.resumeBatchDetail, null);
});

test("buildTaskDebtFocusChangeNotice explains when debt count does not fall", () => {
  const notice = buildTaskDebtFocusChangeNotice({
    label: "观察闸门",
    previousDebtCount: 2,
    currentDebtCount: 2,
  });

  assert.equal(notice?.tone, "unchanged");
  assert.equal(notice?.message, "刚回写观察闸门清债证据：提交前 2 个，现在仍是 2 个。证据可能生成了后续动作，或仍缺验收项。");
});

test("buildTaskDebtRecoveryBatchRecord summarizes the latest cleared resume batch", () => {
  const record = buildTaskDebtRecoveryBatchRecord([{
    label: "沉淀批量初稿 2 个经验",
    href: "/tasks#recommended-batch",
    payload: JSON.stringify({
      plan: {
        scaleGate: "cleared",
        actionLabel: "批量初稿 2 个",
      },
      routeEffectSummary: {
        successRatePercent: 100,
        failedTasks: 0,
        knownCostUsd: 0.02,
        averageQualityScore: 88,
      },
      batchReceipt: {
        headline: "准放量批次稳定，下一批仍小步走",
        detail: "小样本后的第一轮恢复放量已过线。",
        primaryLabel: "继续恢复小批",
        primaryHref: "/tasks#recommended-batch",
      },
    }),
    createdAt: "2026-07-06T06:00:00.000Z",
  }]);

  assert.equal(record?.headline, "恢复小批已回流：准放量批次稳定，下一批仍小步走");
  assert.equal(record?.detail, "小样本后的第一轮恢复放量已过线。");
  assert.deepEqual(record?.metrics, ["成功率 100%", "失败 0", "成本 $0.0200", "质量 88"]);
  assert.equal(record?.actionLabel, "继续恢复小批");
  assert.equal(record?.actionHref, "/tasks#recommended-batch");
  assert.equal(record?.decisionTone, "continue");
  assert.equal(record?.decisionLabel, "继续小批");
  assert.equal(record?.decisionActionHref, "/tasks#recommended-batch");
  assert.match(record?.decisionDetail ?? "", /已过线/);
});

test("buildTaskDebtRecoveryBatchRecord sends failed resume batches to repair", () => {
  const record = buildTaskDebtRecoveryBatchRecord([{
    label: "沉淀批量初稿 2 个经验",
    href: "/tasks#recommended-batch",
    payload: JSON.stringify({
      plan: {
        scaleGate: "cleared",
        actionLabel: "批量初稿 2 个",
      },
      routeEffectSummary: {
        successRatePercent: 50,
        failedTasks: 1,
        knownCostUsd: 0.02,
        averageQualityScore: 90,
      },
      batchReceipt: {
        headline: "批次有失败，先修再放大",
        detail: "第二章执行失败。",
        primaryLabel: "继续恢复小批",
        primaryHref: "/tasks#recommended-batch",
      },
    }),
    createdAt: "2026-07-06T06:00:00.000Z",
  }]);

  assert.equal(record?.decisionTone, "repair");
  assert.equal(record?.decisionLabel, "进入失败修复");
  assert.equal(record?.decisionActionLabel, "查看失败修复");
  assert.equal(record?.decisionActionHref, "/failures");
  assert.match(record?.decisionDetail ?? "", /成功率低于 80/);
});

test("buildTaskDebtRecoveryBatchRecord rolls back when quality drops below the resume line", () => {
  const record = buildTaskDebtRecoveryBatchRecord([{
    label: "沉淀批量初稿 2 个经验",
    href: "/tasks#recommended-batch",
    payload: JSON.stringify({
      plan: {
        scaleGate: "cleared",
        actionLabel: "批量初稿 2 个",
      },
      routeEffectSummary: {
        successRatePercent: 100,
        failedTasks: 0,
        knownCostUsd: 0.02,
        averageQualityScore: 82,
      },
      batchReceipt: {
        headline: "恢复小批质量跌线",
        detail: "小批可以跑完，但质量不够稳。",
        primaryLabel: "继续恢复小批",
        primaryHref: "/tasks#recommended-batch",
      },
    }),
    createdAt: "2026-07-06T06:00:00.000Z",
  }]);

  assert.equal(record?.decisionTone, "rollback");
  assert.equal(record?.decisionLabel, "回滚观察修复");
  assert.equal(record?.decisionActionLabel, "回滚观察修复");
  assert.equal(record?.decisionActionHref, "/dispatch");
  assert.match(record?.decisionDetail ?? "", /85 分/);
});

test("buildTaskDebtRecoveryBatchRecord pauses scale-up when the cost line is too high", () => {
  const record = buildTaskDebtRecoveryBatchRecord([{
    label: "沉淀批量初稿 2 个经验",
    href: "/tasks#recommended-batch",
    payload: JSON.stringify({
      plan: {
        scaleGate: "cleared",
        actionLabel: "批量初稿 2 个",
      },
      routeEffectSummary: {
        successRatePercent: 100,
        failedTasks: 0,
        knownCostUsd: 0.14,
        averageQualityScore: 90,
        averageCostPerSucceededTaskUsd: 0.07,
      },
      batchReceipt: {
        headline: "恢复小批成本偏高",
        detail: "质量能过，但模型消耗超线。",
        primaryLabel: "继续恢复小批",
        primaryHref: "/tasks#recommended-batch",
      },
    }),
    createdAt: "2026-07-06T06:00:00.000Z",
  }]);

  assert.equal(record?.decisionTone, "watch");
  assert.equal(record?.decisionLabel, "暂停加码看成本");
  assert.equal(record?.decisionActionLabel, "查看推荐批次");
  assert.equal(record?.decisionActionHref, "/tasks#recommended-batch");
  assert.match(record?.decisionDetail ?? "", /\$0.0700/);
});

test("buildFailureRepairResumeBatchRecord summarizes repair resume batches even without a cleared scale gate", () => {
  const record = buildFailureRepairResumeBatchRecord([{
    label: "沉淀修复后恢复小批经验",
    href: "/tasks?batchContext=repair_resume#recommended-batch",
    payload: JSON.stringify({
      executionContext: "repair_resume",
      plan: {
        executionContext: "repair_resume",
        scaleGate: "none",
        actionLabel: "批量初稿 2 个",
      },
      routeEffectSummary: {
        successRatePercent: 100,
        failedTasks: 0,
        knownCostUsd: 0.02,
        averageQualityScore: 88,
      },
      batchReceipt: {
        headline: "修复后恢复小批通过，继续小步观察",
        detail: "失败修复后的第一轮恢复小批已过线。",
        primaryLabel: "继续恢复小批",
        primaryHref: "/tasks?batchContext=repair_resume#recommended-batch",
      },
    }),
    createdAt: "2026-07-06T07:00:00.000Z",
  }]);

  assert.equal(record?.headline, "失败修复恢复小批已回流：修复后恢复小批通过，继续小步观察");
  assert.equal(record?.detail, "失败修复后的第一轮恢复小批已过线。");
  assert.deepEqual(record?.metrics, ["成功率 100%", "失败 0", "成本 $0.0200", "质量 88"]);
  assert.equal(record?.decisionTone, "continue");
  assert.equal(record?.decisionLabel, "继续小批");
  assert.equal(record?.decisionActionHref, "/tasks?batchContext=repair_resume#recommended-batch");
});

test("buildFailureRepairResumeBatchRecord ignores normal recovery batches", () => {
  const record = buildFailureRepairResumeBatchRecord([{
    label: "沉淀批量初稿 2 个经验",
    href: "/tasks#recommended-batch",
    payload: JSON.stringify({
      plan: {
        scaleGate: "cleared",
        actionLabel: "批量初稿 2 个",
      },
      routeEffectSummary: {
        successRatePercent: 100,
        failedTasks: 0,
        knownCostUsd: 0.02,
        averageQualityScore: 88,
      },
      batchReceipt: {
        headline: "准放量批次稳定，下一批仍小步走",
        primaryLabel: "继续恢复小批",
        primaryHref: "/tasks#recommended-batch",
      },
    }),
    createdAt: "2026-07-06T07:00:00.000Z",
  }]);

  assert.equal(record, null);
});

test("buildFailureRepairResumeBatchRecord allows leaving recovery mode after two stable repair resume batches", () => {
  const record = buildFailureRepairResumeBatchRecord([
    {
      label: "沉淀修复后恢复小批经验",
      href: "/tasks?batchContext=repair_resume#recommended-batch",
      payload: JSON.stringify({
        executionContext: "repair_resume",
        routeEffectSummary: {
          successRatePercent: 100,
          failedTasks: 0,
          knownCostUsd: 0.02,
          averageQualityScore: 88,
          averageCostPerSucceededTaskUsd: 0.01,
        },
        batchReceipt: {
          headline: "第二轮恢复小批通过",
          primaryLabel: "继续恢复小批",
          primaryHref: "/tasks?batchContext=repair_resume#recommended-batch",
        },
      }),
      createdAt: "2026-07-06T08:00:00.000Z",
    },
    {
      label: "沉淀修复后恢复小批经验",
      href: "/tasks?batchContext=repair_resume#recommended-batch",
      payload: JSON.stringify({
        executionContext: "repair_resume",
        routeEffectSummary: {
          successRatePercent: 100,
          failedTasks: 0,
          knownCostUsd: 0.02,
          averageQualityScore: 87,
          averageCostPerSucceededTaskUsd: 0.01,
        },
        batchReceipt: {
          headline: "第一轮恢复小批通过",
          primaryLabel: "继续恢复小批",
          primaryHref: "/tasks?batchContext=repair_resume#recommended-batch",
        },
      }),
      createdAt: "2026-07-06T07:00:00.000Z",
    },
  ]);

  assert.equal(record?.stabilityTone, "ready");
  assert.equal(record?.stableRuns, 2);
  assert.equal(record?.stabilityLabel, "连续稳定，可回普通批次");
  assert.equal(record?.stabilityActionLabel, "回普通推荐批次");
  assert.equal(record?.stabilityActionHref, "/tasks#recommended-batch");
  assert.match(record?.stabilityDetail ?? "", /连续 2 次/);
});

test("buildFailureRepairResumeBatchRecord keeps one healthy repair resume batch in watch mode", () => {
  const record = buildFailureRepairResumeBatchRecord([{
    label: "沉淀修复后恢复小批经验",
    href: "/tasks?batchContext=repair_resume#recommended-batch",
    payload: JSON.stringify({
      executionContext: "repair_resume",
      routeEffectSummary: {
        successRatePercent: 100,
        failedTasks: 0,
        knownCostUsd: 0.02,
        averageQualityScore: 88,
        averageCostPerSucceededTaskUsd: 0.01,
      },
      batchReceipt: {
        headline: "第一轮恢复小批通过",
        primaryLabel: "继续恢复小批",
        primaryHref: "/tasks?batchContext=repair_resume#recommended-batch",
      },
    }),
    createdAt: "2026-07-06T07:00:00.000Z",
  }]);

  assert.equal(record?.stabilityTone, "watch");
  assert.equal(record?.stableRuns, 1);
  assert.equal(record?.stabilityLabel, "继续恢复观察");
  assert.equal(record?.stabilityActionHref, "/tasks?batchContext=repair_resume#recommended-batch");
  assert.match(record?.stabilityDetail ?? "", /还差 1 次/);
});

test("buildFailureRepairResumeBatchRecord blocks leaving recovery mode after the latest repair resume batch fails", () => {
  const record = buildFailureRepairResumeBatchRecord([
    {
      label: "沉淀修复后恢复小批经验",
      href: "/tasks?batchContext=repair_resume#recommended-batch",
      payload: JSON.stringify({
        executionContext: "repair_resume",
        routeEffectSummary: {
          successRatePercent: 50,
          failedTasks: 1,
          knownCostUsd: 0.02,
          averageQualityScore: 90,
          averageCostPerSucceededTaskUsd: 0.01,
        },
        batchReceipt: {
          headline: "恢复小批失败",
          primaryLabel: "查看失败修复",
          primaryHref: "/failures",
        },
      }),
      createdAt: "2026-07-06T08:00:00.000Z",
    },
    {
      label: "沉淀修复后恢复小批经验",
      href: "/tasks?batchContext=repair_resume#recommended-batch",
      payload: JSON.stringify({
        executionContext: "repair_resume",
        routeEffectSummary: {
          successRatePercent: 100,
          failedTasks: 0,
          knownCostUsd: 0.02,
          averageQualityScore: 88,
          averageCostPerSucceededTaskUsd: 0.01,
        },
      }),
      createdAt: "2026-07-06T07:00:00.000Z",
    },
  ]);

  assert.equal(record?.stabilityTone, "blocked");
  assert.equal(record?.stableRuns, 0);
  assert.equal(record?.stabilityLabel, "恢复稳定性中断");
  assert.equal(record?.stabilityActionLabel, "查看失败修复");
  assert.equal(record?.stabilityActionHref, "/failures");
  assert.match(record?.stabilityDetail ?? "", /最近恢复小批未过线/);
});
