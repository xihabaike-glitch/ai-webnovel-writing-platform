interface ExportChapter {
  id?: string;
  order: number;
  title: string;
  content: string;
  wordCount?: number;
  goal?: string;
  hook?: string;
  conflict?: string;
  valueShift?: string;
  cliffhanger?: string;
  status?: string;
}

interface ExportOutlineNode {
  type: string;
  title: string;
  summary?: string;
  goal?: string;
  hook?: string;
  conflict?: string;
  valueShift?: string;
  platformNote?: string;
  depth?: number;
  order?: number;
  status?: string;
}

interface ExportCharacter {
  name: string;
  role: string;
  desire?: string;
  need?: string;
  flaw?: string;
  arcStart?: string;
  arcEnd?: string;
  voice?: string;
  relationshipNotes?: string;
}

interface ExportWorldEntry {
  type: string;
  title: string;
  content?: string;
}

interface ExportForeshadow {
  title: string;
  status?: string;
  notes?: string;
  setupChapterId?: string | null;
  payoffChapterId?: string | null;
}

interface ExportPlotThread {
  type: string;
  title: string;
  status?: string;
}

export interface ExportProject {
  title: string;
  genre?: string;
  targetPlatformName?: string;
  targetLengthType?: string;
  targetWordCount?: number;
  currentWordCount?: number;
  sellingPoint?: string;
  updateCadence?: string;
  chapters: ExportChapter[];
  outlineNodes?: ExportOutlineNode[];
  characters?: ExportCharacter[];
  worldEntries?: ExportWorldEntry[];
  foreshadows?: ExportForeshadow[];
  plotThreads?: ExportPlotThread[];
}

export type ExportPackageReadinessStatus = "ready" | "warning" | "blocked";

export interface ExportPackageReadinessItem {
  id: string;
  label: string;
  status: "pass" | "todo" | "risk";
  detail: string;
}

export interface ExportPackageReadiness {
  status: ExportPackageReadinessStatus;
  label: string;
  readinessPercent: number;
  nextAction: string;
  items: ExportPackageReadinessItem[];
  passCount: number;
  todoCount: number;
  riskCount: number;
}

export type ExportMarkdownMode = "full" | "outline" | "characters";

function line(value: string | undefined | null, fallback = "未填写") {
  const text = value?.trim();
  return text ? text : fallback;
}

function item(id: string, label: string, status: ExportPackageReadinessItem["status"], detail: string): ExportPackageReadinessItem {
  return { id, label, status, detail };
}

function bullet(label: string, value: string | number | undefined | null) {
  const text = typeof value === "number" ? String(value) : line(value);
  return `- ${label}：${text}`;
}

function section(title: string, lines: string[]) {
  return lines.length ? [`## ${title}`, "", ...lines, ""] : [];
}

function chapterAnchor(chapterId: string | null | undefined, chapters: ExportChapter[]) {
  if (!chapterId) return "";
  const chapter = chapters.find((item) => item.id === chapterId);
  return chapter ? `第 ${chapter.order} 章 ${chapter.title}` : chapterId;
}

function exportOutline(nodes: ExportOutlineNode[] = []) {
  return nodes
    .slice()
    .sort((left, right) => (left.depth ?? 0) - (right.depth ?? 0) || (left.order ?? 0) - (right.order ?? 0) || left.title.localeCompare(right.title))
    .flatMap((node) => {
      const indent = "  ".repeat(Math.max(0, node.depth ?? 0));
      const detail = [
        node.summary ? `摘要：${node.summary}` : null,
        node.goal ? `目标：${node.goal}` : null,
        node.hook ? `钩子：${node.hook}` : null,
        node.conflict ? `冲突：${node.conflict}` : null,
        node.valueShift ? `价值变化：${node.valueShift}` : null,
        node.platformNote ? `平台提示：${node.platformNote}` : null,
      ].filter(Boolean).join("；");
      return [`${indent}- ${node.type}｜${node.title}${node.status ? `｜${node.status}` : ""}${detail ? `：${detail}` : ""}`];
    });
}

function projectMetadata(project: ExportProject) {
  return [
    bullet("题材", project.genre),
    bullet("目标平台", project.targetPlatformName),
    bullet("篇幅类型", project.targetLengthType),
    bullet("目标字数", project.targetWordCount),
    bullet("当前字数", project.currentWordCount),
    bullet("更新节奏", project.updateCadence),
    bullet("一句话卖点", project.sellingPoint),
  ];
}

function characterMarkdownLines(project: ExportProject) {
  return (project.characters ?? []).flatMap((character) => [
    `### ${character.name}`,
    "",
    bullet("定位", character.role),
    bullet("欲望", character.desire),
    bullet("真正需求", character.need),
    bullet("缺陷", character.flaw),
    bullet("弧光起点", character.arcStart),
    bullet("弧光终点", character.arcEnd),
    bullet("声音", character.voice),
    bullet("关系压力", character.relationshipNotes),
    "",
  ]);
}

function worldMarkdownLines(project: ExportProject) {
  return (project.worldEntries ?? []).flatMap((entry) => [
    `### ${entry.type}｜${entry.title}`,
    "",
    line(entry.content),
    "",
  ]);
}

function foreshadowMarkdownLines(project: ExportProject, chapters: ExportChapter[]) {
  return (project.foreshadows ?? []).map((entry) => [
    `- ${entry.title}${entry.status ? `｜${entry.status}` : ""}`,
    entry.setupChapterId || entry.payoffChapterId
      ? `  - 章节：${chapterAnchor(entry.setupChapterId, chapters) || "未设置"} -> ${chapterAnchor(entry.payoffChapterId, chapters) || "未回收"}`
      : null,
    entry.notes ? `  - 备注：${entry.notes}` : null,
  ].filter(Boolean).join("\n"));
}

function threadMarkdownLines(project: ExportProject) {
  return (project.plotThreads ?? []).map((entry) => `- ${entry.type}｜${entry.title}${entry.status ? `｜${entry.status}` : ""}`);
}

function sortedChapters(project: ExportProject) {
  return [...project.chapters].sort((a, b) => a.order - b.order);
}

export function buildExportPackageReadiness(project: ExportProject): ExportPackageReadiness {
  const manuscriptChapters = project.chapters.filter((chapter) => chapter.content.trim().length > 0);
  const chapterCards = project.chapters.filter((chapter) => (
    line(chapter.goal, "") && line(chapter.hook, "") && line(chapter.conflict, "") && line(chapter.cliffhanger, "")
  ));
  const outlineNodes = project.outlineNodes ?? [];
  const characters = project.characters ?? [];
  const worldEntries = project.worldEntries ?? [];
  const foreshadows = project.foreshadows ?? [];
  const plotThreads = project.plotThreads ?? [];
  const hasCoreCharacterArc = characters.some((character) => (
    line(character.desire, "") && line(character.flaw, "") && line(character.arcStart, "") && line(character.arcEnd, "")
  ));

  const items = [
    item(
      "metadata",
      "作品基础信息",
      project.title.trim().length >= 2 && line(project.genre, "") && line(project.sellingPoint, "") ? "pass" : "todo",
      line(project.sellingPoint, "") ? "标题、题材和卖点可进入资料包。" : "缺少题材或一句话卖点，导出后很难给编辑快速判断。",
    ),
    item(
      "manuscript",
      "正文内容",
      manuscriptChapters.length > 0 ? "pass" : "todo",
      manuscriptChapters.length > 0 ? `可导出 ${manuscriptChapters.length}/${project.chapters.length} 章正文。` : "还没有可导出的正文。",
    ),
    item(
      "chapter-cards",
      "章节卡",
      chapterCards.length >= Math.min(3, project.chapters.length) && project.chapters.length > 0 ? "pass" : "risk",
      project.chapters.length > 0 ? `章节卡完整 ${chapterCards.length}/${project.chapters.length} 章。` : "章节卡为空，后续审稿和续写会缺上下文。",
    ),
    item(
      "outline",
      "大纲树",
      outlineNodes.length >= 3 ? "pass" : "todo",
      outlineNodes.length >= 3 ? `已有 ${outlineNodes.length} 个大纲节点。` : "大纲树太薄，至少补根设定、主线和章节节点。",
    ),
    item(
      "characters",
      "人物弧光",
      hasCoreCharacterArc ? "pass" : characters.length > 0 ? "risk" : "todo",
      hasCoreCharacterArc ? "至少 1 个角色具备欲望、缺陷和弧光起终点。" : characters.length > 0 ? "有人物，但弧光字段不足。" : "还没有人物设定。",
    ),
    item(
      "world",
      "世界观/设定",
      worldEntries.length > 0 ? "pass" : "risk",
      worldEntries.length > 0 ? `已有 ${worldEntries.length} 条设定。` : "没有世界观/设定，长篇资料包会显得空。",
    ),
    item(
      "foreshadows",
      "伏笔表",
      foreshadows.length > 0 || plotThreads.length > 0 ? "pass" : "risk",
      foreshadows.length > 0 ? `已有 ${foreshadows.length} 条伏笔。` : plotThreads.length > 0 ? `已有 ${plotThreads.length} 条故事线。` : "没有伏笔或故事线记录，后期回收风险高。",
    ),
  ];

  const passCount = items.filter((entry) => entry.status === "pass").length;
  const todoCount = items.filter((entry) => entry.status === "todo").length;
  const riskCount = items.filter((entry) => entry.status === "risk").length;
  const readinessPercent = Math.round((passCount / items.length) * 100);
  const status: ExportPackageReadinessStatus = todoCount > 0 ? "blocked" : riskCount > 0 ? "warning" : "ready";
  const label = status === "ready" ? "资料包可交付" : status === "warning" ? "可导出但需补强" : "暂不建议交付";
  const firstOpen = items.find((entry) => entry.status !== "pass");
  const nextAction = firstOpen
    ? `先补「${firstOpen.label}」：${firstOpen.detail}`
    : "可以导出完整资料包，并同步保存一个投稿前备份。";

  return {
    status,
    label,
    readinessPercent,
    nextAction,
    items,
    passCount,
    todoCount,
    riskCount,
  };
}

export function exportProjectMarkdown(project: ExportProject): string {
  const chapters = sortedChapters(project);
  const chapterLines = chapters.flatMap((chapter) => [
    `## 第 ${chapter.order} 章 ${chapter.title}`,
    "",
    chapter.goal || chapter.hook || chapter.conflict || chapter.valueShift || chapter.cliffhanger ? [
      bullet("章节目标", chapter.goal),
      bullet("开头钩子", chapter.hook),
      bullet("冲突", chapter.conflict),
      bullet("价值变化", chapter.valueShift),
      bullet("章末悬念", chapter.cliffhanger),
      "",
    ].join("\n") : "",
    chapter.content.trim(),
    "",
  ]);

  return [
    `# ${project.title}`,
    "",
    ...section("作品信息", projectMetadata(project)),
    ...section("大纲树", exportOutline(project.outlineNodes)),
    ...section("人物设定", characterMarkdownLines(project)),
    ...section("世界观/设定", worldMarkdownLines(project)),
    ...section("伏笔表", foreshadowMarkdownLines(project, chapters)),
    ...section("故事线", threadMarkdownLines(project)),
    "## 正文",
    "",
    ...chapterLines,
  ].join("\n");
}

export function exportProjectOutlineMarkdown(project: ExportProject): string {
  return [
    `# ${project.title} 大纲包`,
    "",
    ...section("作品信息", projectMetadata(project)),
    ...section("大纲树", exportOutline(project.outlineNodes)),
  ].join("\n");
}

export function exportProjectCharacterForeshadowMarkdown(project: ExportProject): string {
  const chapters = sortedChapters(project);
  return [
    `# ${project.title} 人物伏笔包`,
    "",
    ...section("作品信息", projectMetadata(project)),
    ...section("人物设定", characterMarkdownLines(project)),
    ...section("伏笔表", foreshadowMarkdownLines(project, chapters)),
    ...section("故事线", threadMarkdownLines(project)),
  ].join("\n");
}

export function exportProjectMarkdownByMode(project: ExportProject, mode: ExportMarkdownMode = "full"): string {
  if (mode === "outline") return exportProjectOutlineMarkdown(project);
  if (mode === "characters") return exportProjectCharacterForeshadowMarkdown(project);
  return exportProjectMarkdown(project);
}

export function exportMarkdownFileSuffix(mode: ExportMarkdownMode = "full") {
  if (mode === "outline") return "大纲包";
  if (mode === "characters") return "人物伏笔包";
  return "完整资料包";
}
