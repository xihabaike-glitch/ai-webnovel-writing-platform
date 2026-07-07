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
});
