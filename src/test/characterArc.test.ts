import test from "node:test";
import assert from "node:assert/strict";
import { buildCharacterArcDashboard } from "../lib/projects/characterArc.ts";

test("buildCharacterArcDashboard", async (t) => {
  await t.test("scores complete character arcs", () => {
    const dashboard = buildCharacterArcDashboard([
      {
        id: "character-1",
        name: "林晚",
        role: "主角",
        desire: "活下去并查清系统来源",
        need: "学会主动选择",
        flaw: "遇事先逃避",
        arcStart: "被系统推着走",
        arcEnd: "主动定义规则",
        voice: "克制、敏锐",
        relationshipNotes: "和反派有系统标记牵连",
      },
    ]);

    assert.equal(dashboard.totalCharacters, 1);
    assert.equal(dashboard.completeCharacters, 1);
    assert.equal(dashboard.averageCompleteness, 100);
    assert.equal(dashboard.summaries[0].status, "complete");
    assert.ok(dashboard.relationshipWarnings.some((warning) => warning.includes("只有一个人物")));
  });

  await t.test("flags missing character support", () => {
    const dashboard = buildCharacterArcDashboard([]);

    assert.equal(dashboard.totalCharacters, 0);
    assert.equal(dashboard.completeCharacters, 0);
    assert.ok(dashboard.relationshipWarnings.some((warning) => warning.includes("还没有人物卡")));
    assert.ok(dashboard.nextActions[0].includes("创建主角人物卡"));
  });

  await t.test("tracks missing fields on partial characters", () => {
    const dashboard = buildCharacterArcDashboard([
      {
        id: "character-2",
        name: "沈珩",
        role: "反派",
        desire: "",
        need: "",
        flaw: "控制欲强",
        arcStart: "",
        arcEnd: "",
        voice: "",
        relationshipNotes: "",
      },
    ]);

    assert.equal(dashboard.summaries[0].status, "partial");
    assert.ok(dashboard.summaries[0].missingFields.includes("欲望"));
    assert.ok(dashboard.relationshipWarnings.some((warning) => warning.includes("关系网没有压力点")));
  });
});
