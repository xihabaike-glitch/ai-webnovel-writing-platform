export type ProjectContextStatus = "pass" | "warn" | "fail";

export interface ProjectContextChapter {
  id: string;
  order: number;
  title: string;
  content: string;
  hook: string;
  conflict: string;
  cliffhanger: string;
  status: string;
}

export interface ProjectContextCharacter {
  id: string;
  name: string;
  role: string;
  desire: string;
  need: string;
  flaw: string;
  arcStart: string;
  arcEnd: string;
  relationshipNotes: string;
}

export interface ProjectContextWorldEntry {
  id: string;
  type: string;
  title: string;
  content: string;
}

export interface ProjectContextForeshadow {
  id: string;
  title: string;
  setupChapterId: string | null;
  payoffChapterId: string | null;
  relatedCharacterIds: string | string[];
  status: string;
  notes: string;
}

export interface ProjectContextPlotThread {
  id: string;
  type: string;
  title: string;
  startChapterId: string | null;
  endChapterId: string | null;
  status: string;
}

export interface ProjectContextPackInput {
  currentChapterId?: string | null;
  chapters: ProjectContextChapter[];
  characters: ProjectContextCharacter[];
  worldEntries: ProjectContextWorldEntry[];
  foreshadows: ProjectContextForeshadow[];
  plotThreads: ProjectContextPlotThread[];
}

export interface ProjectContextBlock {
  id: "characters" | "world" | "story_lines" | "history";
  label: string;
  status: ProjectContextStatus;
  items: string[];
  missing: string[];
}

export interface ProjectContextPack {
  status: ProjectContextStatus;
  summary: string;
  promptBlock: string;
  warnings: string[];
  sourceCounts: {
    characters: number;
    worldEntries: number;
    storyLines: number;
    historyChapters: number;
  };
  blocks: ProjectContextBlock[];
}

function hasText(value: string | null | undefined) {
  return Boolean(value?.trim());
}

function compact(value: string | null | undefined, max = 90) {
  const clean = value?.replace(/\s+/g, " ").trim() ?? "";
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1)}…`;
}

function blockStatus(items: string[], missing: string[]): ProjectContextStatus {
  if (items.length > 0 && missing.length === 0) return "pass";
  if (items.length > 0) return "warn";
  return "fail";
}

function overallStatus(blocks: ProjectContextBlock[]): ProjectContextStatus {
  if (blocks.some((block) => block.status === "fail")) return "fail";
  if (blocks.some((block) => block.status === "warn")) return "warn";
  return "pass";
}

function completeCharacter(character: ProjectContextCharacter) {
  return [
    character.name,
    character.desire,
    character.need,
    character.flaw,
    character.arcStart,
    character.arcEnd,
  ].every(hasText);
}

function relatedCharacterIds(value: string | string[]) {
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function buildCharacterBlock(characters: ProjectContextCharacter[]): ProjectContextBlock {
  const complete = characters.filter(completeCharacter);
  const source = complete.length ? complete : characters;
  const items = source.slice(0, 3).map((character) => [
    `${character.name || "未命名人物"}（${character.role || "角色未定"}）`,
    character.desire ? `欲望：${compact(character.desire, 42)}` : "",
    character.need ? `需求：${compact(character.need, 42)}` : "",
    character.flaw ? `缺陷：${compact(character.flaw, 42)}` : "",
    character.arcStart && character.arcEnd ? `弧光：${compact(character.arcStart, 32)} -> ${compact(character.arcEnd, 32)}` : "",
    character.relationshipNotes ? `关系压力：${compact(character.relationshipNotes, 46)}` : "",
  ].filter(Boolean).join("；"));
  const missing = [
    characters.length === 0 ? "缺少人物卡" : "",
    complete.length === 0 ? "缺少完整人物弧光" : "",
  ].filter(Boolean);

  return {
    id: "characters",
    label: "人物弧光",
    status: blockStatus(items, missing),
    items,
    missing,
  };
}

function buildWorldBlock(worldEntries: ProjectContextWorldEntry[]): ProjectContextBlock {
  const requiredTypes = ["system_rule", "taboo", "platform_soil"];
  const completeEntries = worldEntries.filter((entry) => hasText(entry.title) && entry.content.trim().length >= 18);
  const missing = requiredTypes
    .filter((type) => !worldEntries.some((entry) => entry.type === type && entry.content.trim().length >= 18))
    .map((type) => {
      if (type === "system_rule") return "缺少系统规则";
      if (type === "taboo") return "缺少禁忌/限制";
      return "缺少平台土壤";
    });
  const preferredTypes = ["platform_soil", "system_rule", "taboo", "location", "organization", "item", "other"];
  const items = [...completeEntries]
    .sort((left, right) => preferredTypes.indexOf(left.type) - preferredTypes.indexOf(right.type))
    .slice(0, 5)
    .map((entry) => `${entry.title}：${compact(entry.content, 96)}`);

  return {
    id: "world",
    label: "世界观与平台土壤",
    status: blockStatus(items, missing),
    items,
    missing,
  };
}

function buildStoryLineBlock(input: ProjectContextPackInput): ProjectContextBlock {
  const foreshadowItems = input.foreshadows.slice(0, 3).map((foreshadow) => {
    const related = relatedCharacterIds(foreshadow.relatedCharacterIds);
    return [
      `伏笔：${foreshadow.title}`,
      foreshadow.status ? `状态：${foreshadow.status}` : "",
      foreshadow.setupChapterId ? "已埋" : "待埋",
      foreshadow.payoffChapterId ? "已回收" : "待回收",
      related.length ? `关联人物 ${related.length} 个` : "",
      foreshadow.notes ? compact(foreshadow.notes, 54) : "",
    ].filter(Boolean).join("；");
  });
  const threadItems = input.plotThreads.slice(0, 3).map((thread) => [
    `剧情线：${thread.title}`,
    thread.type ? `类型：${thread.type}` : "",
    thread.status ? `状态：${thread.status}` : "",
    thread.startChapterId ? "有起点" : "缺起点",
    thread.endChapterId ? "有终点" : "缺终点",
  ].filter(Boolean).join("；"));
  const items = [...threadItems, ...foreshadowItems].slice(0, 5);
  const missing = [
    input.plotThreads.length === 0 ? "缺少主线/支线" : "",
    input.foreshadows.length === 0 ? "缺少伏笔卡" : "",
    input.foreshadows.some((item) => !item.setupChapterId && !hasText(item.notes)) ? "伏笔缺少埋设说明" : "",
  ].filter(Boolean);

  return {
    id: "story_lines",
    label: "主线支线与伏笔",
    status: blockStatus(items, missing),
    items,
    missing,
  };
}

function buildHistoryBlock(input: ProjectContextPackInput): ProjectContextBlock {
  const currentChapter = input.currentChapterId
    ? input.chapters.find((chapter) => chapter.id === input.currentChapterId)
    : null;
  const previousChapters = currentChapter
    ? input.chapters.filter((chapter) => chapter.order < currentChapter.order)
    : input.chapters;
  const usefulHistory = previousChapters
    .filter((chapter) => hasText(chapter.content) || hasText(chapter.hook) || hasText(chapter.conflict))
    .sort((left, right) => right.order - left.order)
    .slice(0, 3);
  const isOpening = currentChapter ? currentChapter.order <= 1 : input.chapters.length <= 1;
  const items = usefulHistory.map((chapter) => [
    `第 ${chapter.order} 章 ${chapter.title}`,
    chapter.hook ? `钩子：${compact(chapter.hook, 38)}` : "",
    chapter.conflict ? `冲突：${compact(chapter.conflict, 38)}` : "",
    chapter.cliffhanger ? `章末：${compact(chapter.cliffhanger, 38)}` : "",
    chapter.content ? `正文摘要：${compact(chapter.content, 70)}` : "",
  ].filter(Boolean).join("；"));
  const missing = isOpening || items.length > 0 ? [] : ["缺少历史章节摘要"];

  return {
    id: "history",
    label: "历史章节",
    status: isOpening ? "pass" : blockStatus(items, missing),
    items: isOpening && items.length === 0 ? ["当前为开篇或首章，无需历史章节承接。"] : items,
    missing,
  };
}

function buildPromptBlock(blocks: ProjectContextBlock[], warnings: string[]) {
  const lines = ["项目上下文召回包："];
  for (const block of blocks) {
    lines.push(`【${block.label}｜${block.status === "pass" ? "可用" : block.status === "warn" ? "需谨慎" : "缺失"}】`);
    if (block.items.length) {
      lines.push(...block.items.map((item) => `- ${item}`));
    }
    if (block.missing.length) {
      lines.push(...block.missing.map((item) => `- 缺口：${item}`));
    }
  }
  if (warnings.length) {
    lines.push("召回警告：", ...warnings.map((warning) => `- ${warning}`));
  }
  return lines.join("\n");
}

export function buildProjectContextPack(input: ProjectContextPackInput): ProjectContextPack {
  const blocks = [
    buildCharacterBlock(input.characters),
    buildWorldBlock(input.worldEntries),
    buildStoryLineBlock(input),
    buildHistoryBlock(input),
  ];
  const status = overallStatus(blocks);
  const warnings = blocks.flatMap((block) => block.missing.map((missing) => `${block.label}：${missing}`));
  const sourceCounts = {
    characters: input.characters.length,
    worldEntries: input.worldEntries.length,
    storyLines: input.foreshadows.length + input.plotThreads.length,
    historyChapters: Math.max(0, blocks.find((block) => block.id === "history")?.items.filter((item) => !item.includes("无需历史章节")).length ?? 0),
  };

  return {
    status,
    summary: `上下文${status === "pass" ? "可用" : status === "warn" ? "需要补强" : "缺口较大"}：人物 ${sourceCounts.characters}，设定 ${sourceCounts.worldEntries}，线索 ${sourceCounts.storyLines}，历史章节 ${sourceCounts.historyChapters}。`,
    promptBlock: buildPromptBlock(blocks, warnings),
    warnings,
    sourceCounts,
    blocks,
  };
}
