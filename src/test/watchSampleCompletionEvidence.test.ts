import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWatchSampleAutoCompletionDrafts,
  buildWatchSampleCompletionEvidenceSuggestions,
} from "../lib/projects/watchSampleCompletionEvidence.ts";

test("buildWatchSampleCompletionEvidenceSuggestions maps sample receipts to first-day draft dispatches", () => {
  const suggestions = buildWatchSampleCompletionEvidenceSuggestions([
    {
      projectId: "project-1",
      executionType: "recommended_batch",
      label: "沉淀批量初稿 1 个经验",
      createdAt: "2026-01-01T00:00:00.000Z",
      payload: JSON.stringify({
        batchReceipt: {
          completionEvidenceTemplate: [
            "小样本验证已完成：",
            "通过线：成功率 100%，质量 86。",
            "不可接受项：未出现失败。",
            "复查证据：AI 任务 task-1。",
            "放量结论：通过，可以恢复后续初稿批次。",
          ].join("\n"),
        },
      }),
    },
  ]);

  assert.equal(suggestions.length, 1);
  assert.equal(suggestions[0].dispatchKey, "first-day:project-1:first-draft");
  assert.equal(suggestions[0].projectId, "project-1");
  assert.ok(suggestions[0].completionEvidence.includes("放量结论：通过"));
});

test("buildWatchSampleCompletionEvidenceSuggestions keeps the latest sample evidence per dispatch", () => {
  const suggestions = buildWatchSampleCompletionEvidenceSuggestions([
    {
      projectId: "project-1",
      executionType: "recommended_batch",
      label: "旧小样本",
      createdAt: "2026-01-01T00:00:00.000Z",
      payload: JSON.stringify({
        batchReceipt: {
          completionEvidenceTemplate: "小样本验证已完成：\n放量结论：未通过，继续停留观察。",
        },
      }),
    },
    {
      projectId: "project-1",
      executionType: "recommended_batch",
      label: "新小样本",
      createdAt: "2026-01-02T00:00:00.000Z",
      payload: JSON.stringify({
        batchReceipt: {
          completionEvidenceTemplate: "小样本验证已完成：\n放量结论：通过，可以恢复后续初稿批次。",
        },
      }),
    },
  ]);

  assert.equal(suggestions.length, 1);
  assert.equal(suggestions[0].label, "新小样本");
  assert.ok(suggestions[0].completionEvidence.includes("通过，可以恢复"));
});

test("buildWatchSampleCompletionEvidenceSuggestions ignores unrelated or unusable audits", () => {
  const suggestions = buildWatchSampleCompletionEvidenceSuggestions([
    {
      projectId: "project-1",
      executionType: "manual",
      label: "人工记录",
      createdAt: "2026-01-01T00:00:00.000Z",
      payload: JSON.stringify({ batchReceipt: { completionEvidenceTemplate: "小样本验证已完成：放量结论：通过。" } }),
    },
    {
      projectId: null,
      executionType: "recommended_batch",
      label: "跨项目批次",
      createdAt: "2026-01-01T00:00:00.000Z",
      payload: JSON.stringify({ batchReceipt: { completionEvidenceTemplate: "小样本验证已完成：放量结论：通过。" } }),
    },
    {
      projectId: "project-2",
      executionType: "recommended_batch",
      label: "普通批次",
      createdAt: "2026-01-01T00:00:00.000Z",
      payload: JSON.stringify({ batchReceipt: { headline: "普通完成" } }),
    },
  ]);

  assert.equal(suggestions.length, 0);
});

test("buildWatchSampleAutoCompletionDrafts prefills assigned first-day sample evidence without overwriting edits", () => {
  const drafts = buildWatchSampleAutoCompletionDrafts({
    currentDrafts: {
      "first-day:project-2:first-draft": "作者已经手写的验收依据。",
    },
    suggestions: [
      {
        dispatchKey: "first-day:project-1:first-draft",
        projectId: "project-1",
        label: "恢复放量小样本",
        createdAt: "2026-01-02T00:00:00.000Z",
        completionEvidence: [
          "小样本验证已完成：",
          "成功率：100%",
          "质量分：86",
          "失败样本：0",
          "放量结论：通过，可以恢复后续初稿批次。",
        ].join("\n"),
      },
      {
        dispatchKey: "first-day:project-2:first-draft",
        projectId: "project-2",
        label: "不会覆盖人工输入",
        createdAt: "2026-01-02T00:00:00.000Z",
        completionEvidence: "小样本验证已完成：\n成功率：100%",
      },
      {
        dispatchKey: "first-day:project-3:first-draft",
        projectId: "project-3",
        label: "已完成任务不回填",
        createdAt: "2026-01-02T00:00:00.000Z",
        completionEvidence: "小样本验证已完成：\n成功率：100%",
      },
    ],
    tasks: [
      {
        dispatchKey: "first-day:project-1:first-draft",
        state: "assigned",
        completionEvidence: "",
      },
      {
        dispatchKey: "first-day:project-2:first-draft",
        state: "assigned",
        completionEvidence: "",
      },
      {
        dispatchKey: "first-day:project-3:first-draft",
        state: "completed",
        completionEvidence: "",
      },
    ],
  });

  assert.ok(drafts["first-day:project-1:first-draft"].includes("质量分：86"));
  assert.equal(drafts["first-day:project-2:first-draft"], "作者已经手写的验收依据。");
  assert.equal(drafts["first-day:project-3:first-draft"], undefined);
});

test("buildWatchSampleAutoCompletionDrafts returns the same draft object when nothing changes", () => {
  const currentDrafts = {
    "first-day:project-1:first-draft": "作者已经手写的验收依据。",
  };
  const drafts = buildWatchSampleAutoCompletionDrafts({
    currentDrafts,
    suggestions: [
      {
        dispatchKey: "first-day:project-1:first-draft",
        projectId: "project-1",
        label: "不会覆盖",
        createdAt: "2026-01-02T00:00:00.000Z",
        completionEvidence: "小样本验证已完成：\n成功率：100%",
      },
    ],
    tasks: [
      {
        dispatchKey: "first-day:project-1:first-draft",
        state: "assigned",
        completionEvidence: "",
      },
    ],
  });

  assert.equal(drafts, currentDrafts);
});
