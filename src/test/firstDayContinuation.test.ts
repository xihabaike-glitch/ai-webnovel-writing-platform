import assert from "node:assert/strict";
import test from "node:test";
import { getPlatformProfile } from "../lib/platforms/platformProfiles.ts";
import { buildFirstDayContinuationAction } from "../lib/projects/firstDayContinuation.ts";
import { buildFirstDayWorkflow, type FirstDayWorkflow } from "../lib/projects/firstDayWorkflow.ts";
import type { TaskQueueProject } from "../lib/projects/taskQueueCenter.ts";

const chapter = {
  id: "chapter-1",
  order: 1,
  title: "第一章 雨夜系统",
  content: "",
  wordCount: 0,
  goal: "让主角遭遇系统。",
  hook: "门外倒计时和陌生求救同时出现。",
  conflict: "主角必须在自保和救人之间选择。",
  valueShift: "普通生活被系统任务击穿。",
  cliffhanger: "系统提示第一次选择失败过。",
  status: "outline",
};
const outlineNodes = ["root", "opening", "ending", "trunk", "branch", "branch", "branch", "leaf", "leaf", "soil"].map((type) => ({ type }));
const characters = [{
  name: "林晚",
  role: "主角",
  desire: "查清系统",
  need: "主动承担",
  flaw: "逃避冲突",
  arcStart: "被动",
  arcEnd: "主动掌控",
  voice: "克制",
}];
const worldEntries = [
  { type: "system_rule", title: "选择系统", content: "系统只在高压选择出现时发布任务，每次奖励都绑定代价和下一轮冲突，不能无成本升级。" },
  { type: "taboo", title: "回档禁忌", content: "回档不能无损使用，主角每次借用未来信息都会失去关系信任，并制造新的证据缺口和敌人。" },
  { type: "platform_soil", title: "番茄土壤", content: "状态：模板推荐\n打法：首章先给不可逆危机，三章内连续兑现爽点。\n开头动作：第一段给倒计时。\n验证动作：批量前检查前三章追读。\n风险：解释过多会掉节奏。" },
];
const checklist = {
  readinessPercent: 30,
  passCount: 3,
  todoCount: 5,
  riskCount: 1,
  items: [],
};

function activeWorkflow() {
  return buildFirstDayWorkflow({
    project: { id: "project-1", title: "夜雨系统", currentWordCount: 0 },
    platform: getPlatformProfile("fanqie"),
    chapters: [chapter, { ...chapter, id: "chapter-2", order: 2 }, { ...chapter, id: "chapter-3", order: 3 }],
    outlineNodes,
    characters,
    worldEntries,
    aiTasks: [],
    submissionChecklist: checklist,
  });
}

function completedWorkflow(): FirstDayWorkflow {
  return buildFirstDayWorkflow({
    project: { id: "project-1", title: "夜雨系统", currentWordCount: 2400 },
    platform: getPlatformProfile("fanqie"),
    chapters: [
      { ...chapter, content: "正文", wordCount: 2400, status: "revising" },
      { ...chapter, id: "chapter-2", order: 2, title: "第二章 第一次奖励" },
      { ...chapter, id: "chapter-3", order: 3, title: "第三章 反杀证据" },
    ],
    outlineNodes,
    characters,
    worldEntries,
    aiTasks: [
      { chapterId: "chapter-1", taskType: "chapter_draft", status: "succeeded" },
      { chapterId: "chapter-1", taskType: "chapter_review", status: "succeeded" },
      { chapterId: "chapter-1", taskType: "chapter_second_pass", status: "succeeded" },
    ],
    submissionChecklist: { ...checklist, readinessPercent: 75 },
  });
}

function project(overrides: Partial<TaskQueueProject> = {}): TaskQueueProject {
  return {
    id: "project-1",
    title: "夜雨系统",
    targetPlatform: "fanqie",
    targetWordCount: 300000,
    currentWordCount: 2400,
    genre: "都市系统",
    sellingPoint: "雨夜危机中觉醒系统，主角用一次次选择翻盘。",
    chapters: [{ ...chapter, content: "正文", wordCount: 2400, status: "draft" }],
    aiTasks: [],
    worldEntries,
    ...overrides,
  };
}

test("buildFirstDayContinuationAction keeps unfinished first-day work ahead of batch scale-up", () => {
  const action = buildFirstDayContinuationAction({
    project: project(),
    workflow: activeWorkflow(),
  });

  assert.equal(action.status, "first_day_active");
  assert.equal(action.queueCategory, null);
  assert.ok(action.headline.includes("首日链路"));
  assert.ok(action.warnings.some((warning) => warning.includes("不建议扩大批量")));
});

test("buildFirstDayContinuationAction routes completed first-day work into the AI pipeline", () => {
  const action = buildFirstDayContinuationAction({
    project: project(),
    workflow: completedWorkflow(),
  });

  assert.equal(action.status, "ready");
  assert.equal(action.queueCategory, "review");
  assert.equal(action.primaryLabel, "进入批量审稿");
  assert.equal(action.primaryHref, "/projects/project-1#ai-pipeline");
  assert.equal(action.secondaryHref, "/tasks");
  assert.ok(action.warnings.some((warning) => warning.includes("小样本") || warning.includes("同类可执行任务")));
});

test("buildFirstDayContinuationAction gives a fallback when no direct batch item exists", () => {
  const action = buildFirstDayContinuationAction({
    project: project({
      chapters: [],
      aiTasks: [],
      currentWordCount: 0,
    }),
    workflow: completedWorkflow(),
  });

  assert.equal(action.status, "complete");
  assert.equal(action.itemCount, 0);
  assert.equal(action.primaryHref, "/projects/project-1#chapter-production");
  assert.ok(action.detail.includes("暂无可直接批量执行"));
});
