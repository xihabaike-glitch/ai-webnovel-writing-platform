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
