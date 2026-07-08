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

function firstDayOutcomeGuidance(status: "scale" | "watch" | "blocked"): QueueItem["handoffGuidance"] {
  if (status === "scale") {
    return {
      label: "执行扩展交接",
      detail: "首日数据过线，可以进入小样本扩展。",
      firstDayActions: ["执行扩展：沿用生成-审稿-二改顺序，扩到下一章小样本。"],
      avoidRules: ["执行扩展不是直接批量放量。"],
      evidence: ["首日执行数据回收：进入小样本扩展"],
      firstDayOutcome: {
        status: "scale",
        badge: "可以扩展",
        title: "首日执行可扩展",
        nextMove: "扩到下一章小样本。",
        boundary: "未过下一轮数据前不直接批量复制。",
      },
    };
  }
  if (status === "watch") {
    return {
      label: "执行观察交接",
      detail: "首日追读证据不足。",
      firstDayActions: ["执行观察：只补追读和收藏证据，不扩展章节。"],
      avoidRules: ["首日数据还在观察，不要把补追读任务当成扩展通过。"],
      evidence: ["首日执行数据回收：继续观察"],
      firstDayOutcome: {
        status: "watch",
        badge: "继续观察",
        title: "首日执行继续观察",
        nextMove: "先补追读证据。",
        boundary: "追读证据不足前不扩展章节。",
      },
    };
  }
  return {
    label: "执行避坑交接",
    detail: "首日数据未过线。",
    firstDayActions: ["执行避坑：先重做入口卖点和前三章兑现。"],
    avoidRules: ["不要复用首日未过线的开头、平台包装或扩展节奏。"],
    evidence: ["首日执行数据回收：暂停"],
    firstDayOutcome: {
      status: "blocked",
      badge: "先避坑",
      title: "首日执行先避坑",
      nextMove: "先重做入口卖点。",
      boundary: "不要复用首日未过线的开头。",
    },
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

  await t.test("keeps platform strategy tasks out of the generic recommended batch", () => {
    const plan = buildTaskQueueExecutionPlan([
      queueItem({
        id: "project-1:platform-strategy:fanqie:rewrite-first-three",
        category: "second_pass",
        projectId: "project-1",
        projectTitle: "项目一",
        chapterTitle: "主平台策略执行链",
        sourceType: "platform_strategy",
        sourceLabel: "平台策略",
        sourceNextStep: "解锁前三章候选采纳：生成改写候选后，先采纳并回发布质检确认样章能投。",
        actionLabel: "重写前三章",
      }),
      queueItem({
        id: "project-1:second-pass:chapter-2",
        category: "second_pass",
        projectId: "project-1",
        projectTitle: "项目一",
        chapterTitle: "第二章",
      }),
    ]);

    assert.equal(plan.platformStrategyCount, 0);
    assert.deepEqual(plan.platformStrategyItemIds, []);
    assert.deepEqual(plan.itemIds, ["project-1:second-pass:chapter-2"]);
    assert.deepEqual(plan.chapterIds, ["chapter-2"]);
    assert.ok(!plan.warnings.some((warning) => warning.includes("解锁前三章候选采纳")));
  });

  await t.test("returns a blocked plan when there are no executable items", () => {
    const plan = buildTaskQueueExecutionPlan([
      queueItem({ id: "project-1:blocked:chapter-1", category: "blocked", projectId: "project-1", projectTitle: "项目一", chapterTitle: "第一章" }),
    ]);

    assert.equal(plan.canRun, false);
    assert.equal(plan.category, null);
    assert.equal(plan.chapterIds.length, 0);
  });

  await t.test("explains watch evidence blockers when no executable batch is allowed", () => {
    const plan = buildTaskQueueExecutionPlan([
      queueItem({
        id: "project-1:watch-scale-gate:fanqie",
        category: "blocked",
        blockerType: "watch_scale_gate",
        projectId: "project-1",
        projectTitle: "项目一",
        chapterTitle: "观察放量闸门",
        evidence: "需先完成小样本验收：通过线、不可接受项、复查证据、成功率、质量分、失败样本和放量结论齐全后再放量。",
        actionLabel: "完成小样本验收",
        href: "/dispatch?firstDayProject=project-1&step=first-draft#first-day-dispatch",
      }),
    ]);

    assert.equal(plan.canRun, false);
    assert.equal(plan.actionLabel, "先处理观察放量闸门");
    assert.ok(plan.detail.includes("成功率"));
    assert.ok(plan.detail.includes("质量分"));
    assert.ok(plan.warnings.some((warning) => warning.includes("完成小样本验收")));
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

  await t.test("limits first-day scale outcomes to one recovery sample", () => {
    const plan = buildTaskQueueExecutionPlan([
      queueItem({
        id: "project-1:draft:chapter-1",
        category: "draft",
        projectId: "project-1",
        projectTitle: "项目一",
        chapterTitle: "第一章",
        handoffGuidance: firstDayOutcomeGuidance("scale"),
      }),
      queueItem({
        id: "project-1:draft:chapter-2",
        category: "draft",
        projectId: "project-1",
        projectTitle: "项目一",
        chapterTitle: "第二章",
        handoffGuidance: firstDayOutcomeGuidance("scale"),
      }),
    ], 8);

    assert.equal(plan.canRun, true);
    assert.deepEqual(plan.itemIds, ["project-1:draft:chapter-1"]);
    assert.deepEqual(plan.chapterIds, ["chapter-1"]);
    assert.equal(plan.batchModeTone, "recovery");
    assert.ok(plan.batchModeLabel.includes("首日扩展"));
    assert.ok(plan.warnings.some((warning) => warning.includes("首日执行可扩展")));
    assert.ok(plan.warnings.some((warning) => warning.includes("不直接批量")));
  });

  await t.test("blocks first-day watch and avoidance outcomes from recommended batches", () => {
    const watchPlan = buildTaskQueueExecutionPlan([
      queueItem({
        id: "project-1:draft:chapter-1",
        category: "draft",
        projectId: "project-1",
        projectTitle: "项目一",
        chapterTitle: "第一章",
        handoffGuidance: firstDayOutcomeGuidance("watch"),
      }),
    ]);
    const blockedPlan = buildTaskQueueExecutionPlan([
      queueItem({
        id: "project-2:draft:chapter-1",
        category: "draft",
        projectId: "project-2",
        projectTitle: "项目二",
        chapterTitle: "第一章",
        handoffGuidance: firstDayOutcomeGuidance("blocked"),
      }),
    ]);

    assert.equal(watchPlan.canRun, false);
    assert.ok(watchPlan.actionLabel.includes("先补首日观察证据"));
    assert.ok(watchPlan.detail.includes("继续观察"));
    assert.ok(watchPlan.warnings.some((warning) => warning.includes("追读证据")));

    assert.equal(blockedPlan.canRun, false);
    assert.ok(blockedPlan.actionLabel.includes("先处理首日避坑"));
    assert.ok(blockedPlan.detail.includes("先避坑"));
    assert.ok(blockedPlan.warnings.some((warning) => warning.includes("重做入口")));
  });
});
