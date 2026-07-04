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
    assert.equal(dashboard.items[1].nextAction, "二改或前三章改写");
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
});
