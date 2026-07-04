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

  assert.equal(reviewStage?.runAction?.action, "review");
  assert.equal(reviewStage?.runAction?.endpoint, "/api/projects/project-1/batch-review");
  assert.deepEqual(reviewStage?.runAction?.chapterIds, ["chapter-1", "chapter-2", "chapter-3"]);
  assert.equal(reviewStage?.runAction?.label, "一键送审 3 章");
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

  assert.equal(secondPassStage?.runAction?.action, "second_pass");
  assert.deepEqual(secondPassStage?.runAction?.chapterIds, ["chapter-1"]);
  assert.equal(secondPassStage?.runAction?.targetWords, 1200);
  assert.equal(secondPassStage?.runAction?.label, "一键二改 1 章");
});
