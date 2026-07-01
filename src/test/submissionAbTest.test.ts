import test from "node:test";
import assert from "node:assert/strict";
import { getPlatformProfile } from "../lib/platforms/platformProfiles.ts";
import { buildSubmissionAbTest } from "../lib/projects/submissionAbTest.ts";

const chapters = [
  {
    order: 1,
    title: "雨夜系统",
    content: "",
    goal: "让主角遭遇不可逆事件。",
    hook: "系统倒计时只剩十秒。",
    conflict: "主角必须在逃跑和救人之间选择。",
    cliffhanger: "系统给出第二个选择。",
    wordCount: 3000,
  },
  {
    order: 2,
    title: "第一次选择",
    content: "",
    goal: "展示系统代价。",
    hook: "奖励和惩罚同时弹出。",
    conflict: "主角必须公开暴露自己的异常。",
    cliffhanger: "反派发现了系统痕迹。",
    wordCount: 3000,
  },
];

test("buildSubmissionAbTest", async (t) => {
  await t.test("builds five ranked packaging variants", () => {
    const result = buildSubmissionAbTest({
      title: "夜雨系统",
      genre: "都市系统",
      sellingPoint: "雨夜危机中觉醒系统，主角用一次次选择翻盘。",
      currentWordCount: 9000,
      targetWordCount: 300000,
      platform: getPlatformProfile("fanqie"),
      chapters,
    });

    assert.equal(result.platformName, "番茄小说");
    assert.equal(result.variants.length, 5);
    assert.ok(result.recommendedVariantId);
    assert.ok(result.variants[0].score >= result.variants[1].score);
    assert.ok(result.variants.some((variant) => variant.id === "hook"));
    assert.ok(result.markdown.includes("投稿 A/B 测试"));
  });

  await t.test("keeps overseas packaging available for overseas platforms", () => {
    const result = buildSubmissionAbTest({
      title: "Night Rain System",
      genre: "Urban Fantasy System",
      sellingPoint: "A girl awakens a choice-based system during a rainy-night crisis.",
      currentWordCount: 9000,
      targetWordCount: 300000,
      platform: getPlatformProfile("webnovel"),
      chapters,
    });
    const overseas = result.variants.find((variant) => variant.id === "overseas");

    assert.ok(overseas);
    assert.ok(overseas.title.includes("System Choice"));
    assert.ok(overseas.synopsis.includes("progression"));
    assert.ok(overseas.tags.includes("System"));
  });
});
