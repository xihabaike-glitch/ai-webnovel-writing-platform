import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("src/components/gate/GateDispatchTaskCenter.tsx", "utf8");
const dispatchPageSource = readFileSync("src/app/dispatch/page.tsx", "utf8");

test("dispatch task center sends completed acceptance dispatches back to gate recheck", () => {
  assert.ok(source.includes("dispatchGateRecheckHref"));
  assert.ok(source.includes("focus=action-recheck"));
  assert.ok(source.includes("project-acceptance:${encodeURIComponent(projectId)}"));
  assert.ok(source.includes("回总闸门复检"));
});

test("dispatch task center highlights the dispatch targeted by the URL hash", () => {
  assert.ok(source.includes("dispatchKeyFromHash"));
  assert.ok(source.includes("hashFocusedDispatchKey"));
  assert.ok(source.includes("window.addEventListener(\"hashchange\", syncHashFocus)"));
  assert.ok(source.includes("task.dispatchKey === hashFocusedDispatchKey"));
  assert.ok(source.includes("刚生成的派单"));
});

test("dispatch task center points completed dispatches back to remaining gate blockers", () => {
  assert.ok(source.includes("buildGateRecheckActionLink"));
  assert.ok(source.includes("回总闸门复检并查看剩余卡点"));
  assert.ok(source.includes("查看剩余卡点"));
  assert.ok(source.includes("buildGateRecheckActionLink(updated.task)"));
});

test("dispatch task center routes completed role closure dispatches back to gate recheck", () => {
  assert.ok(source.includes("isRoleClosureDispatchTask(updated.task)"));
  assert.ok(source.includes("角色闭环已完成"));
  assert.ok(source.includes("回总闸门复检角色闭环"));
  assert.ok(source.includes("isRoleClosureTask"));
  assert.ok(source.includes("角色闭环回填"));
});

test("dispatch task center carries gate return into internal work links", () => {
  assert.ok(dispatchPageSource.includes("gateReturnHref={gateReturn}"));
  assert.ok(source.includes("gateReturnHref?: string | null"));
  assert.ok(source.includes("function hrefWithGateReturn"));
  assert.ok(source.includes("href={gateReturnHref ?? \"/gate\"}"));
  assert.ok(source.includes("href={hrefWithGateReturn(firstDayDesk.nextTask.firstDayHref, gateReturnHref)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(card.firstDayHref, gateReturnHref)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(card.href, gateReturnHref)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(task.href, gateReturnHref)}"));
});

test("dispatch task center carries gate return through dashboard work entry links", () => {
  assert.ok(source.includes("href={hrefWithGateReturn(firstDayDesk.completionGateCta.primaryHref, gateReturnHref)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(group.executionGuide.primaryHref, gateReturnHref)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(chain.reviewIntervention.href, gateReturnHref)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(chain.latestHref, gateReturnHref)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(routeConfirmationDispatchFlow.emptyGuide.primaryHref, gateReturnHref)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(routeConfirmationDispatchFlow.emptyGuide.secondaryHref, gateReturnHref)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(item.href, gateReturnHref)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(routeActionLink.href, gateReturnHref)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(routeActionLink.secondary.href, gateReturnHref)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(routeExecutionDesk.emptyState.href, gateReturnHref)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(routeExecutionDesk.nextTask.href, gateReturnHref)}"));
  assert.ok(source.includes("href={hrefWithGateReturn(item.href, gateReturnHref)} key={item.dispatchKey}"));
});

test("dispatch task center renders a role intent task draft", () => {
  assert.ok(dispatchPageSource.includes("initialRoleIntent={roleIntent}"));
  assert.ok(source.includes("initialRoleIntent?: DispatchRoleIntent | null"));
  assert.ok(source.includes("角色任务草稿"));
  assert.ok(source.includes("initialRoleIntent.modelOwner"));
  assert.ok(source.includes("initialRoleIntent.acceptance"));
  assert.ok(source.includes("href={hrefWithGateReturn(initialRoleIntent.returnHref, gateReturnHref)}"));
});

test("dispatch task center can persist a role intent as a formal dispatch", () => {
  assert.ok(source.includes("buildRoleIntentDispatch"));
  assert.ok(source.includes("createRoleIntentDispatch"));
  assert.ok(source.includes("creatingRoleIntentDispatch"));
  assert.ok(source.includes("const created = await persistGateDispatchTask(buildRoleIntentDispatch(initialRoleIntent));"));
  assert.ok(source.includes("nextByKey.set(created.dispatchKey, created);"));
  assert.ok(source.includes("setFocusedCompletionDispatchKey(created.dispatchKey);"));
  assert.ok(source.includes("创建正式任务"));
});

test("dispatch task center creates acceptance gap drafts as gate recheck tasks", () => {
  assert.ok(source.includes("initialRoleIntent.roleIntent === \"acceptance-gap\""));
  assert.ok(source.includes("验收缺口已生成正式派单"));
  assert.ok(source.includes("回总闸门复检验收缺口"));
  assert.ok(source.includes("dispatchGateRecheckHref(created)"));
  assert.ok(source.includes("task.projectId ?? projectIdFromFirstDayDispatchKey(task.dispatchKey)"));
});

test("role intent dispatch targets the matching project work area", () => {
  assert.ok(source.includes("roleIntentWorkAreaLabel"));
  assert.ok(source.includes("story-structure"));
  assert.ok(source.includes("结构诊断"));
  assert.ok(source.includes("context-recall"));
  assert.ok(source.includes("项目土壤"));
  assert.ok(source.includes("platform-export"));
  assert.ok(source.includes("平台导出"));
  assert.ok(source.includes("acceptance-gap"));
  assert.ok(source.includes("验收缺口"));
  assert.ok(source.includes("actionLabel: `打开${workAreaLabel}`"));
  assert.ok(source.includes("`工作区：${workAreaLabel}`"));
});

test("dispatch task center groups gate role closure dispatches", () => {
  assert.ok(source.includes("role_closure"));
  assert.ok(source.includes("isRoleClosureDispatchTask"));
  assert.ok(source.includes("roleClosureTaskKeys"));
  assert.ok(source.includes("activeRoleClosureTasks"));
  assert.ok(source.includes("角色闭环"));
  assert.ok(source.includes("结构"));
  assert.ok(source.includes("资料"));
  assert.ok(source.includes("平台"));
  assert.ok(source.includes("只看角色闭环"));
  assert.ok(source.includes("queueFilter === \"role_closure\""));
});

test("dispatch task center auto-fills role closure completion templates", () => {
  assert.ok(source.includes("roleClosureCompletionTemplates"));
  assert.ok(source.includes("buildGateDispatchCompletionTemplate(task)"));
  assert.ok(source.includes("if (current[task.dispatchKey]?.trim()) continue"));
  assert.ok(source.includes("[task.dispatchKey]: template"));
});

test("dispatch task center auto-fills acceptance gap completion templates", () => {
  assert.ok(source.includes("isAcceptanceGapDispatchTask"));
  assert.ok(source.includes("acceptanceGapCompletionTemplates"));
  assert.ok(source.includes("验收缺口完成依据模板"));
  assert.ok(source.includes("完成项："));
  assert.ok(source.includes("人工验收："));
  assert.ok(source.includes("回总闸门复检："));
});

test("dispatch task center auto-fills chapter adoption follow-up templates", () => {
  assert.ok(source.includes("isChapterAdoptionDispatchTask"));
  assert.ok(source.includes("chapterAdoptionCompletionTemplates"));
  assert.ok(source.includes("buildChapterAdoptionCompletionTemplate(task)"));
  assert.ok(source.includes("采纳后审稿完成依据模板"));
  assert.ok(source.includes("采纳后二改完成依据模板"));
  assert.ok(source.includes("二改采纳后发布质检模板"));
  assert.ok(source.includes("采纳版本："));
  assert.ok(source.includes("人工验收：通过 / 退回"));
  assert.ok(source.includes("下一步：进入二改 / 回发布质检 / 继续修稿"));
});

test("dispatch task center shows dispatch receipt acceptance criteria before completion", () => {
  assert.ok(source.includes("dispatchReceiptAcceptanceCriteria"));
  assert.ok(source.includes("任务回执验收口径"));
  assert.ok(source.includes("执行角色"));
  assert.ok(source.includes("输入"));
  assert.ok(source.includes("输出"));
  assert.ok(source.includes("人工验收"));
  assert.ok(source.includes("下一步"));
  assert.ok(source.includes("dispatchReceiptAcceptanceCriteria.map"));
});

test("dispatch task center labels acceptance recheck next-step dispatches", () => {
  assert.ok(source.includes("isProjectAcceptanceNextDispatchTask"));
  assert.ok(source.includes("project-acceptance-next:"));
  assert.ok(source.includes("总闸门复检分流"));
  assert.ok(source.includes("复检分流补证据模板"));
  assert.ok(source.includes("回总闸门复检结论："));
});

test("dispatch task center explains which gate blockers recheck receipts can close", () => {
  assert.ok(source.includes("projectAcceptanceNextImpactHint"));
  assert.ok(source.includes("这张复检收据会关闭发布包验收卡点"));
  assert.ok(source.includes("这张复检收据会关闭资料官、平台包装角色线"));
  assert.ok(source.includes("复检分流已完成"));
  assert.ok(source.includes("回总闸门查看卡点变化"));
});

test("dispatch task center shows acceptance recheck receipt counts", () => {
  assert.ok(source.includes("待总闸门复检"));
  assert.ok(source.includes("evidenceReview.summary.acceptanceRecheck"));
});
