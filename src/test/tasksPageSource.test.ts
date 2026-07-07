import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/app/tasks/page.tsx", "utf8");

test("tasks page shows invalid view feedback", () => {
  assert.ok(source.includes("invalidViewNotice"));
  assert.ok(source.includes("viewParam ? `任务视图「${viewParam}」不存在，已显示全部任务。` : null"));
  assert.ok(source.includes("视图已回退"));
  assert.ok(source.includes("查看全部任务"));
  assert.ok(source.includes("href={hrefWithGateReturn(\"/tasks\", gateReturn)}"));
});

test("tasks page shows invalid debt feedback", () => {
  assert.ok(source.includes("invalidDebtNotice"));
  assert.ok(source.includes("debtParam ? `清债类型「${debtParam}」不存在，已显示全部阻塞债务。` : null"));
  assert.ok(source.includes("清债筛选已回退"));
  assert.ok(source.includes("查看全部阻塞"));
  assert.ok(source.includes("href={hrefWithGateReturn(\"/tasks?view=blocked#task-debt\", gateReturn)}"));
});

test("tasks page shows invalid cleared debt feedback", () => {
  assert.ok(source.includes("invalidClearedDebtNotice"));
  assert.ok(source.includes("clearedDebtParam ? `清债完成类型「${clearedDebtParam}」不存在，已忽略这次完成反馈。` : null"));
  assert.ok(source.includes("清债完成反馈已忽略"));
  assert.ok(source.includes("查看阻塞清债"));
  assert.ok(source.includes("href={hrefWithGateReturn(\"/tasks?view=blocked#task-debt\", gateReturn)}"));
});

test("tasks page shows invalid batch strategy feedback", () => {
  assert.ok(source.includes("invalidBatchStrategyNotice"));
  assert.ok(source.includes("batchStrategyParam ? `批量策略「${batchStrategyParam}」不存在，已回退到标准档。` : null"));
  assert.ok(source.includes("批量策略已回退"));
  assert.ok(source.includes("查看标准档"));
  assert.ok(source.includes("href={hrefWithGateReturn(\"/tasks?batchStrategy=standard\", gateReturn)}"));
});

test("tasks page shows invalid batch context feedback", () => {
  assert.ok(source.includes("invalidBatchContextNotice"));
  assert.ok(source.includes("batchContextParam ? `批量上下文「${batchContextParam}」不存在，已回退到默认生产批次。` : null"));
  assert.ok(source.includes("批量上下文已回退"));
  assert.ok(source.includes("查看默认批次"));
  assert.ok(source.includes("href={hrefWithGateReturn(\"/tasks#recommended-batch\", gateReturn)}"));
});

test("tasks page keeps a gate recheck return path visible", () => {
  assert.ok(source.includes("gateReturnFromParam"));
  assert.ok(source.includes("gateReturn"));
  assert.ok(source.includes("来自总闸门复检"));
  assert.ok(source.includes("回总闸门复检"));
});

test("tasks page carries gate return through task work links", () => {
  const recommendedBatchButton = readFileSync("src/components/tasks/RunRecommendedBatchButton.tsx", "utf8");
  const publishEffectButton = readFileSync("src/components/tasks/RunPublishEffectQueueActionButton.tsx", "utf8");
  const debtEvidenceForm = readFileSync("src/components/tasks/CompleteTaskDebtEvidenceForm.tsx", "utf8");
  const batchRhythmDispatchButton = readFileSync("src/components/tasks/CreateBatchRhythmDispatchButton.tsx", "utf8");

  assert.ok(source.includes("function hrefWithGateReturn"));
  assert.ok(source.includes("base.includes(\"gateReturn=\")"));
  assert.ok(source.includes("href={hrefWithGateReturn(queue.recommendedNext.href, gateReturn)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(queue.pmFocus.actionHref, gateReturn)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(queue.pmFocus.pipelineActionHref, gateReturn)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(debtView.nextAction.href, gateReturn)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(\"/tasks\", gateReturn)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(\"/tasks?view=blocked#task-debt\", gateReturn)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(group.href, gateReturn)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(entry.href, gateReturn)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(taskQueueSourcePresentation(entry)?.returnHref ?? \"/gate\", gateReturn)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(runConsole.failureRepairBatch.primaryActionHref, gateReturn)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(candidate.href, gateReturn)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(log.href, gateReturn)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(batchRhythmDecision.href, gateReturn)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(safetyPriorityBlocker.actionHref, gateReturn)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(strategyDecision.actionHref, gateReturn)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(batch.href, gateReturn)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(action.href, gateReturn)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(`/projects/${entry.projectId}`, gateReturn)}"));
  assert.ok(source.includes("gateReturnHref={gateReturn}"));

  assert.ok(recommendedBatchButton.includes("gateReturnHref?: string | null"));
  assert.ok(recommendedBatchButton.includes("hrefWithGateReturn(payload.task.href ?? \"/dispatch\", gateReturnHref)"));
  assert.ok(recommendedBatchButton.includes("href={hrefWithGateReturn(routeGateActions?.primaryLinkHref ?? modelRouteGate.targetHref, gateReturnHref)}"));
  assert.ok(recommendedBatchButton.includes("href={hrefWithGateReturn(batchReceipt.primaryHref, gateReturnHref)}"));
  assert.ok(recommendedBatchButton.includes("href={hrefWithGateReturn(batchReceipt.secondaryHref, gateReturnHref)}"));

  assert.ok(publishEffectButton.includes("gateReturnHref?: string | null"));
  assert.ok(publishEffectButton.includes("router.push(hrefWithGateReturn(href, gateReturnHref));"));
  assert.ok(publishEffectButton.includes("href={hrefWithGateReturn(href, gateReturnHref)}"));

  assert.ok(debtEvidenceForm.includes("gateReturnHref?: string | null"));
  assert.ok(debtEvidenceForm.includes("router.push(hrefWithGateReturn(nextFeedback.autoFocusHref, gateReturnHref));"));
  assert.ok(debtEvidenceForm.includes("href={hrefWithGateReturn(feedback.href, gateReturnHref)}"));

  assert.ok(source.includes("<CreateBatchRhythmDispatchButton gateReturnHref={gateReturn} label=\"生成节奏派单\" />"));
  assert.ok(batchRhythmDispatchButton.includes("gateReturnHref?: string | null"));
  assert.ok(batchRhythmDispatchButton.includes("function hrefWithGateReturn"));
  assert.ok(batchRhythmDispatchButton.includes("router.push(hrefWithGateReturn(`/dispatch#dispatch-${payload.task.dispatchKey}`, gateReturnHref));"));
});

test("tasks page shows platform strategy task source detail", () => {
  assert.ok(source.includes("entry.sourceType === \"platform_strategy\" && entry.sourceDetail"));
  assert.ok(source.includes("border-violet-200 bg-violet-50 text-violet-950"));
});

test("tasks page surfaces platform strategy work in the overview", () => {
  assert.ok(source.includes("queue.overview.platformStrategyTasks"));
  assert.ok(source.includes("平台策略"));
  assert.ok(source.includes("href={hrefWithGateReturn(\"/tasks#platform-strategy-tasks\", gateReturn)}"));
  assert.ok(source.includes("id=\"platform-strategy-tasks\""));
});

test("tasks page shows what a platform strategy task unlocks next", () => {
  assert.ok(source.includes("entry.sourceType === \"platform_strategy\" && entry.sourceNextStep"));
  assert.ok(source.includes("做完解锁："));
});

test("tasks page runs any queued platform action with the action button", () => {
  assert.ok(source.includes("{entry.effectAction ? ("));
  assert.ok(source.includes("action={entry.effectAction}"));
});

test("queue action button records task ids from first-three rewrite results", () => {
  const publishEffectButton = readFileSync("src/components/tasks/RunPublishEffectQueueActionButton.tsx", "utf8");

  assert.ok(publishEffectButton.includes("function queueActionTaskId"));
  assert.ok(publishEffectButton.includes("const resultTask = payload?.results?.find((result) => result.task?.id)?.task"));
  assert.ok(publishEffectButton.includes("return payload?.task?.id ?? resultTask?.id ?? null"));
  assert.ok(publishEffectButton.includes("taskId: queueActionTaskId(input.payload)"));
});
