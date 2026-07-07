import assert from "node:assert/strict";
import test from "node:test";
import { buildDevelopmentOverview } from "../lib/development/developmentOverview.ts";

test("buildDevelopmentOverview", async (t) => {
  await t.test("summarizes the current product delivery scope", () => {
    const overview = buildDevelopmentOverview();

    assert.equal(overview.platformScope.corePlatformCount, 8);
    assert.equal(overview.platformScope.completedPlatformCount, 8);
    assert.equal(overview.platformScope.pausedExpansionCount, 10);
    assert.equal(overview.platformScope.expansionLabel, "剩余 10 个平台不再添加");
    assert.ok(overview.referenceCount >= 30);
    assert.equal(overview.modelInterfaces.total, 4);
    assert.deepEqual(
      overview.modelInterfaces.items.map((item) => item.providerId),
      ["claude", "deepseek", "kimi", "gpt"],
    );
  });

  await t.test("builds a PM-facing development document map", () => {
    const overview = buildDevelopmentOverview();

    assert.ok(overview.pmFocus.headline.includes("开发文档"));
    assert.ok(overview.pmFocus.detail.includes("写作"));
    assert.ok(overview.pmFocus.detail.includes("投稿"));
    assert.ok(overview.pmFocus.detail.includes("复盘"));
    assert.equal(overview.pmFocus.actionHref, "/projects");
    assert.equal(overview.docSections.length, 5);
    assert.deepEqual(
      overview.docSections.map((section) => section.id),
      ["product_scope", "writing_workflow", "model_interfaces", "platform_delivery", "pm_gates"],
    );

    for (const section of overview.docSections) {
      assert.ok(section.title.length >= 4);
      assert.ok(section.summary.length >= 20);
      assert.ok(section.acceptance.length >= 12);
      assert.ok(section.href.startsWith("/"));
      assert.ok(section.evidenceItems.length >= 2);
    }
  });

  await t.test("keeps the tree-writing workflow visible as the product spine", () => {
    const overview = buildDevelopmentOverview();

    assert.deepEqual(
      overview.treeWorkflow.map((step) => step.id),
      ["opening", "ending", "trunk", "branches", "leaves", "soil"],
    );
    assert.ok(overview.treeWorkflow[0].name.includes("开头"));
    assert.ok(overview.treeWorkflow[0].pmRule.includes("钩子"));
    assert.ok(overview.treeWorkflow[1].name.includes("结尾"));
    assert.ok(overview.treeWorkflow.at(-1)?.name.includes("土壤"));
  });

  await t.test("prioritizes the next route instead of expanding more platforms", () => {
    const overview = buildDevelopmentOverview();

    assert.equal(overview.nextActions[0].href, "/projects");
    assert.ok(overview.nextActions[0].label.includes("作品"));
    assert.ok(overview.nextActions.some((action) => action.href === "/settings/models"));
    assert.ok(overview.nextActions.some((action) => action.href === "/references"));
    assert.equal(
      overview.nextActions.some((action) => action.label.includes("新增平台")),
      false,
    );
  });

  await t.test("builds a delivery audit from the original product requirements", () => {
    const overview = buildDevelopmentOverview();

    assert.equal(overview.deliveryAudit.summary.total, overview.deliveryAudit.items.length);
    assert.ok(overview.deliveryAudit.summary.total >= 8);
    assert.equal(overview.deliveryAudit.summary.blocked, 0);
    assert.ok(overview.deliveryAudit.summary.ready >= 6);
    assert.ok(overview.deliveryAudit.headline.includes("交付验收"));
    assert.ok(overview.deliveryAudit.pmVerdict.includes("剩余 10 个平台不再添加"));

    const auditIds = overview.deliveryAudit.items.map((item) => item.id);
    assert.deepEqual(auditIds, [
      "reference_cases",
      "platform_scope",
      "length_modes",
      "tree_workflow",
      "model_interfaces",
      "ai_roles",
      "writing_pipeline",
      "pm_gates",
    ]);

    for (const item of overview.deliveryAudit.items) {
      assert.ok(["ready", "watch", "blocked"].includes(item.status));
      assert.ok(item.title.length >= 4);
      assert.ok(item.requirement.length >= 10);
      assert.ok(item.evidence.length >= 10);
      assert.ok(item.href.startsWith("/"));
      assert.notEqual(item.nextStep.includes("新增平台"), true);
    }

    const platformScope = overview.deliveryAudit.items.find((item) => item.id === "platform_scope");
    const modelInterfaces = overview.deliveryAudit.items.find((item) => item.id === "model_interfaces");
    const treeWorkflow = overview.deliveryAudit.items.find((item) => item.id === "tree_workflow");

    assert.equal(platformScope?.status, "ready");
    assert.ok(platformScope?.evidence.includes("8/8 核心平台已完成"));
    assert.ok(platformScope?.evidence.includes("剩余 10 个平台不再添加"));
    assert.equal(modelInterfaces?.status, "ready");
    assert.ok(modelInterfaces?.evidence.includes("Claude"));
    assert.ok(modelInterfaces?.evidence.includes("DeepSeek"));
    assert.ok(modelInterfaces?.evidence.includes("Kimi"));
    assert.ok(modelInterfaces?.evidence.includes("GPT"));
    assert.equal(treeWorkflow?.status, "ready");
    assert.ok(treeWorkflow?.evidence.includes("开头"));
    assert.ok(treeWorkflow?.evidence.includes("土壤"));
  });

  await t.test("builds an executable writing-to-submission proof route", () => {
    const overview = buildDevelopmentOverview();

    assert.ok(overview.pipelineProofRoute.headline.includes("流水线验收"));
    assert.ok(overview.pipelineProofRoute.pmRule.includes("不跳过人工采用"));
    assert.equal(overview.pipelineProofRoute.steps.length, 6);
    assert.deepEqual(
      overview.pipelineProofRoute.steps.map((step) => step.id),
      ["project_start", "sample_draft", "task_dispatch", "gate_check", "failure_repair", "publish_package"],
    );

    for (const [index, step] of overview.pipelineProofRoute.steps.entries()) {
      assert.equal(step.order, index + 1);
      assert.ok(step.title.length >= 4);
      assert.ok(step.owner.length >= 4);
      assert.ok(step.href.startsWith("/"));
      assert.ok(step.passCondition.length >= 10);
      assert.ok(step.stopRule.length >= 10);
      assert.ok(step.evidence.length >= 10);
    }

    const gate = overview.pipelineProofRoute.steps.find((step) => step.id === "gate_check");
    const failureRepair = overview.pipelineProofRoute.steps.find((step) => step.id === "failure_repair");
    const publishPackage = overview.pipelineProofRoute.steps.find((step) => step.id === "publish_package");

    assert.equal(gate?.href, "/gate");
    assert.ok(gate?.stopRule.includes("不允许批量"));
    assert.equal(failureRepair?.href, "/failures");
    assert.ok(failureRepair?.stopRule.includes("暂停批量"));
    assert.ok(publishPackage?.passCondition.includes("8 个核心平台"));
    assert.equal(
      overview.pipelineProofRoute.steps.some((step) => step.title.includes("新增平台")),
      false,
    );
  });

  await t.test("builds a receipt template for the pipeline proof route", () => {
    const overview = buildDevelopmentOverview();

    assert.ok(overview.pipelineProofRoute.acceptanceReceipt.title.includes("验收回执"));
    assert.ok(overview.pipelineProofRoute.acceptanceReceipt.pmInstruction.includes("证据"));
    assert.deepEqual(overview.pipelineProofRoute.acceptanceReceipt.outcomeOptions, ["pass", "repair", "hold_batch"]);
    assert.equal(overview.pipelineProofRoute.acceptanceReceipt.fields.length, overview.pipelineProofRoute.steps.length);

    for (const field of overview.pipelineProofRoute.acceptanceReceipt.fields) {
      assert.ok(overview.pipelineProofRoute.steps.some((step) => step.id === field.stepId));
      assert.ok(field.evidencePrompt.length >= 10);
      assert.ok(field.requiredSignals.length >= 2);
      assert.ok(field.rejectIf.length >= 2);
      assert.ok(field.ownerConfirmation.length >= 6);
    }

    const gateField = overview.pipelineProofRoute.acceptanceReceipt.fields.find((field) => field.stepId === "gate_check");
    const failureField = overview.pipelineProofRoute.acceptanceReceipt.fields.find((field) => field.stepId === "failure_repair");
    const publishField = overview.pipelineProofRoute.acceptanceReceipt.fields.find((field) => field.stepId === "publish_package");

    assert.ok(gateField?.requiredSignals.some((signal) => signal.includes("样本")));
    assert.ok(gateField?.rejectIf.some((signal) => signal.includes("缺少复查")));
    assert.ok(failureField?.rejectIf.some((signal) => signal.includes("未修复")));
    assert.ok(publishField?.requiredSignals.some((signal) => signal.includes("8 个核心平台")));
  });

  await t.test("surfaces the current writing pipeline validation receipt", () => {
    const overview = buildDevelopmentOverview();

    assert.equal(overview.currentPipelineValidation.watchItemId, "writing_pipeline");
    assert.ok(overview.currentPipelineValidation.headline.includes("真实作品"));
    assert.ok(overview.currentPipelineValidation.pmVerdict.includes("观察中"));
    assert.equal(overview.currentPipelineValidation.nextStepId, "project_start");
    assert.equal(overview.currentPipelineValidation.actionHref, "/projects#pipeline-projects");
    assert.equal(overview.currentPipelineValidation.actionLabel, "验收真实流水线");
    assert.ok(overview.currentPipelineValidation.requiredEvidence.some((item) => item.includes("开头钩子")));
    assert.ok(overview.currentPipelineValidation.requiredEvidence.some((item) => item.includes("人工采用")));
    assert.ok(overview.currentPipelineValidation.requiredEvidence.some((item) => item.includes("发布包")));
    assert.ok(overview.currentPipelineValidation.stopIfMissing.some((item) => item.includes("不允许批量")));
  });

  await t.test("maps original requirements to current product evidence", () => {
    const overview = buildDevelopmentOverview();

    assert.equal(overview.requirementTraceability.headline, "原始需求追踪矩阵");
    assert.ok(overview.requirementTraceability.pmRule.includes("逐条对照"));
    assert.deepEqual(
      overview.requirementTraceability.items.map((item) => item.id),
      [
        "reference_30",
        "platform_8",
        "length_modes",
        "tree_method",
        "model_interfaces",
        "role_dispatch",
        "tomato_style",
        "pipeline_validation",
      ],
    );

    for (const item of overview.requirementTraceability.items) {
      assert.ok(item.originalRequest.length >= 12);
      assert.ok(item.currentEvidence.length >= 12);
      assert.ok(item.acceptanceSignal.length >= 12);
      assert.ok(item.href.startsWith("/"));
      assert.notEqual(item.currentEvidence.includes("待补"), true);
    }

    const modelInterfaces = overview.requirementTraceability.items.find((item) => item.id === "model_interfaces");
    const platformScope = overview.requirementTraceability.items.find((item) => item.id === "platform_8");
    const tomatoStyle = overview.requirementTraceability.items.find((item) => item.id === "tomato_style");
    const treeMethod = overview.requirementTraceability.items.find((item) => item.id === "tree_method");

    assert.ok(modelInterfaces?.currentEvidence.includes("Claude"));
    assert.ok(modelInterfaces?.currentEvidence.includes("DeepSeek"));
    assert.ok(modelInterfaces?.currentEvidence.includes("Kimi"));
    assert.ok(modelInterfaces?.currentEvidence.includes("GPT"));
    assert.ok(platformScope?.currentEvidence.includes("8/8"));
    assert.equal(platformScope?.href, "/projects#platform-export");
    assert.equal(tomatoStyle?.href, "/projects#platform-export");
    assert.ok(treeMethod?.acceptanceSignal.includes("开头"));
    assert.ok(treeMethod?.acceptanceSignal.includes("土壤"));
    assert.equal(treeMethod?.href, "/projects#story-structure");
  });

  await t.test("builds a final product acceptance gate for the home page", () => {
    const overview = buildDevelopmentOverview();

    assert.equal(overview.finalAcceptanceGate.title, "产品最终验收闸门");
    assert.ok(overview.finalAcceptanceGate.verdict.includes("真实流水线"));
    assert.equal(overview.finalAcceptanceGate.metrics.ready, overview.deliveryAudit.summary.ready);
    assert.equal(overview.finalAcceptanceGate.metrics.watch, overview.deliveryAudit.summary.watch);
    assert.equal(overview.finalAcceptanceGate.metrics.blocked, overview.deliveryAudit.summary.blocked);
    assert.equal(overview.finalAcceptanceGate.actionHref, overview.currentPipelineValidation.actionHref);
    assert.equal(overview.finalAcceptanceGate.actionLabel, overview.currentPipelineValidation.actionLabel);
    assert.ok(overview.finalAcceptanceGate.stopRule.includes("不要新增平台"));
  });
});
