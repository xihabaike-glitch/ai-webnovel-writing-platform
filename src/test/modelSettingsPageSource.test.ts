import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/app/settings/models/page.tsx", "utf8");
const settingsSource = readFileSync("src/components/settings/ModelProviderSettings.tsx", "utf8");

test("model settings page keeps a gate recheck return path visible", () => {
  assert.ok(source.includes("gateReturnFromParam"));
  assert.ok(source.includes("gateReturn"));
  assert.ok(source.includes("来自总闸门复检"));
  assert.ok(source.includes("回总闸门复检"));
});

test("model settings page carries gate return through model routing links", () => {
  assert.ok(source.includes("gateReturnHref={gateReturn}"));

  assert.ok(settingsSource.includes("gateReturnHref?: string | null"));
  assert.ok(settingsSource.includes("function hrefWithGateReturn"));
  assert.ok(settingsSource.includes("href={hrefWithGateReturn(\"/settings/models\", gateReturnHref)}"));
  assert.ok(settingsSource.includes("href={hrefWithGateReturn(modelRoleMatrix.interfaceCoverage.actionHref, gateReturnHref)}"));
  assert.ok(settingsSource.includes("href={hrefWithGateReturn(modelRoleMatrixPmFocusNotice.actionHref, gateReturnHref)}"));
  assert.ok(settingsSource.includes("href={hrefWithGateReturn(modelRoleMatrixPmFocusNotice.pipelineActionHref, gateReturnHref)}"));
  assert.ok(settingsSource.includes("href={hrefWithGateReturn(routeNotice.href, gateReturnHref)}"));
  assert.ok(settingsSource.includes("href={hrefWithGateReturn(governanceStatus.nextRecheck.href, gateReturnHref)}"));
  assert.ok(settingsSource.includes("href={hrefWithGateReturn(\"/dispatch\", gateReturnHref)}"));
  assert.ok(settingsSource.includes("href={hrefWithGateReturn(providerSetupNotice.href, gateReturnHref)}"));
  assert.ok(settingsSource.includes("href={hrefWithGateReturn(\"/projects\", gateReturnHref)}"));
});

test("model settings retest dispatch notice links back into dispatch center", () => {
  assert.ok(settingsSource.includes("setRouteNotice({ message: `已生成「${item.providerName}」复测派单`, href: \"/dispatch\", actionLabel: \"去派单中心查看复测任务\" });"));
  assert.ok(settingsSource.includes("href={hrefWithGateReturn(routeNotice.href, gateReturnHref)}"));
});

test("model settings renders concrete provider interface contracts", () => {
  assert.ok(source.includes("providerInterfaceContracts"));
  assert.ok(source.includes("interfaceContracts={providerInterfaceContracts}"));

  assert.ok(settingsSource.includes("interfaceContracts: ProviderInterfaceContractView[]"));
  assert.ok(settingsSource.includes("模型接口合同"));
  assert.ok(settingsSource.includes("id=\"model-provider-interface-contracts\""));
  assert.ok(settingsSource.includes("interfaceContracts.map"));
  assert.ok(settingsSource.includes("contract.protocolLabel"));
  assert.ok(settingsSource.includes("contract.authHeaderLabel"));
  assert.ok(settingsSource.includes("contract.requestPath"));
  assert.ok(settingsSource.includes("contract.defaultBaseUrl"));
  assert.ok(settingsSource.includes("contract.connectionTestLabel"));
});

test("model settings exposes gate recheck inside model setup action notices", () => {
  assert.ok(settingsSource.includes("模型配置动作已完成"));
  assert.ok(settingsSource.includes("回总闸门复检"));
  assert.ok(settingsSource.includes("href={gateReturnHref}"));
  assert.ok(settingsSource.includes("gateReturnHref ? ("));
});

test("model settings summarizes model role route closeout for PM review", () => {
  assert.ok(settingsSource.includes("模型职责路线收口面板"));
  assert.ok(settingsSource.includes("modelRoleRouteCloseoutPercent"));
  assert.ok(settingsSource.includes("aria-label=\"模型职责路线完成率\""));
  assert.ok(settingsSource.includes("放行判断"));
  assert.ok(settingsSource.includes("收口缺口"));
  assert.ok(settingsSource.includes("下一刀"));
  assert.ok(settingsSource.includes("modelRoleRouteNextCutLabel"));
  assert.ok(settingsSource.includes("modelRoleRouteReleaseLabel"));
});

test("model settings renders the PM model role repair queue", () => {
  assert.ok(source.includes("buildModelRoleRepairQueue"));
  assert.ok(source.includes("modelRoleRepairQueue"));
  assert.ok(settingsSource.includes("模型岗位 PM 修复队列"));
  assert.ok(settingsSource.includes("modelRoleRepairQueue.map"));
  assert.ok(settingsSource.includes("item.priorityLabel"));
  assert.ok(settingsSource.includes("item.repairLabel"));
  assert.ok(settingsSource.includes("item.evidenceChecklist.map"));
  assert.ok(settingsSource.includes("href={hrefWithGateReturn(item.href, gateReturnHref)}"));
  assert.ok(settingsSource.includes("href={hrefWithGateReturn(item.gateReturnHref, gateReturnHref)}"));
});
