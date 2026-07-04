import test from "node:test";
import assert from "node:assert/strict";
import { getPlatformProfile } from "../lib/platforms/platformProfiles.ts";
import { buildRetentionDiagnostic, type RetentionChapter } from "../lib/projects/retentionDiagnostic.ts";

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

test("buildRetentionDiagnostic", async (t) => {
  await t.test("scores a complete first-three-chapter chain", () => {
    const diagnostic = buildRetentionDiagnostic({
      projectTitle: "夜雨系统",
      platform: getPlatformProfile("fanqie"),
      chapters: strongChapters,
    });

    assert.equal(diagnostic.chapterSignals.length, 3);
    assert.ok(diagnostic.score >= 70);
    assert.ok(diagnostic.items.some((item) => item.id === "cliffhanger-chain" && item.status === "pass"));
    assert.deepEqual(diagnostic.quickFixes, []);
    assert.ok(diagnostic.markdown.includes("前三章追读诊断"));
    assert.ok(diagnostic.markdown.includes("暂无章节卡快修"));
  });

  await t.test("flags missing chapters and weak hooks", () => {
    const diagnostic = buildRetentionDiagnostic({
      projectTitle: "夜雨系统",
      platform: getPlatformProfile("fanqie"),
      chapters: [
        {
          ...strongChapters[0],
          hook: "",
          cliffhanger: "",
          wordCount: 300,
        },
      ],
    });

    assert.ok(diagnostic.score < 60);
    assert.ok(diagnostic.items.some((item) => item.id === "chapter-count" && item.status === "warn"));
    assert.ok(diagnostic.items.some((item) => item.status === "fail"));
    assert.equal(diagnostic.quickFixes.length, 1);
    assert.equal(diagnostic.quickFixes[0].method, "PATCH");
    assert.equal(diagnostic.quickFixes[0].endpoint, "/api/chapters/chapter-1");
    assert.equal(diagnostic.quickFixes[0].label, "补第 1 章追读卡");
    assert.ok(diagnostic.quickFixes[0].payload.hook);
    assert.ok(diagnostic.quickFixes[0].payload.cliffhanger?.includes("下一章"));
    assert.ok(!("conflict" in diagnostic.quickFixes[0].payload));
    assert.ok(diagnostic.markdown.includes("补第 1 章追读卡"));
  });

  await t.test("builds quick fixes for missing goal and mainline pressure", () => {
    const diagnostic = buildRetentionDiagnostic({
      projectTitle: "夜雨系统",
      platform: getPlatformProfile("fanqie"),
      chapters: [
        {
          ...strongChapters[0],
          goal: "",
          conflict: "",
        },
      ],
    });

    assert.equal(diagnostic.quickFixes.length, 1);
    assert.ok(diagnostic.quickFixes[0].payload.goal.includes("可见推进"));
    assert.ok(diagnostic.quickFixes[0].payload.conflict.includes("更高代价"));
  });
});
