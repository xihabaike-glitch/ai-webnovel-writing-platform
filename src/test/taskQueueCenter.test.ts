import test from "node:test";
import assert from "node:assert/strict";
import { buildTaskQueueCenter, type TaskQueueProject } from "../lib/projects/taskQueueCenter.ts";

const baseChapter = {
  id: "chapter-ready-draft",
  order: 1,
  title: "第一章 雨夜系统",
  content: "",
  wordCount: 0,
  goal: "让主角在雨夜被系统逼进不可逆选择。",
  hook: "系统倒计时只剩十秒，门外的人已经开始求救。",
  conflict: "主角必须在逃跑和救人之间选择，否则会失去唯一证据。",
  valueShift: "从普通生活转向失控危机，第一次意识到系统会索命。",
  cliffhanger: "系统刷新第二个任务：亲手交出证据。",
  status: "outline",
};

const project: TaskQueueProject = {
  id: "project-1",
  title: "夜雨系统",
  targetPlatform: "fanqie",
  targetWordCount: 300000,
  currentWordCount: 5000,
  genre: "都市系统",
  sellingPoint: "雨夜危机中觉醒系统，主角用一次次选择翻盘。",
  chapters: [
    baseChapter,
    {
      ...baseChapter,
      id: "chapter-review",
      order: 2,
      title: "第二章 第一次奖励",
      content: "已有正文",
      wordCount: 2200,
      status: "draft",
    },
    {
      ...baseChapter,
      id: "chapter-second-pass",
      order: 3,
      title: "第三章 反杀证据",
      content: "已有正文",
      wordCount: 2400,
      status: "revising",
    },
    {
      ...baseChapter,
      id: "chapter-blocked",
      order: 4,
      title: "第四章 缺卡",
      hook: "",
    },
  ],
  aiTasks: [
    {
      id: "review-weak",
      chapterId: "chapter-second-pass",
      taskType: "chapter_review",
      status: "succeeded",
      outputText: JSON.stringify({ score: 70, issues: [{ type: "hook", suggestion: "强化开头钩子。" }] }),
      errorMessage: null,
      createdAt: "2026-01-02T00:00:00.000Z",
    },
  ],
  worldEntries: [
    {
      type: "platform_soil",
      title: "首轮平台打法：番茄小说",
      content: "状态：模板推荐\n打法：首章先给不可逆危机，三章内连续兑现爽点。\n开头动作：第一段给倒计时。\n验证动作：批量前检查前三章追读。\n风险：解释过多会掉节奏。",
    },
  ],
};

test("buildTaskQueueCenter", async (t) => {
  await t.test("collects cross-project draft, review, second-pass, export, and blocked tasks", () => {
    const queue = buildTaskQueueCenter([project]);

    assert.equal(queue.overview.draftReady, 1);
    assert.equal(queue.overview.reviewReady, 1);
    assert.equal(queue.overview.secondPassReady, 1);
    assert.equal(queue.overview.exportReady, 0);
    assert.equal(queue.overview.blockedCards, 2);
    assert.equal(queue.overview.publishBlocked, 1);
    assert.equal(queue.overview.chapterCardBlocked, 1);
    assert.equal(queue.overview.riskRecoveryBlocked, 0);
    assert.equal(queue.overview.watchScaleBlocked, 0);
    assert.equal(queue.overview.watchItems, 0);
    assert.equal(queue.overview.watchSampleOnly, 0);
    assert.equal(queue.overview.watchCleared, 0);
    assert.equal(queue.overview.totalItems, 5);
    assert.equal(queue.recommendedNext?.category, "review");
    assert.deepEqual(
      queue.items.map((item) => item.category),
      ["review", "second_pass", "draft", "blocked", "blocked"],
    );
    const publishBlocker = queue.items.find((item) => item.id.includes(":publish-repair:"));
    const cardBlocker = queue.items.find((item) => item.id.includes(":blocked:"));
    assert.ok(publishBlocker?.href.endsWith("#platform-export"));
    assert.equal(publishBlocker?.blockerType, "publish_repair");
    assert.equal(cardBlocker?.blockerType, "chapter_card");
    assert.ok(publishBlocker?.evidence.includes("先处理"));
    assert.equal(queue.recommendedNext?.strategyBasis?.label, "模板推荐");
    assert.ok(queue.items.every((item) => item.strategyBasis?.openingMove.includes("倒计时")));
  });

  await t.test("blocks risky first drafts behind recovery validation", () => {
    const blockedProject: TaskQueueProject = {
      ...project,
      id: "blocked-project",
      worldEntries: [
        {
          type: "platform_soil",
          title: "首轮平台打法：番茄小说",
          content: [
            "状态：历史避坑",
            "打法：旧样本首章解释过多，先重做入口卖点。",
            "开头动作：第一段给不可逆危机。",
            "验证动作：只看前三章兑现是否改掉。",
            "风险：没有恢复条件前不能放量。",
          ].join("\n"),
        },
      ],
    };
    const queue = buildTaskQueueCenter([blockedProject]);

    assert.equal(queue.overview.riskRecoveryBlocked, 1);
    assert.equal(queue.items.some((item) => item.category === "draft"), false);
    const recovery = queue.items.find((item) => item.blockerType === "risk_recovery");
    assert.equal(recovery?.riskLevel, "blocked");
    assert.equal(recovery?.actionLabel, "做恢复验证");
    assert.ok(recovery?.href.endsWith("#first-day-workflow"));
    assert.ok(recovery?.evidence.includes("恢复条件"));
  });

  await t.test("keeps watch projects as small-sample draft tasks", () => {
    const watchProject: TaskQueueProject = {
      ...project,
      id: "watch-project",
      chapters: [
        baseChapter,
        {
          ...baseChapter,
          id: "chapter-ready-draft-2",
          order: 2,
          title: "第二章 第二个样本",
        },
      ],
      aiTasks: [],
      worldEntries: [
        {
          type: "platform_soil",
          title: "首轮平台打法：番茄小说",
          content: [
            "状态：历史观察",
            "打法：先用第一章小样本验证读者反馈。",
            "开头动作：第一段给强冲突。",
            "验证动作：写清通过线和不可接受项。",
            "风险：观察期不要批量。",
          ].join("\n"),
        },
      ],
    };
    const queue = buildTaskQueueCenter([watchProject]);
    const drafts = queue.items.filter((item) => item.category === "draft");
    const gate = queue.items.find((item) => item.blockerType === "watch_scale_gate");

    assert.equal(drafts.length, 1);
    assert.equal(queue.overview.watchScaleBlocked, 1);
    assert.equal(queue.overview.watchSampleOnly, 2);
    assert.equal(drafts[0].riskLevel, "watch");
    assert.equal(drafts[0].scaleGate, "sample_only");
    assert.equal(drafts[0].actionLabel, "生成小样本");
    assert.ok(drafts[0].riskNotice?.includes("小样本验证"));
    assert.ok(gate?.evidence.includes("通过线、不可接受项、复查证据和放量结论"));
  });

  await t.test("allows watch drafts to scale after sample acceptance evidence clears the gate", () => {
    const clearedProject: TaskQueueProject = {
      ...project,
      id: "watch-cleared-project",
      chapters: [
        baseChapter,
        {
          ...baseChapter,
          id: "chapter-ready-draft-2",
          order: 2,
          title: "第二章 第二个样本",
        },
      ],
      aiTasks: [],
      worldEntries: [
        {
          type: "platform_soil",
          title: "首轮平台打法：番茄小说",
          content: [
            "状态：历史观察",
            "打法：先用第一章小样本验证读者反馈。",
            "开头动作：第一段给强冲突。",
            "验证动作：写清通过线和不可接受项。",
            "风险：观察期不要批量。",
          ].join("\n"),
        },
      ],
      gateDispatchTasks: [
        {
          dispatchKey: "first-day:watch-cleared-project:first-draft",
          state: "completed",
          completionEvidence: "小样本首轮通过线已写清，不可接受项和复查证据已补齐。放量结论：通过，可以恢复后续初稿批次。",
        },
      ],
    };
    const queue = buildTaskQueueCenter([clearedProject]);
    const drafts = queue.items.filter((item) => item.category === "draft");

    assert.equal(drafts.length, 2);
    assert.equal(queue.overview.watchScaleBlocked, 0);
    assert.equal(queue.overview.watchSampleOnly, 0);
    assert.equal(queue.overview.watchCleared, 2);
    assert.ok(drafts.every((item) => item.scaleGate === "cleared"));
    assert.ok(drafts.every((item) => item.actionLabel === "生成初稿"));
    assert.ok(drafts.every((item) => item.riskNotice?.includes("小样本验收依据已过线")));
  });

  await t.test("keeps the watch gate closed when sample evidence says not passed", () => {
    const notPassedProject: TaskQueueProject = {
      ...project,
      id: "watch-not-passed-project",
      chapters: [
        baseChapter,
        {
          ...baseChapter,
          id: "chapter-ready-draft-2",
          order: 2,
          title: "第二章 第二个样本",
        },
      ],
      aiTasks: [],
      worldEntries: [
        {
          type: "platform_soil",
          title: "首轮平台打法：番茄小说",
          content: [
            "状态：历史观察",
            "打法：先用第一章小样本验证读者反馈。",
            "开头动作：第一段给强冲突。",
            "验证动作：写清通过线和不可接受项。",
            "风险：观察期不要批量。",
          ].join("\n"),
        },
      ],
      gateDispatchTasks: [
        {
          dispatchKey: "first-day:watch-not-passed-project:first-draft",
          state: "completed",
          completionEvidence: "小样本首轮通过线已写清，不可接受项和复查证据已补齐。放量结论：未通过，继续停留观察。",
        },
      ],
    };
    const queue = buildTaskQueueCenter([notPassedProject]);
    const drafts = queue.items.filter((item) => item.category === "draft");
    const gate = queue.items.find((item) => item.blockerType === "watch_scale_gate");

    assert.equal(drafts.length, 1);
    assert.equal(gate?.scaleGate, "sample_only");
    assert.equal(queue.overview.watchScaleBlocked, 1);
    assert.equal(queue.overview.watchCleared, 0);
  });
});
