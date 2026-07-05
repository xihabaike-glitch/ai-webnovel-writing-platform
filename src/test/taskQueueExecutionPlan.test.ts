import test from "node:test";
import assert from "node:assert/strict";
import { getBatchExecutionStrategy } from "../lib/projects/batchExecutionStrategy.ts";
import { buildTaskQueueExecutionPlan } from "../lib/projects/taskQueueExecutionPlan.ts";
import type { QueueItem } from "../lib/projects/taskQueueCenter.ts";

function queueItem(input: Partial<QueueItem> & Pick<QueueItem, "id" | "category" | "projectId" | "projectTitle" | "chapterTitle">): QueueItem {
  return {
    platformName: "番茄小说",
    blockerType: null,
    label: input.category,
    evidence: "可执行",
    riskLevel: "standard",
    riskLabel: "标准",
    riskNotice: null,
    scaleGate: "none",
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

  await t.test("summarizes start tactics for the recommended batch", () => {
    const strategyBasis = {
      title: "首轮平台打法：番茄小说",
      label: "模板推荐",
      primaryTactic: "先抓首章钩子，再用前三章连续兑现爽点。",
      openingMove: "第一段给倒计时。",
      verificationMove: "审稿前看前三章追读。",
      risk: "慢热会掉首秀。",
    };
    const plan = buildTaskQueueExecutionPlan([
      queueItem({ id: "project-1:review:chapter-1", category: "review", projectId: "project-1", projectTitle: "项目一", chapterTitle: "第一章", strategyBasis }),
      queueItem({ id: "project-1:review:chapter-2", category: "review", projectId: "project-1", projectTitle: "项目一", chapterTitle: "第二章", strategyBasis }),
    ]);

    assert.equal(plan.strategyBases.length, 1);
    assert.equal(plan.strategyBases[0].label, "模板推荐");
    assert.ok(plan.strategyBases[0].openingMove.includes("倒计时"));
  });

  await t.test("warns when adoption follow-up tasks enter the recommended batch", () => {
    const plan = buildTaskQueueExecutionPlan([
      queueItem({
        id: "project-1:adoption-followup:first-three-adoption:project-1:chapter-1:revision-1:review",
        category: "review",
        projectId: "project-1",
        projectTitle: "项目一",
        chapterTitle: "第 1 章采纳后重新审稿",
        sourceType: "first_three_adoption",
        sourceLabel: "采纳闭环",
        executionChapterId: "chapter-1",
      }),
      queueItem({
        id: "project-1:review:chapter-2",
        category: "review",
        projectId: "project-1",
        projectTitle: "项目一",
        chapterTitle: "第二章",
      }),
    ]);

    assert.equal(plan.adoptionFollowupCount, 1);
    assert.deepEqual(plan.chapterIds, ["chapter-1", "chapter-2"]);
    assert.ok(plan.warnings.some((warning) => warning.includes("采纳闭环任务")));
    assert.ok(plan.warnings.some((warning) => warning.includes("回总闸门复检")));
  });

  await t.test("returns a blocked plan when there are no executable items", () => {
    const plan = buildTaskQueueExecutionPlan([
      queueItem({ id: "project-1:blocked:chapter-1", category: "blocked", projectId: "project-1", projectTitle: "项目一", chapterTitle: "第一章" }),
    ]);

    assert.equal(plan.canRun, false);
    assert.equal(plan.category, null);
    assert.equal(plan.chapterIds.length, 0);
  });

  await t.test("allows aggressive same-action batches to cross projects", () => {
    const plan = buildTaskQueueExecutionPlan([
      queueItem({ id: "project-1:review:chapter-1", category: "review", projectId: "project-1", projectTitle: "项目一", chapterTitle: "第一章" }),
      queueItem({ id: "project-2:review:chapter-2", category: "review", projectId: "project-2", projectTitle: "项目二", chapterTitle: "第二章" }),
      queueItem({ id: "project-3:review:chapter-3", category: "review", projectId: "project-3", projectTitle: "项目三", chapterTitle: "第三章" }),
    ], 8, getBatchExecutionStrategy("aggressive"));

    assert.deepEqual(plan.projectIds, ["project-1", "project-2", "project-3"]);
    assert.deepEqual(plan.chapterIds, ["chapter-1", "chapter-2", "chapter-3"]);
    assert.ok(plan.warnings.some((warning) => warning.includes("跨 3 个项目")));
  });

  await t.test("keeps watch scale-up gate to one sample even in aggressive mode", () => {
    const plan = buildTaskQueueExecutionPlan([
      queueItem({ id: "project-1:draft:chapter-1", category: "draft", projectId: "project-1", projectTitle: "项目一", chapterTitle: "第一章", riskLevel: "watch", riskLabel: "恢复观察", scaleGate: "sample_only", actionLabel: "生成小样本" }),
      queueItem({ id: "project-2:draft:chapter-2", category: "draft", projectId: "project-2", projectTitle: "项目二", chapterTitle: "第二章", riskLevel: "watch", riskLabel: "恢复观察", scaleGate: "sample_only", actionLabel: "生成小样本" }),
    ], 8, getBatchExecutionStrategy("aggressive"));

    assert.equal(plan.canRun, true);
    assert.deepEqual(plan.itemIds, ["project-1:draft:chapter-1"]);
    assert.deepEqual(plan.chapterIds, ["chapter-1"]);
    assert.ok(plan.warnings.some((warning) => warning.includes("小样本闸门")));
  });

  await t.test("marks cleared watch drafts as recovery scale-up batches", () => {
    const plan = buildTaskQueueExecutionPlan([
      queueItem({ id: "project-1:draft:chapter-1", category: "draft", projectId: "project-1", projectTitle: "项目一", chapterTitle: "第一章", riskLevel: "watch", riskLabel: "恢复观察", scaleGate: "cleared", actionLabel: "生成初稿" }),
      queueItem({ id: "project-1:draft:chapter-2", category: "draft", projectId: "project-1", projectTitle: "项目一", chapterTitle: "第二章", riskLevel: "watch", riskLabel: "恢复观察", scaleGate: "cleared", actionLabel: "生成初稿" }),
    ]);

    assert.equal(plan.scaleGate, "cleared");
    assert.deepEqual(plan.chapterIds, ["chapter-1", "chapter-2"]);
    assert.equal(plan.batchModeLabel, "复检通过恢复批");
    assert.equal(plan.batchModeTone, "recovery");
    assert.ok(plan.batchModeDetail.includes("谨慎恢复"));
    assert.ok(plan.warnings.some((warning) => warning.includes("恢复放量")));
  });

  await t.test("labels third-round stable batches as cautious scale-up", () => {
    const strategyBasis = {
      title: "首轮平台打法：番茄小说",
      label: "三轮稳住",
      primaryTactic: "三轮数据已站住，可以小批放大。",
      openingMove: "复用首章高压钩子。",
      verificationMove: "继续回填曝光、点击、收藏和追读。",
      risk: "稳定加码不是无限放量。",
    };
    const plan = buildTaskQueueExecutionPlan([
      queueItem({ id: "project-1:draft:chapter-1", category: "draft", projectId: "project-1", projectTitle: "项目一", chapterTitle: "第一章", strategyBasis }),
      queueItem({ id: "project-1:draft:chapter-2", category: "draft", projectId: "project-1", projectTitle: "项目一", chapterTitle: "第二章", strategyBasis }),
    ]);

    assert.equal(plan.canRun, true);
    assert.deepEqual(plan.chapterIds, ["chapter-1", "chapter-2"]);
    assert.ok(plan.warnings.some((warning) => warning.includes("三轮稳住样本")));
    assert.ok(plan.warnings.some((warning) => warning.includes("不要把稳定加码理解成无限放量")));
  });

  await t.test("keeps third-round downgrade batches in repair sample language", () => {
    const strategyBasis = {
      title: "首轮平台打法：七猫",
      label: "三轮降档",
      primaryTactic: "只复用修复流程。",
      openingMove: "重修前三章兑现。",
      verificationMove: "小样本通过后再放大。",
      risk: "不能直接进入稳定加码。",
    };
    const plan = buildTaskQueueExecutionPlan([
      queueItem({ id: "project-1:draft:chapter-1", category: "draft", projectId: "project-1", projectTitle: "项目一", chapterTitle: "第一章", strategyBasis, riskLevel: "watch", riskLabel: "三轮降档", scaleGate: "sample_only", actionLabel: "生成小样本" }),
      queueItem({ id: "project-1:draft:chapter-2", category: "draft", projectId: "project-1", projectTitle: "项目一", chapterTitle: "第二章", strategyBasis, riskLevel: "watch", riskLabel: "三轮降档", scaleGate: "sample_only", actionLabel: "生成小样本" }),
    ]);

    assert.deepEqual(plan.chapterIds, ["chapter-1"]);
    assert.ok(plan.warnings.some((warning) => warning.includes("三轮降档样本")));
    assert.ok(plan.warnings.some((warning) => warning.includes("观察小样本闸门")));
  });
});
