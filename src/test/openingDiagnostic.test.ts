import test from "node:test";
import assert from "node:assert/strict";
import { buildOpeningDiagnostic } from "../lib/chapters/openingDiagnostic.ts";
import { getPlatformProfile } from "../lib/platforms/platformProfiles.ts";

test("buildOpeningDiagnostic", async (t) => {
  await t.test("rewards a high-pressure platform-ready opening", () => {
    const diagnostic = buildOpeningDiagnostic({
      projectTitle: "夜雨系统",
      platform: getPlatformProfile("fanqie"),
      chapter: {
        title: "第一章 雨夜系统",
        content: "林晚推开门，系统倒计时只剩十秒。雨水顺着她的袖口往下滴，门后传来母亲压低的求救声。她想逃，可屏幕上弹出的任务写得清清楚楚：救人，奖励新手技能；逃跑，永久抹除记忆。她只能在冲进去和转身离开之间选择，而无论选哪一个，她今晚都回不到普通生活。",
        goal: "让主角遭遇不可逆事件。",
        hook: "系统倒计时只剩十秒。",
        conflict: "主角必须在逃跑和救人之间选择，否则永久失去记忆。",
        cliffhanger: "系统给出第二个选择。",
      },
    });

    assert.ok(diagnostic.score >= 70);
    assert.equal(diagnostic.items.length, 6);
    assert.ok(diagnostic.items.some((item) => item.id === "first-line-hook" && item.status === "pass"));
    assert.ok(diagnostic.markdown.includes("黄金三秒诊断"));
  });

  await t.test("flags an empty or slow opening", () => {
    const diagnostic = buildOpeningDiagnostic({
      projectTitle: "夜雨系统",
      platform: getPlatformProfile("fanqie"),
      chapter: {
        title: "第一章 雨夜系统",
        content: "这个世界很大，有很多城市，也有很多普通人。",
        goal: "",
        hook: "",
        conflict: "",
        cliffhanger: "",
      },
    });

    assert.ok(diagnostic.score < 50);
    assert.ok(diagnostic.items.some((item) => item.status === "fail"));
    assert.ok(diagnostic.rewritePlan.length >= 3);
  });

  await t.test("uses project start tactic as an opening diagnostic rule", () => {
    const diagnostic = buildOpeningDiagnostic({
      projectTitle: "夜雨系统",
      platform: getPlatformProfile("fanqie"),
      startTactic: {
        title: "首轮平台打法：番茄小说",
        label: "历史可复用",
        primaryTactic: "修复、复测、重验和效果回填已闭环。",
        openingMove: "第一段直接给危机和倒计时。",
        verificationMove: "记录首轮曝光、点击、收藏、追读。",
        risk: "不要直接放量。",
      },
      chapter: {
        title: "第一章 雨夜系统",
        content: "林晚推开门，系统倒计时只剩十秒。她必须立刻选择。",
        goal: "让主角遭遇不可逆事件。",
        hook: "系统倒计时只剩十秒。",
        conflict: "主角必须在逃跑和救人之间选择。",
        cliffhanger: "系统给出第二个选择。",
      },
    });

    assert.ok(diagnostic.items.some((item) => item.id === "start-tactic-fit"));
    assert.ok(diagnostic.platformFocus.some((item) => item.includes("首轮打法")));
    assert.ok(diagnostic.rewritePlan[0].includes("第一段直接给危机和倒计时"));
    assert.ok(diagnostic.markdown.includes("首轮打法：历史可复用"));
  });
});
