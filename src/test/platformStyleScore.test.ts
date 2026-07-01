import test from "node:test";
import assert from "node:assert/strict";
import { buildPlatformStyleScore } from "../lib/chapters/platformStyleScore.ts";
import { getPlatformProfile } from "../lib/platforms/platformProfiles.ts";

test("buildPlatformStyleScore", async (t) => {
  await t.test("allows generation for a platform-ready Fanqie chapter card", () => {
    const score = buildPlatformStyleScore({
      platform: getPlatformProfile("fanqie"),
      chapter: {
        title: "第一章 雨夜系统",
        goal: "让主角在雨夜被系统逼进不可逆选择。",
        hook: "系统倒计时只剩十秒，门外的人已经开始求救。",
        conflict: "主角必须在逃跑和救人之间选择，否则会失去唯一证据。",
        valueShift: "从普通生活转向失控危机，第一次意识到系统会索命。",
        cliffhanger: "系统刷新第二个任务：亲手交出证据。",
      },
    });

    assert.equal(score.canGenerate, true);
    assert.ok(score.score >= 80);
    assert.equal(score.items.every((item) => item.status !== "fail"), true);
  });

  await t.test("blocks weak cards before draft generation", () => {
    const score = buildPlatformStyleScore({
      platform: getPlatformProfile("fanqie"),
      chapter: {
        title: "第一章 日常",
        goal: "介绍主角。",
        hook: "",
        conflict: "聊聊天。",
        valueShift: "",
        cliffhanger: "",
      },
    });

    assert.equal(score.canGenerate, false);
    assert.ok(score.score < 60);
    assert.ok(score.priorityFixes.some((fix) => fix.includes("章节卡完整度")));
    assert.ok(score.items.some((item) => item.id === "opening-hook" && item.status === "fail"));
  });

  await t.test("scores overseas progression cards with English platform signals", () => {
    const score = buildPlatformStyleScore({
      platform: getPlatformProfile("royal_road"),
      chapter: {
        title: "Chapter 1: Known Issue",
        goal: "Introduce the broken system and the first exploit.",
        hook: "The tutorial patch note says she died three minutes ago.",
        conflict: "Mara must exploit a bug, but it will crash another player's quest.",
        valueShift: "from tester to trapped participant with a visible build path",
        cliffhanger: "the next patch note names her as the bug.",
      },
    });

    assert.equal(score.canGenerate, true);
    assert.ok(score.platformMustHave.includes("earned progression"));
    assert.ok(score.items.some((item) => item.id === "platform-fit" && item.status === "pass"));
  });
});
