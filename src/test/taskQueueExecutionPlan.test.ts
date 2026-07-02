import test from "node:test";
import assert from "node:assert/strict";
import { buildTaskQueueExecutionPlan } from "../lib/projects/taskQueueExecutionPlan.ts";
import type { QueueItem } from "../lib/projects/taskQueueCenter.ts";

function queueItem(input: Partial<QueueItem> & Pick<QueueItem, "id" | "category" | "projectId" | "projectTitle" | "chapterTitle">): QueueItem {
  return {
    platformName: "番茄小说",
    blockerType: null,
    label: input.category,
    evidence: "可执行",
    actionLabel: "执行",
    href: "/projects/project-1",
    priority: input.category === "review" ? 10 : input.category === "second_pass" ? 20 : 30,
    ...input,
  };
}

test("buildTaskQueueExecutionPlan", async (t) => {
  await t.test("keeps the recommended batch in one project and one action category", () => {
    const plan = buildTaskQueueExecutionPlan([
      queueItem({ id: "project-1:review:chapter-1", category: "review", projectId: "project-1", projectTitle: "项目一", chapterTitle: "第一章" }),
      queueItem({ id: "project-1:review:chapter-2", category: "review", projectId: "project-1", projectTitle: "项目一", chapterTitle: "第二章" }),
      queueItem({ id: "project-2:review:chapter-3", category: "review", projectId: "project-2", projectTitle: "项目二", chapterTitle: "第三章" }),
      queueItem({ id: "project-1:draft:chapter-4", category: "draft", projectId: "project-1", projectTitle: "项目一", chapterTitle: "第四章" }),
    ]);

    assert.equal(plan.canRun, true);
    assert.equal(plan.category, "review");
    assert.equal(plan.projectId, "project-1");
    assert.deepEqual(plan.chapterIds, ["chapter-1", "chapter-2"]);
    assert.ok(plan.warnings.some((warning) => warning.includes("其他项目")));
  });

  await t.test("returns a blocked plan when there are no executable items", () => {
    const plan = buildTaskQueueExecutionPlan([
      queueItem({ id: "project-1:blocked:chapter-1", category: "blocked", projectId: "project-1", projectTitle: "项目一", chapterTitle: "第一章" }),
    ]);

    assert.equal(plan.canRun, false);
    assert.equal(plan.category, null);
    assert.equal(plan.chapterIds.length, 0);
  });
});
