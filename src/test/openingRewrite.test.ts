import test from "node:test";
import assert from "node:assert/strict";
import { buildOpeningRewritePackage } from "../lib/chapters/openingRewrite.ts";
import { getPlatformProfile } from "../lib/platforms/platformProfiles.ts";

const chapter = {
  title: "第一章 雨夜系统",
  content: "林晚推开门，系统提示音在雨夜响起。门后有人求救，手机屏幕上出现倒计时。",
  goal: "让主角遭遇不可逆事件。",
  hook: "系统倒计时只剩十秒。",
  conflict: "主角必须在逃跑和救人之间选择。",
  cliffhanger: "系统给出第二个选择。",
};

test("buildOpeningRewritePackage", async (t) => {
  await t.test("builds three rewrite variants from the diagnostic", () => {
    const result = buildOpeningRewritePackage({
      projectTitle: "夜雨系统",
      platform: getPlatformProfile("fanqie"),
      chapter,
    });

    assert.equal(result.variants.length, 3);
    assert.ok(result.recommendedVariantId);
    assert.ok(result.variants[0].estimatedScore >= result.diagnostic.score);
    assert.ok(result.variants.some((variant) => variant.name === "番茄强钩子版"));
    assert.ok(result.variants.every((variant) => variant.openingText.length > 80));
    assert.ok(result.markdown.includes("首章开头重写"));
  });

  await t.test("uses an overseas primary rewrite for overseas platforms", () => {
    const result = buildOpeningRewritePackage({
      projectTitle: "Night Rain System",
      platform: getPlatformProfile("webnovel"),
      chapter: {
        ...chapter,
        title: "Chapter 1",
        content: "Lin Wan touched the door when the system countdown appeared.",
      },
    });
    const primary = result.variants.find((variant) => variant.id === "platform-primary");

    assert.ok(primary);
    assert.equal(primary.name, "海外直白版");
    assert.ok(primary.openingText.includes("countdown"));
    assert.ok(primary.platformNote.includes("Explain the hook"));
  });

  await t.test("carries project start tactic into rewrite variants", () => {
    const result = buildOpeningRewritePackage({
      projectTitle: "夜雨系统",
      platform: getPlatformProfile("fanqie"),
      startTactic: {
        title: "首轮平台打法：番茄小说",
        label: "历史观察",
        primaryTactic: "只复用小步重验流程，不复制成功结论。",
        openingMove: "先修前三章兑现，再用小步数据重验。",
        verificationMove: "等下一轮效果回填后再加码。",
        risk: "缺重验效果前不要扩大投放。",
      },
      chapter,
    });
    const primary = result.variants.find((variant) => variant.id === "platform-primary");

    assert.ok(primary?.strategy.includes("首轮平台打法要求"));
    assert.ok(primary?.fixes.some((fix) => fix.includes("先修前三章兑现")));
    assert.ok(primary?.platformNote.includes("历史观察"));
    assert.ok(result.markdown.includes("首轮打法：历史观察"));
  });
});
