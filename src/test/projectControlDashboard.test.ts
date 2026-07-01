import test from "node:test";
import assert from "node:assert/strict";
import { getPlatformProfile } from "../lib/platforms/platformProfiles.ts";
import { buildProjectControlDashboard } from "../lib/projects/projectControlDashboard.ts";

const project = {
  title: "夜雨系统",
  genre: "都市系统",
  sellingPoint: "雨夜危机中觉醒系统，主角用选择翻盘。",
  targetLengthType: "long_300k_plus",
  targetWordCount: 300000,
  currentWordCount: 1200,
  updateCadence: "daily_4000",
};
const chapter = {
  id: "chapter-1",
  order: 1,
  title: "第一章 雨夜系统",
  content: "林晚推开门，系统提示音在雨夜响起。",
  wordCount: 1200,
  goal: "让主角遭遇系统。",
  hook: "系统倒计时出现。",
  conflict: "主角必须救人或逃跑。",
  valueShift: "平静转向危机。",
  cliffhanger: "系统给出第二个任务。",
  status: "draft",
  updatedAt: "2026-01-01T00:00:00.000Z",
};
const checklist = {
  readinessPercent: 70,
  passCount: 7,
  todoCount: 2,
  riskCount: 1,
  items: [{ id: "word-count", label: "投稿字数", status: "todo" as const, detail: "字数不足。" }],
};

test("buildProjectControlDashboard", async (t) => {
  await t.test("aggregates project health areas and critical actions", () => {
    const dashboard = buildProjectControlDashboard({
      project,
      platform: getPlatformProfile("fanqie"),
      chapters: [chapter],
      outlineNodes: [
        { id: "root", parentId: null, chapterId: null, type: "root", title: "总纲", summary: "总纲", goal: "总目标", hook: "总钩子", conflict: "总冲突", valueShift: "总转变", platformNote: "平台", order: 0, depth: 0, status: "planned" },
        { id: "opening", parentId: "root", chapterId: "chapter-1", type: "opening", title: "开头", summary: "开头", goal: "目标", hook: "钩子", conflict: "冲突", valueShift: "转变", platformNote: "平台", order: 1, depth: 1, status: "chapter_card" },
      ],
      characters: [],
      worldEntries: [],
      foreshadows: [],
      plotThreads: [],
      aiTasks: [
        { id: "review-1", chapterId: "chapter-1", taskType: "chapter_review", status: "succeeded", outputText: JSON.stringify({ score: 72, issues: [{ type: "hook" }] }), errorMessage: null, createdAt: "2026-01-01T00:00:00.000Z" },
      ],
      submissionChecklist: checklist,
    });

    assert.equal(dashboard.areas.length, 8);
    assert.equal(dashboard.metrics.chapters, 1);
    assert.equal(dashboard.metrics.publishableChapters, 1);
    assert.equal(dashboard.areas.find((area) => area.id === "export")?.status, "blocked");
    assert.ok(dashboard.areas.find((area) => area.id === "export")?.nextAction.includes("先处理"));
    assert.equal(dashboard.priorityActions.length, 4);
    assert.ok(dashboard.priorityActions.some((action) => action.areaId === "characters" && action.targetAnchor === "character-arc"));
    assert.ok(dashboard.priorityActions.every((action) => action.actionLabel.length > 0));
    assert.ok(dashboard.priorityActions.some((action) => action.areaId === "characters" && action.canExecute && action.executeLabel === "补人物卡"));
    assert.ok(dashboard.priorityActions.some((action) => action.areaId === "characters" && action.canGenerate && action.generateLabel === "AI 生成人物"));
    assert.ok(dashboard.overallScore > 0);
    assert.ok(dashboard.criticalActions.some((action) => action.includes("人物弧光")));
  });

  await t.test("rewards a more complete production system", () => {
    const dashboard = buildProjectControlDashboard({
      project: { ...project, currentWordCount: 2400 },
      platform: getPlatformProfile("fanqie"),
      chapters: [{ ...chapter, wordCount: 2400, status: "revising" }],
      outlineNodes: ["root", "opening", "ending", "trunk", "soil"].map((type, index) => ({
        id: type,
        parentId: index === 0 ? null : "root",
        chapterId: type === "opening" ? "chapter-1" : null,
        type,
        title: type,
        summary: type,
        goal: type,
        hook: type,
        conflict: type,
        valueShift: type,
        platformNote: type,
        order: index,
        depth: index === 0 ? 0 : 1,
        status: "planned",
      })),
      characters: [
        { id: "c1", name: "林晚", role: "主角", desire: "查清系统", need: "主动选择", flaw: "逃避", arcStart: "被动", arcEnd: "主动", voice: "克制", relationshipNotes: "和反派有牵连" },
      ],
      worldEntries: [
        { id: "w1", type: "system_rule", title: "系统规则", content: "系统任务必须伴随代价，并推动主角做出高风险选择。每次奖励都要带出新的债务、敌人或关系压力。" },
        { id: "w2", type: "taboo", title: "复活禁忌", content: "不能无代价复活，任何复活都必须交换记忆或关系。禁忌一旦触发，会让主角失去最重要的证据。" },
        { id: "w3", type: "platform_soil", title: "平台土壤", content: "每章必须有爽点、冲突和章末追读，信息要前置。设定只服务选择压力，不能连续解释超过两段。" },
      ],
      foreshadows: [
        { id: "f1", title: "系统异常", setupChapterId: "chapter-1", payoffChapterId: "chapter-1", relatedCharacterIds: "[]", status: "paid_off", notes: "已回收" },
      ],
      plotThreads: [
        { id: "p1", type: "main", title: "系统主线", startChapterId: "chapter-1", endChapterId: "chapter-1", status: "resolved" },
      ],
      aiTasks: [
        { id: "draft-1", chapterId: "chapter-1", taskType: "chapter_draft", status: "succeeded", outputText: chapter.content, errorMessage: null, createdAt: "2026-01-01T00:00:00.000Z" },
        { id: "review-1", chapterId: "chapter-1", taskType: "chapter_review", status: "succeeded", outputText: JSON.stringify({ score: 88, shouldSecondPass: false, issues: [] }), errorMessage: null, createdAt: "2026-01-02T00:00:00.000Z" },
        { id: "second-1", chapterId: "chapter-1", taskType: "chapter_second_pass", status: "succeeded", outputText: chapter.content, errorMessage: null, createdAt: "2026-01-03T00:00:00.000Z" },
      ],
      submissionChecklist: { ...checklist, readinessPercent: 90, items: [] },
    });

    assert.ok(dashboard.overallScore >= 60);
    assert.equal(dashboard.areas.find((area) => area.id === "world")?.status, "good");
    assert.equal(dashboard.areas.find((area) => area.id === "export")?.status, "good");
  });
});
