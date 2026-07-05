export interface ContinuityAuditChapter {
  id: string;
  order: number;
  title: string;
  content: string;
  goal: string;
  hook: string;
  conflict: string;
  cliffhanger: string;
  status: string;
}

export interface ContinuityAuditCharacter {
  id: string;
  name: string;
  role: string;
  desire: string;
  need: string;
  flaw: string;
  arcStart: string;
  arcEnd: string;
}

export interface ContinuityAuditWorldEntry {
  id: string;
  type: string;
  title: string;
  content: string;
}

export interface ContinuityAuditForeshadow {
  id: string;
  title: string;
  setupChapterId: string | null;
  payoffChapterId: string | null;
  status: string;
  notes: string;
}

export interface ContinuityAuditPlotThread {
  id: string;
  type: string;
  title: string;
  startChapterId: string | null;
  endChapterId: string | null;
  status: string;
}

export interface ContinuityAuditInput {
  chapters: ContinuityAuditChapter[];
  characters: ContinuityAuditCharacter[];
  worldEntries: ContinuityAuditWorldEntry[];
  foreshadows: ContinuityAuditForeshadow[];
  plotThreads: ContinuityAuditPlotThread[];
}

export type ContinuityAuditItemStatus = "pass" | "watch" | "block";
export type ContinuityAuditItemAxis = "chapter" | "character" | "world" | "foreshadow" | "thread";

export interface ContinuityAuditItem {
  id: string;
  axis: ContinuityAuditItemAxis;
  status: ContinuityAuditItemStatus;
  title: string;
  detail: string;
  action: string;
  href: string;
  evidence: string[];
}

export interface ContinuityAudit {
  score: number;
  status: "ready" | "watch" | "blocked";
  label: string;
  summary: string;
  nextAction: string;
  metrics: {
    totalIssues: number;
    blockedIssues: number;
    watchIssues: number;
    chapterCoveragePercent: number;
    characterReferencePercent: number;
    worldReferencePercent: number;
    foreshadowResolvedPercent: number;
    threadAnchoredPercent: number;
  };
  items: ContinuityAuditItem[];
}

function compact(value: string | null | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function hasText(value: string | null | undefined) {
  return compact(value).length > 0;
}

function textOf(chapter: ContinuityAuditChapter) {
  return [
    chapter.title,
    chapter.content,
    chapter.goal,
    chapter.hook,
    chapter.conflict,
    chapter.cliffhanger,
  ].join("\n");
}

function percent(part: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

function chapterLabel(chapter: ContinuityAuditChapter | undefined) {
  return chapter ? `第 ${chapter.order} 章「${chapter.title}」` : "未绑定章节";
}

function item(input: ContinuityAuditItem): ContinuityAuditItem {
  return input;
}

function characterIsComplete(character: ContinuityAuditCharacter) {
  return [character.desire, character.need, character.flaw, character.arcStart, character.arcEnd].every(hasText);
}

function referencedByAnyChapter(texts: string[], keyword: string) {
  const value = compact(keyword);
  if (value.length < 2) return false;
  return texts.some((text) => text.includes(value));
}

function buildChapterIssues(chapters: ContinuityAuditChapter[]) {
  const items: ContinuityAuditItem[] = [];
  const sorted = chapters.slice().sort((left, right) => left.order - right.order);
  const contentful = sorted.filter((chapter) => hasText(chapter.content));

  for (const chapter of contentful) {
    const missing = [
      hasText(chapter.goal) ? null : "章节目标",
      hasText(chapter.hook) ? null : "开头钩子",
      hasText(chapter.conflict) ? null : "冲突",
      hasText(chapter.cliffhanger) ? null : "章末悬念",
    ].filter(Boolean);
    if (missing.length > 0) {
      items.push(item({
        id: `chapter-card:${chapter.id}`,
        axis: "chapter",
        status: missing.length >= 3 ? "block" : "watch",
        title: `${chapterLabel(chapter)}章节卡不完整`,
        detail: `正文已存在，但缺少 ${missing.join("、")}。`,
        action: "补章节卡后再继续生成或导出。",
        href: "#chapter-production",
        evidence: [`缺口：${missing.join("、")}`],
      }));
    }
  }

  const orders = new Set(sorted.map((chapter) => chapter.order));
  for (let order = 1; order <= (sorted.at(-1)?.order ?? 0); order += 1) {
    if (!orders.has(order)) {
      items.push(item({
        id: `chapter-gap:${order}`,
        axis: "chapter",
        status: "watch",
        title: `章节序号缺第 ${order} 章`,
        detail: "章节序号断档会影响导出排序、伏笔回收和读者进度判断。",
        action: "补齐章节或调整章节序号。",
        href: "#create-chapter",
        evidence: [`缺少 order=${order}`],
      }));
    }
  }

  return items;
}

function buildCharacterIssues(characters: ContinuityAuditCharacter[], chapterTexts: string[]) {
  const items: ContinuityAuditItem[] = [];
  for (const character of characters) {
    const complete = characterIsComplete(character);
    const referenced = referencedByAnyChapter(chapterTexts, character.name);
    if (!complete) {
      items.push(item({
        id: `character-arc:${character.id}`,
        axis: "character",
        status: "block",
        title: `人物弧光未闭合：${character.name || "未命名人物"}`,
        detail: "欲望、真正需求、缺陷、弧光起点和终点必须能支撑长篇选择压力。",
        action: "补齐人物弧光核心字段。",
        href: "#character-arc",
        evidence: [
          hasText(character.desire) ? "有欲望" : "缺欲望",
          hasText(character.flaw) ? "有缺陷" : "缺缺陷",
          hasText(character.arcStart) && hasText(character.arcEnd) ? "有起终点" : "缺弧光起终点",
        ],
      }));
    } else if (!referenced) {
      items.push(item({
        id: `character-reference:${character.id}`,
        axis: "character",
        status: "watch",
        title: `人物未进入正文：${character.name}`,
        detail: "人物卡完整但正文和章节卡暂未引用，后续容易变成孤立设定。",
        action: "把人物选择绑定到最近一章的冲突里。",
        href: "#character-arc",
        evidence: [`正文未出现「${character.name}」`],
      }));
    }
  }
  if (characters.length === 0) {
    items.push(item({
      id: "character-empty",
      axis: "character",
      status: "block",
      title: "缺少人物弧光",
      detail: "没有人物卡，长篇只能靠剧情事件硬推。",
      action: "先创建主角人物卡。",
      href: "#character-arc",
      evidence: ["人物数 0"],
    }));
  }
  return items;
}

function buildWorldIssues(worldEntries: ContinuityAuditWorldEntry[], chapterTexts: string[]) {
  const items: ContinuityAuditItem[] = [];
  const required = ["system_rule", "taboo", "platform_soil"];
  for (const type of required) {
    if (!worldEntries.some((entry) => entry.type === type)) {
      items.push(item({
        id: `world-missing:${type}`,
        axis: "world",
        status: "block",
        title: `缺少核心设定：${type}`,
        detail: "系统规则、禁忌和平台土壤是长篇连续性的底座。",
        action: "去世界观面板补核心设定。",
        href: "#world-bible",
        evidence: [`缺少 ${type}`],
      }));
    }
  }
  for (const entry of worldEntries) {
    const thin = compact(entry.content).length < 40;
    const referenced = referencedByAnyChapter(chapterTexts, entry.title);
    if (thin || !referenced) {
      items.push(item({
        id: `world-entry:${entry.id}`,
        axis: "world",
        status: thin ? "block" : "watch",
        title: `设定承接不足：${entry.title || "未命名设定"}`,
        detail: thin ? "设定内容过薄，模型和作者都难以稳定引用。" : "设定卡存在，但正文或章节卡暂未引用。",
        action: thin ? "补清规则、限制和剧情用途。" : "把设定绑定到最近章节的行动或代价里。",
        href: "#world-bible",
        evidence: [
          `类型：${entry.type || "未分类"}`,
          thin ? `内容 ${compact(entry.content).length} 字` : `正文未出现「${entry.title}」`,
        ],
      }));
    }
  }
  if (worldEntries.length === 0) {
    items.push(item({
      id: "world-empty",
      axis: "world",
      status: "block",
      title: "缺少世界观资料",
      detail: "没有设定卡，长篇后期很难保持规则一致。",
      action: "先补系统规则、禁忌和平台土壤。",
      href: "#world-bible",
      evidence: ["设定数 0"],
    }));
  }
  return items;
}

function buildForeshadowIssues(foreshadows: ContinuityAuditForeshadow[], chapterById: Map<string, ContinuityAuditChapter>) {
  const items: ContinuityAuditItem[] = [];
  for (const foreshadow of foreshadows) {
    const setup = foreshadow.setupChapterId ? chapterById.get(foreshadow.setupChapterId) : undefined;
    const payoff = foreshadow.payoffChapterId ? chapterById.get(foreshadow.payoffChapterId) : undefined;
    if (setup && payoff && payoff.order < setup.order) {
      items.push(item({
        id: `foreshadow-order:${foreshadow.id}`,
        axis: "foreshadow",
        status: "block",
        title: `伏笔回收早于埋设：${foreshadow.title}`,
        detail: `${chapterLabel(payoff)} 在 ${chapterLabel(setup)} 之前，读者会看成凭空反转。`,
        action: "调整埋点章或回收章顺序。",
        href: "#story-lines",
        evidence: [`埋点 ${setup.order}`, `回收 ${payoff.order}`],
      }));
    } else if (!foreshadow.setupChapterId || (!foreshadow.payoffChapterId && foreshadow.status === "paid_off")) {
      items.push(item({
        id: `foreshadow-missing:${foreshadow.id}`,
        axis: "foreshadow",
        status: "block",
        title: `伏笔证据缺失：${foreshadow.title}`,
        detail: "已回收或计划回收的伏笔必须有明确埋点和回收证据。",
        action: "补埋点章和回收章。",
        href: "#story-lines",
        evidence: [
          foreshadow.setupChapterId ? "有埋点" : "缺埋点",
          foreshadow.payoffChapterId ? "有回收" : "缺回收",
        ],
      }));
    } else if (foreshadow.setupChapterId && !foreshadow.payoffChapterId) {
      items.push(item({
        id: `foreshadow-open:${foreshadow.id}`,
        axis: "foreshadow",
        status: "watch",
        title: `伏笔未安排回收：${foreshadow.title}`,
        detail: "只埋不收会变成读者信任成本。",
        action: "给这条伏笔指定阶段回收章。",
        href: "#story-lines",
        evidence: [`埋点：${chapterLabel(setup)}`],
      }));
    }
  }
  return items;
}

function buildThreadIssues(plotThreads: ContinuityAuditPlotThread[], chapterById: Map<string, ContinuityAuditChapter>) {
  const items: ContinuityAuditItem[] = [];
  for (const thread of plotThreads) {
    const start = thread.startChapterId ? chapterById.get(thread.startChapterId) : undefined;
    const end = thread.endChapterId ? chapterById.get(thread.endChapterId) : undefined;
    if (start && end && end.order < start.order) {
      items.push(item({
        id: `thread-order:${thread.id}`,
        axis: "thread",
        status: "block",
        title: `剧情线终点早于起点：${thread.title}`,
        detail: `${chapterLabel(end)} 在 ${chapterLabel(start)} 之前，主线因果会倒置。`,
        action: "调整剧情线起止章节。",
        href: "#story-lines",
        evidence: [`起点 ${start.order}`, `终点 ${end.order}`],
      }));
    } else if (!thread.startChapterId || (thread.status === "resolved" && !thread.endChapterId)) {
      items.push(item({
        id: `thread-anchor:${thread.id}`,
        axis: "thread",
        status: "block",
        title: `剧情线锚点不足：${thread.title}`,
        detail: "剧情线需要起点；已解决的线必须有阶段终点。",
        action: "补起点章和阶段终点。",
        href: "#story-lines",
        evidence: [
          thread.startChapterId ? "有起点" : "缺起点",
          thread.endChapterId ? "有终点" : "缺终点",
        ],
      }));
    } else if (thread.startChapterId && !thread.endChapterId && thread.status !== "resolved") {
      items.push(item({
        id: `thread-open:${thread.id}`,
        axis: "thread",
        status: "watch",
        title: `剧情线缺阶段终点：${thread.title}`,
        detail: "长篇可以开放推进，但至少要知道下一阶段在哪里收束。",
        action: "给剧情线补阶段终点或下一卷目标。",
        href: "#story-lines",
        evidence: [`起点：${chapterLabel(start)}`],
      }));
    }
  }
  if (plotThreads.length === 0) {
    items.push(item({
      id: "thread-empty",
      axis: "thread",
      status: "watch",
      title: "缺少主线/支线记录",
      detail: "没有剧情线，章节推进容易只剩单章事件。",
      action: "先创建主线，再补关系线或反派压力线。",
      href: "#story-lines",
      evidence: ["剧情线 0"],
    }));
  }
  return items;
}

export function buildContinuityAudit(input: ContinuityAuditInput): ContinuityAudit {
  const chapters = input.chapters.slice().sort((left, right) => left.order - right.order);
  const chapterTexts = chapters.map(textOf);
  const chapterById = new Map(chapters.map((chapter) => [chapter.id, chapter]));
  const items = [
    ...buildChapterIssues(chapters),
    ...buildCharacterIssues(input.characters, chapterTexts),
    ...buildWorldIssues(input.worldEntries, chapterTexts),
    ...buildForeshadowIssues(input.foreshadows, chapterById),
    ...buildThreadIssues(input.plotThreads, chapterById),
  ];
  const blockedIssues = items.filter((entry) => entry.status === "block").length;
  const watchIssues = items.filter((entry) => entry.status === "watch").length;
  const contentfulChapters = chapters.filter((chapter) => hasText(chapter.content));
  const cardReadyChapters = contentfulChapters.filter((chapter) => (
    hasText(chapter.goal) && hasText(chapter.hook) && hasText(chapter.conflict) && hasText(chapter.cliffhanger)
  ));
  const referencedCharacters = input.characters.filter((character) => referencedByAnyChapter(chapterTexts, character.name));
  const referencedWorldEntries = input.worldEntries.filter((entry) => referencedByAnyChapter(chapterTexts, entry.title));
  const resolvedForeshadows = input.foreshadows.filter((foreshadow) => (
    Boolean(foreshadow.setupChapterId && foreshadow.payoffChapterId)
  ));
  const anchoredThreads = input.plotThreads.filter((thread) => Boolean(thread.startChapterId));
  const score = Math.max(0, Math.min(100, 100 - blockedIssues * 14 - watchIssues * 6));
  const status = blockedIssues > 0 ? "blocked" : watchIssues > 0 ? "watch" : "ready";
  const label = status === "ready" ? "连续性可承接" : status === "watch" ? "连续性需观察" : "连续性阻塞";
  const firstIssue = items[0] ?? null;
  const nextAction = firstIssue
    ? `${firstIssue.action} ${firstIssue.detail}`
    : "可以进入下一批章节生产；继续保持人物、设定和伏笔同步更新。";

  return {
    score,
    status,
    label,
    summary: items.length > 0
      ? `${blockedIssues} 个阻塞，${watchIssues} 个观察项；优先处理「${firstIssue?.title ?? "连续性缺口"}」。`
      : "人物、设定、伏笔、剧情线和章节卡当前没有明显断点。",
    nextAction,
    metrics: {
      totalIssues: items.length,
      blockedIssues,
      watchIssues,
      chapterCoveragePercent: percent(cardReadyChapters.length, contentfulChapters.length),
      characterReferencePercent: percent(referencedCharacters.length, input.characters.length),
      worldReferencePercent: percent(referencedWorldEntries.length, input.worldEntries.length),
      foreshadowResolvedPercent: percent(resolvedForeshadows.length, input.foreshadows.length),
      threadAnchoredPercent: percent(anchoredThreads.length, input.plotThreads.length),
    },
    items,
  };
}
