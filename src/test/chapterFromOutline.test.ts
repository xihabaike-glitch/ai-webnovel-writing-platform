import test from "node:test";
import assert from "node:assert/strict";
import { buildChapterCardFromOutline } from "../lib/chapters/chapterFromOutline.ts";
import { getPlatformProfile } from "../lib/platforms/platformProfiles.ts";

test("buildChapterCardFromOutline", async (t) => {
  await t.test("turns an outline node into a usable chapter card", () => {
    const card = buildChapterCardFromOutline({
      projectTitle: "夜雨系统",
      platform: getPlatformProfile("fanqie"),
      nextOrder: 3,
      outlineNode: {
        type: "opening",
        title: "开头钩子",
        summary: "雨夜系统出现。",
        goal: "让主角遭遇不可逆事件。",
        hook: "系统倒计时只剩十秒。",
        conflict: "主角必须在逃跑和救人之间选择。",
        valueShift: "普通生活转向失控危机。",
        platformNote: "前三章必须强钩子。",
      },
    });

    assert.equal(card.title, "第3章 开局：开头钩子");
    assert.equal(card.status, "outline");
    assert.equal(card.goal, "让主角遭遇不可逆事件。");
    assert.equal(card.hook, "系统倒计时只剩十秒。");
    assert.equal(card.conflict, "主角必须在逃跑和救人之间选择。");
    assert.ok(card.cliffhanger.includes("开头钩子"));
  });
});
