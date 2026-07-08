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

test("tasks page shows task receipt acceptance criteria in the PM focus", () => {
  assert.ok(source.includes("taskReceiptAcceptanceCriteria"));
  assert.ok(source.includes("任务回执验收口径"));
  assert.ok(source.includes("任务回执收口面板"));
  assert.ok(source.includes("id=\"task-receipt-closeout\""));
  assert.ok(source.includes("taskReceiptCloseoutPercent"));
  assert.ok(source.includes("aria-label=\"任务回执完成率\""));
  assert.ok(source.includes("taskReceiptReleaseLabel"));
  assert.ok(source.includes("taskReceiptNextCutLabel"));
  assert.ok(source.includes("/gate#pipeline-final-review"));
  assert.ok(source.includes("查看最终交付正式放行卡"));
  assert.ok(source.includes("放行判断"));
  assert.ok(source.includes("收口缺口"));
  assert.ok(source.includes("下一刀"));
  assert.ok(source.includes("执行角色"));
  assert.ok(source.includes("输入"));
  assert.ok(source.includes("输出"));
  assert.ok(source.includes("人工验收"));
  assert.ok(source.includes("下一步"));
  assert.ok(source.includes("taskReceiptAcceptanceCriteria.map"));
});

test("tasks page renders receipt templates on queue items", () => {
  assert.ok(source.includes("任务回执模板"));
  assert.ok(source.includes("entry.receiptTemplate.map"));
  assert.ok(source.includes("entry.runbookStep"));
  assert.ok(source.includes("当前实跑动作"));
  assert.ok(source.includes("entry.runbookStep.sampleAction"));
  assert.ok(source.includes("entry.runbookStep.proofToCapture"));
  assert.ok(source.includes("entry.runbookStep.rollbackIfWeak"));
  assert.ok(source.includes("break-words"));
  assert.ok(source.includes('className="grid min-w-0 gap-3 [&>*]:min-w-0"'));
  assert.ok(source.includes('className="mt-1 grid min-w-0 gap-1"'));
  assert.ok(source.includes('className="min-w-0 break-words"'));
});

test("tasks page previews PM receipt fields on queue items", () => {
  assert.ok(source.includes("buildTaskReceiptCloseoutPreview"));
  assert.ok(source.includes("taskReceiptCloseoutPreview"));
  assert.ok(source.includes("任务回执预检"));
  assert.ok(source.includes("缺少回执字段"));
  assert.ok(source.includes("回执预检通过"));
  assert.ok(source.includes("taskReceiptCloseoutPreview.missingLabels"));
  assert.ok(source.includes("已带"));
  assert.ok(source.includes("待补"));
});

test("tasks page shows archive experience execution receipts on run logs", () => {
  assert.ok(source.includes("归档经验执行回执"));
  assert.ok(source.includes("log.archiveExperienceReceipt"));
  assert.ok(source.includes("archiveExperienceReceipt.status"));
  assert.ok(source.includes("archiveExperienceReceipt.evidence.map"));
  assert.ok(source.includes("最终交付归档强制执行"));
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

test("tasks page surfaces role closure work in the queue", () => {
  assert.ok(source.includes('{ dispatchKey: { startsWith: "role-intent:" } }'));
  assert.ok(source.includes("queue.overview.roleClosureTasks"));
  assert.ok(source.includes("角色闭环"));
  assert.ok(source.includes("debt=role_closure"));
  assert.ok(source.includes("entry.sourceType === \"role_closure\" && entry.sourceDetail"));
});

test("tasks page exposes role closure as a batch safety blocker", () => {
  const safetySource = readFileSync("src/lib/projects/batchExecutionSafety.ts", "utf8");

  assert.ok(source.includes("const safetyPriorityBlocker = buildBatchSafetyPriorityBlocker(safety);"));
  assert.ok(source.includes("href={hrefWithGateReturn(safetyPriorityBlocker.actionHref, gateReturn)}"));
  assert.ok(source.includes("{safetyPriorityBlocker.actionLabel}"));
  assert.ok(safetySource.includes("\"role-closure\""));
  assert.ok(safetySource.includes("roleClosureCount === 0 ? \"pass\" : \"block\""));
  assert.ok(safetySource.includes("\"/tasks?view=blocked&debt=role_closure#task-debt\""));
});

test("tasks page exposes first-day gate as a batch safety blocker", () => {
  const safetySource = readFileSync("src/lib/projects/batchExecutionSafety.ts", "utf8");

  assert.ok(source.includes("const safetyPriorityBlocker = buildBatchSafetyPriorityBlocker(safety);"));
  assert.ok(source.includes("href={hrefWithGateReturn(safetyPriorityBlocker.actionHref, gateReturn)}"));
  assert.ok(safetySource.includes("\"first-day-gate\""));
  assert.ok(safetySource.includes("firstDayGateCount === 0 ? \"pass\" : \"block\""));
  assert.ok(safetySource.includes("\"/tasks?view=blocked&debt=first_day_gate#task-debt\""));
});

test("tasks page exposes risk recovery as a batch safety blocker", () => {
  const safetySource = readFileSync("src/lib/projects/batchExecutionSafety.ts", "utf8");

  assert.ok(source.includes("const safetyPriorityBlocker = buildBatchSafetyPriorityBlocker(safety);"));
  assert.ok(source.includes("href={hrefWithGateReturn(safetyPriorityBlocker.actionHref, gateReturn)}"));
  assert.ok(safetySource.includes("\"risk-recovery\""));
  assert.ok(safetySource.includes("riskRecoveryCount === 0 ? \"pass\" : \"block\""));
  assert.ok(safetySource.includes("\"/tasks?view=blocked&debt=risk_recovery#task-debt\""));
});

test("tasks page exposes publish repair as a batch safety blocker", () => {
  const safetySource = readFileSync("src/lib/projects/batchExecutionSafety.ts", "utf8");

  assert.ok(source.includes("const safetyPriorityBlocker = buildBatchSafetyPriorityBlocker(safety);"));
  assert.ok(source.includes("href={hrefWithGateReturn(safetyPriorityBlocker.actionHref, gateReturn)}"));
  assert.ok(safetySource.includes("\"publish-repair\""));
  assert.ok(safetySource.includes("publishRepairCount === 0 ? \"pass\" : \"block\""));
  assert.ok(safetySource.includes("\"/tasks?view=blocked&debt=publish_repair#task-debt\""));
});

test("tasks page exposes export version as a batch safety blocker", () => {
  const safetySource = readFileSync("src/lib/projects/batchExecutionSafety.ts", "utf8");

  assert.ok(source.includes("const safetyPriorityBlocker = buildBatchSafetyPriorityBlocker(safety);"));
  assert.ok(source.includes("href={hrefWithGateReturn(safetyPriorityBlocker.actionHref, gateReturn)}"));
  assert.ok(safetySource.includes("\"export-version\""));
  assert.ok(safetySource.includes("exportVersionCount === 0 ? \"pass\" : \"block\""));
  assert.ok(safetySource.includes("\"/tasks?view=blocked&debt=export_version#task-debt\""));
});

test("tasks page blocks recommended batches when model roles are missing", () => {
  assert.ok(source.includes("const modelRolesBlockRecommendedBatch = modelRolePriorityBlocker?.tone === \"blocked\";"));
  assert.ok(source.includes("disabled={!safety.canRunRecommendedBatch || !executionPlan.canRun || modelRouteBlocksRecommendedBatch || modelRolesBlockRecommendedBatch}"));
  assert.ok(source.includes("canRun: safety.canRunRecommendedBatch && executionPlan.canRun && !modelRouteBlocksRecommendedBatch && !modelRolesBlockRecommendedBatch"));
});

test("recommended batch API blocks direct execution when model roles are missing", () => {
  const routeSource = readFileSync("src/app/api/tasks/recommended-batch/route.ts", "utf8");

  assert.ok(routeSource.includes("buildModelRoleMatrix"));
  assert.ok(routeSource.includes("buildModelRoleMatrixPriorityBlocker"));
  assert.ok(routeSource.includes("modelRolePriorityBlocker?.tone === \"blocked\""));
  assert.ok(routeSource.includes("return NextResponse.json({ error: modelRolePriorityBlocker.detail"));
  assert.ok(routeSource.includes("modelRoleBlocker: modelRolePriorityBlocker"));
});

test("recommended batch button surfaces model role repair actions from the API", () => {
  const buttonSource = readFileSync("src/components/tasks/RunRecommendedBatchButton.tsx", "utf8");

  assert.ok(buttonSource.includes("modelRoleBlocker?: {"));
  assert.ok(buttonSource.includes("setModelRoleBlocker(payload.modelRoleBlocker ?? null);"));
  assert.ok(buttonSource.includes("模型岗位修复"));
  assert.ok(buttonSource.includes("href={hrefWithGateReturn(modelRoleBlocker.actionHref, gateReturnHref)}"));
});

test("tasks page shows what a platform strategy task unlocks next", () => {
  assert.ok(source.includes("entry.sourceType === \"platform_strategy\" && entry.sourceNextStep"));
  assert.ok(source.includes("做完解锁："));
});

test("tasks page groups first-day execution outcomes in handoff work", () => {
  assert.ok(source.includes("firstDayOutcomeHandoffItems"));
  assert.ok(source.includes("queue.overview.firstDayOutcomeScale"));
  assert.ok(source.includes("queue.overview.firstDayOutcomeWatch"));
  assert.ok(source.includes("queue.overview.firstDayOutcomeBlocked"));
  assert.ok(source.includes("首日执行分流"));
  assert.ok(source.includes("可以扩展"));
  assert.ok(source.includes("继续观察"));
  assert.ok(source.includes("先避坑"));
  assert.ok(source.includes("entry.handoffGuidance.firstDayOutcome"));
  assert.ok(source.includes("firstDayOutcome.badge"));
  assert.ok(source.includes("firstDayOutcome.nextMove"));
  assert.ok(source.includes("firstDayOutcome.boundary"));
});

test("tasks page surfaces first-day scale batch receipts as a follow-up card", () => {
  assert.ok(source.includes("buildFirstDayScaleBatchRecord"));
  assert.ok(source.includes("firstDayScaleBatchRecord"));
  assert.ok(source.includes("首日扩展回流"));
  assert.ok(source.includes("firstDayScaleBatchRecord.decisionActionHref"));
  assert.ok(source.includes("firstDayScaleBatchRecord.decisionActionLabel"));
});

test("tasks page mirrors scale gate decision labels from the gate workspace", () => {
  assert.ok(source.includes("function scaleGateDecisionLabel"));
  assert.ok(source.includes("if (riskLevel === \"blocked\") return \"禁止放大\";"));
  assert.ok(source.includes("if (scaleGate === \"cleared\") return \"允许小步加码\";"));
  assert.ok(source.includes("if (scaleGate === \"sample_only\") return \"继续观察\";"));
  assert.ok(source.includes("{scaleGateDecisionLabel(entry.scaleGate, entry.riskLevel)}"));
});

test("tasks page shares execution scale decisions with recommended batch controls", () => {
  const buttonSource = readFileSync("src/components/tasks/RunRecommendedBatchButton.tsx", "utf8");

  assert.ok(source.includes("function executionScaleDecisionClass"));
  assert.ok(source.includes("{executionPlan.scaleDecisionLabel}"));
  assert.ok(source.includes("scaleDecisionLabel={executionPlan.scaleDecisionLabel}"));
  assert.ok(source.includes("scaleDecisionDetail={executionPlan.scaleDecisionDetail}"));
  assert.ok(source.includes("scaleDecisionTone={executionPlan.scaleDecisionTone}"));
  assert.ok(buttonSource.includes("scaleDecisionLabel?: string"));
  assert.ok(buttonSource.includes("scaleDecisionDetail?: string"));
  assert.ok(buttonSource.includes("scaleDecisionTone?: \"allow\" | \"watch\" | \"block\" | \"standard\""));
  assert.ok(buttonSource.includes("{scaleDecisionLabel ? ("));
});

test("tasks page shows failure repair resume scale decisions", () => {
  assert.ok(source.includes("failureRepairResumeBatchRecord.scaleDecisionLabel"));
  assert.ok(source.includes("failureRepairResumeBatchRecord.scaleDecisionDetail"));
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
