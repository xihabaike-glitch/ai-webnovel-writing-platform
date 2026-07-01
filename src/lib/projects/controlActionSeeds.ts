import { buildDefaultOutlineNodes } from "../outlines/defaultOutline.ts";
import type { PlatformProfile } from "../platforms/platformProfiles.ts";

export interface SeedProject {
  id: string;
  title: string;
  genre: string;
  sellingPoint: string;
}

export interface SeedCharacter {
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

export interface SeedWorldEntry {
  type: string;
  title: string;
  content: string;
}

export interface SeedChapter {
  id: string;
  order: number;
  title: string;
}

export interface SeedForeshadow {
  title: string;
}

export interface SeedPlotThread {
  type: string;
}

export interface SeedOutlineNode {
  id: string;
  type: string;
  title: string;
}

export interface OutlineNodeCreateSeed {
  id: string;
  parentId: string | null;
  type: string;
  title: string;
  summary: string;
  goal: string;
  hook: string;
  conflict: string;
  valueShift: string;
  platformNote: string;
  order: number;
  depth: number;
  status: string;
}

function includesPattern(value: string, pattern: RegExp) {
  return pattern.test(value.trim());
}

function hasNamedSeed(items: Array<{ name?: string; title?: string }>, label: string) {
  return items.some((item) => (item.name ?? item.title ?? "").includes(label));
}

function requiredOutlineCount(type: string) {
  if (type === "branch") return 3;
  if (type === "leaf") return 2;
  return 1;
}

export function buildCharacterActionSeeds(project: SeedProject, characters: SeedCharacter[]): SeedCharacter[] {
  const seeds: SeedCharacter[] = [];
  const sellingPoint = project.sellingPoint || "围绕核心卖点持续制造选择压力";
  const hasProtagonist = characters.some((character) => includesPattern(`${character.role}${character.name}`, /主角|男主|女主|protagonist/i));
  const hasAntagonist = characters.some((character) => includesPattern(`${character.role}${character.name}`, /反派|敌人|对手|antagonist/i));

  if (!hasProtagonist && !hasNamedSeed(characters, "主角占位卡")) {
    seeds.push({
      name: "主角占位卡",
      role: "主角",
      desire: `抓住「${sellingPoint}」带来的翻盘机会。`,
      need: "学会主动选择，而不是被设定和事件推着走。",
      flaw: "开局容易逃避代价，只想用最短路径解决眼前危机。",
      arcStart: "被动卷入危机，靠本能和运气撑住第一轮。",
      arcEnd: "主动承担代价，能用自己的规则解决终局问题。",
      voice: "紧绷、直接，遇到压力时先判断收益和风险。",
      relationshipNotes: "需要绑定一个反派压力源和一个情绪镜像角色，形成选择拉扯。",
    });
  }

  if (!hasAntagonist && !hasNamedSeed(characters, "反派压力源")) {
    seeds.push({
      name: "反派压力源",
      role: "反派",
      desire: "阻止主角拿到关键资源，维护原有秩序或个人利益。",
      need: "暴露主角真正的弱点，让每次胜利都带来更高代价。",
      flaw: "过度相信控制和规则，低估主角的成长速度。",
      arcStart: "把主角当作可以随手压下的小麻烦。",
      arcEnd: "被主角逼到亲自下场，成为终局选择的压力核心。",
      voice: "冷静、克制，擅长用利益和规则压人。",
      relationshipNotes: "和主角的欲望直接冲突，每次出手都要改变局面。",
    });
  }

  if (characters.length + seeds.length < 3 && !hasNamedSeed(characters, "关系镜像角色")) {
    seeds.push({
      name: "关系镜像角色",
      role: "重要关系",
      desire: "希望主角保留人性、承诺或情感连接。",
      need: "把爽点背后的情绪重量落到具体关系上。",
      flaw: "容易用保护或误解干扰主角选择。",
      arcStart: "和主角目标不完全一致，制造关系摩擦。",
      arcEnd: "在关键节点成为主角愿意付出代价的理由。",
      voice: "更情绪化，能把压力说成人话。",
      relationshipNotes: "用于承接亲情、友情、爱情或师徒线，避免剧情只剩任务推进。",
    });
  }

  return seeds.slice(0, 3);
}

export function buildWorldActionSeeds(project: SeedProject, platform: PlatformProfile, worldEntries: SeedWorldEntry[]): SeedWorldEntry[] {
  const existingTypes = new Set(worldEntries.map((entry) => entry.type));
  const sellingPoint = project.sellingPoint || "核心卖点";
  const seeds: SeedWorldEntry[] = [];

  if (!existingTypes.has("system_rule")) {
    seeds.push({
      type: "system_rule",
      title: "核心规则",
      content: `围绕「${sellingPoint}」建立规则：每次能力、资源或机会出现，都必须绑定限制、代价和下一轮压力，不能无成本解决问题。`,
    });
  }
  if (!existingTypes.has("taboo")) {
    seeds.push({
      type: "taboo",
      title: "不可轻易打破的禁忌",
      content: "禁止无代价复活、无代价洗白和无铺垫开挂。任何突破都要交换记忆、关系、资源或身份安全，反过来推动主线升级。",
    });
  }
  if (!existingTypes.has("platform_soil")) {
    seeds.push({
      type: "platform_soil",
      title: `${platform.name}平台土壤`,
      content: `${platform.name}读者期待：${platform.reviewFocus.join("、")}。章节填充必须服务钩子、冲突、爽点和章末追读，设定解释不能连续拖慢节奏。`,
    });
  }

  return seeds;
}

export function buildStoryLineActionSeeds(
  project: SeedProject,
  chapters: SeedChapter[],
  characters: Array<{ id: string }>,
  foreshadows: SeedForeshadow[],
  plotThreads: SeedPlotThread[],
) {
  const firstChapter = [...chapters].sort((left, right) => left.order - right.order)[0] ?? null;
  const lastChapter = [...chapters].sort((left, right) => right.order - left.order)[0] ?? null;
  const seeds: {
    plotThreads: Array<{ type: string; title: string; startChapterId: string | null; endChapterId: string | null; status: string }>;
    foreshadows: Array<{ title: string; setupChapterId: string | null; payoffChapterId: string | null; relatedCharacterIds: string[]; status: string; notes: string }>;
  } = {
    plotThreads: [],
    foreshadows: [],
  };

  if (!plotThreads.some((thread) => thread.type === "main")) {
    seeds.plotThreads.push({
      type: "main",
      title: `${project.title}主线问题`,
      startChapterId: firstChapter?.id ?? null,
      endChapterId: lastChapter && lastChapter.id !== firstChapter?.id ? lastChapter.id : null,
      status: "active",
    });
  }

  if (foreshadows.length === 0) {
    seeds.foreshadows.push({
      title: "开局异常伏笔",
      setupChapterId: firstChapter?.id ?? null,
      payoffChapterId: null,
      relatedCharacterIds: characters[0]?.id ? [characters[0].id] : [],
      status: "planned",
      notes: "先在开头埋一个异常细节，中段回收时揭示更大的规则、身份或代价。",
    });
  }

  return seeds;
}

export function buildOutlineActionSeeds(
  project: SeedProject,
  platform: PlatformProfile,
  outlineNodes: SeedOutlineNode[],
): OutlineNodeCreateSeed[] {
  const defaultNodes = buildDefaultOutlineNodes({
    projectId: project.id,
    title: project.title,
    genre: project.genre,
    sellingPoint: project.sellingPoint,
    platform,
  });
  if (outlineNodes.length === 0) return defaultNodes;

  const createdByDefaultId = new Map<string, string>();
  const existingByType = new Map(outlineNodes.map((node) => [node.type, node.id]));
  const countsByType = new Map<string, number>();
  for (const node of outlineNodes) {
    countsByType.set(node.type, (countsByType.get(node.type) ?? 0) + 1);
  }
  const seeds: OutlineNodeCreateSeed[] = [];

  for (const node of defaultNodes) {
    if ((countsByType.get(node.type) ?? 0) >= requiredOutlineCount(node.type)) continue;
    const defaultParent = defaultNodes.find((item) => item.id === node.parentId);
    const parentId = defaultParent
      ? existingByType.get(defaultParent.type) ?? createdByDefaultId.get(defaultParent.id) ?? null
      : null;

    seeds.push({
      ...node,
      parentId,
    });
    createdByDefaultId.set(node.id, node.id);
    existingByType.set(node.type, existingByType.get(node.type) ?? node.id);
    countsByType.set(node.type, (countsByType.get(node.type) ?? 0) + 1);
  }

  return seeds;
}
