import type { PlatformProfile } from "../platforms/platformProfiles.ts";
import { platformProfiles, type PlatformId } from "../platforms/platformProfiles.ts";
import { publishRepairTaskSource } from "./publishRepairActionExecution.ts";
import type { SubmissionChecklist } from "./submissionChecklist.ts";
import { buildSubmissionPackage, type SubmissionPackage, type SubmissionPackageChapter } from "./submissionPackage.ts";

export interface PublishExportProject {
  title: string;
  genre: string;
  sellingPoint: string;
  currentWordCount: number;
  targetWordCount: number;
}

export interface PublishExportChapter extends SubmissionPackageChapter {
  id: string;
  status: string;
}

export interface PublishExportAiTask {
  id?: string;
  chapterId: string | null;
  taskType: string;
  status: string;
  outputText: string | null;
  inputSnapshot?: string;
  errorMessage?: string | null;
  model?: string;
  createdAt: Date | string;
}

export type PublishRepairActionKind =
  | "edit_chapter"
  | "run_chapter_review"
  | "run_second_pass"
  | "open_submission_package"
  | "add_publish_chapters";

export interface PublishRepairAction {
  id: string;
  kind: PublishRepairActionKind;
  priority: "high" | "medium" | "low";
  label: string;
  detail: string;
  chapterId?: string;
  chapterTitle?: string;
}

export interface PublishRepairHistoryItem {
  id: string;
  actionKind: PublishRepairActionKind;
  label: string;
  chapterId: string | null;
  chapterTitle: string;
  status: string;
  score: number | null;
  shouldSecondPass: boolean | null;
  message: string;
  createdAt: Date | string;
}

export interface PublishRepairPathStep {
  id: string;
  kind: PublishRepairActionKind;
  priority: PublishRepairAction["priority"];
  label: string;
  detail: string;
  executable: boolean;
  chapterId?: string;
  chapterTitle?: string;
}

export interface PublishRepairPathGroup {
  kind: PublishRepairActionKind;
  label: string;
  count: number;
  executableCount: number;
  manualCount: number;
  chapterTitles: string[];
}

export interface PublishRepairPath {
  status: "ready" | "needs_repair";
  headline: string;
  nextStep: PublishRepairPathStep | null;
  totalActions: number;
  executableActions: number;
  manualActions: number;
  affectedChapters: number;
  blockedCount: number;
  warningCount: number;
  groups: PublishRepairPathGroup[];
}

export interface PublishPackageVersionItem {
  id: string;
  platformId: string;
  platformName: string;
  title: string;
  action: string;
  chapterCount: number;
  wordCount: number;
  preflightScore: number;
  canExport: boolean;
  createdAt: Date | string;
}

export type PublishPackageVersionActionFilter = "all" | "copy" | "download" | "archive" | "snapshot";

export interface PublishPackageSnapshotDetail extends PublishPackageVersionItem {
  logline: string;
  synopsis: string;
  tags: string[];
  markdown: string;
}

export interface PublishPackageArchiveGroupPlatform {
  id: string;
  platformId: string;
  platformName: string;
  chapterCount: number;
  wordCount: number;
  preflightScore: number;
  canExport: boolean;
}

export interface PublishPackageArchiveGroup {
  createdAt: Date | string;
  platformCount: number;
  totalWordCount: number;
  platforms: PublishPackageArchiveGroupPlatform[];
}

export interface PublishPackageVersionComparisonItem {
  label: string;
  current: string;
  version: string;
  changed: boolean;
}

export interface PublishPackageVersionComparison {
  changedCount: number;
  items: PublishPackageVersionComparisonItem[];
}

export interface PlatformPublishExportInput {
  project: PublishExportProject;
  chapters: PublishExportChapter[];
  aiTasks?: PublishExportAiTask[];
  publishSnapshots?: PublishPackageVersionItem[];
  submissionChecklist?: SubmissionChecklist;
  targetPlatform: PlatformProfile;
  platforms?: PlatformProfile[];
}

export interface PublishPreflight {
  score: number;
  canExport: boolean;
  passed: string[];
  blocked: string[];
  warnings: string[];
  repairActions: PublishRepairAction[];
}

export interface PlatformPublishChapter {
  id: string;
  order: number;
  title: string;
  formattedTitle: string;
  wordCount: number;
  status: string;
  ready: boolean;
  preflight: PublishPreflight;
  repairActions: PublishRepairAction[];
  body: string;
  warnings: string[];
}

export interface PlatformPublishPackage {
  platformId: PlatformId;
  platformName: string;
  category: PlatformProfile["category"];
  title: string;
  logline: string;
  synopsis: string;
  tags: string[];
  publishNote: string;
  chapters: PlatformPublishChapter[];
  preflight: PublishPreflight;
  canExport: boolean;
  repairActions: PublishRepairAction[];
  repairPath: PublishRepairPath;
  repairHistory: PublishRepairHistoryItem[];
  publishVersions: PublishPackageVersionItem[];
  warnings: string[];
  markdown: string;
}

export interface PlatformPublishWorkspaceAction extends PublishRepairAction {
  platformIds: PlatformId[];
  platformNames: string[];
  occurrenceCount: number;
}

export interface PlatformPublishWorkspace {
  readyPlatforms: number;
  blockedPlatforms: number;
  averagePreflightScore: number;
  totalBlockedItems: number;
  totalWarnings: number;
  executableActions: number;
  manualActions: number;
  archiveReady: boolean;
  nextActions: PlatformPublishWorkspaceAction[];
  headline: string;
}

export interface PlatformPublishExportCenter {
  packages: PlatformPublishPackage[];
  recommendedPlatformId: PlatformId;
  totalPublishableChapters: number;
  workspace: PlatformPublishWorkspace;
}

export interface PlatformPublishArchivePlatform {
  platformId: string;
  platformName: string;
  canExport: boolean;
  fileName: string;
  chapterCount: number;
  wordCount: number;
  preflightScore: number;
  blocked: string[];
  warnings: string[];
}

export interface PlatformPublishArchive {
  readyCount: number;
  blockedCount: number;
  totalChapterCount: number;
  totalWordCount: number;
  platforms: PlatformPublishArchivePlatform[];
  markdown: string;
}

function formatCompareValue(value: string | number | boolean | string[]) {
  if (Array.isArray(value)) return value.length ? value.join("、") : "无";
  if (typeof value === "boolean") return value ? "允许导出" : "暂不允许";
  return String(value);
}

export function parsePublishSnapshotTags(tags: string | string[] | null | undefined) {
  if (Array.isArray(tags)) return tags;
  if (!tags) return [];
  try {
    const parsed = JSON.parse(tags) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function normalizePublishPackageVersionAction(action: string): PublishPackageVersionActionFilter {
  if (action === "copy" || action === "download" || action === "archive" || action === "snapshot") return action;
  return "snapshot";
}

export function filterPublishPackageVersions(
  versions: PublishPackageVersionItem[],
  action: PublishPackageVersionActionFilter,
) {
  if (action === "all") return versions;
  return versions.filter((version) => normalizePublishPackageVersionAction(version.action) === action);
}

export function countPublishPackageVersionActions(versions: PublishPackageVersionItem[]) {
  const counts: Record<PublishPackageVersionActionFilter, number> = {
    all: versions.length,
    copy: 0,
    download: 0,
    archive: 0,
    snapshot: 0,
  };
  versions.forEach((version) => {
    counts[normalizePublishPackageVersionAction(version.action)] += 1;
  });
  return counts;
}

export function buildPublishPackageVersionComparison(
  version: PublishPackageSnapshotDetail,
  current: PlatformPublishPackage,
): PublishPackageVersionComparison {
  const currentWordCount = current.chapters.reduce((sum, chapter) => sum + chapter.wordCount, 0);
  const pairs = [
    ["书名", current.title, version.title],
    ["一句话卖点", current.logline, version.logline],
    ["简介", current.synopsis, version.synopsis],
    ["标签", current.tags, version.tags],
    ["章节数", current.chapters.length, version.chapterCount],
    ["字数", currentWordCount, version.wordCount],
    ["质检分", current.preflight.score, version.preflightScore],
    ["导出状态", current.canExport, version.canExport],
  ] as const;
  const items = pairs.map(([label, currentValue, versionValue]) => {
    const currentText = formatCompareValue(currentValue);
    const versionText = formatCompareValue(versionValue);
    return {
      label,
      current: currentText,
      version: versionText,
      changed: currentText !== versionText,
    };
  });

  return {
    changedCount: items.filter((item) => item.changed).length,
    items,
  };
}

function compact(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function safeFileName(input: string) {
  return input
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function markdownTableCell(input: string) {
  return input.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function latestTask(tasks: PublishExportAiTask[], chapterId: string, taskType: string) {
  return tasks
    .filter((task) => task.chapterId === chapterId && task.taskType === taskType)
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0];
}

function parseReviewDecision(task: PublishExportAiTask | undefined) {
  if (!task || task.status !== "succeeded" || !task.outputText) return null;
  try {
    const parsed = JSON.parse(task.outputText) as { score?: number; shouldSecondPass?: boolean };
    const score = typeof parsed.score === "number" ? parsed.score : null;
    const shouldSecondPass = typeof parsed.shouldSecondPass === "boolean"
      ? parsed.shouldSecondPass
      : score === null || score < 85;
    return { score, shouldSecondPass };
  } catch {
    return null;
  }
}

function parseJsonObject(text: string | null | undefined) {
  if (!text) return null;
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function preflightScore(blocked: string[], warnings: string[]) {
  return Math.max(0, Math.min(100, 100 - blocked.length * 22 - warnings.length * 6));
}

function chapterAction(
  chapter: PublishExportChapter,
  kind: PublishRepairActionKind,
  label: string,
  detail: string,
  priority: PublishRepairAction["priority"] = "high",
): PublishRepairAction {
  return {
    id: `${chapter.id}-${kind}`,
    kind,
    priority,
    label,
    detail,
    chapterId: chapter.id,
    chapterTitle: chapter.title,
  };
}

function publishableChapters(chapters: PublishExportChapter[]) {
  return chapters
    .filter((chapter) => compact(chapter.content).length > 0)
    .sort((left, right) => left.order - right.order || left.title.localeCompare(right.title));
}

function titleForPlatform(chapter: PublishExportChapter, platform: PlatformProfile) {
  if (platform.category === "overseas") return `Chapter ${chapter.order}: ${chapter.title}`;
  if (platform.id === "zhihu_yanxuan") return `${chapter.title}`;
  return `第 ${chapter.order} 章 ${chapter.title}`;
}

function formatBody(chapter: PublishExportChapter, platform: PlatformProfile) {
  const body = chapter.content.trim();
  if (platform.category === "overseas") {
    return [
      titleForPlatform(chapter, platform),
      "",
      body,
      "",
      `Author note: This chapter is positioned around ${platform.reviewFocus.slice(0, 3).join(", ")}.`,
    ].join("\n");
  }
  if (platform.id === "zhihu_yanxuan") {
    return [
      titleForPlatform(chapter, platform),
      "",
      body,
      "",
      "付费期待：本章结尾必须留下反转或情绪回收问题。",
    ].join("\n");
  }
  return [
    titleForPlatform(chapter, platform),
    "",
    body,
    "",
    `章末检查：${chapter.cliffhanger || platform.reviewFocus[0] || "保留追读问题"}`,
  ].join("\n");
}

function chapterWarnings(chapter: PublishExportChapter, platform: PlatformProfile) {
  const warnings: string[] = [];
  if (chapter.wordCount <= 0) warnings.push("正文为空。");
  if (!chapter.hook.trim()) warnings.push("缺少开头钩子。");
  if (!chapter.cliffhanger.trim()) warnings.push("缺少章末悬念。");
  if (platform.category === "free" && chapter.wordCount < 1200) warnings.push("免费平台章节偏短，可能影响节奏和广告收益。");
  if (platform.category === "paid" && chapter.wordCount < 2000) warnings.push("付费订阅平台章节偏短，建议补足信息量。");
  if (platform.category === "overseas" && /[。！？]/.test(chapter.content)) warnings.push("海外平台发布前建议人工英文化，不要直接硬翻。");
  return warnings;
}

function buildChapterPreflight(
  chapter: PublishExportChapter,
  platform: PlatformProfile,
  tasks: PublishExportAiTask[],
  warnings: string[],
): PublishPreflight {
  const blocked: string[] = [];
  const passed: string[] = [];
  const softWarnings = [...warnings];
  const repairActions: PublishRepairAction[] = [];
  const reviewDecision = parseReviewDecision(latestTask(tasks, chapter.id, "chapter_review"));

  if (compact(chapter.content).length > 0 && chapter.wordCount > 0) passed.push("正文已生成");
  else {
    blocked.push("正文为空，不能发布。");
    repairActions.push(chapterAction(
      chapter,
      "edit_chapter",
      "补正文或生成初稿",
      "进入章节工作台补正文，再重新审稿。",
    ));
  }
  if (chapter.hook.trim()) passed.push("开头钩子已填写");
  else {
    blocked.push("缺少开头钩子。");
    repairActions.push(chapterAction(
      chapter,
      "edit_chapter",
      "补开头钩子",
      "进入章节编辑区补强第一屏抓人点。",
    ));
  }
  if (chapter.cliffhanger.trim()) passed.push("章末悬念已填写");
  else {
    blocked.push("缺少章末悬念。");
    repairActions.push(chapterAction(
      chapter,
      "edit_chapter",
      "补章末悬念",
      "进入章节编辑区补下一章追读问题。",
    ));
  }
  if (reviewDecision && !reviewDecision.shouldSecondPass) {
    passed.push(`最新平台复检 ${reviewDecision.score ?? "--"} 分`);
  } else if (reviewDecision?.shouldSecondPass) {
    blocked.push(`最新平台复检 ${reviewDecision.score ?? "--"} 分，仍要求二改。`);
    repairActions.push(chapterAction(
      chapter,
      "run_second_pass",
      "执行二改",
      "进入二改工作台按平台问题重写，并让系统自动复检。",
    ));
  } else {
    blocked.push("缺少通过的审稿/复检记录。");
    repairActions.push(chapterAction(
      chapter,
      "run_chapter_review",
      "补章节审稿",
      "进入章节工作台运行审稿，拿到通过的复检记录。",
    ));
  }
  if (platform.category === "overseas") softWarnings.push("海外平台发布前建议人工英文化终稿。");

  return {
    score: preflightScore(blocked, softWarnings),
    canExport: blocked.length === 0,
    passed,
    blocked,
    warnings: softWarnings,
    repairActions: dedupeRepairActions(repairActions),
  };
}

function buildPublishNote(platform: PlatformProfile, submissionPackage: SubmissionPackage) {
  if (platform.category === "overseas") {
    return [
      `Use the overseas synopsis first: ${submissionPackage.overseasSynopsis}`,
      `Focus before posting: ${platform.reviewFocus.join(", ")}.`,
      `Risk check: ${platform.risks.join(", ")}.`,
    ].join("\n");
  }
  return [
    `发布前先核对：${platform.reviewFocus.join("、")}。`,
    `平台风险：${platform.risks.join("、")}。`,
    `简介建议：${submissionPackage.synopsis}`,
  ].join("\n");
}

function buildPackageWarnings(platform: PlatformProfile, chapters: PlatformPublishChapter[], checklist?: SubmissionChecklist) {
  const warnings: string[] = [];
  if (chapters.length === 0) warnings.push("没有可导出的正文章节。");
  if (chapters.some((chapter) => !chapter.ready)) warnings.push("存在未完全就绪章节，发布前先补钩子、正文或章末悬念。");
  if (checklist && checklist.readinessPercent < 80) warnings.push(`投稿资料准备度 ${checklist.readinessPercent}%，低于发布门槛。`);
  if (platform.id === "qidian" && chapters.length < 3) warnings.push("起点投稿建议至少准备前三章和长期主线期待。");
  if (platform.id === "fanqie" && chapters.length < 8) warnings.push("番茄首秀前建议继续储备章节，减少断更风险。");
  if (platform.id === "zhihu_yanxuan" && chapters.reduce((sum, chapter) => sum + chapter.wordCount, 0) < 1000) warnings.push("知乎盐选短篇至少准备 1000 字以上的付费期待。");
  if (platform.category === "overseas") warnings.push("海外平台发布前建议补英文标题、英文简介和英文正文润色。");
  return warnings;
}

function buildPackagePreflight(chapters: PlatformPublishChapter[], warnings: string[], checklist?: SubmissionChecklist): PublishPreflight {
  const blocked: string[] = [];
  const passed: string[] = [];
  const repairActions: PublishRepairAction[] = [];

  if (chapters.length > 0) passed.push(`已准备 ${chapters.length} 章正文`);
  else {
    blocked.push("没有可导出的正文章节。");
    repairActions.push({
      id: "add-publish-chapters",
      kind: "add_publish_chapters",
      priority: "high",
      label: "补可发布章节",
      detail: "先创建或生成至少一章正文，再回到发布质检。",
    });
  }
  const blockedChapters = chapters.filter((chapter) => !chapter.preflight.canExport);
  if (blockedChapters.length === 0 && chapters.length > 0) passed.push("全部章节通过发布前质检");
  if (blockedChapters.length > 0) {
    blocked.push(`${blockedChapters.length} 章未通过发布前质检。`);
    repairActions.push(...blockedChapters.flatMap((chapter) => chapter.repairActions));
  }
  if (checklist) {
    if (checklist.readinessPercent >= 80) passed.push(`投稿资料准备度 ${checklist.readinessPercent}%`);
    else {
      blocked.push(`投稿资料准备度 ${checklist.readinessPercent}%，低于 80%。`);
      repairActions.push({
        id: "open-submission-package",
        kind: "open_submission_package",
        priority: "high",
        label: "补投稿资料",
        detail: "处理投稿清单里的待办项，让准备度达到 80% 以上。",
      });
    }
  }

  return {
    score: preflightScore(blocked, warnings),
    canExport: blocked.length === 0,
    passed,
    blocked,
    warnings,
    repairActions: dedupeRepairActions(repairActions),
  };
}

function dedupeRepairActions(actions: PublishRepairAction[]) {
  const seen = new Set<string>();
  return actions.filter((action) => {
    const key = `${action.kind}-${action.chapterId ?? "project"}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function repairLabel(kind: PublishRepairActionKind) {
  const labels: Record<PublishRepairActionKind, string> = {
    edit_chapter: "编辑章节",
    run_chapter_review: "补章节审稿",
    run_second_pass: "执行二改",
    open_submission_package: "补投稿资料",
    add_publish_chapters: "补可发布章节",
  };
  return labels[kind];
}

function canExecuteRepairAction(action: PublishRepairAction) {
  return (action.kind === "run_chapter_review" || action.kind === "run_second_pass") && Boolean(action.chapterId);
}

function repairActionRank(action: PublishRepairAction) {
  const priorityRank: Record<PublishRepairAction["priority"], number> = {
    high: 0,
    medium: 1,
    low: 2,
  };
  const kindRank: Record<PublishRepairActionKind, number> = {
    add_publish_chapters: 0,
    edit_chapter: 1,
    run_second_pass: 2,
    run_chapter_review: 3,
    open_submission_package: 4,
  };
  return priorityRank[action.priority] * 10 + kindRank[action.kind];
}

function workspaceActionKey(action: PublishRepairAction) {
  return `${action.kind}-${action.chapterId ?? "project"}`;
}

function buildPublishWorkspace(packages: PlatformPublishPackage[]): PlatformPublishWorkspace {
  const actions = new Map<string, PlatformPublishWorkspaceAction>();
  for (const pack of packages) {
    for (const action of pack.repairActions) {
      const key = workspaceActionKey(action);
      const current = actions.get(key);
      if (current) {
        if (!current.platformIds.includes(pack.platformId)) current.platformIds.push(pack.platformId);
        if (!current.platformNames.includes(pack.platformName)) current.platformNames.push(pack.platformName);
        current.occurrenceCount += 1;
      } else {
        actions.set(key, {
          ...action,
          platformIds: [pack.platformId],
          platformNames: [pack.platformName],
          occurrenceCount: 1,
        });
      }
    }
  }
  const nextActions = [...actions.values()]
    .sort((left, right) => (
      repairActionRank(left) - repairActionRank(right)
      || right.occurrenceCount - left.occurrenceCount
      || left.label.localeCompare(right.label)
    ));
  const readyPlatforms = packages.filter((pack) => pack.canExport).length;
  const blockedPlatforms = packages.length - readyPlatforms;
  const averagePreflightScore = packages.length
    ? Math.round(packages.reduce((sum, pack) => sum + pack.preflight.score, 0) / packages.length)
    : 0;
  const executableActions = nextActions.filter(canExecuteRepairAction).length;
  const manualActions = nextActions.length - executableActions;

  return {
    readyPlatforms,
    blockedPlatforms,
    averagePreflightScore,
    totalBlockedItems: packages.reduce((sum, pack) => sum + pack.preflight.blocked.length, 0),
    totalWarnings: packages.reduce((sum, pack) => sum + pack.preflight.warnings.length, 0),
    executableActions,
    manualActions,
    archiveReady: readyPlatforms > 0,
    nextActions,
    headline: blockedPlatforms === 0
      ? "所有平台已通过当前质检，可以下载全平台投稿包。"
      : `还有 ${blockedPlatforms} 个平台待处理，优先清理 ${executableActions} 个可自动执行动作。`,
  };
}

function buildRepairPath(preflight: PublishPreflight): PublishRepairPath {
  const sortedActions = [...preflight.repairActions].sort((left, right) => (
    repairActionRank(left) - repairActionRank(right)
    || (left.chapterTitle ?? "").localeCompare(right.chapterTitle ?? "")
    || left.label.localeCompare(right.label)
  ));
  const steps = sortedActions.map((action): PublishRepairPathStep => ({
    id: action.id,
    kind: action.kind,
    priority: action.priority,
    label: action.label,
    detail: action.detail,
    executable: canExecuteRepairAction(action),
    chapterId: action.chapterId,
    chapterTitle: action.chapterTitle,
  }));
  const groups = Array.from(steps.reduce((map, step) => {
    const current = map.get(step.kind) ?? {
      kind: step.kind,
      label: repairLabel(step.kind),
      count: 0,
      executableCount: 0,
      manualCount: 0,
      chapterTitles: [],
    };
    current.count += 1;
    if (step.executable) current.executableCount += 1;
    else current.manualCount += 1;
    if (step.chapterTitle && !current.chapterTitles.includes(step.chapterTitle)) {
      current.chapterTitles.push(step.chapterTitle);
    }
    map.set(step.kind, current);
    return map;
  }, new Map<PublishRepairActionKind, PublishRepairPathGroup>()).values())
    .sort((left, right) => repairActionRank({ id: left.kind, kind: left.kind, priority: "high", label: left.label, detail: "" })
      - repairActionRank({ id: right.kind, kind: right.kind, priority: "high", label: right.label, detail: "" }));
  const affectedChapters = new Set(steps.map((step) => step.chapterId).filter((chapterId): chapterId is string => Boolean(chapterId))).size;
  const executableActions = steps.filter((step) => step.executable).length;
  const manualActions = steps.length - executableActions;

  if (preflight.canExport) {
    return {
      status: "ready",
      headline: "当前发布包已通过质检，可以复制、下载或加入全平台归档。",
      nextStep: null,
      totalActions: 0,
      executableActions: 0,
      manualActions: 0,
      affectedChapters: 0,
      blockedCount: preflight.blocked.length,
      warningCount: preflight.warnings.length,
      groups: [],
    };
  }

  return {
    status: "needs_repair",
    headline: steps[0]
      ? `先处理：${steps[0].label}${steps[0].chapterTitle ? `（${steps[0].chapterTitle}）` : ""}`
      : "先补齐阻塞项，再回到发布前质检。",
    nextStep: steps[0] ?? null,
    totalActions: steps.length,
    executableActions,
    manualActions,
    affectedChapters,
    blockedCount: preflight.blocked.length,
    warningCount: preflight.warnings.length,
    groups,
  };
}

function buildRepairHistory(tasks: PublishExportAiTask[], chapters: PublishExportChapter[]): PublishRepairHistoryItem[] {
  const chapterTitles = new Map(chapters.map((chapter) => [chapter.id, chapter.title]));
  const auditBySecondPassTaskId = new Map<string, { score: number | null; shouldSecondPass: boolean | null }>();

  tasks.forEach((task) => {
    const snapshot = parseJsonObject(task.inputSnapshot);
    const secondPassTaskId = typeof snapshot?.secondPassTaskId === "string" ? snapshot.secondPassTaskId : null;
    if (task.taskType === "chapter_review" && secondPassTaskId) {
      const decision = parseReviewDecision(task);
      auditBySecondPassTaskId.set(secondPassTaskId, {
        score: decision?.score ?? null,
        shouldSecondPass: decision?.shouldSecondPass ?? null,
      });
    }
  });

  return tasks
    .map((task) => {
      const snapshot = parseJsonObject(task.inputSnapshot);
      if (snapshot?.source !== publishRepairTaskSource) return null;
      const actionKind = typeof snapshot.actionKind === "string" ? snapshot.actionKind as PublishRepairActionKind : null;
      if (!actionKind) return null;
      const actionLabel = typeof snapshot.actionLabel === "string" && snapshot.actionLabel.trim()
        ? snapshot.actionLabel
        : repairLabel(actionKind);
      const chapterTitle = typeof snapshot.chapterTitle === "string" && snapshot.chapterTitle.trim()
        ? snapshot.chapterTitle
        : task.chapterId ? chapterTitles.get(task.chapterId) ?? "未命名章节" : "项目资料";
      const decision = task.taskType === "chapter_review"
        ? parseReviewDecision(task)
        : auditBySecondPassTaskId.get(task.id ?? "");
      const score = decision?.score ?? null;
      const shouldSecondPass = decision?.shouldSecondPass ?? null;
      const statusLabel = task.status === "succeeded" ? "成功" : task.status === "failed" ? "失败" : task.status;
      const message = task.status === "failed"
        ? task.errorMessage ?? "执行失败。"
        : score !== null
          ? `复检 ${score} 分${shouldSecondPass ? "，仍需继续处理。" : "，已通过当前检查。"}`
          : "已完成修复动作。";

      return {
        id: task.id ?? `${actionKind}-${task.chapterId ?? "project"}-${new Date(task.createdAt).getTime()}`,
        actionKind,
        label: actionLabel,
        chapterId: task.chapterId,
        chapterTitle,
        status: statusLabel,
        score,
        shouldSecondPass,
        message,
        createdAt: task.createdAt,
      };
    })
    .filter((item): item is PublishRepairHistoryItem => Boolean(item))
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 6);
}

function buildMarkdown(pack: Omit<PlatformPublishPackage, "markdown">) {
  return [
    `# ${pack.platformName} 发布包`,
    "",
    "## 书名",
    pack.title,
    "",
    "## 一句话卖点",
    pack.logline,
    "",
    "## 简介",
    pack.synopsis,
    "",
    "## 标签",
    pack.tags.join("、"),
    "",
    "## 发布说明",
    pack.publishNote,
    "",
    "## 发布前质检",
    `质检分：${pack.preflight.score}`,
    `导出状态：${pack.canExport ? "允许导出" : "暂不允许导出"}`,
    ...(pack.preflight.blocked.length ? pack.preflight.blocked.map((item) => `- 阻塞：${item}`) : ["- 阻塞：无"]),
    ...(pack.preflight.warnings.length ? pack.preflight.warnings.map((item) => `- 提醒：${item}`) : ["- 提醒：无"]),
    ...(pack.repairActions.length ? [
      "",
      "## 修复路径",
      pack.repairPath.headline,
      `- 阻塞项：${pack.repairPath.blockedCount}`,
      `- 可一键处理：${pack.repairPath.executableActions}`,
      `- 需要手动处理：${pack.repairPath.manualActions}`,
      `- 影响章节：${pack.repairPath.affectedChapters}`,
      ...pack.repairPath.groups.map((group) => `- ${group.label}：${group.count} 项`),
      "",
      "## 修复动作",
      ...pack.repairActions.map((action) => `- ${action.label}：${action.detail}`),
    ] : []),
    ...(pack.repairHistory.length ? ["", "## 最近修复记录", ...pack.repairHistory.map((item) => `- ${item.label}｜${item.chapterTitle}｜${item.status}｜${item.message}`)] : []),
    "",
    "## 风险提醒",
    ...(pack.warnings.length ? pack.warnings.map((warning) => `- ${warning}`) : ["- 暂无明显风险。"]),
    "",
    "## 章节正文",
    ...pack.chapters.flatMap((chapter) => [
      `### ${chapter.formattedTitle}`,
      "",
      chapter.body,
      "",
      chapter.warnings.length ? `章节风险：${chapter.warnings.join("；")}` : "章节风险：暂无明显风险。",
      "",
    ]),
  ].join("\n");
}

function buildPlatformPackage(
  input: PlatformPublishExportInput,
  platform: PlatformProfile,
): PlatformPublishPackage {
  const submissionPackage = buildSubmissionPackage({
    title: input.project.title,
    genre: input.project.genre,
    sellingPoint: input.project.sellingPoint,
    currentWordCount: input.project.currentWordCount,
    targetWordCount: input.project.targetWordCount,
    platform,
    chapters: input.chapters,
  });
  const chapters = publishableChapters(input.chapters).map((chapter) => {
    const warnings = chapterWarnings(chapter, platform);
    const preflight = buildChapterPreflight(chapter, platform, input.aiTasks ?? [], warnings);
    return {
      id: chapter.id,
      order: chapter.order,
      title: chapter.title,
      formattedTitle: titleForPlatform(chapter, platform),
      wordCount: chapter.wordCount,
      status: chapter.status,
      ready: preflight.canExport,
      preflight,
      repairActions: preflight.repairActions,
      body: formatBody(chapter, platform),
      warnings,
    };
  });
  const warnings = buildPackageWarnings(platform, chapters, input.submissionChecklist);
  const preflight = buildPackagePreflight(chapters, warnings, input.submissionChecklist);
  const repairPath = buildRepairPath(preflight);
  const repairHistory = buildRepairHistory(input.aiTasks ?? [], input.chapters);
  const publishVersions = (input.publishSnapshots ?? [])
    .filter((snapshot) => snapshot.platformId === platform.id)
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 5);
  const packWithoutMarkdown = {
    platformId: platform.id,
    platformName: platform.name,
    category: platform.category,
    title: input.project.title,
    logline: submissionPackage.logline,
    synopsis: platform.category === "overseas" ? submissionPackage.overseasSynopsis : submissionPackage.synopsis,
    tags: submissionPackage.tags,
    publishNote: buildPublishNote(platform, submissionPackage),
    chapters,
    preflight,
    canExport: preflight.canExport,
    repairActions: preflight.repairActions,
    repairPath,
    repairHistory,
    publishVersions,
    warnings,
  };

  return {
    ...packWithoutMarkdown,
    markdown: buildMarkdown(packWithoutMarkdown),
  };
}

export function buildPlatformPublishExportCenter(input: PlatformPublishExportInput): PlatformPublishExportCenter {
  const platforms = input.platforms ?? platformProfiles;
  const packages = platforms.map((platform) => buildPlatformPackage(input, platform));

  return {
    packages,
    recommendedPlatformId: input.targetPlatform.id,
    totalPublishableChapters: publishableChapters(input.chapters).length,
    workspace: buildPublishWorkspace(packages),
  };
}

export function buildPlatformPublishArchive(
  center: PlatformPublishExportCenter,
  projectTitle: string,
  generatedAt: Date | string = new Date(),
): PlatformPublishArchive {
  const platforms = center.packages.map((pack) => {
    const wordCount = pack.chapters.reduce((sum, chapter) => sum + chapter.wordCount, 0);
    return {
      platformId: pack.platformId,
      platformName: pack.platformName,
      canExport: pack.canExport,
      fileName: `${safeFileName(`${projectTitle}-${pack.platformName}-发布包`)}.md`,
      chapterCount: pack.chapters.length,
      wordCount,
      preflightScore: pack.preflight.score,
      blocked: pack.preflight.blocked,
      warnings: pack.warnings,
    };
  });
  const readyPlatforms = center.packages.filter((pack) => pack.canExport);
  const readyMeta = platforms.filter((platform) => platform.canExport);
  const generatedText = new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(generatedAt));
  const totalChapterCount = readyMeta.reduce((sum, platform) => sum + platform.chapterCount, 0);
  const totalWordCount = readyMeta.reduce((sum, platform) => sum + platform.wordCount, 0);
  const manifestRows = platforms.map((platform) => [
    platform.platformName,
    platform.canExport ? "可导出" : "需处理",
    String(platform.preflightScore),
    String(platform.chapterCount),
    String(platform.wordCount),
    platform.canExport ? platform.fileName : platform.blocked.join("；") || "暂无",
  ]);
  const markdown = [
    `# ${projectTitle} 全平台投稿包`,
    "",
    `生成时间：${generatedText}`,
    `可导出平台：${readyMeta.length}/${platforms.length}`,
    `归档章节合计：${totalChapterCount}`,
    `归档字数合计：${totalWordCount}`,
    "",
    "## 平台清单",
    "",
    "| 平台 | 状态 | 质检分 | 章节 | 字数 | 文件/阻塞项 |",
    "| --- | --- | ---: | ---: | ---: | --- |",
    ...manifestRows.map((row) => `| ${row.map(markdownTableCell).join(" | ")} |`),
    "",
    "## 已就绪平台正文",
    ...(readyPlatforms.length
      ? readyPlatforms.flatMap((pack) => {
        const meta = platforms.find((platform) => platform.platformId === pack.platformId);
        return [
          "",
          `### ${pack.platformName}`,
          "",
          `建议文件名：${meta?.fileName ?? `${pack.platformName}-发布包.md`}`,
          "",
          pack.markdown,
        ];
      })
      : ["", "暂无通过质检的平台发布包。"]),
    "",
    "## 待处理平台",
    ...(platforms.some((platform) => !platform.canExport)
      ? platforms
        .filter((platform) => !platform.canExport)
        .flatMap((platform) => [
          "",
          `### ${platform.platformName}`,
          ...(platform.blocked.length ? platform.blocked.map((item) => `- 阻塞：${item}`) : ["- 阻塞：暂无"]),
          ...(platform.warnings.length ? platform.warnings.slice(0, 4).map((item) => `- 提醒：${item}`) : []),
        ])
      : ["", "所有平台均已通过当前质检。"]),
  ].join("\n");

  return {
    readyCount: readyMeta.length,
    blockedCount: platforms.length - readyMeta.length,
    totalChapterCount,
    totalWordCount,
    platforms,
    markdown,
  };
}
