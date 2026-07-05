import test from "node:test";
import assert from "node:assert/strict";
import { getPlatformProfile } from "../lib/platforms/platformProfiles.ts";
import { buildFirstDayDispatchItem, buildFirstDayExecutionReceipt, buildFirstDayExperienceHandoffDispatchItems, buildFirstDayFollowUpDispatch, buildFirstDayLaunchPackage, buildFirstDayLaunchReceipt, buildFirstDayModelExecutionPlan, buildFirstDayRiskProfile, buildFirstDayWorkflow } from "../lib/projects/firstDayWorkflow.ts";

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

  await t.test("builds a launch package with the first-day dispatch", () => {
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
    const launchPackage = buildFirstDayLaunchPackage({ workflow, project, platform });

    assert.equal(launchPackage.receipt.nextStepId, "first-draft");
    assert.equal(launchPackage.dispatch.id, "first-day:project-1:first-draft");
    assert.equal(launchPackage.dispatch.state, "assigned");
    assert.equal(launchPackage.dispatch.dueLabel, "今天收口");
    assert.equal(launchPackage.dispatch.actionLabel, launchPackage.receipt.actionLabel);
    assert.ok(launchPackage.dispatch.acceptanceCriteria.includes("第一章正文已生成并写回章节"));
    assert.deepEqual(launchPackage.handoffDispatches, []);
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
    assert.ok(workflow.executionPackage.modelPrompt.includes("你是网文首日执行助手"));
    assert.ok(workflow.executionPackage.modelPrompt.includes("夜雨系统"));
    assert.ok(workflow.executionPackage.modelPrompt.includes("番茄小说"));
    assert.ok(workflow.executionPackage.modelPrompt.includes("第一章 雨夜系统"));
    assert.ok(workflow.executionPackage.modelPrompt.includes("第一章正文已生成并写回章节"));
    assert.ok(workflow.executionPackage.completionEvidenceTemplate.includes("第一章正文已生成"));
  });

  await t.test("injects project start tactics and model route recheck into first-day execution", () => {
    const platform = getPlatformProfile("fanqie");
    const startTactic = {
      title: "首轮平台打法：番茄小说",
      label: "恢复放量打法",
      primaryTactic: "首章先给不可逆危机，三章内连续兑现爽点。",
      openingMove: "第一段给倒计时和身份暴露风险。",
      verificationMove: "批量后复检前三章追读；首批同时做模型路由复检，确认正文初稿、章节审稿成功率、质量和成本。",
      risk: "新项目仍先跑小样本，不要直接放量。",
      handoffStatus: "reuse" as const,
      handoffLabel: "复用交接",
      handoffDetail: "沿用番茄历史高压钩子，但首日必须回填数据证据。",
      recommendedPlatformName: "番茄小说",
      recommendedTemplateId: "fanqie_system_reversal" as const,
      firstDayActions: ["开头：第一段给倒计时。", "验证：回填前三章追读。"],
      avoidRules: ["不要直接放量，先做小样本。"],
      handoffEvidence: ["最终判定：稳定加码。"],
    };
    const workflow = buildFirstDayWorkflow({
      project,
      platform,
      chapters: [chapter, { ...chapter, id: "chapter-2", order: 2 }, { ...chapter, id: "chapter-3", order: 3 }],
      outlineNodes,
      characters,
      worldEntries,
      aiTasks: [],
      startTactic,
      submissionChecklist: checklist,
    });
    const dispatch = buildFirstDayDispatchItem({ workflow, project, platform });
    const handoffDispatches = buildFirstDayExperienceHandoffDispatchItems({ workflow, project, platform });
    const launchPackage = buildFirstDayLaunchPackage({ workflow, project, platform });

    assert.equal(workflow.nextStep.id, "first-draft");
    assert.equal(workflow.executionPackage.tacticFocus?.label, "恢复放量打法");
    assert.equal(workflow.handoffProgress?.headline, "开书交接执行进度");
    assert.equal(workflow.handoffProgress?.progressPercent, 0);
    assert.equal(workflow.handoffProgress?.items[0]?.status, "active");
    assert.equal(workflow.handoffProgress?.items[0]?.label, "开头打法");
    assert.ok(workflow.handoffProgress?.nextAction.includes("开头打法"));
    assert.ok(workflow.executionPackage.tacticFocus?.openingMove.includes("倒计时"));
    assert.equal(workflow.executionPackage.tacticFocus?.handoffDetail, "沿用番茄历史高压钩子，但首日必须回填数据证据。");
    assert.ok(workflow.executionPackage.tacticFocus?.firstDayActions.some((action) => action.includes("第一段给倒计时")));
    assert.ok(workflow.executionPackage.tacticFocus?.avoidRules.some((rule) => rule.includes("不要直接放量")));
    assert.ok(workflow.executionPackage.acceptanceCriteria.some((criterion) => criterion.includes("第一章正文必须执行开头动作")));
    assert.ok(workflow.executionPackage.acceptanceCriteria.some((criterion) => criterion.includes("执行开书交接动作")));
    assert.ok(workflow.executionPackage.acceptanceCriteria.some((criterion) => criterion.includes("避开交接边界")));
    assert.ok(workflow.executionPackage.acceptanceCriteria.some((criterion) => criterion.includes("模型路线复检")));
    assert.ok(workflow.executionPackage.missingEvidence.some((evidence) => evidence.includes("开头动作")));
    assert.ok(workflow.executionPackage.missingEvidence.some((evidence) => evidence.includes("模型路线复检")));
    assert.ok(workflow.executionPackage.handoffNote.includes("开书打法要落地"));
    assert.ok(workflow.executionPackage.completionEvidenceTemplate.includes("交接动作已落地"));
    assert.ok(workflow.executionPackage.completionEvidenceTemplate.includes("避坑边界已确认"));
    assert.ok(workflow.executionPackage.modelPrompt.includes("开书打法约束"));
    assert.ok(workflow.executionPackage.modelPrompt.includes("恢复放量打法"));
    assert.ok(workflow.executionPackage.modelPrompt.includes("交接说明"));
    assert.ok(workflow.executionPackage.modelPrompt.includes("首日动作"));
    assert.ok(workflow.executionPackage.modelPrompt.includes("避坑边界"));
    assert.ok(workflow.executionPackage.modelPrompt.includes("模型路线复检"));
    assert.ok(dispatch.acceptanceCriteria.some((criterion) => criterion.includes("模型路线复检")));
    assert.deepEqual(handoffDispatches.map((item) => item.id), [
      "first-day-handoff:project-1:opening",
      "first-day-handoff:project-1:verification",
      "first-day-handoff:project-1:platform-package",
    ]);
    assert.deepEqual(handoffDispatches.map((item) => item.ownerRole), ["开头编辑", "审稿编辑", "平台运营"]);
    assert.ok(handoffDispatches[0]?.acceptanceCriteria.some((criterion) => criterion.includes("倒计时")));
    assert.ok(handoffDispatches[1]?.acceptanceCriteria.some((criterion) => criterion.includes("通过线")));
    assert.ok(handoffDispatches[2]?.acceptanceCriteria.some((criterion) => criterion.includes("首轮曝光")));
    assert.ok(handoffDispatches.every((item) => item.evidence.some((evidence) => evidence.includes("稳定加码"))));
    assert.equal(launchPackage.handoffDispatches.length, 3);
  });

  await t.test("tracks closed-loop handoff progress from completed handoff dispatches", () => {
    const platform = getPlatformProfile("fanqie");
    const startTactic = {
      title: "首轮平台打法：番茄小说",
      label: "开局闭环",
      primaryTactic: "番茄小说 已经把平台经验落到新书第一天流程。",
      openingMove: "先锁定第一屏危机和读者承诺。",
      verificationMove: "写清通过线、不可接受项和复查证据格式。",
      risk: "仍要回填真实效果，不能直接当成长线加码结论。",
      handoffStatus: "reuse" as const,
      handoffLabel: "闭环交接",
      handoffDetail: "已用于新书开局并闭环：开头、验收、包装三段交接完成。",
      recommendedPlatformName: "番茄小说",
      recommendedTemplateId: "fanqie_system_reversal" as const,
      firstDayActions: [
        "闭环复用：沿用已完成的新书开局三段交接。",
        "开头：先锁开头钩子和读者承诺。",
        "验证：通过线与不可接受项必须写清。",
      ],
      avoidRules: ["包装交接：标题、简介、标签、卖点必须回收平台避坑边界。"],
      handoffEvidence: ["已用于新书开局并闭环：开头、验收、包装三段交接完成"],
    };
    const workflow = buildFirstDayWorkflow({
      project,
      platform,
      chapters: [chapter, { ...chapter, id: "chapter-2", order: 2 }, { ...chapter, id: "chapter-3", order: 3 }],
      outlineNodes,
      characters,
      worldEntries,
      aiTasks: [],
      startTactic,
      dispatchTasks: [
        {
          dispatchKey: "first-day-handoff:project-1:opening",
          state: "completed",
          completionEvidence: "已锁定前三段钩子、读者承诺和第一章冲突升级。",
        },
        {
          dispatchKey: "first-day-handoff:project-1:verification",
          state: "completed",
          completionEvidence: "已写清通过线、不可接受项和复查证据格式。",
        },
        {
          dispatchKey: "first-day-handoff:project-1:platform-package",
          state: "completed",
          completionEvidence: "已把避坑边界回收到标题、简介、标签和卖点包装。",
        },
      ],
      submissionChecklist: checklist,
    });

    assert.equal(workflow.handoffProgress?.headline, "闭环打法执行进度");
    assert.equal(workflow.handoffProgress?.label, "闭环交接");
    assert.equal(workflow.handoffProgress?.completedCount, 3);
    assert.equal(workflow.handoffProgress?.progressPercent, 100);
    assert.equal(workflow.handoffProgress?.items.every((item) => item.status === "done"), true);
    assert.ok(workflow.handoffProgress?.nextAction.includes("三段交接已闭环"));
    assert.ok(workflow.handoffProgress?.evidence.some((item) => item.includes("已用于新书开局并闭环")));
    assert.ok(workflow.handoffProgress?.items[2]?.evidence.includes("标题、简介、标签"));
  });

  await t.test("turns the current first-day package into a model execution plan", () => {
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

    const plan = buildFirstDayModelExecutionPlan(workflow);

    assert.equal(plan.executable, true);
    assert.equal(plan.stepId, "first-draft");
    assert.equal(plan.taskType, "chapter_draft");
    assert.equal(plan.chapterId, "chapter-1");
    assert.equal(plan.actionKind, "chapter_draft");
    assert.ok(plan.modelPrompt.includes("第一章 雨夜系统"));
    assert.ok(plan.completionEvidence.includes("第一章正文已生成"));
  });

  await t.test("builds a write-back receipt for first-day chapter draft execution", () => {
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
    const plan = buildFirstDayModelExecutionPlan(workflow);
    const receipt = buildFirstDayExecutionReceipt({
      plan,
      result: {
        chapter: { title: "第一章 雨夜系统", wordCount: 1320 },
        provider: { displayName: "DeepSeek" },
        draftQuality: { score: 86 },
      },
    });

    assert.equal(receipt.success, true);
    assert.equal(receipt.writeBackTarget, "第一章 雨夜系统");
    assert.ok(receipt.summary.includes("已写回"));
    assert.ok(receipt.completionEvidence.includes("1320 字"));
    assert.ok(receipt.completionEvidence.includes("DeepSeek"));
    assert.ok(receipt.detailItems.some((item) => item.includes("自动质检")));
  });

  await t.test("builds a task receipt for first-day chapter review execution", () => {
    const plan = {
      executable: true,
      stepId: "first-review",
      actionKind: "chapter_review" as const,
      taskType: "chapter_review" as const,
      chapterId: "chapter-1",
      modelPrompt: "",
      completionEvidence: "",
    };
    const receipt = buildFirstDayExecutionReceipt({
      plan,
      result: {
        chapter: { title: "第一章 雨夜系统" },
        provider: { displayName: "Kimi" },
        result: {
          score: 72,
          summary: "钩子明确，但解释密度偏高。",
          issues: [{ severity: "medium" }, { severity: "low" }],
        },
      },
    });

    assert.equal(receipt.success, true);
    assert.equal(receipt.writeBackTarget, "AI 任务审稿记录");
    assert.ok(receipt.completionEvidence.includes("评分 72"));
    assert.ok(receipt.completionEvidence.includes("2 个问题"));
    assert.ok(receipt.nextAction.includes("二改"));
  });

  await t.test("builds a write-back receipt for first-day second pass execution", () => {
    const plan = {
      executable: true,
      stepId: "first-rewrite",
      actionKind: "chapter_second_pass" as const,
      taskType: "chapter_second_pass" as const,
      chapterId: "chapter-1",
      modelPrompt: "",
      completionEvidence: "",
    };
    const receipt = buildFirstDayExecutionReceipt({
      plan,
      result: {
        chapter: { title: "第一章 雨夜系统", wordCount: 1480 },
        activeProvider: { displayName: "Claude" },
        secondPassAudit: { score: 90 },
      },
    });

    assert.equal(receipt.success, true);
    assert.ok(receipt.summary.includes("二改已写回"));
    assert.ok(receipt.completionEvidence.includes("保留改前版本"));
    assert.ok(receipt.completionEvidence.includes("90 分复检"));
  });

  await t.test("builds a write-back receipt for first-day control assets execution", () => {
    const plan = {
      executable: true,
      stepId: "story-support",
      actionKind: "control_assets" as const,
      taskType: "control_asset_generate" as const,
      controlAreaIds: ["characters", "world", "story-lines"] as const,
      modelPrompt: "",
      completionEvidence: "",
    };
    const receipt = buildFirstDayExecutionReceipt({
      plan,
      result: [
        { areaId: "characters", created: ["林晚"] },
        { areaId: "world", created: ["选择系统", "回档禁忌"] },
        { areaId: "story-lines", created: ["雨夜主线"] },
      ],
    });

    assert.equal(receipt.success, true);
    assert.equal(receipt.writeBackTarget, "人物弧光、核心设定、主线支线");
    assert.ok(receipt.completionEvidence.includes("新增 4 项"));
    assert.ok(receipt.completionEvidence.includes("林晚"));
    assert.ok(receipt.nextAction.includes("第一章初稿"));
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

  await t.test("raises first-day dispatch intensity for blocked start tactics", () => {
    const platform = getPlatformProfile("qimao");
    const startTactic = {
      title: "首轮平台打法：七猫小说",
      label: "复盘止损",
      primaryTactic: "七猫小说 返工链复盘已完成，结论是先暂停当前平台方向。",
      openingMove: "先按避坑样本重做开头钩子。",
      verificationMove: "如必须验证，只允许一轮小样本。",
      risk: "已暂停七猫加码，转回投稿包和前三章兑现重判。",
    };
    const workflow = buildFirstDayWorkflow({
      project,
      platform,
      chapters: [chapter, { ...chapter, id: "chapter-2", order: 2 }, { ...chapter, id: "chapter-3", order: 3 }],
      outlineNodes,
      characters,
      worldEntries,
      aiTasks: [],
      startTactic,
      submissionChecklist: checklist,
    });

    const dispatch = buildFirstDayDispatchItem({ workflow, project, platform });

    assert.equal(workflow.nextStep.id, "risk-recovery");
    assert.equal(workflow.executionPackage.riskLevel, "blocked");
    assert.equal(workflow.executionPackage.riskLabel, "复盘止损");
    assert.equal(workflow.executionPackage.riskPriorityBoost, 16);
    assert.ok(workflow.executionPackage.headline.includes("止损恢复"));
    assert.ok(workflow.executionPackage.acceptanceCriteria.some((criterion) => criterion.includes("恢复条件")));
    assert.ok(workflow.executionPackage.missingEvidence.some((evidence) => evidence.includes("恢复条件")));
    assert.ok(workflow.executionPackage.handoffNote.includes("避坑平台首日"));
    assert.equal(dispatch.dueLabel, "今天止损验证");
    assert.ok(dispatch.title.includes("止损验证"));
    assert.equal(dispatch.id, "first-day:project-1:risk-recovery");
    assert.equal(dispatch.priorityScore, 78);
    assert.ok(dispatch.evidence.some((evidence) => evidence.includes("恢复条件")));
  });

  await t.test("keeps recovery validation separate from first draft completion", () => {
    const workflow = buildFirstDayWorkflow({
      project,
      platform: getPlatformProfile("qimao"),
      chapters: [chapter, { ...chapter, id: "chapter-2", order: 2 }, { ...chapter, id: "chapter-3", order: 3 }],
      outlineNodes,
      characters,
      worldEntries,
      aiTasks: [],
      startTactic: {
        title: "首轮平台打法：七猫小说",
        label: "复盘止损",
        primaryTactic: "七猫小说方向暂时暂停。",
        openingMove: "先重做开头钩子。",
        verificationMove: "只允许恢复条件验证。",
        risk: "未证明恢复条件前不能生成正文。",
      },
      submissionChecklist: checklist,
    });

    const plan = buildFirstDayModelExecutionPlan(workflow);

    assert.equal(workflow.executionPackage.riskLevel, "blocked");
    assert.equal(workflow.executionPackage.stepId, "risk-recovery");
    assert.equal(workflow.nextStep.id, "risk-recovery");
    assert.equal(plan.executable, false);
    assert.equal(plan.actionKind, "manual");
    assert.equal(plan.taskType, undefined);
    assert.ok(plan.blockedReason?.includes("人工确认"));
    assert.equal(workflow.steps.find((step) => step.id === "first-draft")?.status, "locked");
  });

  await t.test("moves blocked starts to watch mode after recovery evidence", () => {
    const workflow = buildFirstDayWorkflow({
      project,
      platform: getPlatformProfile("qimao"),
      chapters: [chapter, { ...chapter, id: "chapter-2", order: 2 }, { ...chapter, id: "chapter-3", order: 3 }],
      outlineNodes,
      characters,
      worldEntries,
      aiTasks: [],
      dispatchTasks: [{
        dispatchKey: "first-day:project-1:risk-recovery",
        state: "completed",
        completionEvidence: "恢复条件已写清：入口卖点已重做，前三章兑现问题已列出。",
      }],
      startTactic: {
        title: "首轮平台打法：七猫小说",
        label: "复盘止损",
        primaryTactic: "七猫小说方向暂时暂停。",
        openingMove: "先重做开头钩子。",
        verificationMove: "只允许恢复条件验证。",
        risk: "未证明恢复条件前不能生成正文。",
      },
      submissionChecklist: checklist,
    });

    const plan = buildFirstDayModelExecutionPlan(workflow);
    const dispatch = buildFirstDayDispatchItem({ workflow, project, platform: getPlatformProfile("qimao") });

    assert.equal(workflow.nextStep.id, "first-draft");
    assert.equal(workflow.executionPackage.riskLevel, "watch");
    assert.equal(workflow.executionPackage.riskLabel, "恢复观察");
    assert.equal(plan.executable, true);
    assert.equal(plan.actionKind, "chapter_draft");
    assert.equal(dispatch.id, "first-day:project-1:first-draft");
    assert.equal(dispatch.dueLabel, "今天小样本验证");
    assert.ok(dispatch.title.includes("小样本验证"));
  });

  await t.test("does not treat old blocked draft dispatch evidence as completed prose", () => {
    const workflow = buildFirstDayWorkflow({
      project,
      platform: getPlatformProfile("qimao"),
      chapters: [chapter, { ...chapter, id: "chapter-2", order: 2 }, { ...chapter, id: "chapter-3", order: 3 }],
      outlineNodes,
      characters,
      worldEntries,
      aiTasks: [],
      dispatchTasks: [{
        dispatchKey: "first-day:project-1:first-draft",
        state: "completed",
        completionEvidence: "恢复条件已写清：入口卖点已重做，前三章兑现问题已列出。",
      }],
      startTactic: {
        title: "首轮平台打法：七猫小说",
        label: "复盘止损",
        primaryTactic: "七猫小说方向暂时暂停。",
        openingMove: "先重做开头钩子。",
        verificationMove: "只允许恢复条件验证。",
        risk: "未证明恢复条件前不能生成正文。",
      },
      submissionChecklist: checklist,
    });

    assert.equal(workflow.nextStep.id, "risk-recovery");
    assert.equal(workflow.steps.find((step) => step.id === "first-draft")?.status, "locked");
    assert.equal(workflow.steps.find((step) => step.id === "first-review")?.status, "locked");
  });

  await t.test("keeps watch start tactics on a small-sample first-day path", () => {
    const platform = getPlatformProfile("webnovel");
    const riskProfile = buildFirstDayRiskProfile({
      title: "首轮平台打法：WebNovel",
      label: "验收观察",
      primaryTactic: "先跑英文网文小样本。",
      openingMove: "第一章先验海外钩子。",
      verificationMove: "保留小样本通过线。",
      risk: "扩大前必须复查留存。",
    });
    const workflow = buildFirstDayWorkflow({
      project,
      platform,
      chapters: [chapter, { ...chapter, id: "chapter-2", order: 2 }, { ...chapter, id: "chapter-3", order: 3 }],
      outlineNodes,
      characters,
      worldEntries,
      aiTasks: [],
      startTactic: {
        title: "首轮平台打法：WebNovel",
        label: "验收观察",
        primaryTactic: "先跑英文网文小样本。",
        openingMove: "第一章先验海外钩子。",
        verificationMove: "保留小样本通过线。",
        risk: "扩大前必须复查留存。",
      },
      submissionChecklist: checklist,
    });

    const dispatch = buildFirstDayDispatchItem({ workflow, project, platform });

    assert.equal(riskProfile.level, "watch");
    assert.equal(riskProfile.dueLabel, "今天小样本验证");
    assert.equal(workflow.executionPackage.riskLevel, "watch");
    assert.ok(workflow.executionPackage.acceptanceCriteria.some((criterion) => criterion.includes("小样本通过线")));
    assert.equal(dispatch.dueLabel, "今天小样本验证");
    assert.ok(dispatch.title.includes("小样本验证"));
    assert.equal(dispatch.priorityScore, 65);
  });

  await t.test("maps third-round final labels to first-day risk levels", () => {
    const stable = buildFirstDayRiskProfile({
      title: "首轮平台打法：番茄小说",
      label: "三轮稳住",
      primaryTactic: "三轮数据已站住，可以小批放大。",
      openingMove: "复用首章高压钩子。",
      verificationMove: "继续回填曝光、点击、收藏和追读。",
      risk: "稳定加码不是无限放量。",
    });
    const downgrade = buildFirstDayRiskProfile({
      title: "首轮平台打法：七猫",
      label: "三轮降档",
      primaryTactic: "只复用修复流程。",
      openingMove: "先重修前三章兑现。",
      verificationMove: "小样本通过后再放大。",
      risk: "不能直接进入稳定加码。",
    });
    const pause = buildFirstDayRiskProfile({
      title: "首轮平台打法：WebNovel",
      label: "三轮暂停",
      primaryTactic: "三轮后归档暂停。",
      openingMove: "重写入口卖点。",
      verificationMove: "先写清恢复条件。",
      risk: "未证明恢复条件前不要硬冲。",
    });
    const pivot = buildFirstDayRiskProfile({
      title: "首轮平台打法：Royal Road",
      label: "三轮换平台",
      primaryTactic: "先换平台验证。",
      openingMove: "按新平台读者入口重写开头。",
      verificationMove: "旧平台只做对照组。",
      risk: "别把旧平台弱匹配判成题材失败。",
    });

    assert.equal(stable.level, "standard");
    assert.equal(downgrade.level, "watch");
    assert.equal(downgrade.dueLabel, "今天小样本验证");
    assert.equal(pause.level, "blocked");
    assert.equal(pause.dueLabel, "今天止损验证");
    assert.equal(pivot.level, "blocked");
  });

  await t.test("uses completed first-day dispatch evidence to advance the workflow", () => {
    const workflow = buildFirstDayWorkflow({
      project,
      platform: getPlatformProfile("fanqie"),
      chapters: [chapter, { ...chapter, id: "chapter-2", order: 2 }, { ...chapter, id: "chapter-3", order: 3 }],
      outlineNodes,
      characters,
      worldEntries,
      aiTasks: [],
      dispatchTasks: [{
        dispatchKey: "first-day:project-1:first-draft",
        state: "completed",
        completionEvidence: "第一章正文已经生成并写回章节，作者已确认可以进入审稿。",
      }],
      submissionChecklist: checklist,
    });

    const draftStep = workflow.steps.find((step) => step.id === "first-draft");

    assert.equal(draftStep?.status, "done");
    assert.equal(workflow.completedCount, 4);
    assert.equal(workflow.nextStep.id, "first-review");
    assert.ok(draftStep?.evidence.includes("任务中心已验收"));
    assert.ok(draftStep?.evidence.includes("第一章正文已经生成"));
  });

  await t.test("builds the next first-day dispatch after a completed task", () => {
    const platform = getPlatformProfile("fanqie");
    const workflow = buildFirstDayWorkflow({
      project,
      platform,
      chapters: [chapter, { ...chapter, id: "chapter-2", order: 2 }, { ...chapter, id: "chapter-3", order: 3 }],
      outlineNodes,
      characters,
      worldEntries,
      aiTasks: [],
      dispatchTasks: [{
        dispatchKey: "first-day:project-1:first-draft",
        state: "completed",
        completionEvidence: "第一章正文已经生成并写回章节，作者已确认可以进入审稿。",
      }],
      submissionChecklist: checklist,
    });
    const followUp = buildFirstDayFollowUpDispatch({
      workflow,
      project,
      platform,
      completedDispatchKey: "first-day:project-1:first-draft",
      existingDispatchKeys: ["first-day:project-1:first-draft"],
    });

    assert.equal(workflow.nextStep.id, "first-review");
    assert.equal(followUp?.id, "first-day:project-1:first-review");
    assert.equal(followUp?.title, "夜雨系统 · 第一章审稿");
    assert.equal(followUp?.state, "assigned");

    assert.equal(buildFirstDayFollowUpDispatch({
      workflow,
      project,
      platform,
      existingDispatchKeys: ["first-day:project-1:first-review"],
    }), null);
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
    assert.equal(buildFirstDayFollowUpDispatch({
      workflow,
      project: { ...project, currentWordCount: 2400 },
      platform: getPlatformProfile("fanqie"),
    }), null);
  });
});
