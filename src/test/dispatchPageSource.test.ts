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
