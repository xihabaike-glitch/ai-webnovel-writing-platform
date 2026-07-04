import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFirstDayDispatchCompletionTemplate,
  buildFirstDayDispatchDesk,
  buildFirstDayReceiptCompletionAction,
  buildFirstDayStepView,
  completeFirstDayDispatchStep,
} from "../lib/projects/firstDayWorkflowView.ts";

test("buildFirstDayStepView separates task center acceptance evidence", () => {
  const view = buildFirstDayStepView({
    id: "skeleton",
    label: "搭建大树骨架",
    status: "done",
    owner: "策划",
    evidence: "0 个大纲节点，0 张章节卡。 任务中心已验收：首日骨架派单已完成，开头结尾主干分支土壤都已经复核。",
    instruction: "确认开头、结尾、主干、分支、叶片和土壤都已经生成。",
    actionLabel: "看项目总控",
    href: "/projects/project-1#project-control",
  });

  assert.equal(view.primaryEvidence, "0 个大纲节点，0 张章节卡。");
  assert.equal(view.acceptanceLabel, "任务中心验收");
  assert.equal(view.acceptanceEvidence, "首日骨架派单已完成，开头结尾主干分支土壤都已经复核。");
  assert.equal(view.hasTaskAcceptance, true);
});

test("buildFirstDayStepView keeps normal evidence unchanged", () => {
  const view = buildFirstDayStepView({
    id: "opening-hook",
    label: "确认开头钩子",
    status: "active",
    owner: "作者",
    evidence: "第一章：天降系统。钩子：主角被迫当天逆袭。",
    instruction: "补完整开头冲突。",
    actionLabel: "打开第一章",
    href: "/projects/project-1/chapters/chapter-1",
  });

  assert.equal(view.primaryEvidence, "第一章：天降系统。钩子：主角被迫当天逆袭。");
  assert.equal(view.acceptanceEvidence, null);
  assert.equal(view.hasTaskAcceptance, false);
});

test("buildFirstDayReceiptCompletionAction only allows successful receipts with enough evidence", () => {
  const hidden = buildFirstDayReceiptCompletionAction({
    receipt: { success: false, completionEvidence: "" },
    completionEvidence: "",
    hasDispatch: true,
    isCompleting: false,
  });
  const missingDispatch = buildFirstDayReceiptCompletionAction({
    receipt: { success: true, completionEvidence: "第一章正文已生成并写回章节。" },
    completionEvidence: "第一章正文已生成并写回章节。",
    hasDispatch: false,
    isCompleting: false,
  });
  const thinEvidence = buildFirstDayReceiptCompletionAction({
    receipt: { success: true, completionEvidence: "已完成" },
    completionEvidence: "已完成",
    hasDispatch: true,
    isCompleting: false,
  });
  const ready = buildFirstDayReceiptCompletionAction({
    receipt: { success: true, completionEvidence: "第一章正文已生成并写回章节。" },
    completionEvidence: "第一章正文已生成并写回章节。",
    hasDispatch: true,
    isCompleting: false,
  });

  assert.equal(hidden.visible, false);
  assert.equal(missingDispatch.visible, true);
  assert.equal(missingDispatch.canComplete, false);
  assert.ok(missingDispatch.reason.includes("派到任务中心"));
  assert.equal(thinEvidence.canComplete, false);
  assert.ok(thinEvidence.reason.includes("至少 8 个字"));
  assert.equal(ready.visible, true);
  assert.equal(ready.canComplete, true);
  assert.equal(ready.label, "验收并进入下一步");
});

test("buildFirstDayDispatchDesk highlights the next first-day task", () => {
  const desk = buildFirstDayDispatchDesk([
    {
      databaseId: "db-1",
      dispatchKey: "first-day:project-1:first-review",
      id: "first-day:project-1:first-review",
      projectId: "project-1",
      platformId: "fanqie",
      platformName: "番茄小说",
      stage: "start_first_three_review",
      state: "assigned",
      priorityScore: 70,
      ownerRole: "AI",
      title: "夜雨系统 · 第一章审稿",
      detail: "AI 先当毒舌审稿编辑。",
      dueLabel: "今天收口",
      actionLabel: "去审稿",
      href: "/projects/project-1/chapters/chapter-1",
      acceptanceCriteria: ["第一章已有结构化审稿结果"],
      evidence: ["缺少第一章成功审稿任务"],
      sourceReceiptId: null,
      completionEvidence: "",
      reviewLatestAt: "2026-01-01T00:00:00.000Z",
      assignedAt: "2026-01-01T00:00:00.000Z",
      completedAt: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    {
      databaseId: "db-2",
      dispatchKey: "first-day:project-1:first-draft",
      id: "first-day:project-1:first-draft",
      projectId: "project-1",
      platformId: "fanqie",
      platformName: "番茄小说",
      stage: "start_first_three_review",
      state: "completed",
      priorityScore: 80,
      ownerRole: "AI",
      title: "夜雨系统 · 生成第一章正文",
      detail: "AI 接手第一章初稿。",
      dueLabel: "今天收口",
      actionLabel: "生成第一章",
      href: "/projects/project-1/chapters/chapter-1",
      acceptanceCriteria: ["第一章正文已生成并写回章节"],
      evidence: [],
      sourceReceiptId: null,
      completionEvidence: "第一章正文已生成并写回章节。",
      reviewLatestAt: "2026-01-01T00:00:00.000Z",
      assignedAt: "2026-01-01T00:00:00.000Z",
      completedAt: "2026-01-01T00:10:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:10:00.000Z",
    },
  ]);

  assert.equal(desk.summary.total, 2);
  assert.equal(desk.summary.active, 1);
  assert.equal(desk.summary.completed, 1);
  assert.equal(desk.nextTask?.stepId, "first-review");
  assert.equal(desk.nextTask?.stepLabel, "第一章审稿");
  assert.equal(desk.nextTask?.firstDayHref, "/projects/project-1?firstDayLaunch=1&nextStep=first-review#first-day-workflow");
  assert.ok(desk.nextTask?.completionTemplate.includes("第一章审稿已完成"));
  assert.ok(desk.nextActions[0].includes("第一章审稿"));
});

test("buildFirstDayDispatchCompletionTemplate covers first-day step types", () => {
  assert.ok(buildFirstDayDispatchCompletionTemplate({
    dispatchKey: "first-day:project-1:first-draft",
    acceptanceCriteria: [],
  }).includes("第一章正文已生成"));
  assert.ok(buildFirstDayDispatchCompletionTemplate({
    dispatchKey: "first-day:project-1:publish-precheck",
    acceptanceCriteria: [],
  }).includes("平台包预检已完成"));
  assert.equal(buildFirstDayDispatchCompletionTemplate({
    dispatchKey: "manual",
    acceptanceCriteria: ["完成当前动作"],
  }), "");
});

test("completeFirstDayDispatchStep completes the matching task center dispatch", async () => {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return new Response(JSON.stringify({
      task: {
        dispatchKey: "first-day:project-1:first-draft",
        state: "completed",
        completionEvidence: "第一章正文已经生成并写回章节，作者已确认可以进入审稿。",
      },
      followUpTasks: [],
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;

  try {
    const result = await completeFirstDayDispatchStep(
      "project-1",
      "first-draft",
      "第一章正文已经生成并写回章节，作者已确认可以进入审稿。",
    );

    assert.equal(result.task.dispatchKey, "first-day:project-1:first-draft");
    assert.equal(result.task.state, "completed");
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "/api/gate/dispatch-tasks");
    assert.equal(calls[0].init.method, "PATCH");
    assert.deepEqual(JSON.parse(String(calls[0].init.body)), {
      dispatchKey: "first-day:project-1:first-draft",
      state: "completed",
      completionEvidence: "第一章正文已经生成并写回章节，作者已确认可以进入审稿。",
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("completeFirstDayDispatchStep rejects thin acceptance evidence before calling the api", async () => {
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = (async () => {
    called = true;
    return new Response("{}", { status: 200 });
  }) as typeof fetch;

  try {
    await assert.rejects(
      completeFirstDayDispatchStep("project-1", "first-draft", "已完成"),
      /完成派单前，请写清楚完成依据，至少 8 个字。/,
    );
    assert.equal(called, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
