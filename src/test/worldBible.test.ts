import test from "node:test";
import assert from "node:assert/strict";
import { buildWorldBibleDashboard } from "../lib/projects/worldBible.ts";

test("buildWorldBibleDashboard", async (t) => {
  await t.test("scores complete core world entries", () => {
    const dashboard = buildWorldBibleDashboard([
      {
        id: "rule-1",
        type: "system_rule",
        title: "系统任务规则",
        content: "系统只能在主角做出高风险选择时触发任务，奖励必须伴随代价，并且每次使用都留下可追踪痕迹。",
      },
      {
        id: "taboo-1",
        type: "taboo",
        title: "复活禁忌",
        content: "任何角色不能无代价复活，若强行复活必须交换记忆、关系或主线资源，且会制造下一卷冲突。",
      },
      {
        id: "soil-1",
        type: "platform_soil",
        title: "番茄平台土壤",
        content: "每章保持明确爽点、危机和钩子，主角收益要直给，但规则代价必须持续推进人物弧光，并为下一章留下清晰追读问题。",
      },
    ]);

    assert.equal(dashboard.totalEntries, 3);
    assert.equal(dashboard.completeEntries, 3);
    assert.equal(dashboard.warnings.some((warning) => warning.includes("缺少")), false);
    assert.equal(dashboard.typeSummaries.find((summary) => summary.type === "system_rule")?.status, "pass");
  });

  await t.test("warns when the bible is empty", () => {
    const dashboard = buildWorldBibleDashboard([]);

    assert.equal(dashboard.totalEntries, 0);
    assert.equal(dashboard.completeEntries, 0);
    assert.ok(dashboard.warnings.includes("还没有设定资料，长篇继续写会靠记忆硬扛。"));
    assert.ok(dashboard.nextActions[0].includes("系统规则、禁忌和平台土壤"));
  });

  await t.test("flags thin entries as partial", () => {
    const dashboard = buildWorldBibleDashboard([
      {
        id: "thin-1",
        type: "location",
        title: "黑塔",
        content: "很危险。",
      },
    ]);

    assert.equal(dashboard.entrySummaries[0].status, "partial");
    assert.ok(dashboard.entrySummaries[0].completeness < 80);
    assert.ok(dashboard.warnings.includes("存在内容过薄的设定卡，后续引用时容易前后不一致。"));
  });
});
