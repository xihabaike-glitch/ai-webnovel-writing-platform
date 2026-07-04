import test from "node:test";
import assert from "node:assert/strict";
import { getPlatformProfile } from "../lib/platforms/platformProfiles.ts";
import { buildSubmissionPrecheckRepairDispatches } from "../lib/projects/submissionPrecheckRepair.ts";

test("buildSubmissionPrecheckRepairDispatches creates role-based repair tasks", () => {
  const dispatches = buildSubmissionPrecheckRepairDispatches({
    projectId: "project-1",
    projectTitle: "夜雨系统",
    platform: getPlatformProfile("fanqie"),
    now: "2026-07-05T10:00:00.000Z",
    items: [
      { id: "title", label: "作品标题", status: "todo", detail: "标题过短。" },
      { id: "word-count", label: "投稿字数", status: "todo", detail: "当前字数不足。" },
      { id: "platform-risk", label: "平台风险", status: "risk", detail: "版权风险需确认。" },
      { id: "genre", label: "题材标签", status: "pass", detail: "已填写。" },
    ],
  });

  assert.equal(dispatches.length, 3);
  assert.equal(dispatches[0].id, "submission-precheck:project-1:word-count");
  assert.equal(dispatches[0].ownerRole, "作者");
  assert.equal(dispatches[0].href, "/projects/project-1#chapter-production");
  assert.ok(dispatches[0].acceptanceCriteria.some((item) => item.includes("投稿前检查")));
  assert.ok(dispatches.some((dispatch) => dispatch.id === "submission-precheck:project-1:platform-risk"));
});

test("buildSubmissionPrecheckRepairDispatches skips existing repair dispatches", () => {
  const dispatches = buildSubmissionPrecheckRepairDispatches({
    projectId: "project-1",
    projectTitle: "夜雨系统",
    platform: getPlatformProfile("qidian"),
    existingDispatchKeys: ["submission-precheck:project-1:selling-point"],
    items: [
      { id: "selling-point", label: "一句话卖点", status: "todo", detail: "卖点太弱。" },
      { id: "reviewed-first-three", label: "前三章审稿", status: "todo", detail: "已审稿 0/3 章。" },
    ],
  });

  assert.equal(dispatches.length, 1);
  assert.equal(dispatches[0].id, "submission-precheck:project-1:reviewed-first-three");
  assert.equal(dispatches[0].actionLabel, "审前三章");
  assert.equal(dispatches[0].href, "/projects/project-1#review-pipeline");
});
