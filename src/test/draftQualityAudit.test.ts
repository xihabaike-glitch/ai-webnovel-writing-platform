import test from "node:test";
import assert from "node:assert/strict";
import { buildDraftQualityAudit } from "../lib/ai/draftQualityAudit.ts";
import { getPlatformProfile } from "../lib/platforms/platformProfiles.ts";

const chapter = {
  title: "第一章 雨夜系统",
  goal: "让主角在雨夜被系统逼进不可逆选择。",
  hook: "系统倒计时只剩十秒，门外的人已经开始求救。",
  conflict: "主角必须在逃跑和救人之间选择，否则会失去唯一证据。",
  valueShift: "从普通生活转向失控危机，第一次意识到系统会索命。",
  cliffhanger: "系统刷新第二个任务：亲手交出证据。",
};

test("buildDraftQualityAudit", async (t) => {
  await t.test("scores a generated draft and allows good platform fit", () => {
    const content = [
      "系统倒计时只剩十秒，门外的人已经开始求救。",
      "林晚抓住门把，雨水顺着指缝往下滴。她必须在逃跑和救人之间选择，否则唯一证据会被对面的人带走。",
      "她冲进雨里，系统任务刷新，奖励和惩罚同时亮起。第一次，她意识到这不是奇遇，而是一场会索命的规则。",
      "楼道里的灯一盏盏熄灭，求救声却越来越近。林晚没有时间解释，她把手机塞进口袋，顺着血迹追到消防门后。",
      "门后的人捂着伤口，怀里抱着被雨水泡软的证据袋。对方看见她，第一句话不是求救，而是问她为什么又回来了。",
      "系统冷冰冰地提示，选择救人会失去逃跑机会，选择逃跑会永久删除证据。林晚咬住牙，终于明白自己已经被推到规则中央。",
      "她没有再退，反手把消防门抵住。门外脚步声逼近，证据袋里的照片却露出一角，上面正是她三小时前参加葬礼的画面。",
      "门开的一瞬间，男人把证据袋塞进她怀里。下一秒，系统刷新第二个任务：亲手交出证据。",
    ].join("\n");
    const audit = buildDraftQualityAudit({
      platform: getPlatformProfile("fanqie"),
      chapter,
      content,
      targetWords: 500,
    });

    assert.ok(audit.score >= 85);
    assert.equal(audit.shouldSecondPass, false);
    assert.equal(audit.issues.some((issue) => issue.severity === "high"), false);
  });

  await t.test("marks thin generated prose for second pass", () => {
    const audit = buildDraftQualityAudit({
      platform: getPlatformProfile("fanqie"),
      chapter,
      content: "林晚起床后想了很多事情。她觉得今天有些不一样，但暂时也说不上来。后来她决定出门看看。",
      targetWords: 1200,
    });

    assert.ok(audit.score < 85);
    assert.equal(audit.shouldSecondPass, true);
    assert.ok(audit.issues.some((issue) => issue.type === "length"));
    assert.ok(audit.issues.some((issue) => issue.type === "payoff"));
  });
});
