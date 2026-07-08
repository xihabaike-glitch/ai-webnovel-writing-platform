import test from "node:test";
import assert from "node:assert/strict";
import { buildProjectDashboard } from "../lib/projects/projectDashboard.ts";
import { getPlatformProfile } from "../lib/platforms/platformProfiles.ts";

test("buildProjectDashboard", async (t) => {
  await t.test("summarizes progress, status counts, next chapter, and unreviewed chapters", () => {
    const dashboard = buildProjectDashboard({
      currentWordCount: 5000,
      targetWordCount: 10000,
      platform: getPlatformProfile("fanqie"),
      chapters: [
        {
          id: "chapter-1",
          title: "第一章",
          order: 1,
          status: "draft",
          wordCount: 3000,
          updatedAt: "2026-07-01T00:00:00.000Z",
        },
        {
          id: "chapter-2",
          title: "第二章",
          order: 2,
          status: "outline",
          wordCount: 2000,
          updatedAt: "2026-07-01T00:00:00.000Z",
        },
      ],
      aiTasks: [
        {
          id: "task-1",
          taskType: "chapter_review",
          status: "succeeded",
          model: "mock-editor",
          createdAt: "2026-07-01T00:00:00.000Z",
          chapter: { id: "chapter-1", title: "第一章" },
          modelProvider: { providerId: "mock", displayName: "Mock" },
        },
      ],
    });

    assert.equal(dashboard.progressPercent, 50);
    assert.equal(dashboard.statusCounts.draft, 1);
    assert.equal(dashboard.statusCounts.outline, 1);
    assert.equal(dashboard.nextChapter?.id, "chapter-1");
    assert.deepEqual(dashboard.unreviewedChapters.map((chapter) => chapter.id), ["chapter-2"]);
    assert.ok(dashboard.platformWarnings.some((warning) => warning.includes("未审稿")));
  });

  await t.test("builds a single-project real sample acceptance sheet", () => {
    const dashboard = buildProjectDashboard({
      projectId: "project-1",
      currentWordCount: 6600,
      targetWordCount: 300000,
      platform: getPlatformProfile("fanqie"),
      chapters: [
        {
          id: "chapter-1",
          title: "第一章",
          order: 1,
          status: "draft",
          wordCount: 2200,
          goal: "让主角遭遇系统。",
          hook: "门外倒计时和陌生求救同时出现。",
          conflict: "主角必须在自保和救人之间选择。",
          valueShift: "普通生活被系统任务击穿。",
          cliffhanger: "系统提示第一次选择失败过。",
          updatedAt: "2026-07-01T00:00:00.000Z",
        },
        {
          id: "chapter-2",
          title: "第二章",
          order: 2,
          status: "draft",
          wordCount: 2200,
          updatedAt: "2026-07-01T00:00:00.000Z",
        },
        {
          id: "chapter-3",
          title: "第三章",
          order: 3,
          status: "draft",
          wordCount: 2200,
          updatedAt: "2026-07-01T00:00:00.000Z",
        },
      ],
      aiTasks: [
        {
          id: "task-1",
          taskType: "chapter_review",
          status: "succeeded",
          model: "mock-editor",
          createdAt: "2026-07-01T00:00:00.000Z",
          chapter: { id: "chapter-1", title: "第一章" },
          modelProvider: { providerId: "mock", displayName: "Mock" },
        },
      ],
      gateDispatchTasks: [],
    });

    assert.equal(dashboard.realSampleAcceptanceSheet.title, "单本作品验收单");
    assert.equal(dashboard.realSampleAcceptanceSheet.steps.length, 6);
    assert.deepEqual(
      dashboard.realSampleAcceptanceSheet.steps.map((step) => step.id),
      ["project_start", "opening_sample", "chapter_review", "second_pass", "dispatch_receipt", "publish_package"],
    );
    assert.equal(dashboard.realSampleAcceptanceSheet.currentStepId, "second_pass");
    assert.ok(dashboard.realSampleAcceptanceSheet.verdict.includes("二改"));
    assert.equal(dashboard.realSampleAcceptanceSheet.actionHref, "#ai-pipeline");
    assert.equal(dashboard.realSampleAcceptanceSheet.finalReleaseHref, "/gate#pipeline-final-review");
    assert.equal(dashboard.realSampleAcceptanceSheet.finalReleaseLabel, "查看最终交付正式放行卡");
    assert.equal(dashboard.realSampleAcceptanceSheet.completedSteps, 3);
    assert.equal(dashboard.realSampleAcceptanceSheet.totalSteps, 6);
    assert.equal(dashboard.realSampleAcceptanceSheet.gateStatus, "blocked");
    assert.deepEqual(
      dashboard.realSampleAcceptanceSheet.missingEvidence.map((item) => item.stepId),
      ["second_pass", "dispatch_receipt", "publish_package"],
    );
    assert.ok(dashboard.realSampleAcceptanceSheet.missingEvidence[0]?.reason.includes("二改"));
    assert.equal(dashboard.realSampleAcceptanceSheet.missingEvidence[0]?.actionLabel, "启动二改");
    assert.equal(dashboard.realSampleAcceptanceSheet.missingEvidence[0]?.ownerRole, "二改编辑");
    assert.equal(dashboard.realSampleAcceptanceSheet.missingEvidence[0]?.actionMode, "ai_task");
    assert.ok(dashboard.realSampleAcceptanceSheet.missingEvidence[0]?.executionHint.includes("章节二改"));
    assert.ok(dashboard.realSampleAcceptanceSheet.missingEvidence[0]?.receiptTemplate.some((line) => line.includes("完成项：二改")));
    assert.ok(dashboard.realSampleAcceptanceSheet.missingEvidence[0]?.receiptTemplate.some((line) => line.includes("执行角色：二改编辑")));
    assert.ok(dashboard.realSampleAcceptanceSheet.missingEvidence[0]?.receiptTemplate.some((line) => line.includes("输入：")));
    assert.ok(dashboard.realSampleAcceptanceSheet.missingEvidence[0]?.receiptTemplate.some((line) => line.includes("输出：")));
    assert.ok(dashboard.realSampleAcceptanceSheet.missingEvidence[0]?.receiptTemplate.some((line) => line.includes("验收证据：")));
    assert.ok(dashboard.realSampleAcceptanceSheet.missingEvidence[0]?.receiptTemplate.some((line) => line.includes("人工验收：通过 / 退回")));
    assert.ok(dashboard.realSampleAcceptanceSheet.missingEvidence[0]?.receiptTemplate.some((line) => line.includes("下一动作：")));
    assert.equal(dashboard.realSampleAcceptanceSheet.missingEvidence[0]?.runbookStep.stepId, "sample_draft");
    assert.ok(dashboard.realSampleAcceptanceSheet.missingEvidence[0]?.runbookStep.title.includes("首章样本"));
    assert.ok(dashboard.realSampleAcceptanceSheet.missingEvidence[0]?.runbookStep.sampleAction.includes("首章样本"));
    assert.ok(dashboard.realSampleAcceptanceSheet.missingEvidence[0]?.runbookStep.proofToCapture.includes("人工采用"));
    assert.ok(dashboard.realSampleAcceptanceSheet.missingEvidence[0]?.runbookStep.rollbackIfWeak.includes("二改"));
    assert.equal(dashboard.realSampleAcceptanceSheet.missingEvidence[1]?.runbookStep.stepId, "task_dispatch");
    assert.ok(dashboard.realSampleAcceptanceSheet.missingEvidence[1]?.runbookStep.proofToCapture.includes("派单回执"));
    assert.equal(dashboard.realSampleAcceptanceSheet.missingEvidence[2]?.runbookStep.stepId, "publish_package");
    assert.ok(dashboard.realSampleAcceptanceSheet.missingEvidence[2]?.runbookStep.rollbackIfWeak.includes("发布修复"));
    const secondPassDraftHref = dashboard.realSampleAcceptanceSheet.missingEvidence[0]?.dispatchDraftHref;
    assert.equal(typeof secondPassDraftHref, "string");
    assert.ok(secondPassDraftHref.startsWith("/dispatch?"));
    assert.ok(secondPassDraftHref.includes("roleIntent=acceptance-gap"));
    assert.ok(secondPassDraftHref.includes("roleId=second_pass"));
    assert.ok(decodeURIComponent(secondPassDraftHref).includes("完成「二改」证据"));
    assert.ok(decodeURIComponent(secondPassDraftHref).includes("/projects/project-1#ai-pipeline"));
    assert.equal(dashboard.realSampleAcceptanceSheet.missingEvidence[1]?.actionLabel, "回填派单验收");
    assert.equal(dashboard.realSampleAcceptanceSheet.missingEvidence[1]?.ownerRole, "派单验收负责人");
    assert.equal(dashboard.realSampleAcceptanceSheet.missingEvidence[1]?.actionMode, "dispatch");
    assert.ok(dashboard.realSampleAcceptanceSheet.missingEvidence[1]?.executionHint.includes("派单中心"));
    assert.equal(dashboard.realSampleAcceptanceSheet.missingEvidence[2]?.actionLabel, "打开发布包");
    assert.equal(dashboard.realSampleAcceptanceSheet.missingEvidence[2]?.actionMode, "publish");
    assert.ok(dashboard.realSampleAcceptanceSheet.blockReason.includes("不能进总闸门放量"));
    assert.ok(dashboard.realSampleAcceptanceSheet.steps.find((step) => step.id === "opening_sample")?.evidence.includes("钩子"));
    assert.ok(dashboard.realSampleAcceptanceSheet.steps.find((step) => step.id === "dispatch_receipt")?.stopRule.includes("人工验收"));
  });

  await t.test("requires active role intent dispatches to close before publish package acceptance", () => {
    const baseInput = {
      projectId: "project-role-gate",
      currentWordCount: 6600,
      targetWordCount: 300000,
      platform: getPlatformProfile("fanqie"),
      chapters: [
        {
          id: "chapter-1",
          title: "第一章",
          order: 1,
          status: "draft",
          wordCount: 2200,
          goal: "让主角遭遇系统。",
          hook: "门外倒计时和陌生求救同时出现。",
          conflict: "主角必须在自保和救人之间选择。",
          valueShift: "普通生活被系统任务击穿。",
          cliffhanger: "系统提示第一次选择失败过。",
          updatedAt: "2026-07-01T00:00:00.000Z",
        },
        {
          id: "chapter-2",
          title: "第二章",
          order: 2,
          status: "draft",
          wordCount: 2200,
          updatedAt: "2026-07-01T00:00:00.000Z",
        },
        {
          id: "chapter-3",
          title: "第三章",
          order: 3,
          status: "draft",
          wordCount: 2200,
          updatedAt: "2026-07-01T00:00:00.000Z",
        },
      ],
      aiTasks: [
        {
          id: "task-1",
          taskType: "chapter_review",
          status: "succeeded",
          model: "mock-editor",
          createdAt: "2026-07-01T00:00:00.000Z",
          chapter: { id: "chapter-1", title: "第一章" },
          modelProvider: { providerId: "mock", displayName: "Mock" },
        },
        {
          id: "task-2",
          taskType: "chapter_second_pass",
          status: "succeeded",
          model: "mock-editor",
          createdAt: "2026-07-01T00:00:00.000Z",
          chapter: { id: "chapter-1", title: "第一章" },
          modelProvider: { providerId: "mock", displayName: "Mock" },
        },
      ],
      gateDispatchTasks: [
        {
          dispatchKey: "first-day:project-role-gate:publish-precheck",
          state: "completed",
          completionEvidence: "首日派单已完成，人工验收确认样本、审稿、二改和发布预检可以进入下一步。",
        },
        {
          dispatchKey: "role-intent:project-role-gate:story-structure:structure_editor",
          state: "completed",
          completionEvidence: "结构主编完成人物弧光、主线支线、开头钩子和结尾回收复查。",
        },
      ],
    };

    const blocked = buildProjectDashboard(baseInput);

    assert.deepEqual(
      blocked.realSampleAcceptanceSheet.steps.map((step) => step.id),
      ["project_start", "opening_sample", "chapter_review", "second_pass", "dispatch_receipt", "role_dispatch", "publish_package"],
    );
    assert.equal(blocked.realSampleAcceptanceSheet.currentStepId, "role_dispatch");
    assert.ok(blocked.realSampleAcceptanceSheet.verdict.includes("角色闭环"));
    assert.ok(blocked.realSampleAcceptanceSheet.actionHref.includes("#story-structure"));
    assert.ok(blocked.realSampleAcceptanceSheet.steps.find((step) => step.id === "role_dispatch")?.evidence.includes("资料官"));
    assert.equal(blocked.realSampleAcceptanceSheet.missingEvidence[0]?.stepId, "role_dispatch");
    assert.equal(blocked.realSampleAcceptanceSheet.missingEvidence[0]?.actionLabel, "补角色派单");
    assert.equal(blocked.realSampleAcceptanceSheet.missingEvidence[0]?.ownerRole, "角色验收负责人");
    assert.equal(blocked.realSampleAcceptanceSheet.missingEvidence[0]?.actionMode, "dispatch");
    assert.ok(blocked.realSampleAcceptanceSheet.missingEvidence[0]?.executionHint.includes("结构、资料、平台包装"));
    const roleDispatchDraftHref = blocked.realSampleAcceptanceSheet.missingEvidence[0]?.dispatchDraftHref;
    assert.equal(typeof roleDispatchDraftHref, "string");
    assert.ok(roleDispatchDraftHref.includes("roleId=role_dispatch"));
    assert.ok(decodeURIComponent(roleDispatchDraftHref).includes("补齐结构、资料、平台包装角色派单闭环"));
    assert.equal(blocked.realSampleAcceptanceSheet.roleClosureProgress?.completedRoles, 1);
    assert.equal(blocked.realSampleAcceptanceSheet.roleClosureProgress?.totalRoles, 3);
    assert.deepEqual(blocked.realSampleAcceptanceSheet.roleClosureProgress?.completedLabels, ["结构主编"]);
    assert.deepEqual(blocked.realSampleAcceptanceSheet.roleClosureProgress?.missingLabels, ["资料官", "平台包装"]);
    assert.ok(blocked.realSampleAcceptanceSheet.roleClosureProgress?.headline.includes("角色闭环 1/3"));

    const passed = buildProjectDashboard({
      ...baseInput,
      gateDispatchTasks: [
        ...baseInput.gateDispatchTasks,
        {
          dispatchKey: "role-intent:project-role-gate:context-recall:context_librarian",
          state: "completed",
          completionEvidence: "资料官完成项目土壤、上下文引用、排除资料和连续性风险复查。",
        },
        {
          dispatchKey: "role-intent:project-role-gate:platform-export:overseas_packager",
          state: "completed",
          completionEvidence: "平台包装官完成番茄、起点、七猫、知乎盐选、WebNovel、Royal Road、Wattpad 发布包差异复查。",
        },
      ],
    });

    assert.equal(passed.realSampleAcceptanceSheet.currentStepId, "publish_package");
    assert.ok(passed.realSampleAcceptanceSheet.verdict.includes("已闭合"));
    assert.equal(passed.realSampleAcceptanceSheet.completedSteps, 7);
    assert.equal(passed.realSampleAcceptanceSheet.totalSteps, 7);
    assert.equal(passed.realSampleAcceptanceSheet.gateStatus, "ready");
    assert.equal(passed.realSampleAcceptanceSheet.finalReleaseHref, "/gate#pipeline-final-review");
    assert.equal(passed.realSampleAcceptanceSheet.finalReleaseLabel, "查看最终交付正式放行卡");
    assert.deepEqual(passed.realSampleAcceptanceSheet.missingEvidence, []);
    assert.ok(passed.realSampleAcceptanceSheet.blockReason.includes("可以进入发布包"));
    assert.ok(passed.realSampleAcceptanceSheet.steps.find((step) => step.id === "role_dispatch")?.evidence.includes("结构主编、资料官、平台包装"));
    assert.equal(passed.realSampleAcceptanceSheet.roleClosureProgress?.completedRoles, 3);
    assert.equal(passed.realSampleAcceptanceSheet.roleClosureProgress?.missingLabels.length, 0);
    assert.ok(passed.realSampleAcceptanceSheet.roleClosureProgress?.headline.includes("三类角色已闭合"));
  });

  await t.test("uses role closure recheck receipts to close missing role lanes", () => {
    const dashboard = buildProjectDashboard({
      projectId: "project-role-recheck",
      currentWordCount: 6600,
      targetWordCount: 300000,
      platform: getPlatformProfile("fanqie"),
      chapters: [
        {
          id: "chapter-1",
          title: "第一章",
          order: 1,
          status: "draft",
          wordCount: 2200,
          goal: "让主角遭遇系统。",
          hook: "门外倒计时和陌生求救同时出现。",
          conflict: "主角必须在自保和救人之间选择。",
          valueShift: "普通生活被系统任务击穿。",
          cliffhanger: "系统提示第一次选择失败过。",
          updatedAt: "2026-07-01T00:00:00.000Z",
        },
        {
          id: "chapter-2",
          title: "第二章",
          order: 2,
          status: "draft",
          wordCount: 2200,
          updatedAt: "2026-07-01T00:00:00.000Z",
        },
        {
          id: "chapter-3",
          title: "第三章",
          order: 3,
          status: "draft",
          wordCount: 2200,
          updatedAt: "2026-07-01T00:00:00.000Z",
        },
      ],
      aiTasks: [
        {
          id: "task-1",
          taskType: "chapter_review",
          status: "succeeded",
          model: "mock-editor",
          createdAt: "2026-07-01T00:00:00.000Z",
          chapter: { id: "chapter-1", title: "第一章" },
          modelProvider: { providerId: "mock", displayName: "Mock" },
        },
        {
          id: "task-2",
          taskType: "chapter_second_pass",
          status: "succeeded",
          model: "mock-editor",
          createdAt: "2026-07-01T00:00:00.000Z",
          chapter: { id: "chapter-1", title: "第一章" },
          modelProvider: { providerId: "mock", displayName: "Mock" },
        },
      ],
      gateDispatchTasks: [
        {
          dispatchKey: "first-day:project-role-recheck:publish-precheck",
          state: "completed",
          completionEvidence: "首日派单已完成，人工验收确认样本、审稿、二改和发布预检可以进入下一步。",
        },
        {
          dispatchKey: "role-intent:project-role-recheck:story-structure:structure_editor",
          state: "completed",
          completionEvidence: "结构主编完成人物弧光、主线支线、开头钩子和结尾回收复查。",
        },
        {
          dispatchKey: "project-acceptance-next:project-role-recheck:role_dispatch",
          state: "completed",
          completionEvidence: [
            "复检分流补证据模板",
            "完成项：已补齐资料官和平台包装角色闭环",
            "产物链接/位置：/projects/project-role-recheck#context-recall；/projects/project-role-recheck#platform-export",
            "人工验收：通过",
            "回总闸门复检结论：验收缺口已解除",
          ].join("\n"),
        },
      ],
    });

    assert.equal(dashboard.realSampleAcceptanceSheet.currentStepId, "publish_package");
    assert.equal(dashboard.realSampleAcceptanceSheet.gateStatus, "ready");
    assert.equal(dashboard.realSampleAcceptanceSheet.roleClosureProgress?.completedRoles, 3);
    assert.deepEqual(dashboard.realSampleAcceptanceSheet.roleClosureProgress?.missingLabels, []);
    assert.ok(dashboard.realSampleAcceptanceSheet.roleClosureProgress?.lanes.find((lane) => lane.label === "资料官")?.evidence.includes("复检分流"));
    assert.ok(dashboard.realSampleAcceptanceSheet.steps.find((step) => step.id === "role_dispatch")?.evidence.includes("结构主编、资料官、平台包装"));
  });

  await t.test("uses publish package recheck receipts to close the acceptance sheet", () => {
    const dashboard = buildProjectDashboard({
      projectId: "project-publish-recheck",
      currentWordCount: 4400,
      targetWordCount: 300000,
      platform: getPlatformProfile("fanqie"),
      chapters: [
        {
          id: "chapter-1",
          title: "第一章",
          order: 1,
          status: "draft",
          wordCount: 2200,
          goal: "让主角遭遇系统。",
          hook: "门外倒计时和陌生求救同时出现。",
          conflict: "主角必须在自保和救人之间选择。",
          valueShift: "普通生活被系统任务击穿。",
          cliffhanger: "系统提示第一次选择失败过。",
          updatedAt: "2026-07-01T00:00:00.000Z",
        },
        {
          id: "chapter-2",
          title: "第二章",
          order: 2,
          status: "draft",
          wordCount: 2200,
          updatedAt: "2026-07-01T00:00:00.000Z",
        },
      ],
      aiTasks: [
        {
          id: "task-1",
          taskType: "chapter_review",
          status: "succeeded",
          model: "mock-editor",
          createdAt: "2026-07-01T00:00:00.000Z",
          chapter: { id: "chapter-1", title: "第一章" },
          modelProvider: { providerId: "mock", displayName: "Mock" },
        },
        {
          id: "task-2",
          taskType: "chapter_second_pass",
          status: "succeeded",
          model: "mock-editor",
          createdAt: "2026-07-01T00:00:00.000Z",
          chapter: { id: "chapter-1", title: "第一章" },
          modelProvider: { providerId: "mock", displayName: "Mock" },
        },
      ],
      gateDispatchTasks: [
        {
          dispatchKey: "first-day:project-publish-recheck:publish-precheck",
          state: "completed",
          completionEvidence: "首日派单已完成，人工验收确认样本、审稿、二改和发布预检可以进入下一步。",
        },
        {
          dispatchKey: "project-acceptance-next:project-publish-recheck:publish_package",
          state: "completed",
          completionEvidence: [
            "复检分流补证据模板",
            "完成项：已补齐番茄发布包标题、简介、标签和前三章样章",
            "产物链接/位置：/projects/project-publish-recheck#platform-export",
            "人工验收：通过",
            "回总闸门复检结论：验收缺口已解除",
          ].join("\n"),
        },
      ],
    });

    assert.equal(dashboard.realSampleAcceptanceSheet.currentStepId, "publish_package");
    assert.equal(dashboard.realSampleAcceptanceSheet.gateStatus, "ready");
    assert.equal(dashboard.realSampleAcceptanceSheet.completedSteps, 6);
    assert.deepEqual(dashboard.realSampleAcceptanceSheet.missingEvidence, []);
    assert.ok(dashboard.realSampleAcceptanceSheet.steps.find((step) => step.id === "publish_package")?.evidence.includes("复检分流"));
  });
});
