import test from "node:test";
import assert from "node:assert/strict";
import { buildContinuityAudit } from "../lib/projects/continuityAudit.ts";

const baseChapters = [
  {
    id: "chapter-1",
    order: 1,
    title: "雨夜门开",
    content: "林晚在雨夜系统的倒计时里被迫接案，系统代价第一次显形。",
    goal: "让林晚接案。",
    hook: "死人敲门。",
    conflict: "报警会触发惩罚。",
    cliffhanger: "死者说出林晚的秘密。",
    status: "draft",
  },
  {
    id: "chapter-2",
    order: 2,
    title: "旧案回声",
    content: "林晚沿着旧案真相追查，门锁声成为下一次反转的埋点。",
    goal: "推进旧案。",
    hook: "旧案照片出现。",
    conflict: "线索会伤害盟友。",
    cliffhanger: "门锁声再次响起。",
    status: "draft",
  },
];

test("buildContinuityAudit", async (t) => {
  await t.test("passes a coherent long-form continuity package", () => {
    const audit = buildContinuityAudit({
      chapters: baseChapters,
      characters: [{
        id: "char-1",
        name: "林晚",
        role: "主角",
        desire: "找回记忆",
        need: "学会承担真相代价",
        flaw: "习惯逃避",
        arcStart: "被动自保",
        arcEnd: "主动承担",
      }],
      worldEntries: [
        { id: "world-1", type: "system_rule", title: "雨夜系统", content: "雨夜系统只在暴雨夜启动，以倒计时逼主角做选择；每次奖励都交换记忆或关系安全，不能白拿好处。" },
        { id: "world-2", type: "taboo", title: "系统代价", content: "系统代价禁止无代价复活，所有翻盘都要损失记忆、身份安全或关键关系，并制造下一章追读问题。" },
        { id: "world-3", type: "platform_soil", title: "旧案真相", content: "旧案真相每章前半给危机，后半给反击，章末必须推进到新问题，服务番茄前三章留存节奏。" },
      ],
      foreshadows: [{
        id: "fs-1",
        title: "门锁声",
        setupChapterId: "chapter-1",
        payoffChapterId: "chapter-2",
        status: "paid_off",
        notes: "身份线回收。",
      }],
      plotThreads: [{
        id: "thread-1",
        type: "main",
        title: "旧案真相",
        startChapterId: "chapter-1",
        endChapterId: "chapter-2",
        status: "resolved",
      }],
    });

    assert.equal(audit.status, "ready");
    assert.equal(audit.metrics.blockedIssues, 0);
    assert.equal(audit.metrics.chapterCoveragePercent, 100);
    assert.equal(audit.metrics.characterReferencePercent, 100);
    assert.equal(audit.metrics.foreshadowResolvedPercent, 100);
  });

  await t.test("blocks missing arcs, thin world rules and incomplete chapter cards", () => {
    const audit = buildContinuityAudit({
      chapters: [{
        ...baseChapters[0],
        goal: "",
        hook: "",
        conflict: "",
      }],
      characters: [{
        id: "char-2",
        name: "周衡",
        role: "反派",
        desire: "",
        need: "",
        flaw: "",
        arcStart: "",
        arcEnd: "",
      }],
      worldEntries: [{ id: "world-thin", type: "system_rule", title: "薄规则", content: "很强。" }],
      foreshadows: [],
      plotThreads: [],
    });

    assert.equal(audit.status, "blocked");
    assert.ok(audit.items.some((item) => item.id === "chapter-card:chapter-1" && item.status === "block"));
    assert.ok(audit.items.some((item) => item.id === "character-arc:char-2"));
    assert.ok(audit.items.some((item) => item.id === "world-entry:world-thin"));
    assert.ok(audit.nextAction.length > 0);
  });

  await t.test("catches foreshadow and thread order inversions", () => {
    const audit = buildContinuityAudit({
      chapters: baseChapters,
      characters: [],
      worldEntries: [
        { id: "world-1", type: "system_rule", title: "雨夜系统", content: "雨夜系统只在暴雨夜启动，以倒计时逼主角做选择；每次奖励都交换记忆或关系安全，不能白拿好处。" },
        { id: "world-2", type: "taboo", title: "系统代价", content: "系统代价禁止无代价复活，所有翻盘都要损失记忆、身份安全或关键关系，并制造下一章追读问题。" },
        { id: "world-3", type: "platform_soil", title: "旧案真相", content: "旧案真相每章前半给危机，后半给反击，章末必须推进到新问题，服务番茄前三章留存节奏。" },
      ],
      foreshadows: [{
        id: "fs-bad",
        title: "倒置伏笔",
        setupChapterId: "chapter-2",
        payoffChapterId: "chapter-1",
        status: "paid_off",
        notes: "",
      }],
      plotThreads: [{
        id: "thread-bad",
        type: "main",
        title: "倒置主线",
        startChapterId: "chapter-2",
        endChapterId: "chapter-1",
        status: "resolved",
      }],
    });

    assert.equal(audit.status, "blocked");
    assert.ok(audit.items.some((item) => item.id === "foreshadow-order:fs-bad"));
    assert.ok(audit.items.some((item) => item.id === "thread-order:thread-bad"));
    assert.ok(audit.summary.includes("阻塞"));
  });
});
