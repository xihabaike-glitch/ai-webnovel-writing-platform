import test from "node:test";
import assert from "node:assert/strict";
import { buildChapterProductionFlow } from "../lib/projects/chapterProductionFlow.ts";

const checklistReady = {
  readinessPercent: 100,
  passCount: 10,
  todoCount: 0,
  riskCount: 0,
  items: Array.from({ length: 10 }, (_, index) => ({
    id: `item-${index}`,
    label: `项目 ${index}`,
    status: "pass" as const,
    detail: "已通过。",
  })),
};

test("buildChapterProductionFlow blocks on missing hooks before drafting", () => {
  const flow = buildChapterProductionFlow({
    projectId: "project-1",
    chapters: [
      {
        id: "chapter-1",
        title: "第一章",
        order: 1,
        status: "outline",
        wordCount: 0,
        hook: "",
        cliffhanger: "",
      },
    ],
    aiTasks: [],
    gateTasks: [],
    submissionChecklist: {
      ...checklistReady,
      readinessPercent: 20,
      passCount: 2,
      todoCount: 8,
    },
  });

  assert.equal(flow.status, "blocked");
  assert.equal(flow.bottleneck, "hooks");
  assert.equal(flow.nextActionLabel, "补钩子");
  assert.ok(flow.headline.includes("开头钩子"));
  assert.equal(flow.stages.find((stage) => stage.id === "hooks")?.count, 0);
  assert.equal(flow.stages.find((stage) => stage.id === "drafts")?.actionLabel, "生成初稿");
});

test("buildChapterProductionFlow marks a full first-three pipeline ready", () => {
  const chapters = [1, 2, 3].map((order) => ({
    id: `chapter-${order}`,
    title: `第 ${order} 章`,
    order,
    status: "final",
    wordCount: 2200,
    hook: "雨夜系统弹出死亡任务。",
    cliffhanger: "下一秒门外传来熟悉声音。",
  }));
  const aiTasks = chapters.flatMap((chapter) => [
    { taskType: "chapter_review", status: "succeeded", chapter: { id: chapter.id } },
    { taskType: "chapter_second_pass", status: "succeeded", chapter: { id: chapter.id } },
  ]);
  const gateTasks = chapters.map((chapter) => ({
    dispatchKey: `story-tree:project-1:${chapter.id}:chapter_draft:opening_ending`,
    state: "completed",
    href: `/projects/project-1/chapters/${chapter.id}`,
  }));
  const flow = buildChapterProductionFlow({
    projectId: "project-1",
    chapters,
    aiTasks,
    gateTasks,
    submissionChecklist: checklistReady,
  });

  assert.equal(flow.status, "ready");
  assert.equal(flow.bottleneck, "submission");
  assert.equal(flow.nextActionLabel, "查看投稿预检");
  assert.equal(flow.stages.find((stage) => stage.id === "drafts")?.count, 3);
  assert.equal(flow.stages.find((stage) => stage.id === "story_tree")?.count, 3);
  assert.equal(flow.stages.find((stage) => stage.id === "reviews")?.actionLabel, "送审稿");
  assert.equal(flow.stages.find((stage) => stage.id === "second_pass")?.actionLabel, "执行二改");
  assert.ok(flow.headline.includes("已跑通"));
});

test("buildChapterProductionFlow exposes one-click review action for drafted chapters", () => {
  const chapters = [1, 2, 3].map((order) => ({
    id: `chapter-${order}`,
    title: `第 ${order} 章`,
    order,
    status: "draft",
    wordCount: 1800,
    hook: "主角醒来发现命运倒计时。",
    cliffhanger: "门后的声音喊出了他的旧名。",
  }));
  const flow = buildChapterProductionFlow({
    projectId: "project-1",
    chapters,
    aiTasks: [],
    gateTasks: [],
    submissionChecklist: checklistReady,
  });
  const reviewStage = flow.stages.find((stage) => stage.id === "reviews");

  assert.equal(reviewStage?.runAction?.type, "batch_review");
  assert.equal(reviewStage?.runAction?.type === "batch_review" ? reviewStage.runAction.action : null, "review");
  assert.equal(reviewStage?.runAction?.endpoint, "/api/projects/project-1/batch-review");
  assert.deepEqual(reviewStage?.runAction?.type === "batch_review" ? reviewStage.runAction.chapterIds : [], ["chapter-1", "chapter-2", "chapter-3"]);
  assert.equal(reviewStage?.runAction?.label, "一键送审 3 章");
  assert.equal(reviewStage?.runAction?.afterSuccess.href, "#review-pipeline");
  assert.equal(reviewStage?.runAction?.afterSuccess.label, "查看审稿结果");
});

test("buildChapterProductionFlow exposes one-click second pass action only when review asks for it", () => {
  const chapters = [1, 2, 3].map((order) => ({
    id: `chapter-${order}`,
    title: `第 ${order} 章`,
    order,
    status: "draft",
    wordCount: 1800,
    hook: "主角醒来发现命运倒计时。",
    cliffhanger: "门后的声音喊出了他的旧名。",
  }));
  const flow = buildChapterProductionFlow({
    projectId: "project-1",
    chapters,
    aiTasks: [
      {
        taskType: "chapter_review",
        status: "succeeded",
        chapter: { id: "chapter-1" },
        createdAt: "2026-01-01T00:00:00.000Z",
        outputText: JSON.stringify({
          score: 72,
          shouldSecondPass: true,
          issues: [{ type: "hook", suggestion: "强化开头钩子。" }],
        }),
      },
      {
        taskType: "chapter_review",
        status: "succeeded",
        chapter: { id: "chapter-2" },
        createdAt: "2026-01-01T00:00:00.000Z",
        outputText: JSON.stringify({
          score: 92,
          shouldSecondPass: false,
          issues: [],
        }),
      },
    ],
    gateTasks: [],
    submissionChecklist: checklistReady,
  });
  const secondPassStage = flow.stages.find((stage) => stage.id === "second_pass");

  assert.equal(secondPassStage?.runAction?.type, "batch_review");
  assert.equal(secondPassStage?.runAction?.type === "batch_review" ? secondPassStage.runAction.action : null, "second_pass");
  assert.deepEqual(secondPassStage?.runAction?.type === "batch_review" ? secondPassStage.runAction.chapterIds : [], ["chapter-1"]);
  assert.equal(secondPassStage?.runAction?.type === "batch_review" ? secondPassStage.runAction.targetWords : null, 1200);
  assert.equal(secondPassStage?.runAction?.label, "一键二改 1 章");
  assert.equal(secondPassStage?.runAction?.afterSuccess.href, "#story-tree-experience");
});

test("buildChapterProductionFlow exposes story tree recheck dispatch action for unassigned drafted chapters", () => {
  const chapters = [1, 2, 3].map((order) => ({
    id: `chapter-${order}`,
    title: `第 ${order} 章`,
    order,
    status: "draft",
    wordCount: 1800,
    hook: "主角醒来发现命运倒计时。",
    cliffhanger: "门后的声音喊出了他的旧名。",
  }));
  const flow = buildChapterProductionFlow({
    projectId: "project-1",
    chapters,
    aiTasks: [],
    gateTasks: [
      {
        dispatchKey: "story-tree:project-1:chapter-2:chapter_draft:opening_ending",
        state: "assigned",
        href: "/projects/project-1/chapters/chapter-2#chapter-second-pass",
      },
    ],
    submissionChecklist: checklistReady,
  });
  const storyTreeStage = flow.stages.find((stage) => stage.id === "story_tree");

  assert.equal(storyTreeStage?.runAction?.type, "story_tree_recheck");
  assert.equal(storyTreeStage?.runAction?.endpoint, "/api/projects/project-1/story-tree-recheck");
  assert.deepEqual(storyTreeStage?.runAction?.chapterIds, ["chapter-1", "chapter-3"]);
  assert.equal(storyTreeStage?.runAction?.label, "一键派发复检 2 章");
  assert.equal(storyTreeStage?.runAction?.afterSuccess.href, "/dispatch");
  assert.equal(storyTreeStage?.runAction?.afterSuccess.label, "查看派单");
  assert.equal(storyTreeStage?.dispatchSummary?.assigned, 1);
  assert.equal(storyTreeStage?.dispatchSummary?.pending, 1);
  assert.ok(storyTreeStage?.dispatchSummary?.detail.includes("待完成 1 章"));
  assert.equal(storyTreeStage?.dispatchSummary?.href, "/dispatch");
  assert.equal(storyTreeStage?.dispatchSummary?.actionLabel, "完成派单");
  assert.equal(flow.recheckNotice, undefined);
});

test("buildChapterProductionFlow exposes submission repair dispatch action for unassigned failed items", () => {
  const flow = buildChapterProductionFlow({
    projectId: "project-1",
    chapters: [],
    aiTasks: [],
    gateTasks: [
      {
        dispatchKey: "submission-precheck:project-1:title",
        state: "assigned",
        href: "/projects/project-1#submission-package",
      },
      {
        dispatchKey: "submission-precheck:project-1:platform-risk",
        state: "completed",
        href: "/projects/project-1#platform-export",
      },
    ],
    submissionChecklist: {
      readinessPercent: 70,
      passCount: 7,
      todoCount: 2,
      riskCount: 1,
      items: [
        { id: "title", label: "作品标题", status: "todo", detail: "标题过短。" },
        { id: "selling-point", label: "一句话卖点", status: "todo", detail: "卖点太弱。" },
        { id: "platform-risk", label: "平台风险", status: "risk", detail: "版权归属需确认。" },
      ],
    },
  });
  const submissionStage = flow.stages.find((stage) => stage.id === "submission");

  assert.equal(submissionStage?.runAction?.type, "submission_precheck_repair");
  assert.equal(submissionStage?.runAction?.endpoint, "/api/projects/project-1/submission-precheck/repair");
  assert.deepEqual(submissionStage?.runAction?.type === "submission_precheck_repair" ? submissionStage.runAction.itemIds : [], ["selling-point", "platform-risk"]);
  assert.equal(submissionStage?.runAction?.label, "一键派发修复 2 项");
  assert.equal(submissionStage?.runAction?.afterSuccess.href, "/dispatch");
  assert.ok(submissionStage?.runAction?.afterSuccess.detail.includes("投稿预检"));
  assert.equal(submissionStage?.dispatchSummary?.assigned, 2);
  assert.equal(submissionStage?.dispatchSummary?.pending, 1);
  assert.equal(submissionStage?.dispatchSummary?.completed, 1);
  assert.equal(submissionStage?.dispatchSummary?.label, "已派单 2 项");
  assert.equal(submissionStage?.dispatchSummary?.href, "/dispatch");
  assert.equal(submissionStage?.dispatchSummary?.actionLabel, "完成派单");
});

test("buildChapterProductionFlow points completed unresolved dispatches back to recheck areas", () => {
  const flow = buildChapterProductionFlow({
    projectId: "project-1",
    chapters: [],
    aiTasks: [],
    gateTasks: [
      {
        dispatchKey: "submission-precheck:project-1:platform-risk",
        state: "completed",
        href: "/projects/project-1#platform-export",
      },
    ],
    submissionChecklist: {
      readinessPercent: 90,
      passCount: 9,
      todoCount: 0,
      riskCount: 1,
      items: [
        { id: "platform-risk", label: "平台风险", status: "risk", detail: "版权归属需确认。" },
      ],
    },
  });
  const submissionStage = flow.stages.find((stage) => stage.id === "submission");

  assert.equal(submissionStage?.dispatchSummary?.pending, 0);
  assert.equal(submissionStage?.dispatchSummary?.completed, 1);
  assert.equal(submissionStage?.dispatchSummary?.href, "#submission-precheck");
  assert.equal(submissionStage?.dispatchSummary?.actionLabel, "复查预检");
  assert.ok(submissionStage?.dispatchSummary?.detail.includes("预检仍未通过"));
  assert.equal(flow.recheckNotice?.title, "有 1 个完成派单待复查");
  assert.equal(flow.recheckNotice?.href, "#submission-precheck");
  assert.equal(flow.recheckNotice?.actionLabel, "复查预检");
  assert.ok(flow.recheckNotice?.detail.includes("投稿预检"));
});
