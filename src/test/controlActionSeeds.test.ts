import test from "node:test";
import assert from "node:assert/strict";
import { getPlatformProfile } from "../lib/platforms/platformProfiles.ts";
import {
  buildAiPipelineControlActionPlan,
  buildChapterCardActionSeeds,
  buildChapterCardDraftHandoff,
  buildCharacterActionSeeds,
  buildOutlineActionSeeds,
  buildStoryLineActionSeeds,
  buildWorldActionSeeds,
} from "../lib/projects/controlActionSeeds.ts";
import { buildControlAssetPrompt, buildControlAssetQualityGate, buildControlAssetRepairPrompt } from "../lib/projects/controlAssetGeneration.ts";

const project = {
  id: "demo-project",
  title: "夜雨系统",
  genre: "都市系统",
  sellingPoint: "雨夜危机中觉醒系统，主角用选择翻盘。",
};

test("control action seeds", async (t) => {
  await t.test("creates editable character support cards", () => {
    const seeds = buildCharacterActionSeeds(project, []);

    assert.equal(seeds.length, 3);
    assert.ok(seeds.some((seed) => seed.role === "主角"));
    assert.ok(seeds.some((seed) => seed.role === "反派"));
    assert.ok(seeds.every((seed) => seed.arcStart && seed.arcEnd));
  });

  await t.test("fills required world bible types only when missing", () => {
    const seeds = buildWorldActionSeeds(project, getPlatformProfile("fanqie"), [
      { type: "system_rule", title: "已有规则", content: "已有规则内容。" },
    ]);

    assert.deepEqual(seeds.map((seed) => seed.type).sort(), ["platform_soil", "taboo"]);
    assert.ok(seeds.find((seed) => seed.type === "platform_soil")?.content.includes("番茄"));
  });

  await t.test("creates main thread and opening foreshadow seeds", () => {
    const seeds = buildStoryLineActionSeeds(
      project,
      [{ id: "chapter-1", order: 1, title: "第一章" }],
      [{ id: "character-1" }],
      [],
      [],
    );

    assert.equal(seeds.plotThreads.length, 1);
    assert.equal(seeds.plotThreads[0].type, "main");
    assert.equal(seeds.plotThreads[0].startChapterId, "chapter-1");
    assert.equal(seeds.foreshadows.length, 1);
    assert.deepEqual(seeds.foreshadows[0].relatedCharacterIds, ["character-1"]);
  });

  await t.test("creates missing tree-writing outline nodes without replacing existing root", () => {
    const seeds = buildOutlineActionSeeds(project, getPlatformProfile("fanqie"), [
      { id: "existing-root", type: "root", title: "已有总纲" },
    ]);
    const types = new Set(seeds.map((seed) => seed.type));

    assert.equal(types.has("root"), false);
    assert.ok(types.has("opening"));
    assert.ok(types.has("ending"));
    assert.ok(types.has("trunk"));
    assert.ok(types.has("soil"));
    assert.equal(seeds.filter((seed) => seed.type === "branch").length, 3);
    assert.equal(seeds.filter((seed) => seed.type === "leaf").length, 2);
    assert.equal(seeds.find((seed) => seed.type === "opening")?.parentId, "existing-root");
  });

  await t.test("creates chapter cards from unbound tree leaves in production order", () => {
    const seeds = buildChapterCardActionSeeds({
      project,
      platform: getPlatformProfile("fanqie"),
      existingChapterCount: 2,
      limit: 3,
      outlineNodes: [
        { id: "soil", type: "soil", title: "平台土壤", order: 1, depth: 1 },
        { id: "branch-bound", chapterId: "chapter-3", type: "branch", title: "已成卡支线", order: 2, depth: 1 },
        { id: "leaf", type: "leaf", title: "追读叶片", goal: "落一个爽点。", order: 4, depth: 2 },
        { id: "opening", type: "opening", title: "雨夜开头", hook: "倒计时出现。", order: 1, depth: 1 },
        { id: "trunk", type: "trunk", title: "系统主干", conflict: "规则逼迫选择。", order: 3, depth: 1 },
        { id: "ending", type: "ending", title: "终局兑现", order: 9, depth: 1 },
      ],
    });

    assert.deepEqual(seeds.map((seed) => seed.outlineNodeId), ["opening", "trunk", "leaf"]);
    assert.equal(seeds[0].title, "第3章 开局：雨夜开头");
    assert.equal(seeds[1].title, "第4章 主线：系统主干");
    assert.equal(seeds[2].goal, "落一个爽点。");
    assert.ok(seeds.every((seed) => seed.status === "outline"));
  });

  await t.test("builds a draft handoff after chapter cards become ready", () => {
    const handoff = buildChapterCardDraftHandoff({
      totalCandidates: 3,
      readyCandidates: 3,
      recommendedChapterIds: ["chapter-1", "chapter-2", "chapter-3"],
      warnings: [],
      candidates: [],
    });

    assert.equal(handoff.readyDraftCount, 3);
    assert.equal(handoff.targetAnchor, "ai-pipeline");
    assert.ok(handoff.headline.includes("批量初稿队列"));
    assert.ok(handoff.nextAction.includes("小批初稿"));
  });

  await t.test("keeps draft handoff blocked when generated cards are not ready", () => {
    const handoff = buildChapterCardDraftHandoff({
      totalCandidates: 1,
      readyCandidates: 0,
      recommendedChapterIds: [],
      warnings: ["存在平台风格体检未达标章节，先补强钩子、冲突或章末悬念。"],
      candidates: [],
    });

    assert.equal(handoff.readyDraftCount, 0);
    assert.equal(handoff.recommendedChapterIds.length, 0);
    assert.ok(handoff.headline.includes("暂时还不能"));
    assert.ok(handoff.nextAction.includes("平台风格"));
  });

  await t.test("builds a repair plan from blocked AI pipeline batch health", () => {
    const plan = buildAiPipelineControlActionPlan([
      {
        receiptId: "blocked-batch",
        actionId: "recommended-batch:standard:draft:demo-project",
        label: "失败批次",
        detail: "番茄小说 · 夜雨系统 · 批量初稿 2 个",
        href: "/tasks#recommended-batch",
        status: "failed",
        message: "推荐批次失败。",
        executionType: "recommended_batch",
        succeededCount: 0,
        failedCount: 2,
        platformId: "fanqie",
        platformName: "番茄小说",
        recheckStatus: "ready",
        recheckLabel: "复检",
        recheckDetail: "复检",
        recheckAction: "刷新",
        payload: JSON.stringify({
          plan: {
            strategyBases: [{
              title: "首轮平台打法：番茄小说",
              label: "三轮稳住",
              primaryTactic: "三轮数据已站住，可以小批放大。",
              openingMove: "第一段给不可逆危机。",
              verificationMove: "继续回填曝光、点击、收藏和追读。",
              risk: "稳定加码不是无限放量。",
            }],
            actionLabel: "批量初稿 2 个",
            category: "draft",
          },
          routeEffectSummary: { successRatePercent: 0, knownCostUsd: 0.02, averageQualityScore: 68 },
        }),
        createdAt: "2026-01-02T00:00:00.000Z",
      },
    ]);

    assert.equal(plan.status, "repair");
    assert.ok(plan.created.some((item) => item.includes("停用")));
    assert.ok(plan.created.some((item) => item.includes("失败")));
    assert.ok(plan.message.includes("先停用"));
    assert.equal(plan.payload.failedTasks, 2);
  });

  await t.test("builds a seed sample plan before batch health has evidence", () => {
    const plan = buildAiPipelineControlActionPlan([]);

    assert.equal(plan.status, "seed_sample");
    assert.equal(plan.targetAnchor, "ai-pipeline");
    assert.ok(plan.created.some((item) => item.includes("推荐批次样本")));
    assert.ok(plan.message.includes("还没有样本"));
  });

  await t.test("builds strict JSON prompts for AI control assets", () => {
    const prompt = buildControlAssetPrompt({
      areaId: "story-lines",
      project: {
        ...project,
        targetLengthType: "long_300k_plus",
        targetWordCount: 300000,
        updateCadence: "daily_4000",
      },
      platform: getPlatformProfile("fanqie"),
      existing: {
        chapters: [{ id: "chapter-1", order: 1, title: "第一章", goal: "开局", hook: "倒计时", conflict: "必须选择", valueShift: "平静到危机", cliffhanger: "新任务" }],
        characters: [{ id: "character-1", name: "林晚", role: "主角", desire: "翻盘", need: "主动选择", flaw: "逃避", arcStart: "被动", arcEnd: "主动", voice: "克制", relationshipNotes: "和反派冲突" }],
        worldEntries: [],
        foreshadows: [],
        plotThreads: [],
      },
    });

    assert.ok(prompt.systemPrompt.includes("只输出合法 JSON"));
    assert.ok(prompt.userPrompt.includes("生成模块：主线伏笔"));
    assert.ok(prompt.userPrompt.includes("章节 ID 必须从现有章节里选择"));
    assert.ok(prompt.userPrompt.includes("chapter-1"));
  });

  await t.test("passes strong generated control assets through the quality gate", () => {
    const gate = buildControlAssetQualityGate("characters", {
      characters: [
        {
          name: "林晚",
          role: "主角",
          desire: "抓住系统翻盘机会",
          need: "学会主动选择",
          flaw: "遇到代价时逃避",
          arcStart: "被动卷入危机",
          arcEnd: "主动承担代价",
          voice: "克制直接",
          relationshipNotes: "和反派形成规则对抗，和关系镜像角色形成情绪拉扯。",
        },
        {
          name: "沈砚",
          role: "反派",
          desire: "控制系统规则",
          need: "逼出主角弱点",
          flaw: "过度迷信秩序",
          arcStart: "把主角当变量",
          arcEnd: "亲自下场对抗",
          voice: "冷静压迫",
          relationshipNotes: "每次出手都改变主角处境。",
        },
      ],
    });

    assert.equal(gate.status, "pass");
    assert.equal(gate.passed, true);
  });

  await t.test("blocks thin generated control assets before database writes", () => {
    const gate = buildControlAssetQualityGate("world", {
      worldEntries: [
        { type: "other", title: "设定", content: "很强。" },
      ],
    });

    assert.equal(gate.status, "fail");
    assert.equal(gate.passed, false);
    assert.ok(gate.issues.some((issue) => issue.includes("缺少")));
  });

  await t.test("builds repair prompts from failed quality gates", () => {
    const originalPrompt = buildControlAssetPrompt({
      areaId: "world",
      project: {
        ...project,
        targetLengthType: "long_300k_plus",
        targetWordCount: 300000,
        updateCadence: "daily_4000",
      },
      platform: getPlatformProfile("fanqie"),
      existing: {
        chapters: [],
        characters: [],
        worldEntries: [],
        foreshadows: [],
        plotThreads: [],
      },
    });
    const qualityGate = buildControlAssetQualityGate("world", {
      worldEntries: [{ type: "other", title: "薄设定", content: "很强。" }],
    });
    const repairPrompt = buildControlAssetRepairPrompt({
      areaId: "world",
      originalPrompt,
      generated: { worldEntries: [{ type: "other", title: "薄设定", content: "很强。" }] },
      qualityGate,
    });

    assert.ok(repairPrompt.systemPrompt.includes("返修模式"));
    assert.ok(repairPrompt.userPrompt.includes("质量分"));
    assert.ok(repairPrompt.userPrompt.includes("缺少 system_rule"));
    assert.ok(repairPrompt.userPrompt.includes("上一版 JSON"));
  });
});
