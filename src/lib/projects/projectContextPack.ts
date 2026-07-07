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

export interface ProjectContextRecallCard {
  id: ProjectContextBlock["id"];
  label: string;
  status: ProjectContextStatus;
  sourceCount: number;
  headline: string;
  detail: string;
  nextAction: string;
}

export type ProjectContextRecallSourceType = "character" | "world" | "foreshadow" | "history";
export type ProjectContextRecallPriority = "must_use" | "should_use" | "optional";

export interface ProjectContextRecallPlanItem {
  id: string;
  sourceType: ProjectContextRecallSourceType;
  sourceLabel: string;
  priority: ProjectContextRecallPriority;
  usage: string;
  promptLine: string;
}

export interface ProjectContextRecallPlan {
  status: "ready" | "partial" | "blocked";
  headline: string;
  items: ProjectContextRecallPlanItem[];
  promptBlock: string;
  nextAction: string;
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
  recallCards: ProjectContextRecallCard[];
  recallPlan: ProjectContextRecallPlan;
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

function buildRecallPlanPromptBlock(plan: ProjectContextRecallPlan) {
  const lines = ["下一章召回计划：", `状态：${plan.status === "ready" ? "可执行" : plan.status === "partial" ? "需补强" : "阻塞"}`];
  if (plan.items.length) {
    lines.push(...plan.items.map((item) => `- [${item.priority}] ${item.promptLine}`));
  } else {
    lines.push("- 缺少可召回素材，先补人物、规则、伏笔或历史章节。");
  }
  lines.push(`下一步：${plan.nextAction}`);
  return lines.join("\n");
}

function sourceCountForBlock(block: ProjectContextBlock) {
  if (block.id === "history" && block.items[0]?.includes("无需历史章节")) return 0;
  return block.items.length;
}

function recallNextAction(block: ProjectContextBlock) {
  if (block.id === "characters") {
    if (block.status === "pass") return "把人物欲望、缺陷和终局变化绑定到下一章选择里。";
    return block.items.length ? "补齐人物真正需求、终局变化和关系压力。" : "先创建主角人物卡，写清欲望、缺陷和弧光终点。";
  }
  if (block.id === "world") {
    if (block.status === "pass") return "生成和审稿时强制引用系统规则、禁忌代价和平台土壤。";
    return "补系统规则、禁忌代价和平台土壤，别让模型凭感觉续写。";
  }
  if (block.id === "story_lines") {
    if (block.status === "pass") return "把主线、支线和伏笔状态写进下一章的冲突与章末钩子。";
    return "补主线/支线和伏笔埋设说明，让章节有长期追读线。";
  }
  if (block.status === "pass") return "继续用最近历史章节承接人物选择、伏笔状态和章末问题。";
  return "补最近章节摘要，否则后续生成容易断设定和断情绪。";
}

function buildRecallCards(blocks: ProjectContextBlock[]): ProjectContextRecallCard[] {
  return blocks.map((block) => {
    const sourceCount = sourceCountForBlock(block);
    const firstItem = block.items[0] ?? "";
    const missing = block.missing[0] ?? "";
    const headline = block.status === "pass"
      ? `${block.label}可召回`
      : block.status === "warn"
        ? `${block.label}需补强`
        : `${block.label}缺失`;
    const detail = block.status === "pass"
      ? firstItem || "当前块可作为模型上下文来源。"
      : missing
        ? `缺口：${missing}`
        : firstItem || "当前块缺少可用素材。";

    return {
      id: block.id,
      label: block.label,
      status: block.status,
      sourceCount,
      headline,
      detail,
      nextAction: recallNextAction(block),
    };
  });
}

function firstCompleteCharacter(characters: ProjectContextCharacter[]) {
  return characters.find(completeCharacter) ?? characters[0] ?? null;
}

function firstUsefulWorldEntry(worldEntries: ProjectContextWorldEntry[]) {
  const preferredTypes = ["system_rule", "platform_soil", "taboo", "location", "organization", "item", "other"];
  return [...worldEntries]
    .filter((entry) => hasText(entry.title) && hasText(entry.content))
    .sort((left, right) => preferredTypes.indexOf(left.type) - preferredTypes.indexOf(right.type))[0] ?? null;
}

function firstActiveForeshadow(foreshadows: ProjectContextForeshadow[]) {
  return foreshadows.find((item) => !item.payoffChapterId && (item.setupChapterId || hasText(item.notes)))
    ?? foreshadows[0]
    ?? null;
}

function firstHistoryChapter(input: ProjectContextPackInput) {
  const currentChapter = input.currentChapterId
    ? input.chapters.find((chapter) => chapter.id === input.currentChapterId)
    : null;
  const previous = currentChapter
    ? input.chapters.filter((chapter) => chapter.order < currentChapter.order)
    : input.chapters;
  return [...previous]
    .filter((chapter) => hasText(chapter.content) || hasText(chapter.hook) || hasText(chapter.conflict))
    .sort((left, right) => right.order - left.order)[0] ?? null;
}

function recallStatus(items: ProjectContextRecallPlanItem[]): ProjectContextRecallPlan["status"] {
  if (items.some((item) => item.sourceType === "character") && items.some((item) => item.sourceType === "world")) return "ready";
  return items.length > 0 ? "partial" : "blocked";
}

function buildRecallPlan(input: ProjectContextPackInput): ProjectContextRecallPlan {
  const items: ProjectContextRecallPlanItem[] = [];
  const character = firstCompleteCharacter(input.characters);
  const worldEntry = firstUsefulWorldEntry(input.worldEntries);
  const foreshadow = firstActiveForeshadow(input.foreshadows);
  const history = firstHistoryChapter(input);

  if (character) {
    items.push({
      id: `character:${character.id}`,
      sourceType: "character",
      sourceLabel: character.name || "未命名人物",
      priority: "must_use",
      usage: "用于下一章人物选择、关系压力和弧光推进。",
      promptLine: `人物 ${character.name || "未命名人物"}：欲望「${compact(character.desire, 28)}」，缺陷「${compact(character.flaw, 28)}」，下一章必须让选择推动人物变化。`,
    });
  }

  if (worldEntry) {
    items.push({
      id: `world:${worldEntry.id}`,
      sourceType: "world",
      sourceLabel: worldEntry.title,
      priority: "must_use",
      usage: "用于约束规则边界、禁忌代价和平台口味。",
      promptLine: `设定 ${worldEntry.title}：${compact(worldEntry.content, 72)}；下一章不能越过规则边界。`,
    });
  }

  if (foreshadow) {
    items.push({
      id: `foreshadow:${foreshadow.id}`,
      sourceType: "foreshadow",
      sourceLabel: foreshadow.title,
      priority: "should_use",
      usage: "用于章中埋线、章末追读或后续回收提醒。",
      promptLine: `伏笔 ${foreshadow.title}：${compact(foreshadow.notes, 62) || "保留异常细节，不要提前解释全部真相。"}；章末要留下可追读问题。`,
    });
  }

  if (history) {
    items.push({
      id: `history:${history.id}`,
      sourceType: "history",
      sourceLabel: `第 ${history.order} 章 ${history.title}`,
      priority: "should_use",
      usage: "用于承接上一章钩子、冲突和情绪余波。",
      promptLine: `历史 第 ${history.order} 章 ${history.title}：${compact(history.hook || history.conflict || history.content, 72)}；下一章要承接这个压力。`,
    });
  }

  const status = recallStatus(items);
  const plan = {
    status,
    headline: status === "ready"
      ? "下一章召回计划可执行"
      : status === "partial"
        ? "下一章召回计划需要补强"
        : "下一章召回计划阻塞",
    items,
    promptBlock: "",
    nextAction: status === "ready"
      ? "把召回计划写入生成、审稿和二改提示词。"
      : status === "partial"
        ? "补齐人物弧光或世界规则后再扩大生成。"
        : "先补人物、设定、伏笔和历史章节摘要。",
  };

  return {
    ...plan,
    promptBlock: buildRecallPlanPromptBlock(plan),
  };
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
  const recallPlan = buildRecallPlan(input);
  const promptBlock = [buildPromptBlock(blocks, warnings), recallPlan.promptBlock].join("\n\n");

  return {
    status,
    summary: `上下文${status === "pass" ? "可用" : status === "warn" ? "需要补强" : "缺口较大"}：人物 ${sourceCounts.characters}，设定 ${sourceCounts.worldEntries}，线索 ${sourceCounts.storyLines}，历史章节 ${sourceCounts.historyChapters}。`,
    promptBlock,
    warnings,
    sourceCounts,
    blocks,
    recallCards: buildRecallCards(blocks),
    recallPlan,
  };
}
