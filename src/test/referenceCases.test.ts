import assert from "node:assert/strict";
import test from "node:test";
import {
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
});
