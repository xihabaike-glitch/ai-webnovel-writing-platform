import test from "node:test";
import assert from "node:assert/strict";
import { getPlatformProfile } from "../lib/platforms/platformProfiles.ts";
import { buildFirstThreeRewritePackage } from "../lib/projects/firstThreeRewrite.ts";
import type { RetentionChapter } from "../lib/projects/retentionDiagnostic.ts";

const strongChapters: RetentionChapter[] = [
  {
    id: "chapter-1",
    order: 1,
    title: "雨夜系统",
    content: "林晚在雨夜获得系统奖励，救人后发现新的线索。",
    wordCount: 2200,
    goal: "让主角获得系统。",
    hook: "系统倒计时只剩十秒。",
    conflict: "主角必须在逃跑和救人之间选择。",
    cliffhanger: "系统给出第二个选择。",
    status: "draft",
  },
  {
    id: "chapter-2",
    order: 2,
    title: "第一次奖励",
    content: "她获得新手技能，反杀追踪者，并发现系统任务背后的秘密。",
    wordCount: 2200,
    goal: "兑现第一次奖励。",
    hook: "奖励栏突然变成惩罚栏。",
    conflict: "主角必须公开暴露异常才能救人。",
    cliffhanger: "反派认出了系统标记。",
    status: "draft",
  },
  {
    id: "chapter-3",
    order: 3,
    title: "反杀前夜",
    content: "主角用技能翻盘，拿到关键线索，却发现真相指向最信任的人。",
    wordCount: 2200,
    goal: "完成第一轮反转。",
    hook: "倒计时在课堂上响起。",
    conflict: "主角必须牺牲安全换取证据。",
    cliffhanger: "任务对象换成了她最信任的人。",
    status: "draft",
  },
];

test("buildFirstThreeRewritePackage", async (t) => {
  await t.test("builds a rewrite prescription for the first three chapters", () => {
    const result = buildFirstThreeRewritePackage({
      projectTitle: "夜雨系统",
      platform: getPlatformProfile("fanqie"),
      chapters: strongChapters,
    });

    assert.equal(result.chapterPlans.length, 3);
    assert.ok(result.recommendedOrder[0].includes("第 1 章开头"));
    assert.ok(result.recommendedOrder.some((step) => step.includes("第 3 章结尾")));
    assert.ok(result.structureMoves.some((move) => move.id === "open-ending-first"));
    assert.ok(result.platformPrescriptions.some((item) => item.instruction.includes("读完率")));
    assert.ok(result.markdown.includes("前三章重排改稿处方"));
  });

  await t.test("creates high-priority plans for missing or weak chapters", () => {
    const result = buildFirstThreeRewritePackage({
      projectTitle: "夜雨系统",
      platform: getPlatformProfile("qidian"),
      chapters: [
        {
          ...strongChapters[0],
          hook: "",
          conflict: "",
          cliffhanger: "",
          wordCount: 200,
        },
      ],
    });

    assert.equal(result.chapterPlans.length, 3);
    assert.ok(result.chapterPlans.some((plan) => plan.priority === "high"));
    assert.ok(result.chapterPlans.some((plan) => plan.chapterId === "missing-2"));
    assert.ok(result.structureMoves.some((move) => move.id === "rebuild-cliffhanger-chain"));
    assert.ok(result.markdown.includes("起点中文网"));
  });
});
