import test from "node:test";
import assert from "node:assert/strict";
import { buildProjectListDashboard, type ProjectListProject } from "../lib/projects/projectListDashboard.ts";

const baseChapter = {
  id: "chapter-1",
  order: 1,
  title: "第一章 雨夜系统",
  content: "正文",
  wordCount: 2200,
  goal: "让主角遭遇系统。",
  hook: "门外倒计时和陌生求救同时出现。",
  conflict: "主角必须在自保和救人之间选择。",
  valueShift: "普通生活被系统任务击穿。",
  cliffhanger: "系统提示第一次选择失败过。",
  status: "draft",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const completeProject: ProjectListProject = {
  id: "ready-project",
  title: "夜雨系统",
  targetPlatform: "fanqie",
  targetLengthType: "long_300k_plus",
  targetWordCount: 300000,
  currentWordCount: 6600,
  genre: "都市系统",
  sellingPoint: "雨夜危机中觉醒系统，主角用一次次选择翻盘。",
  updateCadence: "daily_4000",
  updatedAt: "2026-01-02T00:00:00.000Z",
  chapters: [
    baseChapter,
    { ...baseChapter, id: "chapter-2", order: 2, title: "第二章 第一次奖励" },
    { ...baseChapter, id: "chapter-3", order: 3, title: "第三章 反杀证据" },
  ],
  outlineNodes: ["root", "opening", "ending", "trunk", "branch", "branch", "branch", "leaf", "leaf", "soil"].map((type) => ({ type })),
  characters: [
    { name: "林晚", role: "主角", desire: "查清系统", need: "主动承担", flaw: "逃避", arcStart: "被动", arcEnd: "主动", voice: "克制" },
  ],
  worldEntries: [
    { type: "system_rule", title: "选择系统", content: "系统只在高压选择出现时发布任务，每次奖励都绑定代价和下一轮冲突，不能无成本升级。" },
    { type: "taboo", title: "回档禁忌", content: "回档不能无损使用，主角每次借用未来信息都会失去关系信任，并制造新的证据缺口和敌人。" },
    { type: "platform_soil", title: "番茄土壤", content: "每章前半段给危机，后半段给反击或新问题，章末留下追读钩子，解释不能连续过长拖节奏。" },
  ],
  aiTasks: [
    {
      id: "task-1",
      chapterId: "chapter-1",
      taskType: "chapter_review",
      status: "succeeded",
      model: "mock-novel",
      inputTokens: 1000,
      outputTokens: 400,
      costUsd: 0.01,
      outputText: "{}",
      errorMessage: null,
      createdAt: "2026-01-02T00:00:00.000Z",
      modelProvider: { providerId: "mock", displayName: "Mock" },
    },
  ],
};

const emptyProject: ProjectListProject = {
  ...completeProject,
  id: "empty-project",
  title: "空白新坑",
  currentWordCount: 0,
  updatedAt: "2026-01-03T00:00:00.000Z",
  chapters: [],
  outlineNodes: [],
  characters: [],
  worldEntries: [],
  aiTasks: [],
};

const blockedProject: ProjectListProject = {
  ...completeProject,
  id: "blocked-project",
  title: "避坑旧坑",
  updatedAt: "2026-01-04T00:00:00.000Z",
  worldEntries: [
    ...completeProject.worldEntries.filter((entry) => entry.title !== "番茄土壤"),
    {
      type: "platform_soil",
      title: "首轮平台打法：番茄小说",
      content: [
        "状态：历史避坑",
        "打法：旧样本首章解释过多，先重做入口卖点。",
        "开头动作：第一段给不可逆危机。",
        "验证动作：只看前三章兑现是否改掉。",
        "风险：没有恢复条件前不能放量。",
      ].join("\n"),
    },
  ],
};

const watchProject: ProjectListProject = {
  ...completeProject,
  id: "watch-project",
  title: "观察新坑",
  updatedAt: "2026-01-05T00:00:00.000Z",
  worldEntries: [
    ...completeProject.worldEntries.filter((entry) => entry.title !== "番茄土壤"),
    {
      type: "platform_soil",
      title: "首轮平台打法：七猫小说",
      content: [
        "状态：历史观察",
        "打法：先用第一章小样本验证读者反馈。",
        "开头动作：第一段给强冲突。",
        "验证动作：写清通过线和不可接受项。",
        "风险：观察期不要批量。",
      ].join("\n"),
    },
  ],
};

const handoffBlockedProject: ProjectListProject = {
  ...completeProject,
  id: "handoff-blocked-project",
  title: "交接缺证据",
  aiTasks: [
    {
      ...completeProject.aiTasks[0],
      id: "draft-task",
      taskType: "chapter_draft",
    },
    {
      ...completeProject.aiTasks[0],
      id: "review-task",
      taskType: "chapter_review",
    },
    {
      ...completeProject.aiTasks[0],
      id: "second-pass-task",
      taskType: "chapter_second_pass",
    },
  ],
  worldEntries: [
    ...completeProject.worldEntries.filter((entry) => entry.title !== "番茄土壤"),
    {
      type: "platform_soil",
      title: "首轮平台打法：番茄小说",
      content: [
        "状态：模板推荐",
        "打法：首章先给不可逆危机，三章内连续兑现爽点。",
        "开头动作：第一段给倒计时。",
        "验证动作：批量前检查前三章追读。",
        "风险：解释过多会掉节奏。",
        "交接状态：reuse",
        "交接标签：稳定加码",
        "交接说明：沿用番茄首章强钩子打法。",
        "首日动作：开头必须落地第一段倒计时。",
        "避坑边界：不要直接放量，先做小样本。",
      ].join("\n"),
    },
  ],
  gateDispatchTasks: [{
    dispatchKey: "first-day:handoff-blocked-project:publish-precheck",
    state: "completed",
    completionEvidence: "首日平台包预检已完成，标题、简介、标签、卖点、样章和风险清单已验收。",
  }],
};

const pendingDispatchProject: ProjectListProject = {
  ...completeProject,
  id: "pending-dispatch-project",
  title: "派单待验收",
  aiTasks: [
    completeProject.aiTasks[0],
    {
      ...completeProject.aiTasks[0],
      id: "second-pass-task",
      taskType: "chapter_second_pass",
    },
  ],
  gateDispatchTasks: [{
    dispatchKey: "first-day:pending-dispatch-project:publish-precheck",
    state: "assigned",
    completionEvidence: "",
  }],
};

test("buildProjectListDashboard", async (t) => {
  await t.test("sorts projects by operational urgency and summarizes portfolio metrics", () => {
    const dashboard = buildProjectListDashboard([completeProject, emptyProject], [
      {
        id: "provider-1",
        providerId: "mock",
        displayName: "Mock",
        defaultModel: "mock-novel",
        enabled: true,
        encryptedApiKey: "secret",
      },
    ]);

    assert.equal(dashboard.overview.totalProjects, 2);
    assert.equal(dashboard.overview.activeProjects, 1);
    assert.equal(dashboard.overview.totalWords, 6600);
    assert.equal(dashboard.overview.totalAiCostUsd, 0.01);
    assert.equal(dashboard.items[0].id, "empty-project");
    assert.equal(dashboard.items[0].healthLabel, "先救火");
    assert.ok(dashboard.items[0].riskFlags.includes("没有章节卡"));
    assert.equal(dashboard.items[1].aiCostUsd, 0.01);
    assert.equal(dashboard.items[1].nextAction, "启动二改");
  });

  await t.test("surfaces a toxic PM portfolio focus before project cards", () => {
    const dashboard = buildProjectListDashboard([completeProject, emptyProject], [
      {
        id: "provider-1",
        providerId: "mock",
        displayName: "Mock",
        defaultModel: "mock-novel",
        enabled: true,
        encryptedApiKey: "secret",
      },
    ]);

    assert.equal(dashboard.pmFocus.status, "blocked");
    assert.equal(dashboard.pmFocus.projectId, "empty-project");
    assert.ok(dashboard.pmFocus.headline.includes("空白新坑"));
    assert.ok(dashboard.pmFocus.detail.includes("没有章节卡"));
    assert.ok(dashboard.pmFocus.scopeLabel.includes("8/8 核心平台已完成"));
    assert.ok(dashboard.pmFocus.scopeLabel.includes("剩余 10 个平台不再添加"));
    assert.equal(dashboard.pmFocus.actionLabel, dashboard.items[0].nextAction);
    assert.equal(dashboard.pmFocus.actionHref, dashboard.items[0].nextActionHref);
  });

  await t.test("exposes role workflow anchors for reference role entry links", () => {
    const dashboard = buildProjectListDashboard([completeProject], [
      {
        id: "provider-1",
        providerId: "mock",
        displayName: "Mock",
        defaultModel: "mock-novel",
        enabled: true,
        encryptedApiKey: "secret",
      },
    ]);

    assert.ok(Array.isArray(dashboard.roleEntrypoints), "project list dashboard needs role entrypoints");
    assert.deepEqual(
      dashboard.roleEntrypoints.map((entry) => entry.id),
      ["story-structure", "context-recall", "platform-export"],
    );
    for (const entry of dashboard.roleEntrypoints) {
      assert.ok(entry.title.length >= 4);
      assert.ok(entry.detail.includes("选择作品"));
      assert.ok(entry.actionLabel.length >= 4);
      assert.ok(entry.projectAnchor.startsWith("#"));
      assert.ok(entry.roleIds.length >= 1);
      assert.ok(entry.workflowSteps.length >= 3);
      assert.deepEqual(
        entry.workflowSteps.map((step) => step.stage),
        ["先判断", "再生产", "最后验收"],
      );
      for (const step of entry.workflowSteps) {
        assert.ok(step.ownerRole.length >= 4);
        assert.ok(step.action.length >= 8);
        assert.ok(step.output.length >= 6);
      }
    }
    assert.equal(
      dashboard.roleEntrypoints.find((entry) => entry.id === "platform-export")?.projectAnchor,
      "#platform-export",
    );
    assert.ok(
      dashboard.roleEntrypoints
        .find((entry) => entry.id === "story-structure")
        ?.roleIds.includes("structure_editor"),
    );
    assert.ok(
      dashboard.roleEntrypoints
        .find((entry) => entry.id === "context-recall")
        ?.roleIds.includes("context_librarian"),
    );
    assert.ok(
      dashboard.roleEntrypoints
        .find((entry) => entry.id === "platform-export")
        ?.roleIds.includes("overseas_packager"),
    );
  });

  await t.test("surfaces first-day risk lanes in portfolio cards", () => {
    const dashboard = buildProjectListDashboard([completeProject, blockedProject, watchProject], [
      {
        id: "provider-1",
        providerId: "mock",
        displayName: "Mock",
        defaultModel: "mock-novel",
        enabled: true,
        encryptedApiKey: "secret",
      },
    ]);

    assert.equal(dashboard.overview.standardProjects, 1);
    assert.equal(dashboard.overview.watchProjects, 1);
    assert.equal(dashboard.overview.blockedProjects, 1);
    const blocked = dashboard.items.find((item) => item.id === "blocked-project");
    const watch = dashboard.items.find((item) => item.id === "watch-project");
    assert.equal(blocked?.riskLevel, "blocked");
    assert.equal(blocked?.healthScore, 49);
    assert.ok(blocked?.riskFlags.some((flag) => flag.includes("先止损恢复")));
    assert.equal(watch?.riskLevel, "watch");
    assert.ok((watch?.healthScore ?? 100) <= 74);
    assert.ok(watch?.riskFlags.some((flag) => flag.includes("只跑小样本")));
  });

  await t.test("uses first-day continuation as the project list action", () => {
    const dashboard = buildProjectListDashboard([handoffBlockedProject], [
      {
        id: "provider-1",
        providerId: "mock",
        displayName: "Mock",
        defaultModel: "mock-novel",
        enabled: true,
        encryptedApiKey: "secret",
      },
    ]);
    const item = dashboard.items[0];

    assert.equal(item.nextAction, "补交接验收");
    assert.equal(item.nextActionHref, "/dispatch?firstDayProject=handoff-blocked-project&step=publish-precheck#first-day-dispatch");
    assert.equal(item.continuationStatus, "blocked");
    assert.equal(item.healthLabel, "需盯紧");
    assert.ok(item.riskFlags.some((flag) => flag.includes("补交接验收")));
  });

  await t.test("builds a six-step pipeline proof card for each project", () => {
    const dashboard = buildProjectListDashboard([emptyProject, completeProject], [
      {
        id: "provider-1",
        providerId: "mock",
        displayName: "Mock",
        defaultModel: "mock-novel",
        enabled: true,
        encryptedApiKey: "secret",
      },
    ]);
    const empty = dashboard.items.find((item) => item.id === "empty-project");
    const ready = dashboard.items.find((item) => item.id === "ready-project");

    assert.deepEqual(
      empty?.pipelineProof.steps.map((step) => step.id),
      ["project_start", "sample_draft", "task_dispatch", "gate_check", "failure_repair", "publish_package"],
    );
    assert.equal(empty?.pipelineProof.currentStepId, "project_start");
    assert.equal(empty?.pipelineProof.steps[0].status, "current");
    assert.ok(empty?.pipelineProof.headline.includes("开书与大树骨架"));
    assert.ok(empty?.pipelineProof.nextActionHref.includes("/projects/empty-project"));
    assert.equal(empty?.pipelineProof.validationReceipt.stepId, "project_start");
    assert.ok(empty?.pipelineProof.validationReceipt.headline.includes("当前步骤验收回执"));
    assert.ok(empty?.pipelineProof.validationReceipt.proofPrompt.includes("目标平台"));
    assert.ok(empty?.pipelineProof.validationReceipt.requiredEvidence.some((item) => item.includes("开头钩子")));
    assert.ok(empty?.pipelineProof.validationReceipt.requiredEvidence.some((item) => item.includes("结尾承诺")));
    assert.ok(empty?.pipelineProof.validationReceipt.requiredEvidence.some((item) => item.includes("主干和基础土壤")));
    assert.ok(empty?.pipelineProof.validationReceipt.stopIfMissing.some((item) => item.includes("停在作品工作台")));

    assert.equal(ready?.pipelineProof.steps[0].status, "done");
    assert.equal(ready?.pipelineProof.steps[1].status, "done");
    assert.equal(ready?.pipelineProof.currentStepId, "task_dispatch");
    assert.ok(ready?.pipelineProof.headline.includes("任务与派单回执"));
    assert.equal(
      ready?.pipelineProof.steps.some((step) => step.label.includes("新增平台")),
      false,
    );
  });

  await t.test("adds real sample validation so projects do not pretend the pipeline is complete", () => {
    const dashboard = buildProjectListDashboard([emptyProject, completeProject, handoffBlockedProject], [
      {
        id: "provider-1",
        providerId: "mock",
        displayName: "Mock",
        defaultModel: "mock-novel",
        enabled: true,
        encryptedApiKey: "secret",
      },
    ]);
    const empty = dashboard.items.find((item) => item.id === "empty-project");
    const ready = dashboard.items.find((item) => item.id === "ready-project");
    const handoff = dashboard.items.find((item) => item.id === "handoff-blocked-project");

    assert.equal(empty?.realSampleValidation.status, "blocked");
    assert.ok(empty?.realSampleValidation.headline.includes("开书骨架"));
    assert.ok(empty?.realSampleValidation.missingEvidence.some((item) => item.includes("开头钩子")));
    assert.equal(empty?.realSampleValidation.nextActionHref, "/projects/empty-project");

    assert.equal(ready?.realSampleValidation.status, "needs_acceptance");
    assert.ok(ready?.realSampleValidation.headline.includes("审稿"));
    assert.ok(ready?.realSampleValidation.missingEvidence.some((item) => item.includes("派单回执")));
    assert.ok(ready?.realSampleValidation.completedEvidence.some((item) => item.includes("首章样本")));
    assert.ok(ready?.realSampleValidation.nextActionHref.startsWith("/dispatch?firstDayProject=ready-project&step=first-rewrite&source=real-sample"));
    assert.ok(ready?.realSampleValidation.nextActionHref.includes("gap="));

    assert.equal(handoff?.realSampleValidation.status, "ready_for_gate");
    assert.ok(handoff?.realSampleValidation.headline.includes("总闸门"));
    assert.ok(handoff?.realSampleValidation.completedEvidence.some((item) => item.includes("派单验收")));
    assert.equal(handoff?.realSampleValidation.nextActionHref, "/gate?focus=first-day-complete&projectId=handoff-blocked-project");
    assert.equal(handoff?.pipelineProof.currentStepId, "gate_check");
    assert.equal(handoff?.pipelineProof.nextActionHref, "/gate?focus=first-day-complete&projectId=handoff-blocked-project");
    assert.ok(handoff?.pipelineProof.steps.find((step) => step.id === "gate_check")?.href.includes("projectId=handoff-blocked-project"));
  });

  await t.test("recognizes generated first-day dispatches that still need acceptance evidence", () => {
    const dashboard = buildProjectListDashboard([pendingDispatchProject], [
      {
        id: "provider-1",
        providerId: "mock",
        displayName: "Mock",
        defaultModel: "mock-novel",
        enabled: true,
        encryptedApiKey: "secret",
      },
    ]);
    const item = dashboard.items[0];

    assert.equal(item.realSampleValidation.status, "needs_acceptance");
    assert.ok(item.realSampleValidation.headline.includes("派单已生成"));
    assert.ok(item.realSampleValidation.completedEvidence.some((entry) => entry.includes("派单已生成")));
    assert.ok(item.realSampleValidation.missingEvidence.some((entry) => entry.includes("完成依据")));
    assert.equal(item.realSampleValidation.nextActionLabel, "填写派单验收");
    assert.equal(
      item.realSampleValidation.nextActionHref,
      "/dispatch?firstDayProject=pending-dispatch-project&step=publish-precheck&source=real-sample&gap=%E6%B4%BE%E5%8D%95%E5%B7%B2%E7%94%9F%E6%88%90%EF%BC%8C%E4%BD%86%E8%BF%98%E7%BC%BA%E5%AE%8C%E6%88%90%E4%BE%9D%E6%8D%AE%E5%92%8C%E4%BA%BA%E5%B7%A5%E9%AA%8C%E6%94%B6%E3%80%82#first-day-dispatch",
    );
    assert.equal(item.pipelineProof.currentStepId, "task_dispatch");
    assert.ok(item.pipelineProof.steps.find((step) => step.id === "task_dispatch")?.evidence.includes("派单已生成"));
    assert.ok(item.pipelineProof.validationReceipt.proofPrompt.includes("完成依据"));
  });

  await t.test("summarizes portfolio bottlenecks across pipeline proof steps", () => {
    const dashboard = buildProjectListDashboard([emptyProject, completeProject, handoffBlockedProject], [
      {
        id: "provider-1",
        providerId: "mock",
        displayName: "Mock",
        defaultModel: "mock-novel",
        enabled: true,
        encryptedApiKey: "secret",
      },
    ]);

    assert.ok(dashboard.pipelineProofSummary.headline.includes("流水线"));
    assert.equal(dashboard.pipelineProofSummary.totalProjects, 3);
    assert.equal(dashboard.pipelineProofSummary.bottleneckStepId, "project_start");
    assert.ok(dashboard.pipelineProofSummary.bottleneckLabel.includes("开书与大树骨架"));
    assert.equal(dashboard.pipelineProofSummary.recommendedProjectId, "empty-project");
    assert.equal(dashboard.pipelineProofSummary.recommendedProjectTitle, "空白新坑");
    assert.ok(dashboard.pipelineProofSummary.recommendedActionHref.includes("/projects/empty-project"));
    assert.ok(dashboard.pipelineProofSummary.recommendedActionLabel.includes("开书与大树骨架"));
    assert.equal(dashboard.pipelineProofSummary.stepCounts.find((step) => step.id === "project_start")?.count, 1);
    assert.equal(dashboard.pipelineProofSummary.stepCounts.find((step) => step.id === "task_dispatch")?.count, 1);
    assert.equal(dashboard.pipelineProofSummary.stepCounts.find((step) => step.id === "gate_check")?.count, 1);
    assert.equal(
      dashboard.pipelineProofSummary.stepCounts.find((step) => step.id === "task_dispatch")?.filterHref,
      "/projects?pipelineStep=task_dispatch#pipeline-projects",
    );
    assert.equal(
      dashboard.pipelineProofSummary.stepCounts.some((step) => step.label.includes("新增平台")),
      false,
    );
  });

  await t.test("attaches the bottleneck validation receipt to the portfolio pipeline summary", () => {
    const dashboard = buildProjectListDashboard([emptyProject, completeProject, handoffBlockedProject], [
      {
        id: "provider-1",
        providerId: "mock",
        displayName: "Mock",
        defaultModel: "mock-novel",
        enabled: true,
        encryptedApiKey: "secret",
      },
    ]);

    assert.equal(dashboard.pipelineProofSummary.validationReceipt.stepId, "project_start");
    assert.ok(dashboard.pipelineProofSummary.validationReceipt.headline.includes("开书与大树骨架"));
    assert.ok(dashboard.pipelineProofSummary.validationReceipt.proofPrompt.includes("开头钩子"));
    assert.ok(dashboard.pipelineProofSummary.validationReceipt.requiredEvidence.some((item) => item.includes("目标平台")));
    assert.ok(dashboard.pipelineProofSummary.validationReceipt.stopIfMissing.some((item) => item.includes("停在作品工作台")));
  });

  await t.test("summarizes portfolio pipeline acceptance outcomes", () => {
    const dashboard = buildProjectListDashboard([emptyProject, completeProject, handoffBlockedProject], [
      {
        id: "provider-1",
        providerId: "mock",
        displayName: "Mock",
        defaultModel: "mock-novel",
        enabled: true,
        encryptedApiKey: "secret",
      },
    ]);

    assert.equal(dashboard.pipelineAcceptanceSummary.totalProjects, 3);
    assert.equal(dashboard.pipelineAcceptanceSummary.passCount, 0);
    assert.equal(dashboard.pipelineAcceptanceSummary.repairCount, 2);
    assert.equal(dashboard.pipelineAcceptanceSummary.holdBatchCount, 1);
    assert.ok(dashboard.pipelineAcceptanceSummary.headline.includes("真实流水线验收"));
    assert.ok(dashboard.pipelineAcceptanceSummary.verdict.includes("先修复"));
    assert.equal(dashboard.pipelineAcceptanceSummary.primaryActionLabel, "补开书骨架");
    assert.equal(dashboard.pipelineAcceptanceSummary.primaryActionHref, "/projects/empty-project");
  });

  await t.test("builds a prioritized real sample acceptance queue", () => {
    const dashboard = buildProjectListDashboard([emptyProject, completeProject, handoffBlockedProject], [
      {
        id: "provider-1",
        providerId: "mock",
        displayName: "Mock",
        defaultModel: "mock-novel",
        enabled: true,
        encryptedApiKey: "secret",
      },
    ]);

    assert.equal(dashboard.realSampleAcceptanceQueue.length, 3);
    assert.deepEqual(
      dashboard.realSampleAcceptanceQueue.map((item) => item.projectId),
      ["empty-project", "ready-project", "handoff-blocked-project"],
    );
    assert.deepEqual(
      dashboard.realSampleAcceptanceQueue.map((item) => item.outcome),
      ["repair", "repair", "hold_batch"],
    );
    assert.equal(dashboard.realSampleAcceptanceQueue[0]?.projectTitle, "空白新坑");
    assert.equal(dashboard.realSampleAcceptanceQueue[0]?.actionLabel, "补开书骨架");
    assert.equal(dashboard.realSampleAcceptanceQueue[0]?.actionHref, "/projects/empty-project");
    assert.ok(dashboard.realSampleAcceptanceQueue[0]?.reason.includes("开书骨架"));
    assert.ok(dashboard.realSampleAcceptanceQueue[2]?.reason.includes("总闸门"));
  });

  await t.test("keeps a validation receipt on each portfolio pipeline filter", () => {
    const dashboard = buildProjectListDashboard([emptyProject, completeProject, handoffBlockedProject], [
      {
        id: "provider-1",
        providerId: "mock",
        displayName: "Mock",
        defaultModel: "mock-novel",
        enabled: true,
        encryptedApiKey: "secret",
      },
    ]);
    const taskDispatchFilter = dashboard.pipelineProofSummary.stepCounts.find((step) => step.id === "task_dispatch");

    assert.equal(taskDispatchFilter?.validationReceipt.stepId, "task_dispatch");
    assert.ok(taskDispatchFilter?.validationReceipt.headline.includes("任务与派单回执"));
    assert.ok(taskDispatchFilter?.validationReceipt.proofPrompt.includes("完成依据"));
    assert.ok(taskDispatchFilter?.validationReceipt.stopIfMissing.some((item) => item.includes("派单中心")));
  });

  await t.test("attaches a matching recommended action to each portfolio pipeline filter", () => {
    const dashboard = buildProjectListDashboard([emptyProject, completeProject, handoffBlockedProject], [
      {
        id: "provider-1",
        providerId: "mock",
        displayName: "Mock",
        defaultModel: "mock-novel",
        enabled: true,
        encryptedApiKey: "secret",
      },
    ]);
    const taskDispatchFilter = dashboard.pipelineProofSummary.stepCounts.find((step) => step.id === "task_dispatch");

    assert.equal(taskDispatchFilter?.recommendedProjectId, "ready-project");
    assert.equal(taskDispatchFilter?.recommendedProjectTitle, "夜雨系统");
    assert.ok(taskDispatchFilter?.recommendedActionLabel.includes("任务与派单回执"));
    assert.ok(taskDispatchFilter?.recommendedActionHref.includes("/dispatch?firstDayProject=ready-project"));
  });

  await t.test("routes empty pipeline filters back to the full portfolio instead of looping", () => {
    const dashboard = buildProjectListDashboard([emptyProject, completeProject, handoffBlockedProject], [
      {
        id: "provider-1",
        providerId: "mock",
        displayName: "Mock",
        defaultModel: "mock-novel",
        enabled: true,
        encryptedApiKey: "secret",
      },
    ]);
    const failureRepairFilter = dashboard.pipelineProofSummary.stepCounts.find((step) => step.id === "failure_repair");

    assert.equal(failureRepairFilter?.count, 0);
    assert.equal(failureRepairFilter?.recommendedActionLabel, "查看全部作品");
    assert.equal(failureRepairFilter?.recommendedActionHref, "/projects#pipeline-projects");
    assert.equal(failureRepairFilter?.recommendedProjectTitle, null);
  });
});
