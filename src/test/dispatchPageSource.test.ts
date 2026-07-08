import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/app/dispatch/page.tsx", "utf8");

test("dispatch page shows invalid queue feedback", () => {
  assert.ok(source.includes("invalidQueueNotice"));
  assert.ok(source.includes("queueParam ? `派单队列「${queueParam}」不存在，已显示全部派单。` : null"));
  assert.ok(source.includes("查看全部派单"));
  assert.ok(source.includes("href={hrefWithGateReturn(\"/dispatch\", gateReturn)}"));
});

test("dispatch page keeps a gate recheck return path visible", () => {
  assert.ok(source.includes("gateReturnFromParam"));
  assert.ok(source.includes("gateReturn"));
  assert.ok(source.includes("function hrefWithGateReturn"));
  assert.ok(source.includes("base.includes(\"gateReturn=\")"));
  assert.ok(source.includes("来自总闸门复检"));
  assert.ok(source.includes("回总闸门复检"));
});

test("dispatch page shows dispatch receipt closeout before returning to gate", () => {
  assert.ok(source.includes("dispatchReceiptCloseoutPercent"));
  assert.ok(source.includes("派发回执闭环面板"));
  assert.ok(source.includes("id=\"dispatch-receipt-closeout\""));
  assert.ok(source.includes("aria-label=\"派发回执完成率\""));
  assert.ok(source.includes("dispatchReceiptGateReturnLabel"));
  assert.ok(source.includes("dispatchReceiptNextCutLabel"));
  assert.ok(source.includes("回总闸门判断"));
  assert.ok(source.includes("未闭环派单"));
  assert.ok(source.includes("下一刀"));
  assert.ok(source.includes("/gate#pipeline-final-review"));
  assert.ok(source.includes("查看最终交付正式放行卡"));
});

test("dispatch page exposes a task center anchor for role dispatch evidence", () => {
  assert.ok(source.includes("id=\"dispatch-task-center\""));
  assert.ok(source.includes("<GateDispatchTaskCenter"));
});

test("dispatch page shows role intent handoff from project role navigator", () => {
  assert.ok(source.includes("roleIntentFromParams"));
  assert.ok(source.includes("roleIntent"));
  assert.ok(source.includes("来自作品角色入口"));
  assert.ok(source.includes("roleIntent.modelOwner"));
  assert.ok(source.includes("roleIntent.acceptance"));
  assert.ok(source.includes("回作品工作区"));
});
