import test from "node:test";
import assert from "node:assert/strict";
import { getPlatformProfile } from "../lib/platforms/platformProfiles.ts";
import { buildFirstDayDispatchItem, buildFirstDayLaunchReceipt, buildFirstDayWorkflow } from "../lib/projects/firstDayWorkflow.ts";

const project = {
  id: "project-1",
  title: "夜雨系统",
  currentWordCount: 0,
};
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
};
const checklist = {
  readinessPercent: 30,
  passCount: 3,
  todoCount: 5,
  riskCount: 1,
  items: [],
};
const outlineNodes = ["root", "opening", "ending", "trunk", "branch", "branch", "branch", "leaf", "leaf", "soil"].map((type) => ({ type }));
const characters = [
  {
    name: "林晚",
    role: "主角",
    desire: "查清系统",
    need: "主动承担",
    flaw: "逃避冲突",
    arcStart: "被动",
    arcEnd: "主动掌控",
    voice: "克制",
  },
];
const worldEntries = [
  { type: "system_rule", title: "选择系统", content: "系统只在高压选择出现时发布任务，每次奖励都绑定代价和下一轮冲突，不能无成本升级。" },
  { type: "taboo", title: "回档禁忌", content: "回档不能无损使用，主角每次借用未来信息都会失去关系信任，并制造新的证据缺口和敌人。" },
  { type: "platform_soil", title: "番茄土壤", content: "每章前半段给危机，后半段给反击或新问题，章末留下追读钩子，解释不能连续过长拖节奏。" },
];

test("buildFirstDayWorkflow", async (t) => {
  await t.test("guides a templated new project to first draft generation", () => {
    const workflow = buildFirstDayWorkflow({
      project,
      platform: getPlatformProfile("fanqie"),
      chapters: [chapter, { ...chapter, id: "chapter-2", order: 2 }, { ...chapter, id: "chapter-3", order: 3 }],
      outlineNodes,
      characters,
      worldEntries,
      aiTasks: [],
      submissionChecklist: checklist,
    });

    assert.equal(workflow.steps.length, 7);
    assert.equal(workflow.completedCount, 3);
    assert.equal(workflow.nextStep.id, "first-draft");
    assert.equal(workflow.steps.find((step) => step.id === "first-draft")?.status, "active");
    assert.ok(workflow.nextStep.href.endsWith("/chapters/chapter-1"));
  });

  await t.test("summarizes a created project launch receipt with the first executable step", () => {
    const workflow = buildFirstDayWorkflow({
      project,
      platform: getPlatformProfile("fanqie"),
      chapters: [chapter, { ...chapter, id: "chapter-2", order: 2 }, { ...chapter, id: "chapter-3", order: 3 }],
      outlineNodes,
      characters,
      worldEntries,
      aiTasks: [],
      submissionChecklist: checklist,
    });

    const receipt = buildFirstDayLaunchReceipt(workflow);

    assert.equal(receipt.title, "首日启动回执");
    assert.equal(receipt.nextStepId, "first-draft");
    assert.equal(receipt.owner, "AI");
    assert.equal(receipt.actionLabel, "生成第一章");
    assert.equal(receipt.href, "/projects/project-1/chapters/chapter-1");
    assert.equal(receipt.completedCount, 3);
    assert.equal(receipt.totalSteps, 7);
    assert.equal(receipt.progressPercent, 43);
    assert.ok(receipt.message.includes("下一步"));
    assert.ok(receipt.message.includes("生成第一章正文"));
    assert.deepEqual(receipt.readyStepIds, ["skeleton", "opening-hook", "story-support"]);
  });

  await t.test("builds an execution package for the current first-day step", () => {
    const workflow = buildFirstDayWorkflow({
      project,
      platform: getPlatformProfile("fanqie"),
      chapters: [chapter, { ...chapter, id: "chapter-2", order: 2 }, { ...chapter, id: "chapter-3", order: 3 }],
      outlineNodes,
      characters,
      worldEntries,
      aiTasks: [],
      submissionChecklist: checklist,
    });

    assert.equal(workflow.executionPackage.stepId, "first-draft");
    assert.equal(workflow.executionPackage.owner, "AI");
    assert.equal(workflow.executionPackage.actionLabel, "生成第一章");
    assert.equal(workflow.executionPackage.href, "/projects/project-1/chapters/chapter-1");
    assert.ok(workflow.executionPackage.headline.includes("AI"));
    assert.ok(workflow.executionPackage.acceptanceCriteria.includes("第一章正文已生成并写回章节"));
    assert.ok(workflow.executionPackage.missingEvidence.includes("缺少第一章正文或成功初稿任务"));
    assert.ok(workflow.executionPackage.handoffNote.includes("别批量开跑"));
  });

  await t.test("turns the current first-day execution package into a dispatch task", () => {
    const platform = getPlatformProfile("fanqie");
    const workflow = buildFirstDayWorkflow({
      project,
      platform,
      chapters: [chapter, { ...chapter, id: "chapter-2", order: 2 }, { ...chapter, id: "chapter-3", order: 3 }],
      outlineNodes,
      characters,
      worldEntries,
      aiTasks: [],
      submissionChecklist: checklist,
    });

    const dispatch = buildFirstDayDispatchItem({ workflow, project, platform });

    assert.equal(dispatch.id, "first-day:project-1:first-draft");
    assert.equal(dispatch.platformId, "fanqie");
    assert.equal(dispatch.platformName, "番茄小说");
    assert.equal(dispatch.stage, "start_first_three_review");
    assert.equal(dispatch.state, "assigned");
    assert.equal(dispatch.ownerRole, "AI");
    assert.equal(dispatch.actionLabel, "生成第一章");
    assert.equal(dispatch.href, "/projects/project-1/chapters/chapter-1");
    assert.ok(dispatch.title.includes("夜雨系统"));
    assert.ok(dispatch.acceptanceCriteria.includes("第一章正文已生成并写回章节"));
    assert.ok(dispatch.evidence.includes("缺少第一章正文或成功初稿任务"));
  });

  await t.test("locks downstream work when the skeleton is empty", () => {
    const workflow = buildFirstDayWorkflow({
      project,
      platform: getPlatformProfile("fanqie"),
      chapters: [],
      outlineNodes: [],
      characters: [],
      worldEntries: [],
      aiTasks: [],
      submissionChecklist: checklist,
    });

    assert.equal(workflow.completedCount, 0);
    assert.equal(workflow.nextStep.id, "skeleton");
    assert.equal(workflow.steps.find((step) => step.id === "opening-hook")?.status, "locked");
  });

  await t.test("marks the first-day chain complete after draft, review, rewrite, and precheck", () => {
    const workflow = buildFirstDayWorkflow({
      project: { ...project, currentWordCount: 2400 },
      platform: getPlatformProfile("fanqie"),
      chapters: [{ ...chapter, content: "正文", wordCount: 2400 }, { ...chapter, id: "chapter-2", order: 2 }, { ...chapter, id: "chapter-3", order: 3 }],
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

    assert.equal(workflow.completedCount, 7);
    assert.equal(workflow.progressPercent, 100);
    assert.equal(workflow.nextStep.id, "publish-precheck");
    assert.equal(workflow.steps.every((step) => step.status === "done"), true);
  });
});
