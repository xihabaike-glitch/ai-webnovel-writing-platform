import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/app/tasks/page.tsx", "utf8");

test("tasks page shows invalid view feedback", () => {
  assert.ok(source.includes("invalidViewNotice"));
  assert.ok(source.includes("viewParam ? `任务视图「${viewParam}」不存在，已显示全部任务。` : null"));
  assert.ok(source.includes("视图已回退"));
  assert.ok(source.includes("查看全部任务"));
  assert.ok(source.includes("href=\"/tasks\""));
});

test("tasks page shows invalid debt feedback", () => {
  assert.ok(source.includes("invalidDebtNotice"));
  assert.ok(source.includes("debtParam ? `清债类型「${debtParam}」不存在，已显示全部阻塞债务。` : null"));
  assert.ok(source.includes("清债筛选已回退"));
  assert.ok(source.includes("查看全部阻塞"));
  assert.ok(source.includes("href=\"/tasks?view=blocked#task-debt\""));
});

test("tasks page shows invalid cleared debt feedback", () => {
  assert.ok(source.includes("invalidClearedDebtNotice"));
  assert.ok(source.includes("clearedDebtParam ? `清债完成类型「${clearedDebtParam}」不存在，已忽略这次完成反馈。` : null"));
  assert.ok(source.includes("清债完成反馈已忽略"));
  assert.ok(source.includes("查看阻塞清债"));
  assert.ok(source.includes("href=\"/tasks?view=blocked#task-debt\""));
});

test("tasks page shows invalid batch strategy feedback", () => {
  assert.ok(source.includes("invalidBatchStrategyNotice"));
  assert.ok(source.includes("batchStrategyParam ? `批量策略「${batchStrategyParam}」不存在，已回退到标准档。` : null"));
  assert.ok(source.includes("批量策略已回退"));
  assert.ok(source.includes("查看标准档"));
  assert.ok(source.includes("href=\"/tasks?batchStrategy=standard\""));
});

test("tasks page shows invalid batch context feedback", () => {
  assert.ok(source.includes("invalidBatchContextNotice"));
  assert.ok(source.includes("batchContextParam ? `批量上下文「${batchContextParam}」不存在，已回退到默认生产批次。` : null"));
  assert.ok(source.includes("批量上下文已回退"));
  assert.ok(source.includes("查看默认批次"));
  assert.ok(source.includes("href=\"/tasks#recommended-batch\""));
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

  assert.ok(source.includes("function hrefWithGateReturn"));
  assert.ok(source.includes("base.includes(\"gateReturn=\")"));
  assert.ok(source.includes("href={hrefWithGateReturn(queue.recommendedNext.href, gateReturn)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(queue.pmFocus.actionHref, gateReturn)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(queue.pmFocus.pipelineActionHref, gateReturn)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(debtView.nextAction.href, gateReturn)}"));
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
});
