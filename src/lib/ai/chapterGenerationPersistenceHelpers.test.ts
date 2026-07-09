import assert from "node:assert/strict";
import test from "node:test";
import { completeFirstThreeReviewFollowup } from "../chapters/revisionAdoptionFollowupCompletion.ts";
import { persistServerGateDispatchTaskWithDatabase } from "../projects/gateDispatchTaskPersistence.ts";

test("review follow-up completion uses the supplied transaction client", async () => {
  const calls: unknown[] = [];
  const database = {
    gateDispatchTask: {
      updateMany: async (args: unknown) => {
        calls.push(args);
        return { count: 1 };
      },
    },
  };

  const result = await completeFirstThreeReviewFollowup({
    projectId: "project-1",
    chapterId: "chapter-1",
    chapterOrder: 1,
    chapterTitle: "Opening",
    taskId: "task-1",
    score: 91,
    issueCount: 1,
  }, database as never).catch(() => null);

  assert.deepEqual(result, { count: 1 });
  assert.equal(calls.length, 1);
});

test("story-tree dispatch persistence uses the supplied transaction client", async () => {
  let projectLookups = 0;
  let upserts = 0;
  const now = new Date("2026-07-10T10:00:00.000Z");
  const database = {
    project: {
      findUnique: async () => {
        projectLookups += 1;
        return { id: "project-1" };
      },
    },
    gateDispatchTask: {
      upsert: async () => {
        upserts += 1;
        return {
          id: "dispatch-db-1",
          dispatchKey: "dispatch-1",
          projectId: "project-1",
          platformId: "qidian",
          platformName: "Qidian",
          stage: "start_first_three_review",
          state: "assigned",
          priorityScore: 80,
          ownerRole: "Author",
          title: "Repair chapter",
          detail: "Strengthen the trunk.",
          dueLabel: "Today",
          actionLabel: "Revise",
          href: "/projects/project-1/chapters/chapter-1",
          acceptanceCriteria: "[]",
          evidence: "[]",
          sourceReceiptId: null,
          completionEvidence: "",
          reviewLatestAt: now,
          assignedAt: now,
          completedAt: null,
          createdAt: now,
          updatedAt: now,
        };
      },
    },
  };

  const result = await persistServerGateDispatchTaskWithDatabase({
    id: "dispatch-1",
    platformId: "qidian",
    platformName: "Qidian",
    stage: "start_first_three_review",
    state: "assigned",
    priorityScore: 80,
    ownerRole: "Author",
    title: "Repair chapter",
    detail: "Strengthen the trunk.",
    dueLabel: "Today",
    actionLabel: "Revise",
    href: "/projects/project-1/chapters/chapter-1",
    acceptanceCriteria: [],
    evidence: [],
    reviewLatestAt: now.toISOString(),
  }, database as never).catch(() => null);

  assert.equal(projectLookups, 1);
  assert.equal(upserts, 1);
  assert.equal(result?.databaseId, "dispatch-db-1");
});
