import test from "node:test";
import assert from "node:assert/strict";
import { getPlatformProfile } from "../lib/platforms/platformProfiles.ts";
import {
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
