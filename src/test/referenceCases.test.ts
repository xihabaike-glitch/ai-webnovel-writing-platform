import assert from "node:assert/strict";
import test from "node:test";
import {
  buildReferenceCaseLibraryView,
  buildReferenceCaseDevelopmentPlan,
  openSourceReferenceCases,
  referenceCaseCategories,
} from "../lib/references/openSourceCases.ts";

const requiredCategories = [
  "writing_tool",
  "ai_workflow",
  "knowledge_workspace",
  "publishing_pipeline",
];

test("open source reference cases", async (t) => {
  await t.test("covers at least 30 cases across required categories", () => {
    assert.ok(openSourceReferenceCases.length >= 30);

    const categories = new Set(
      openSourceReferenceCases.map((item) => item.category),
    );

    for (const category of requiredCategories) {
      assert.ok(categories.has(category));
      assert.ok(
        openSourceReferenceCases.filter((item) => item.category === category)
          .length >= 4,
      );
    }

    assert.equal(referenceCaseCategories.length, requiredCategories.length);
  });

  await t.test("keeps every reference actionable for the AI writing platform", () => {
    for (const item of openSourceReferenceCases) {
      assert.ok(item.name.trim().length > 0);
      assert.ok(item.sourceUrl.startsWith("https://github.com/"));
      assert.ok(item.referenceValue.length >= 20);
      assert.ok(item.aiWritingLesson.length >= 20);
      assert.ok(item.productRisk.length >= 10);
      assert.ok(item.tags.length >= 2);
    }
  });

  await t.test("builds a development plan from the reference library", () => {
    const plan = buildReferenceCaseDevelopmentPlan(openSourceReferenceCases);
    const publishingMove = plan.nextBuildMoves.find((move) => move.includes("发布流水线")) ?? "";

    assert.equal(plan.totalCases, openSourceReferenceCases.length);
    assert.ok(plan.categoryBlocks.every((block) => block.cases.length >= 4));
    assert.ok(plan.nextBuildMoves.some((move) => move.includes("写作工作台")));
    assert.ok(plan.nextBuildMoves.some((move) => move.includes("模型")));
    for (const platformName of ["起点", "番茄", "七猫", "晋江", "知乎盐选", "WebNovel", "Royal Road", "Wattpad"]) {
      assert.ok(publishingMove.includes(platformName), `${platformName} should be included in the publishing pipeline move`);
    }
  });

  await t.test("builds a filterable product reference library view", () => {
    const allView = buildReferenceCaseLibraryView();
    const aiView = buildReferenceCaseLibraryView({ selectedCategory: "ai_workflow" });
    const fallbackView = buildReferenceCaseLibraryView({ selectedCategory: "unknown" });

    assert.equal(allView.selectedCategory, "all");
    assert.equal(allView.visibleCases.length, openSourceReferenceCases.length);
    assert.equal(allView.categoryTabs.length, referenceCaseCategories.length + 1);
    assert.ok(allView.categoryTabs.some((tab) => tab.href === "/references?category=ai_workflow"));
    assert.ok(allView.productManagerNotes.some((note) => note.includes("聊天")));
    assert.ok(allView.nextBuildMoves.some((move) => move.includes("发布流水线")));
    assert.equal(allView.developmentPath.length, 4);
    assert.deepEqual(
      allView.developmentPath.map((item) => item.id),
      ["writing_workbench", "model_routing", "knowledge_recall", "publishing_pipeline"],
    );
    assert.ok(allView.pmNextFocus, "reference view should expose a PM next focus");
    assert.equal(allView.pmNextFocus.pathId, "model_routing");
    assert.ok(allView.pmNextFocus.headline.includes("模型任务化"));
    assert.ok(allView.pmNextFocus.reason.includes("聊天"));
    assert.ok(allView.pmNextFocus.proof.includes("失败替代"));
    assert.equal(allView.pmNextFocus.href, "/settings/models#model-role-matrix");
    const roleIds = new Set(allView.rolePlaybook.map((role) => role.id));
    for (const item of allView.developmentPath) {
      assert.ok(["已落地", "继续打磨"].includes(item.status));
      assert.ok(item.ownerRole.length >= 4);
      assert.ok(item.roleIds.length >= 1);
      assert.ok(item.roleIds.every((roleId) => roleIds.has(roleId)));
      assert.equal(item.roleSummaries.length, item.roleIds.length);
      for (const role of item.roleSummaries) {
        assert.ok(item.roleIds.includes(role.id));
        assert.ok(role.roleName.length >= 4);
        assert.ok(role.modelOwner.length >= 3);
      }
      assert.ok(item.currentEvidence.length >= 10);
      assert.ok(item.nextAction.length >= 10);
      assert.ok(item.acceptance.length >= 10);
      assert.ok(item.pmCheckpoint, `${item.id} should expose a PM checkpoint`);
      assert.ok(item.pmCheckpoint.risk.length >= 10);
      assert.ok(item.pmCheckpoint.mustShip.length >= 10);
      assert.ok(item.pmCheckpoint.proof.length >= 10);
      assert.ok(item.pmCheckpoint.actionLabel.length >= 4);
      assert.ok(item.href.startsWith("/"));
    }
    assert.ok(allView.developmentPath.find((item) => item.id === "model_routing")?.roleIds.includes("toxic_pm"));
    assert.ok(allView.developmentPath.find((item) => item.id === "publishing_pipeline")?.roleIds.includes("overseas_packager"));
    const publishingPipeline = allView.developmentPath.find((item) => item.id === "publishing_pipeline");
    assert.ok(publishingPipeline?.acceptance.includes("8 个核心平台已锁定"));
    assert.equal(publishingPipeline?.acceptance.includes("平台还差 0 个"), false);
    assert.ok(publishingPipeline?.pmCheckpoint.proof.includes("8 个核心平台"));
    assert.ok(allView.developmentPath.find((item) => item.id === "model_routing")?.pmCheckpoint.risk.includes("聊天"));
    assert.ok(allView.topTags.length > 0);

    assert.equal(aiView.selectedCategory, "ai_workflow");
    assert.ok(aiView.visibleCases.length >= 4);
    assert.ok(aiView.visibleCases.every((item) => item.category === "ai_workflow"));
    assert.ok(aiView.topTags.some((item) => item.tag === "rag" || item.tag === "workflow"));

    assert.equal(fallbackView.selectedCategory, "all");
  });

  await t.test("builds a role playbook from the reference library", () => {
    const view = buildReferenceCaseLibraryView();

    assert.ok(Array.isArray(view.rolePlaybook), "role playbook is required");
    assert.equal(view.rolePlaybook.length, 6);
    for (const role of view.rolePlaybook) {
      assert.ok(role.roleName.length >= 4);
      assert.ok(role.modelOwner.length >= 3);
      assert.ok(role.skillOwner.length >= 3);
      assert.ok(role.whenToUse.length >= 10);
      assert.ok(role.inputs.length >= 2);
      assert.ok(role.outputs.length >= 2);
      assert.ok(role.referenceCaseIds.length >= 2);
      assert.ok(role.referenceCaseIds.every((id) => openSourceReferenceCases.some((item) => item.id === id)));
      assert.equal(typeof role.workflowHref, "string", `${role.id} should expose a workflow href`);
      assert.ok(role.workflowHref.startsWith("/") && !role.workflowHref.includes("undefined"));
      assert.ok(role.workflowActionLabel.length >= 4);
      assert.ok(role.nextAction.length >= 10);
    }

    const productManager = view.rolePlaybook.find((role) => role.id === "toxic_pm");
    const draftWriter = view.rolePlaybook.find((role) => role.id === "draft_writer");
    const overseasPackager = view.rolePlaybook.find((role) => role.id === "overseas_packager");
    const feedbackOperator = view.rolePlaybook.find((role) => role.id === "feedback_operator");

    assert.ok(productManager?.referenceCaseIds.includes("autogen"));
    assert.ok(draftWriter?.modelOwner.includes("DeepSeek"));
    assert.ok(overseasPackager?.outputs.some((output) => output.includes("WebNovel")));
    assert.ok(feedbackOperator?.referenceCaseIds.includes("n8n"));
    assert.equal(productManager?.workflowHref, "/references");
    assert.equal(draftWriter?.workflowHref, "/projects");
    assert.equal(overseasPackager?.workflowHref, "/projects#platform-export");
    assert.equal(feedbackOperator?.workflowHref, "/gate");
  });

  await t.test("surfaces the locked eight-platform delivery scope", () => {
    const view = buildReferenceCaseLibraryView();

    assert.equal(view.platformScope.corePlatformCount, 8);
    assert.equal(view.platformScope.completedPlatformCount, 8);
    assert.equal(view.platformScope.pausedExpansionCount, 0);
    assert.equal(view.platformScope.statusLabel, "8/8 核心平台已完成");
    assert.equal(view.platformScope.expansionLabel, "剩余 10 个平台不再添加");
    assert.ok(view.platformScope.scopeDecision.includes("扩展平台不再作为待补缺口"));
    assert.ok(view.platformScope.scopeDecision.includes("剩余 10 个平台不再添加"));
    assert.deepEqual(view.platformScope.platformNames, [
      "番茄小说",
      "起点中文网",
      "七猫",
      "晋江文学城",
      "知乎盐选",
      "WebNovel",
      "Royal Road",
      "Wattpad",
    ]);
  });

  await t.test("builds execution cards for every locked platform", () => {
    const view = buildReferenceCaseLibraryView();

    assert.equal(view.platformScope.platformCards.length, 8);
    for (const card of view.platformScope.platformCards) {
      assert.ok(card.platformId.length > 0);
      assert.ok(card.platformName.length > 0);
      assert.ok(card.writingFocus.length >= 2);
      assert.ok(card.submissionFocus.length >= 2);
      assert.ok(card.feedbackMetric.length >= 2);
      assert.ok(card.nextAction.length >= 10);
      assert.ok(["写作", "投稿", "复盘"].every((stage) => card.pipelineStages.includes(stage)));
    }

    const fanqie = view.platformScope.platformCards.find((card) => card.platformId === "fanqie");
    const qidian = view.platformScope.platformCards.find((card) => card.platformId === "qidian");
    const webnovel = view.platformScope.platformCards.find((card) => card.platformId === "webnovel");

    assert.ok(fanqie?.submissionFocus.some((item) => item.includes("首秀")));
    assert.ok(qidian?.writingFocus.some((item) => item.includes("卷结构")));
    assert.ok(webnovel?.submissionFocus.some((item) => item.includes("English synopsis")));
    assert.notDeepEqual(fanqie?.feedbackMetric, qidian?.feedbackMetric);
  });
});
