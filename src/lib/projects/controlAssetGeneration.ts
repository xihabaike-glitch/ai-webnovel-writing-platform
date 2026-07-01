import { prisma } from "../db/prisma.ts";
import { getActiveModelProvider } from "../model-gateway/activeProvider.ts";
import type { ModelProviderId } from "../model-gateway/types.ts";
import { getPlatformProfile, type PlatformProfile, type PlatformId } from "../platforms/platformProfiles.ts";

export type ControlAssetAreaId = "characters" | "world" | "story-lines";

interface PromptProject {
  title: string;
  genre: string;
  sellingPoint: string;
  targetLengthType: string;
  targetWordCount: number;
  updateCadence: string;
}

interface PromptInput {
  areaId: ControlAssetAreaId;
  project: PromptProject;
  platform: PlatformProfile;
  existing: {
    chapters: Array<{ id: string; order: number; title: string; goal: string; hook: string; conflict: string; valueShift: string; cliffhanger: string }>;
    characters: Array<{ id: string; name: string; role: string; desire: string; need: string; flaw: string; arcStart: string; arcEnd: string; voice: string; relationshipNotes: string }>;
    worldEntries: Array<{ id: string; type: string; title: string; content: string }>;
    foreshadows: Array<{ id: string; title: string; setupChapterId: string | null; payoffChapterId: string | null; status: string; notes: string }>;
    plotThreads: Array<{ id: string; type: string; title: string; startChapterId: string | null; endChapterId: string | null; status: string }>;
  };
}

interface GeneratedCharacter {
  name: string;
  role: string;
  desire: string;
  need: string;
  flaw: string;
  arcStart: string;
  arcEnd: string;
  voice: string;
  relationshipNotes: string;
}

interface GeneratedWorldEntry {
  type: string;
  title: string;
  content: string;
}

interface GeneratedPlotThread {
  type: string;
  title: string;
  startChapterId?: string | null;
  endChapterId?: string | null;
  status?: string;
}

interface GeneratedForeshadow {
  title: string;
  setupChapterId?: string | null;
  payoffChapterId?: string | null;
  relatedCharacterIds?: string[];
  status?: string;
  notes: string;
}

interface GeneratedPayload {
  characters?: GeneratedCharacter[];
  worldEntries?: GeneratedWorldEntry[];
  plotThreads?: GeneratedPlotThread[];
  foreshadows?: GeneratedForeshadow[];
  rationale?: string[];
}

export interface ControlAssetQualityGate {
  score: number;
  status: "pass" | "warn" | "fail";
  passed: boolean;
  issues: string[];
  nextActions: string[];
}

function areaLabel(areaId: ControlAssetAreaId) {
  if (areaId === "characters") return "人物弧光";
  if (areaId === "world") return "世界观资料";
  return "主线伏笔";
}

function schemaInstruction(areaId: ControlAssetAreaId) {
  if (areaId === "characters") {
    return [
      "只返回 JSON：",
      '{"characters":[{"name":"","role":"","desire":"","need":"","flaw":"","arcStart":"","arcEnd":"","voice":"","relationshipNotes":""}],"rationale":[]}',
      "生成 2-3 张人物卡，至少包含主角、反派或关系镜像。",
    ].join("\n");
  }
  if (areaId === "world") {
    return [
      "只返回 JSON：",
      '{"worldEntries":[{"type":"system_rule|taboo|platform_soil|location|organization|item|other","title":"","content":""}],"rationale":[]}',
      "生成 3 条设定，优先补系统规则、禁忌、平台土壤；content 写清规则、限制、剧情用途。",
    ].join("\n");
  }
  return [
    "只返回 JSON：",
    '{"plotThreads":[{"type":"main","title":"","startChapterId":null,"endChapterId":null,"status":"active"}],"foreshadows":[{"title":"","setupChapterId":null,"payoffChapterId":null,"relatedCharacterIds":[],"status":"planned","notes":""}],"rationale":[]}',
    "生成 1 条主线和 1-2 个伏笔；章节 ID 必须从现有章节里选择，不能编造。",
  ].join("\n");
}

export function buildControlAssetPrompt(input: PromptInput) {
  const compactContext = {
    project: input.project,
    platform: {
      id: input.platform.id,
      name: input.platform.name,
      genres: input.platform.genres,
      openingRules: input.platform.openingRules,
      reviewFocus: input.platform.reviewFocus,
      risks: input.platform.risks,
    },
    existing: input.existing,
  };

  return {
    systemPrompt: [
      "你是项目总控资料生成器，服务网文 AI 写作平台。",
      "你要按目标平台风格生成可直接入库、可继续编辑的基础资料卡。",
      "必须遵守：只输出合法 JSON；不要 Markdown；不要解释；不要编造不存在的章节 ID；中文项目用中文输出，海外平台可保留英文题材表达。",
      "生成内容要符合网文连载：强钩子、人物欲望、清晰冲突、主线可推进、支线可回收。",
    ].join("\n"),
    userPrompt: [
      `生成模块：${areaLabel(input.areaId)}`,
      `目标平台：${input.platform.name}`,
      `输出要求：${schemaInstruction(input.areaId)}`,
      "项目上下文：",
      JSON.stringify(compactContext, null, 2),
    ].join("\n\n"),
  };
}

function parseJsonObject(text: string): GeneratedPayload {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as GeneratedPayload;
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1)) as GeneratedPayload;
    }
    throw new Error("模型没有返回可解析的 JSON。");
  }
}

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeCharacters(payload: GeneratedPayload): GeneratedCharacter[] {
  return (payload.characters ?? []).slice(0, 3).map((item) => ({
    name: clean(item.name) || "AI 生成人物",
    role: clean(item.role) || "重要角色",
    desire: clean(item.desire),
    need: clean(item.need),
    flaw: clean(item.flaw),
    arcStart: clean(item.arcStart),
    arcEnd: clean(item.arcEnd),
    voice: clean(item.voice),
    relationshipNotes: clean(item.relationshipNotes),
  }));
}

function normalizeWorldEntries(payload: GeneratedPayload): GeneratedWorldEntry[] {
  const allowed = new Set(["system_rule", "location", "organization", "item", "taboo", "platform_soil", "other"]);
  return (payload.worldEntries ?? []).slice(0, 4).map((item) => ({
    type: allowed.has(clean(item.type)) ? clean(item.type) : "other",
    title: clean(item.title) || "AI 生成设定",
    content: clean(item.content),
  }));
}

function validChapterId(chapterIds: Set<string>, value: unknown) {
  const id = clean(value);
  return chapterIds.has(id) ? id : null;
}

function normalizeStoryLines(payload: GeneratedPayload, chapterIds: Set<string>, characterIds: Set<string>) {
  return {
    plotThreads: (payload.plotThreads ?? []).slice(0, 2).map((item) => ({
      type: clean(item.type) || "main",
      title: clean(item.title) || "AI 生成主线",
      startChapterId: validChapterId(chapterIds, item.startChapterId),
      endChapterId: validChapterId(chapterIds, item.endChapterId),
      status: clean(item.status) || "active",
    })),
    foreshadows: (payload.foreshadows ?? []).slice(0, 3).map((item) => ({
      title: clean(item.title) || "AI 生成伏笔",
      setupChapterId: validChapterId(chapterIds, item.setupChapterId),
      payoffChapterId: validChapterId(chapterIds, item.payoffChapterId),
      relatedCharacterIds: (item.relatedCharacterIds ?? []).filter((id) => characterIds.has(id)),
      status: clean(item.status) || "planned",
      notes: clean(item.notes),
    })),
  };
}

function gateStatus(score: number): ControlAssetQualityGate["status"] {
  if (score >= 80) return "pass";
  if (score >= 60) return "warn";
  return "fail";
}

function qualityGate(score: number, issues: string[], nextActions: string[]): ControlAssetQualityGate {
  const normalized = Math.max(0, Math.min(100, Math.round(score)));
  const status = gateStatus(normalized);
  return {
    score: normalized,
    status,
    passed: status !== "fail",
    issues,
    nextActions,
  };
}

function nonEmptyFields(item: Record<string, string>, fields: string[]) {
  return fields.filter((field) => clean(item[field]).length > 0).length;
}

export function buildControlAssetQualityGate(
  areaId: ControlAssetAreaId,
  assets: {
    characters?: GeneratedCharacter[];
    worldEntries?: GeneratedWorldEntry[];
    plotThreads?: Array<{ type: string; title: string; startChapterId: string | null; endChapterId: string | null; status: string }>;
    foreshadows?: Array<{ title: string; setupChapterId: string | null; payoffChapterId: string | null; relatedCharacterIds: string[]; status: string; notes: string }>;
  },
): ControlAssetQualityGate {
  const issues: string[] = [];
  const nextActions: string[] = [];

  if (areaId === "characters") {
    const characters = assets.characters ?? [];
    if (characters.length === 0) issues.push("模型没有生成人物卡。");
    const fields = ["name", "role", "desire", "need", "flaw", "arcStart", "arcEnd", "voice", "relationshipNotes"];
    const completeness = characters.length
      ? characters.reduce((sum, character) => sum + (nonEmptyFields(character as unknown as Record<string, string>, fields) / fields.length) * 100, 0) / characters.length
      : 0;
    if (!characters.some((character) => /主角|男主|女主|protagonist/i.test(`${character.role}${character.name}`))) {
      issues.push("缺少主角定位，人物弧光没有锚点。");
      nextActions.push("补一张主角卡，写清欲望、缺陷、起点和终点。");
    }
    if (!characters.some((character) => /反派|敌人|对手|antagonist/i.test(`${character.role}${character.name}`))) {
      issues.push("缺少反派或压力源，主线冲突会变软。");
      nextActions.push("补一个会主动改变局面的反派压力源。");
    }
    if (characters.some((character) => clean(character.relationshipNotes).length < 12)) {
      issues.push("存在关系压力过薄的人物卡。");
      nextActions.push("把人物关系绑定到误解、亏欠、守护或背叛上。");
    }
    return qualityGate(completeness - issues.length * 6, issues, nextActions);
  }

  if (areaId === "world") {
    const entries = assets.worldEntries ?? [];
    if (entries.length === 0) issues.push("模型没有生成世界观资料。");
    const types = new Set(entries.map((entry) => entry.type));
    for (const required of ["system_rule", "taboo", "platform_soil"]) {
      if (!types.has(required)) issues.push(`缺少 ${required} 类型设定。`);
    }
    const contentScore = entries.length
      ? entries.reduce((sum, entry) => sum + Math.min(100, clean(entry.content).length * 2), 0) / entries.length
      : 0;
    if (entries.some((entry) => clean(entry.content).length < 40)) {
      issues.push("存在内容过薄的设定卡。");
      nextActions.push("每条设定补清规则、限制、代价和剧情用途。");
    }
    if (!entries.some((entry) => /限制|代价|冲突|风险|禁忌|读者|平台/u.test(entry.content))) {
      issues.push("设定没有写出限制或剧情用途。");
      nextActions.push("让设定服务冲突，而不是只当名词解释。");
    }
    return qualityGate((contentScore + (types.size / 3) * 100) / 2 - issues.length * 5, issues, nextActions);
  }

  const plotThreads = assets.plotThreads ?? [];
  const foreshadows = assets.foreshadows ?? [];
  if (plotThreads.length === 0) issues.push("模型没有生成主线。");
  if (foreshadows.length === 0) issues.push("模型没有生成伏笔。");
  if (!plotThreads.some((thread) => thread.type === "main")) {
    issues.push("缺少 main 类型主线。");
    nextActions.push("至少保留一条 main 主线，并绑定第一章起点。");
  }
  if (plotThreads.some((thread) => !thread.startChapterId)) {
    issues.push("存在未绑定起点章节的剧情线。");
    nextActions.push("给每条主线绑定起点章，别让主线只是标签。");
  }
  if (foreshadows.some((foreshadow) => !foreshadow.setupChapterId && clean(foreshadow.notes).length < 20)) {
    issues.push("存在没有埋点章或说明过薄的伏笔。");
    nextActions.push("给伏笔补埋点章，或者写清它会在哪个反转中回收。");
  }
  const storyScore = (
    (plotThreads.length > 0 ? 35 : 0)
    + (foreshadows.length > 0 ? 35 : 0)
    + (plotThreads.some((thread) => thread.startChapterId) ? 15 : 0)
    + (foreshadows.some((foreshadow) => foreshadow.setupChapterId || clean(foreshadow.notes).length >= 20) ? 15 : 0)
  );
  return qualityGate(storyScore - issues.length * 6, issues, nextActions);
}

export async function generateControlAssets(projectId: string, areaId: ControlAssetAreaId) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      chapters: { orderBy: { order: "asc" } },
      characters: { orderBy: { createdAt: "asc" } },
      worldEntries: { orderBy: [{ type: "asc" }, { createdAt: "asc" }] },
      foreshadows: { orderBy: { createdAt: "asc" } },
      plotThreads: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!project) throw new Error("Project not found");

  const platform = getPlatformProfile(project.targetPlatform as PlatformId);
  const prompt = buildControlAssetPrompt({
    areaId,
    project,
    platform,
    existing: {
      chapters: project.chapters,
      characters: project.characters,
      worldEntries: project.worldEntries,
      foreshadows: project.foreshadows,
      plotThreads: project.plotThreads,
    },
  });
  const { provider, adapter } = await getActiveModelProvider("control_asset_generate");
  const task = await prisma.aiTask.create({
    data: {
      projectId,
      chapterId: null,
      taskType: "control_asset_generate",
      providerConfigId: provider.id,
      model: provider.defaultModel,
      status: "running",
      inputSnapshot: JSON.stringify({ ...prompt, areaId }),
    },
  });

  try {
    const result = await adapter.generate({
      providerId: provider.providerId as ModelProviderId,
      model: provider.defaultModel,
      systemPrompt: prompt.systemPrompt,
      userPrompt: prompt.userPrompt,
      temperature: 0.65,
      maxTokens: 2200,
    });
    const payload = parseJsonObject(result.text);
    const created: string[] = [];
    const normalizedCharacters = areaId === "characters" ? normalizeCharacters(payload) : [];
    const normalizedWorldEntries = areaId === "world" ? normalizeWorldEntries(payload) : [];
    const normalizedStoryLines = areaId === "story-lines"
      ? normalizeStoryLines(
        payload,
        new Set(project.chapters.map((chapter) => chapter.id)),
        new Set(project.characters.map((character) => character.id)),
      )
      : { plotThreads: [], foreshadows: [] };
    const quality = buildControlAssetQualityGate(areaId, {
      characters: normalizedCharacters,
      worldEntries: normalizedWorldEntries,
      plotThreads: normalizedStoryLines.plotThreads,
      foreshadows: normalizedStoryLines.foreshadows,
    });

    if (!quality.passed) {
      await prisma.aiTask.update({
        where: { id: task.id },
        data: {
          status: "failed",
          outputText: JSON.stringify({ generated: payload, qualityGate: quality }, null, 2),
          inputTokens: result.usage?.inputTokens,
          outputTokens: result.usage?.outputTokens,
          costUsd: result.usage?.costUsd,
          errorMessage: `质量闸门未通过：${quality.issues.join("；")}`,
        },
      });
      return {
        taskId: task.id,
        areaId,
        created: [],
        qualityGate: quality,
        error: `质量闸门未通过：${quality.issues.join("；")}`,
        provider: {
          id: provider.id,
          providerId: provider.providerId,
          displayName: provider.displayName,
          model: provider.defaultModel,
        },
      };
    }

    await prisma.$transaction(async (tx) => {
      if (areaId === "characters") {
        for (const seed of normalizedCharacters) {
          await tx.character.create({ data: { projectId, ...seed } });
          created.push(seed.name);
        }
      }
      if (areaId === "world") {
        for (const seed of normalizedWorldEntries) {
          await tx.worldEntry.create({ data: { projectId, ...seed } });
          created.push(seed.title);
        }
      }
      if (areaId === "story-lines") {
        for (const seed of normalizedStoryLines.plotThreads) {
          await tx.plotThread.create({ data: { projectId, ...seed } });
          created.push(seed.title);
        }
        for (const seed of normalizedStoryLines.foreshadows) {
          await tx.foreshadow.create({
            data: {
              projectId,
              title: seed.title,
              setupChapterId: seed.setupChapterId,
              payoffChapterId: seed.payoffChapterId,
              relatedCharacterIds: JSON.stringify(seed.relatedCharacterIds),
              status: seed.status,
              notes: seed.notes,
            },
          });
          created.push(seed.title);
        }
      }
      await tx.aiTask.update({
        where: { id: task.id },
        data: {
          status: "succeeded",
          outputText: JSON.stringify({ generated: payload, qualityGate: quality }, null, 2),
          inputTokens: result.usage?.inputTokens,
          outputTokens: result.usage?.outputTokens,
          costUsd: result.usage?.costUsd,
        },
      });
    });

    if (created.length === 0) {
      throw new Error("模型返回为空，未创建任何资料卡。");
    }

    return {
      taskId: task.id,
      areaId,
      created,
      qualityGate: quality,
      provider: {
        id: provider.id,
        providerId: provider.providerId,
        displayName: provider.displayName,
        model: provider.defaultModel,
      },
      message: `AI 已生成 ${created.length} 项，质检 ${quality.score} 分：${created.join("、")}。`,
    };
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Unknown control asset generation error";
    await prisma.aiTask.update({
      where: { id: task.id },
      data: {
        status: "failed",
        errorMessage: message,
      },
    });
    return {
      taskId: task.id,
      areaId,
      created: [],
      error: message,
      provider: {
        id: provider.id,
        providerId: provider.providerId,
        displayName: provider.displayName,
        model: provider.defaultModel,
      },
    };
  }
}
