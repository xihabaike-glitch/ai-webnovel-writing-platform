import test from "node:test";
import assert from "node:assert/strict";
import { buildStoryLineDashboard } from "../lib/projects/storyLines.ts";

const chapters = [
  { id: "chapter-1", order: 1, title: "雨夜系统" },
  { id: "chapter-2", order: 2, title: "第一次奖励" },
  { id: "chapter-3", order: 3, title: "反杀前夜" },
];

test("buildStoryLineDashboard", async (t) => {
  await t.test("summarizes complete foreshadows and plot threads", () => {
    const dashboard = buildStoryLineDashboard(
      chapters,
      [
        {
          id: "foreshadow-1",
          title: "系统来源异常",
          setupChapterId: "chapter-1",
          payoffChapterId: "chapter-3",
          relatedCharacterIds: "[]",
          status: "paid_off",
          notes: "第一章埋，第三章回收。",
        },
      ],
      [
        {
          id: "thread-1",
          type: "main",
          title: "系统主线",
          startChapterId: "chapter-1",
          endChapterId: "chapter-3",
          status: "resolved",
        },
      ],
    );

    assert.equal(dashboard.foreshadowTotal, 1);
    assert.equal(dashboard.foreshadowReady, 1);
    assert.equal(dashboard.threadResolved, 1);
    assert.ok(dashboard.summaries.every((summary) => summary.status === "complete"));
  });

  await t.test("flags missing setup and thread start", () => {
    const dashboard = buildStoryLineDashboard(
      chapters,
      [
        {
          id: "foreshadow-2",
          title: "反派标记",
          setupChapterId: null,
          payoffChapterId: null,
          relatedCharacterIds: "[]",
          status: "planned",
          notes: "",
        },
      ],
      [
        {
          id: "thread-2",
          type: "branch",
          title: "反派压力线",
          startChapterId: null,
          endChapterId: null,
          status: "active",
        },
      ],
    );

    assert.ok(dashboard.summaries.some((summary) => summary.status === "risk"));
    assert.ok(dashboard.warnings.some((warning) => warning.includes("未绑定起点")));
  });

  await t.test("warns when story lines are empty", () => {
    const dashboard = buildStoryLineDashboard([], [], []);

    assert.equal(dashboard.foreshadowTotal, 0);
    assert.equal(dashboard.threadTotal, 0);
    assert.ok(dashboard.warnings.some((warning) => warning.includes("还没有伏笔")));
    assert.ok(dashboard.nextActions[0].includes("核心伏笔"));
  });
});
