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

    assert.equal(plan.totalCases, openSourceReferenceCases.length);
    assert.ok(plan.categoryBlocks.every((block) => block.cases.length >= 4));
    assert.ok(plan.nextBuildMoves.some((move) => move.includes("写作工作台")));
    assert.ok(plan.nextBuildMoves.some((move) => move.includes("模型")));
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
    assert.ok(allView.topTags.length > 0);

    assert.equal(aiView.selectedCategory, "ai_workflow");
    assert.ok(aiView.visibleCases.length >= 4);
    assert.ok(aiView.visibleCases.every((item) => item.category === "ai_workflow"));
    assert.ok(aiView.topTags.some((item) => item.tag === "rag" || item.tag === "workflow"));

    assert.equal(fallbackView.selectedCategory, "all");
  });
});
