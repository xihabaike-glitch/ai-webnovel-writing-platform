import test from "node:test";
import assert from "node:assert/strict";
import { buildProjectStartDecisionActionReceipt } from "../lib/projects/projectStartDecisionActions.ts";

test("buildProjectStartDecisionActionReceipt", async (t) => {
  await t.test("records created platform soil for seed decisions", () => {
    const receipt = buildProjectStartDecisionActionReceipt({
      projectId: "project-1",
      projectTitle: "夜雨系统",
      platformId: "fanqie",
      platformName: "番茄小说",
      decision: {
        status: "seed",
        label: "先建打法",
        headline: "这个项目还没有首轮平台打法，先别让 AI 自由发挥。",
        nextExperiment: "先生成平台土壤和首轮开书打法，再进入前三章、审稿和发布包装。",
        actionLabel: "补平台土壤",
        targetAnchor: "world-bible",
        evidence: ["未找到首轮平台打法记录。"],
      },
      startTactic: null,
      created: ["核心规则", "番茄小说平台土壤"],
      skipped: null,
      now: "2026-07-03T12:00:00.000Z",
    });

    assert.equal(receipt.actionId, "project_start_decision:seed:fanqie");
    assert.equal(receipt.executionType, "manual");
    assert.equal(receipt.status, "succeeded");
    assert.equal(receipt.succeededCount, 2);
    assert.equal(receipt.failedCount, 0);
    assert.equal(receipt.href, "/projects/project-1#world-bible");
    assert.ok(receipt.label.includes("先建打法"));
    assert.ok(receipt.message.includes("核心规则"));
    assert.equal(receipt.recheck.status, "ready");
    assert.equal(receipt.recheck.actionLabel, "刷新项目总控");
    assert.deepEqual(receipt.startTactics, []);
  });

  await t.test("keeps avoidance decisions blocked until first-three rewrite is handled", () => {
    const receipt = buildProjectStartDecisionActionReceipt({
      projectId: "project-2",
      projectTitle: "替身归来",
      platformId: "qimao",
      platformName: "七猫免费小说",
      decision: {
        status: "pause",
        label: "先停用",
        headline: "这套开书打法已经带着避坑信号，别再复用到新批次。",
        nextExperiment: "先重写前三章开头和平台包装，只做小批验证，等审稿分和失败率回正再恢复。",
        actionLabel: "重写前三章",
        targetAnchor: "first-three-rewrite",
        evidence: ["来源：批量避坑"],
      },
      startTactic: {
        title: "首轮平台打法：七猫免费小说",
        label: "批量避坑",
        primaryTactic: "不要复用慢热设定开场。",
        openingMove: "第一屏先给身份暴露。",
        verificationMove: "只做小批验证。",
        risk: "暂停继续放量。",
      },
      created: [],
      skipped: "已记录避坑动作。",
      now: "2026-07-03T12:05:00.000Z",
    });

    assert.equal(receipt.actionId, "project_start_decision:pause:qimao");
    assert.equal(receipt.href, "/projects/project-2#first-three-rewrite");
    assert.equal(receipt.succeededCount, 1);
    assert.equal(receipt.recheck.status, "blocked");
    assert.equal(receipt.recheck.actionLabel, "完成重写后复查");
    assert.equal(receipt.startTactics?.[0].label, "批量避坑");
    assert.ok(receipt.message.includes("重写前三章"));
    assert.ok(receipt.detail.includes("先重写前三章"));
  });
});
