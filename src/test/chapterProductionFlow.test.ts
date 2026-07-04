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
