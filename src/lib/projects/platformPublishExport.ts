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

export type PublishPackageVersionActionFilter = "all" | "copy" | "download" | "archive" | "snapshot" | "restore";

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

export interface PublishPackageRestorePatch {
  title: string;
  sellingPoint: string;
  restoredFields: string[];
}

export interface PlatformSubmissionAssetInput {
  id?: string;
  platformId: string;
  platformName: string;
  title: string;
  logline: string;
  synopsis: string;
  overseasSynopsis: string;
  tags: string[];
  note: string;
  source: string;
  updatedAt?: Date | string;
}

export interface PlatformSubmissionAssetVersionInput extends PlatformSubmissionAssetInput {
  auditScore: number;
  auditStatus: PlatformSubmissionAssetAudit["status"];
  action: string;
  sourceTaskId?: string | null;
  strategy?: string;
  createdAt: Date | string;
}

export interface PlatformSubmissionAssetIssue {
  field: "title" | "logline" | "synopsis" | "overseasSynopsis" | "tags";
  severity: "blocker" | "warning";
  label: string;
  detail: string;
}

export interface PlatformSubmissionAssetAudit {
  score: number;
  status: "ready" | "needs_work" | "blocked";
  passed: string[];
  issues: PlatformSubmissionAssetIssue[];
}

export interface PlatformSubmissionAssetAdoptionSummary {
  generatedTasks: number;
  generatedVariants: number;
  adoptedVersions: number;
  adoptionRatePercent: number;
  bestAdoptedScore: number;
  recentStrategies: string[];
  verdict: string;
}

export interface PlatformPublishMetricInput {
  id?: string;
  platformId: string;
  platformName: string;
  views: number;
  clicks: number;
  favorites: number;
  follows: number;
  comments: number;
  paidReads: number;
  editorFeedback: string;
  contractStatus: string;
  publishUrl: string;
  notes: string;
  snapshotDate: Date | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface PlatformPublishEffectSummary {
  status: "empty" | "weak" | "watch" | "promising" | "signed";
  records: number;
  latest: PlatformPublishMetricInput | null;
  comparison: PlatformPublishEffectComparison;
  totalViews: number;
  totalClicks: number;
  totalFavorites: number;
  totalFollows: number;
  totalComments: number;
  totalPaidReads: number;
  clickRatePercent: number;
  favoriteRatePercent: number;
  followRatePercent: number;
  commentRatePercent: number;
  paidReadRatePercent: number;
  verdict: string;
  nextAction: string;
  history: PlatformPublishMetricInput[];
}

export interface PlatformPublishEffectComparison {
  status: "none" | "improved" | "declined" | "mixed" | "flat";
  previous: PlatformPublishMetricInput | null;
  current: PlatformPublishMetricInput | null;
  viewsDelta: number;
  clicksDelta: number;
  favoritesDelta: number;
  followsDelta: number;
  clickRateDeltaPercent: number;
  favoriteRateDeltaPercent: number;
  followRateDeltaPercent: number;
  verdict: string;
  wins: string[];
  losses: string[];
}

export interface PlatformPublishOptimizationAction {
  id: string;
  priority: "high" | "medium" | "low";
  area: "data" | "asset" | "opening" | "platform" | "cadence";
  execution: "generate_asset_variants" | "rewrite_first_three" | "open_target";
  label: string;
  detail: string;
  evidence: string;
  target: string;
  href: string;
}

export interface PlatformPublishEffectOptimization {
  status: "collect_data" | "urgent_rework" | "iterate" | "scale";
  headline: string;
  actions: PlatformPublishOptimizationAction[];
}

export interface PlatformPublishExportInput {
  project: PublishExportProject;
  chapters: PublishExportChapter[];
  aiTasks?: PublishExportAiTask[];
  publishSnapshots?: PublishPackageVersionItem[];
  submissionAssets?: PlatformSubmissionAssetInput[];
  submissionAssetVersions?: PlatformSubmissionAssetVersionInput[];
  platformPublishMetrics?: PlatformPublishMetricInput[];
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
  submissionAsset: (PlatformSubmissionAssetInput & { persisted: boolean }) | null;
  submissionAssetAudit: PlatformSubmissionAssetAudit;
  submissionAssetVersions: PlatformSubmissionAssetVersionInput[];
  submissionAssetAdoption: PlatformSubmissionAssetAdoptionSummary;
  publishEffect: PlatformPublishEffectSummary;
  effectOptimization: PlatformPublishEffectOptimization;
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

export interface PlatformStrategyRankItem {
  rank: number;
  platformId: PlatformId;
  platformName: string;
  score: number;
  recommendation: "focus" | "grow" | "watch" | "repair" | "avoid";
  reviewDecision: PlatformStrategyReviewDecision;
  verdict: string;
  nextAction: string;
  href: string;
  scores: {
    preflight: number;
    asset: number;
    effect: number;
    comparison: number;
    adoption: number;
  };
  reasons: string[];
  risks: string[];
}

export interface PlatformStrategyReviewDecision {
  kind: "scale" | "iterate" | "collect" | "repair" | "pivot";
  label: string;
  detail: string;
  action: string;
  tasks: PlatformStrategyReviewTask[];
}

export interface PlatformStrategyReviewTask {
  id: string;
  priority: "high" | "medium" | "low";
  execution: "open_target" | "generate_asset_variants" | "rewrite_first_three" | "save_snapshot" | "apply_strategy";
  label: string;
  detail: string;
  href: string;
}

export interface PlatformStrategySwitchStep {
  id: string;
  label: string;
  detail: string;
  status: "done" | "next" | "queued";
  executable: boolean;
  href: string;
}

export interface PlatformStrategyProgressSummary {
  status: "in_progress" | "complete";
  completedSteps: number;
  totalSteps: number;
  progressPercent: number;
  nextStepId: string | null;
  nextStepLabel: string;
  actionLabel: string;
  actionHref: string;
  bottleneck: string;
  verdict: string;
}

export interface PlatformStrategySwitchPlan {
  platformId: PlatformId;
  platformName: string;
  headline: string;
  previousPlatformId: PlatformId;
  previousPlatformName: string;
  recommendation: PlatformStrategyRankItem["recommendation"];
  score: number;
  progress: PlatformStrategyProgressSummary;
  steps: PlatformStrategySwitchStep[];
}

export interface PlatformStrategyExecutionReceipt {
  stepId: PlatformStrategySwitchStep["id"] | "adopt-submission-asset" | "save-publish-effect";
  platformId: PlatformId;
  platformName: string;
  title: string;
  message: string;
  nextAction: string;
  href: string;
  severity: "success" | "needs_action";
}

export interface PlatformPublishExportCenter {
  packages: PlatformPublishPackage[];
  recommendedPlatformId: PlatformId;
  totalPublishableChapters: number;
  workspace: PlatformPublishWorkspace;
  platformStrategy: PlatformStrategyRankItem[];
  activeStrategyPlan: PlatformStrategySwitchPlan | null;
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
  if (action === "copy" || action === "download" || action === "archive" || action === "snapshot" || action === "restore") return action;
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
    restore: 0,
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

export function buildPublishPackageRestorePatch(version: Pick<PublishPackageSnapshotDetail, "title" | "logline">): PublishPackageRestorePatch {
  return {
    title: version.title.trim(),
    sellingPoint: version.logline.trim(),
    restoredFields: ["title", "sellingPoint"],
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

function effectScore(effect: PlatformPublishEffectSummary) {
  if (effect.status === "signed") return 100;
  if (effect.status === "promising") return 82;
  if (effect.status === "watch") return effect.records ? 58 : 42;
  if (effect.status === "weak") return 24;
  return 36;
}

function comparisonScore(comparison: PlatformPublishEffectComparison) {
  if (comparison.status === "improved") return 88;
  if (comparison.status === "mixed") return 58;
  if (comparison.status === "flat") return 45;
  if (comparison.status === "declined") return 18;
  return 40;
}

function buildPlatformStrategyReviewDecision(
  pack: PlatformPublishPackage,
  recommendation: PlatformStrategyRankItem["recommendation"],
): PlatformStrategyReviewDecision {
  if (!pack.publishEffect.records) {
    return {
      kind: "collect",
      label: "先补数据",
      detail: "还没有真实发布数据，现在谈加码就是拍脑袋。",
      action: "先录入曝光、点击、收藏、追读和编辑反馈。",
      tasks: [
        {
          id: "record-first-publish-effect",
          priority: "high",
          execution: "open_target",
          label: "录入首轮数据",
          detail: "补齐曝光、点击、收藏、追读、评论和编辑反馈。",
          href: "#publish-effect-panel",
        },
        {
          id: "archive-current-submission",
          priority: "medium",
          execution: "save_snapshot",
          label: "归档当前版本",
          detail: "把当前投稿包存成版本，下一轮才知道改动有没有用。",
          href: "#package-version-history",
        },
        {
          id: "check-platform-asset",
          priority: pack.submissionAssetAudit.status === "ready" ? "low" : "medium",
          execution: pack.submissionAssetAudit.status === "ready" ? "open_target" : "generate_asset_variants",
          label: "检查投稿资产",
          detail: pack.submissionAssetAudit.status === "ready"
            ? "标题、简介、标签已可用，只做发布前复核。"
            : "投稿资产还没过关，先别急着拿它测平台。",
          href: "#submission-asset-editor",
        },
      ],
    };
  }

  if (recommendation === "focus" || pack.publishEffect.status === "signed" || pack.publishEffect.comparison.status === "improved") {
    return {
      kind: "scale",
      label: "继续加码",
      detail: "数据已经给出正反馈，主资源可以继续往这里压。",
      action: "保持主战场，继续更新、归档版本，并跟踪下一轮转化。",
      tasks: [
        {
          id: "keep-main-platform",
          priority: "high",
          execution: "apply_strategy",
          label: "锁定主战场",
          detail: `继续以 ${pack.platformName} 为主平台，不要频繁横跳稀释样本。`,
          href: "#platform-strategy-ranking",
        },
        {
          id: "archive-winning-version",
          priority: "high",
          execution: "save_snapshot",
          label: "归档有效版本",
          detail: "保存当前标题、简介、标签和前三章组合，作为下一轮对照基准。",
          href: "#package-version-history",
        },
        {
          id: "track-next-round",
          priority: "medium",
          execution: "open_target",
          label: "跟踪下一轮转化",
          detail: "继续记录新增曝光、点击、收藏、追读和付费阅读变化。",
          href: "#publish-effect-panel",
        },
      ],
    };
  }

  if (pack.publishEffect.status === "weak" || pack.publishEffect.comparison.status === "declined" || recommendation === "repair") {
    return {
      kind: "repair",
      label: "先修打法",
      detail: "真实反馈偏弱，现在继续硬投只会扩大损失。",
      action: "回到前三章、投稿资产和发布节奏，先修再投。",
      tasks: [
        {
          id: "rewrite-opening-hook",
          priority: "high",
          execution: "rewrite_first_three",
          label: "重修前三章钩子",
          detail: pack.repairPath.nextStep?.detail ?? "把开局冲突、爽点兑现和章末悬念重新打磨一轮。",
          href: "#first-three-rewrite",
        },
        {
          id: "fix-submission-asset",
          priority: "high",
          execution: "generate_asset_variants",
          label: "重做投稿资产",
          detail: "重写书名、简介、标签和平台话术，别让入口素材拖累正文。",
          href: "#submission-asset-editor",
        },
        {
          id: "record-repair-metric",
          priority: "medium",
          execution: "open_target",
          label: "设置二轮对照",
          detail: "修完后再记录一轮数据，用前后变化判断是不是修对了。",
          href: "#publish-effect-panel",
        },
      ],
    };
  }

  if (recommendation === "avoid") {
    return {
      kind: "pivot",
      label: "换个打法",
      detail: "当前平台胜率靠后，不值得继续烧主资源。",
      action: "把它降为观察平台，回排行榜选择更高胜率主战场。",
      tasks: [
        {
          id: "demote-platform",
          priority: "high",
          execution: "open_target",
          label: "降为观察平台",
          detail: `${pack.platformName} 暂时不吃主资源，只保留必要记录。`,
          href: "#platform-strategy-ranking",
        },
        {
          id: "pick-stronger-platform",
          priority: "high",
          execution: "open_target",
          label: "选择高胜率平台",
          detail: "从排行榜前三里选更适合当前题材和数据的平台继续推进。",
          href: "#platform-strategy-ranking",
        },
        {
          id: "reuse-transferable-assets",
          priority: "medium",
          execution: "generate_asset_variants",
          label: "复用可迁移素材",
          detail: "保留能复用的卖点和简介，按新平台口味重组表达。",
          href: "#submission-asset-editor",
        },
      ],
    };
  }

  return {
    kind: "iterate",
    label: "小步迭代",
    detail: "数据还没差到要撤，也没好到能猛冲。",
    action: "做一轮小改动，再记录下一轮数据对照。",
    tasks: [
      {
        id: "adjust-one-variable",
        priority: "high",
        execution: "generate_asset_variants",
        label: "只改一个变量",
        detail: "优先只改标题、简介、标签或前三章钩子中的一项，别一次全改到无法归因。",
        href: "#submission-asset-editor",
      },
      {
        id: "archive-iteration-version",
        priority: "medium",
        execution: "save_snapshot",
        label: "保存迭代版本",
        detail: "把本轮改动归档，下一轮才能知道到底是哪一刀生效。",
        href: "#package-version-history",
      },
      {
        id: "compare-next-metrics",
        priority: "medium",
        execution: "open_target",
        label: "复盘下一轮数据",
        detail: "记录新一轮曝光、点击、收藏和追读，再决定加码还是换方向。",
        href: "#publish-effect-panel",
      },
    ],
  };
}

function buildPlatformStrategy(packages: PlatformPublishPackage[]): PlatformStrategyRankItem[] {
  const ranked = packages.map((pack) => {
    const scores = {
      preflight: pack.preflight.score,
      asset: pack.submissionAssetAudit.score,
      effect: effectScore(pack.publishEffect),
      comparison: comparisonScore(pack.publishEffect.comparison),
      adoption: pack.submissionAssetAdoption.adoptionRatePercent
        ? Math.min(100, 50 + pack.submissionAssetAdoption.adoptionRatePercent)
        : pack.submissionAssetAdoption.generatedVariants ? 35 : 45,
    };
    const score = Math.round(
      scores.preflight * 0.25
      + scores.asset * 0.2
      + scores.effect * 0.28
      + scores.comparison * 0.17
      + scores.adoption * 0.1,
    );
    const recommendation: PlatformStrategyRankItem["recommendation"] = score >= 82
      ? "focus"
      : score >= 68
        ? "grow"
        : score >= 52
          ? "watch"
          : pack.publishEffect.status === "weak" || pack.preflight.blocked.length
            ? "repair"
            : "avoid";
    const reasons = [
      pack.canExport ? `发布质检 ${pack.preflight.score} 分` : `发布阻塞 ${pack.preflight.blocked.length} 项`,
      `投稿资产 ${pack.submissionAssetAudit.score} 分`,
      pack.publishEffect.records ? `真实效果 ${pack.publishEffect.status}` : "还没真实数据",
      pack.publishEffect.comparison.status !== "none" ? `二轮对照 ${pack.publishEffect.comparison.status}` : "缺前后对照",
      pack.submissionAssetAdoption.adoptedVersions ? `已采纳 ${pack.submissionAssetAdoption.adoptedVersions} 个候选` : "候选采纳不足",
    ];
    const risks = [
      ...pack.preflight.blocked.slice(0, 2),
      ...pack.submissionAssetAudit.issues.slice(0, 2).map((issue) => issue.label),
      pack.publishEffect.status === "weak" ? "真实转化偏弱" : "",
      pack.publishEffect.comparison.status === "declined" ? "二轮后数据下滑" : "",
    ].filter(Boolean);
    const verdict = recommendation === "focus"
      ? `${pack.platformName} 当前最值得优先打，数据和准备度都别浪费。`
      : recommendation === "grow"
        ? `${pack.platformName} 可以继续加码，但先补齐短板。`
        : recommendation === "watch"
          ? `${pack.platformName} 先观察，别把主资源全押上去。`
          : recommendation === "repair"
            ? `${pack.platformName} 先修再投，现在硬上就是给平台送低质样本。`
            : `${pack.platformName} 暂时靠后，别把时间烧在低胜率方向。`;
    const nextAction = recommendation === "focus"
      ? "优先更新、归档并持续记录下一轮数据。"
      : recommendation === "grow"
        ? pack.effectOptimization.actions[0]?.detail ?? "补齐平台短板后再继续投放。"
        : recommendation === "repair"
          ? pack.repairPath.nextStep?.detail ?? pack.effectOptimization.actions[0]?.detail ?? "先处理阻塞项。"
          : pack.publishEffect.nextAction;
    const reviewDecision = buildPlatformStrategyReviewDecision(pack, recommendation);

    return {
      rank: 0,
      platformId: pack.platformId,
      platformName: pack.platformName,
      score,
      recommendation,
      reviewDecision,
      verdict,
      nextAction,
      href: "#platform-export",
      scores,
      reasons,
      risks,
    };
  });

  return ranked
    .sort((left, right) => (
      right.score - left.score
      || left.platformName.localeCompare(right.platformName)
    ))
    .map((item, index) => ({ ...item, rank: index + 1 }));
}

function buildPlatformStrategyProgressSummary(
  platformName: string,
  steps: PlatformStrategySwitchStep[],
): PlatformStrategyProgressSummary {
  const completedSteps = steps.filter((step) => step.status === "done").length;
  const totalSteps = steps.length;
  const nextStep = steps.find((step) => step.status === "next") ?? null;
  const progressPercent = totalSteps ? Math.round((completedSteps / totalSteps) * 100) : 0;

  if (!nextStep) {
    return {
      status: "complete",
      completedSteps,
      totalSteps,
      progressPercent,
      nextStepId: null,
      nextStepLabel: "复盘排行榜",
      actionLabel: "复盘排行榜",
      actionHref: "#platform-strategy-ranking",
      bottleneck: "暂无卡点",
      verdict: `${platformName} 这条执行链已经闭环，别继续盲动，回排行榜看数据说话。`,
    };
  }

  return {
    status: "in_progress",
    completedSteps,
    totalSteps,
    progressPercent,
    nextStepId: nextStep.id,
    nextStepLabel: nextStep.label,
    actionLabel: nextStep.label,
    actionHref: nextStep.href,
    bottleneck: nextStep.detail,
    verdict: `${platformName} 还有 ${totalSteps - completedSteps} 步没跑完，先处理「${nextStep.label}」，别开新坑。`,
  };
}

export function buildPlatformStrategySwitchPlan(
  strategy: PlatformStrategyRankItem,
  previousPlatform: PlatformProfile,
  pack?: PlatformPublishPackage,
): PlatformStrategySwitchPlan {
  const isSamePlatform = strategy.platformId === previousPlatform.id;
  const priorityLabel = strategy.recommendation === "focus"
    ? "主推"
    : strategy.recommendation === "grow"
      ? "加码"
      : strategy.recommendation === "repair"
        ? "先修"
        : strategy.recommendation === "watch"
          ? "观察"
          : "降权";
  const headline = isSamePlatform
    ? `${strategy.platformName} 继续当主战场，别换来换去，先把这条执行链跑完。`
    : `已从 ${previousPlatform.name} 切到 ${strategy.platformName}，接下来别到处乱投，先把这条执行链跑完。`;
  const assetDetail = strategy.recommendation === "repair"
    ? "先处理投稿资料和发布阻塞，当前状态硬投只会消耗样本。"
    : `按「${priorityLabel}」策略修标题、简介、标签和平台话术，别拿通用简介糊弄平台。`;
  const assetDone = pack ? pack.submissionAssetAudit.status === "ready" : false;
  const rewriteDone = pack ? pack.canExport : false;
  const effectDone = pack ? pack.publishEffect.records > 0 : false;
  const nextStepId: "fix-submission-asset" | "rewrite-first-three" | "record-publish-effect" | null = !assetDone
    ? "fix-submission-asset"
    : !rewriteDone
      ? "rewrite-first-three"
      : !effectDone
        ? "record-publish-effect"
        : null;
  const stepStatus = (id: "fix-submission-asset" | "rewrite-first-three" | "record-publish-effect") => {
    if (id === "fix-submission-asset" && assetDone) return "done" as const;
    if (id === "rewrite-first-three" && rewriteDone) return "done" as const;
    if (id === "record-publish-effect" && effectDone) return "done" as const;
    return id === nextStepId ? "next" as const : "queued" as const;
  };

  const steps: PlatformStrategySwitchStep[] = [
    {
      id: "switch-target-platform",
      label: "切换目标平台",
      detail: `项目主战场已设为 ${strategy.platformName}，后续发布包、前三章重写和效果记录都以它为准。`,
      status: "done",
      executable: false,
      href: "#platform-export",
    },
    {
      id: "fix-submission-asset",
      label: "修投稿资产",
      detail: assetDetail,
      status: stepStatus("fix-submission-asset"),
      executable: !assetDone,
      href: "#submission-asset-editor",
    },
    {
      id: "rewrite-first-three",
      label: "重写前三章",
      detail: "用目标平台规则重写前三章钩子、爽点、情绪张力和章末悬念。",
      status: stepStatus("rewrite-first-three"),
      executable: assetDone && !rewriteDone,
      href: "#first-three-rewrite",
    },
    {
      id: "record-publish-effect",
      label: "记录发布效果",
      detail: "上线后记录阅读、点击、收藏、追读和编辑反馈，下一轮排行榜才有真实判断。",
      status: stepStatus("record-publish-effect"),
      executable: assetDone && rewriteDone && !effectDone,
      href: "#publish-effect-panel",
    },
  ];

  return {
    platformId: strategy.platformId,
    platformName: strategy.platformName,
    headline,
    previousPlatformId: previousPlatform.id,
    previousPlatformName: previousPlatform.name,
    recommendation: strategy.recommendation,
    score: strategy.score,
    progress: buildPlatformStrategyProgressSummary(strategy.platformName, steps),
    steps,
  };
}

export function buildPlatformStrategyExecutionReceipt(
  plan: PlatformStrategySwitchPlan,
  stepId: PlatformStrategyExecutionReceipt["stepId"],
  resultCount = 0,
): PlatformStrategyExecutionReceipt {
  if (stepId === "adopt-submission-asset") {
    return {
      stepId,
      platformId: plan.platformId,
      platformName: plan.platformName,
      title: "投稿资产已采纳保存",
      message: `${plan.platformName} 的候选方案已经落库。生成只是热身，保存才算开始干活。`,
      nextAction: "看刷新后的执行链，继续执行真正的下一步。",
      href: "#platform-export",
      severity: "success",
    };
  }

  if (stepId === "fix-submission-asset") {
    return {
      stepId,
      platformId: plan.platformId,
      platformName: plan.platformName,
      title: "投稿资产候选已生成",
      message: resultCount
        ? `已给 ${plan.platformName} 生成 ${resultCount} 个候选方案。别停在欣赏文案，挑一个采纳并保存。`
        : `已进入 ${plan.platformName} 投稿资产修复区。别拿通用简介糊弄平台。`,
      nextAction: "采纳一个候选并保存投稿资产，然后重新应用策略链。",
      href: "#submission-asset-editor",
      severity: "needs_action",
    };
  }

  if (stepId === "rewrite-first-three") {
    return {
      stepId,
      platformId: plan.platformId,
      platformName: plan.platformName,
      title: "前三章已按主战场重写",
      message: resultCount
        ? `已重写 ${resultCount} 章。现在别急着投，先看发布质检是不是还在拦你。`
        : "前三章重写动作已完成。现在检查钩子、爽点和章末悬念有没有真的变硬。",
      nextAction: "回到发布前质检；若通过，就记录发布效果，若未通过，继续处理阻塞项。",
      href: "#platform-export",
      severity: "needs_action",
    };
  }

  if (stepId === "record-publish-effect") {
    return {
      stepId,
      platformId: plan.platformId,
      platformName: plan.platformName,
      title: "该录真实效果了",
      message: `把 ${plan.platformName} 的曝光、点击、收藏、追读和编辑反馈填进去。没有数据的策略都是情绪价值。`,
      nextAction: "保存发布效果后再看排行榜，让真实数据决定下一轮主战场。",
      href: "#publish-effect-panel",
      severity: "needs_action",
    };
  }

  if (stepId === "save-publish-effect") {
    return {
      stepId,
      platformId: plan.platformId,
      platformName: plan.platformName,
      title: "发布效果已入账",
      message: `${plan.platformName} 的真实数据已经写进策略系统。现在别拍脑袋，排行榜会重新算账。`,
      nextAction: "回到平台策略排行榜，看主战场是否继续加码，还是该换打法。",
      href: "#platform-export",
      severity: "success",
    };
  }

  return {
    stepId,
    platformId: plan.platformId,
    platformName: plan.platformName,
    title: "主战场已切换",
    message: `${plan.platformName} 已设为当前主战场。`,
    nextAction: "继续执行链里的下一步。",
    href: "#platform-export",
    severity: "success",
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
    "## 投稿资产质检",
    `资产分：${pack.submissionAssetAudit.score}`,
    `状态：${pack.submissionAssetAudit.status === "ready" ? "可用" : pack.submissionAssetAudit.status === "blocked" ? "需重写" : "需打磨"}`,
    ...(pack.submissionAssetAudit.issues.length
      ? pack.submissionAssetAudit.issues.map((issue) => `- ${issue.severity === "blocker" ? "阻塞" : "提醒"}：${issue.label}｜${issue.detail}`)
      : ["- 暂无明显问题。"]),
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
    "## 发布效果复盘",
    `记录数：${pack.publishEffect.records}`,
    `曝光/点击/收藏/追读：${pack.publishEffect.totalViews}/${pack.publishEffect.totalClicks}/${pack.publishEffect.totalFavorites}/${pack.publishEffect.totalFollows}`,
    `点击率：${pack.publishEffect.clickRatePercent}%｜收藏率：${pack.publishEffect.favoriteRatePercent}%｜追读率：${pack.publishEffect.followRatePercent}%`,
    `结论：${pack.publishEffect.verdict}`,
    `下一步：${pack.publishEffect.nextAction}`,
    ...(pack.publishEffect.latest?.editorFeedback ? [`编辑反馈：${pack.publishEffect.latest.editorFeedback}`] : []),
    "",
    "## 执行前后对照",
    `状态：${pack.publishEffect.comparison.status}`,
    `曝光变化：${pack.publishEffect.comparison.viewsDelta}`,
    `点击率变化：${pack.publishEffect.comparison.clickRateDeltaPercent}%`,
    `收藏率变化：${pack.publishEffect.comparison.favoriteRateDeltaPercent}%`,
    `追读率变化：${pack.publishEffect.comparison.followRateDeltaPercent}%`,
    `判断：${pack.publishEffect.comparison.verdict}`,
    "",
    "## 二轮优化清单",
    pack.effectOptimization.headline,
    ...pack.effectOptimization.actions.map((action) => `- [${action.priority}] ${action.label}｜${action.target}｜${action.detail}｜依据：${action.evidence}`),
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

function textOrFallback(value: string | undefined, fallback: string) {
  const trimmed = value?.trim();
  return trimmed || fallback;
}

function textLength(value: string) {
  return value.trim().length;
}

function hasAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.toLowerCase().includes(keyword.toLowerCase()));
}

function cjkRatio(text: string) {
  const compact = text.replace(/\s/g, "");
  if (!compact.length) return 0;
  const cjk = compact.match(/[\u4e00-\u9fff]/g)?.length ?? 0;
  return cjk / compact.length;
}

export function buildSubmissionAssetAudit(
  platform: PlatformProfile,
  asset: {
    title: string;
    logline: string;
    synopsis: string;
    overseasSynopsis: string;
    tags: string[];
  },
): PlatformSubmissionAssetAudit {
  const issues: PlatformSubmissionAssetIssue[] = [];
  const passed: string[] = [];
  const searchableText = [asset.title, asset.logline, asset.synopsis, asset.overseasSynopsis, asset.tags.join(" ")].join(" ");
  const primarySynopsis = platform.category === "overseas" ? asset.overseasSynopsis : asset.synopsis;

  const addIssue = (issue: PlatformSubmissionAssetIssue) => issues.push(issue);
  const minLogline = platform.category === "overseas" ? 55 : 18;
  const minSynopsis = platform.category === "short" ? 80 : platform.category === "overseas" ? 120 : 100;

  if (textLength(asset.title) >= 2 && textLength(asset.title) <= 32) {
    passed.push("标题长度可用。");
  } else {
    addIssue({ field: "title", severity: "blocker", label: "标题长度失控", detail: "标题需要 2-32 字，太短没识别度，太长会拖慢平台列表页判断。" });
  }

  if (textLength(asset.logline) >= minLogline) {
    passed.push("一句话卖点有基本信息量。");
  } else {
    addIssue({ field: "logline", severity: "blocker", label: "卖点太空", detail: `一句话卖点至少 ${minLogline} 字，要说清主角、冲突和可期待的爽点或情绪。` });
  }

  if (textLength(primarySynopsis) >= minSynopsis) {
    passed.push("简介长度达到平台判断门槛。");
  } else {
    addIssue({
      field: platform.category === "overseas" ? "overseasSynopsis" : "synopsis",
      severity: "blocker",
      label: "简介撑不起投稿判断",
      detail: `当前平台简介至少建议 ${minSynopsis} 字，要补主角目标、核心冲突、主线推进和读者期待。`,
    });
  }

  if (asset.tags.length >= 3) {
    passed.push("标签数量够平台分发使用。");
  } else {
    addIssue({ field: "tags", severity: "warning", label: "标签太少", detail: "至少准备 3 个标签，方便平台识别题材、情绪和核心卖点。" });
  }

  if (hasAny(searchableText, platform.genres)) {
    passed.push("题材标签与平台常见品类有连接。");
  } else {
    addIssue({ field: "tags", severity: "warning", label: "平台题材信号弱", detail: `建议至少贴近一个平台高频品类：${platform.genres.slice(0, 5).join("、")}。` });
  }

  if (platform.id === "fanqie" && hasAny(searchableText, ["爽", "逆袭", "系统", "重生", "翻盘", "危机", "选择"])) {
    passed.push("番茄快读爽点信号明确。");
  } else if (platform.id === "fanqie") {
    addIssue({ field: "logline", severity: "warning", label: "番茄爽点不够直给", detail: "番茄标题/卖点要更直接打出系统、逆袭、翻盘、危机或连续选择。" });
  }

  if (platform.id === "qidian" && hasAny(searchableText, ["世界", "体系", "升级", "主线", "长期", "伏笔", "境界"])) {
    passed.push("起点长线结构信号明确。");
  } else if (platform.id === "qidian") {
    addIssue({ field: "synopsis", severity: "warning", label: "起点长线期待不足", detail: "起点简介要补世界观、升级体系、长期主线或阶段目标。" });
  }

  if (platform.id === "zhihu_yanxuan" && hasAny(searchableText, ["反转", "真相", "复仇", "第一人称", "悬疑", "付费"])) {
    passed.push("知乎盐选反转/付费期待明确。");
  } else if (platform.id === "zhihu_yanxuan") {
    addIssue({ field: "synopsis", severity: "warning", label: "盐选付费钩子不够尖", detail: "知乎盐选需要更强的第一人称矛盾、反转链、复仇或真相期待。" });
  }

  if (platform.category === "female" && hasAny(searchableText, ["关系", "情感", "拉扯", "暗恋", "婚", "救赎", "成长"])) {
    passed.push("女频情绪关系信号明确。");
  } else if (platform.category === "female") {
    addIssue({ field: "logline", severity: "warning", label: "情绪线不够可见", detail: "女频平台需要更早展示关系张力、情绪推进或人物成长。" });
  }

  if (platform.category === "overseas" && cjkRatio(asset.overseasSynopsis) < 0.2 && /[a-zA-Z]/.test(asset.overseasSynopsis)) {
    passed.push("海外简介具备英文投稿信号。");
  } else if (platform.category === "overseas") {
    addIssue({ field: "overseasSynopsis", severity: "blocker", label: "海外简介不够英文平台化", detail: "海外平台需要英文简介，避免直接中文投递或机器直译感过强。" });
  }

  const blockerCount = issues.filter((issue) => issue.severity === "blocker").length;
  const warningCount = issues.length - blockerCount;
  const score = Math.max(0, 100 - blockerCount * 24 - warningCount * 10);

  return {
    score,
    status: blockerCount ? "blocked" : warningCount ? "needs_work" : "ready",
    passed,
    issues,
  };
}

function taskPlatformId(task: PublishExportAiTask) {
  const parsed = parseJsonObject(task.inputSnapshot ?? "");
  return typeof parsed?.platformId === "string" ? parsed.platformId : null;
}

function countOptimizationVariants(task: PublishExportAiTask) {
  if (task.status !== "succeeded") return 0;
  const parsed = parseJsonObject(task.outputText ?? "");
  const variants = parsed?.variants;
  return Array.isArray(variants) ? variants.length : 0;
}

function buildSubmissionAssetAdoptionSummary(
  platform: PlatformProfile,
  tasks: PublishExportAiTask[],
  versions: PlatformSubmissionAssetVersionInput[],
): PlatformSubmissionAssetAdoptionSummary {
  const optimizationTasks = tasks.filter((task) => (
    task.taskType === "platform_submission_asset_optimize"
    && taskPlatformId(task) === platform.id
    && task.status === "succeeded"
  ));
  const generatedVariants = optimizationTasks.reduce((sum, task) => sum + countOptimizationVariants(task), 0);
  const adoptedVersions = versions.filter((version) => version.platformId === platform.id && version.action === "adopt");
  const adoptionRatePercent = generatedVariants ? Math.round((adoptedVersions.length / generatedVariants) * 100) : 0;
  const recentStrategies = adoptedVersions
    .map((version) => version.strategy?.trim())
    .filter((strategy): strategy is string => Boolean(strategy))
    .slice(0, 3);
  const bestAdoptedScore = adoptedVersions.reduce((best, version) => Math.max(best, version.auditScore), 0);

  return {
    generatedTasks: optimizationTasks.length,
    generatedVariants,
    adoptedVersions: adoptedVersions.length,
    adoptionRatePercent,
    bestAdoptedScore,
    recentStrategies,
    verdict: generatedVariants === 0
      ? "还没有生成候选方案。"
      : adoptedVersions.length === 0
        ? "候选还没被采纳，先别自嗨，拿一个方案落库验证。"
        : `已采纳 ${adoptedVersions.length}/${generatedVariants} 个候选，最高质检 ${bestAdoptedScore} 分。`,
  };
}

function percent(numerator: number, denominator: number) {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function contractStatusLabel(status: string) {
  if (status === "signed") return "已签约";
  if (status === "invited") return "收到邀约";
  if (status === "rejected") return "被拒";
  if (status === "pending") return "待反馈";
  return "未知";
}

function rateDelta(current: number, previous: number) {
  return Math.round((current - previous) * 10) / 10;
}

function metricRates(metric: PlatformPublishMetricInput | null) {
  if (!metric) {
    return {
      clickRatePercent: 0,
      favoriteRatePercent: 0,
      followRatePercent: 0,
    };
  }
  return {
    clickRatePercent: percent(metric.clicks, metric.views),
    favoriteRatePercent: percent(metric.favorites, metric.views),
    followRatePercent: percent(metric.follows, metric.views),
  };
}

function buildPublishEffectComparison(history: PlatformPublishMetricInput[]): PlatformPublishEffectComparison {
  const current = history[0] ?? null;
  const previous = history[1] ?? null;

  if (!current || !previous) {
    return {
      status: "none",
      previous,
      current,
      viewsDelta: 0,
      clicksDelta: 0,
      favoritesDelta: 0,
      followsDelta: 0,
      clickRateDeltaPercent: 0,
      favoriteRateDeltaPercent: 0,
      followRateDeltaPercent: 0,
      verdict: "还没有前后对照样本。至少录两次数据，才能判断改动有没有用。",
      wins: [],
      losses: [],
    };
  }

  const currentRates = metricRates(current);
  const previousRates = metricRates(previous);
  const clickRateDeltaPercent = rateDelta(currentRates.clickRatePercent, previousRates.clickRatePercent);
  const favoriteRateDeltaPercent = rateDelta(currentRates.favoriteRatePercent, previousRates.favoriteRatePercent);
  const followRateDeltaPercent = rateDelta(currentRates.followRatePercent, previousRates.followRatePercent);
  const wins = [
    clickRateDeltaPercent >= 1 ? `点击率 +${clickRateDeltaPercent}%` : "",
    favoriteRateDeltaPercent >= 1 ? `收藏率 +${favoriteRateDeltaPercent}%` : "",
    followRateDeltaPercent >= 0.5 ? `追读率 +${followRateDeltaPercent}%` : "",
    current.comments > previous.comments ? `评论 +${current.comments - previous.comments}` : "",
  ].filter(Boolean);
  const losses = [
    clickRateDeltaPercent <= -1 ? `点击率 ${clickRateDeltaPercent}%` : "",
    favoriteRateDeltaPercent <= -1 ? `收藏率 ${favoriteRateDeltaPercent}%` : "",
    followRateDeltaPercent <= -0.5 ? `追读率 ${followRateDeltaPercent}%` : "",
    current.comments < previous.comments ? `评论 ${current.comments - previous.comments}` : "",
  ].filter(Boolean);
  const status: PlatformPublishEffectComparison["status"] = wins.length && !losses.length
    ? "improved"
    : losses.length && !wins.length
      ? "declined"
      : wins.length && losses.length
        ? "mixed"
        : "flat";
  const verdict = status === "improved"
    ? "这轮优化有正反馈，别急着换方向，继续放大有效信号。"
    : status === "declined"
      ? "这轮优化把数据改差了，别嘴硬，回滚包装或重查前三章兑现。"
      : status === "mixed"
        ? "有指标涨也有指标跌，先判断是入口变好还是留存变差。"
        : "数据基本没动，说明改动不够狠，或者样本还不够。";

  return {
    status,
    previous,
    current,
    viewsDelta: current.views - previous.views,
    clicksDelta: current.clicks - previous.clicks,
    favoritesDelta: current.favorites - previous.favorites,
    followsDelta: current.follows - previous.follows,
    clickRateDeltaPercent,
    favoriteRateDeltaPercent,
    followRateDeltaPercent,
    verdict,
    wins,
    losses,
  };
}

function buildPlatformPublishEffect(
  platform: PlatformProfile,
  metrics: PlatformPublishMetricInput[],
): PlatformPublishEffectSummary {
  const history = metrics
    .filter((metric) => metric.platformId === platform.id)
    .sort((left, right) => new Date(right.snapshotDate).getTime() - new Date(left.snapshotDate).getTime())
    .slice(0, 6);
  const totalViews = history.reduce((sum, metric) => sum + Math.max(0, metric.views), 0);
  const totalClicks = history.reduce((sum, metric) => sum + Math.max(0, metric.clicks), 0);
  const totalFavorites = history.reduce((sum, metric) => sum + Math.max(0, metric.favorites), 0);
  const totalFollows = history.reduce((sum, metric) => sum + Math.max(0, metric.follows), 0);
  const totalComments = history.reduce((sum, metric) => sum + Math.max(0, metric.comments), 0);
  const totalPaidReads = history.reduce((sum, metric) => sum + Math.max(0, metric.paidReads), 0);
  const clickRatePercent = percent(totalClicks, totalViews);
  const favoriteRatePercent = percent(totalFavorites, totalViews);
  const followRatePercent = percent(totalFollows, totalViews);
  const commentRatePercent = percent(totalComments, totalViews);
  const paidReadRatePercent = percent(totalPaidReads, totalViews);
  const latest = history[0] ?? null;
  const comparison = buildPublishEffectComparison(history);

  if (!latest) {
    return {
      status: "empty",
      records: 0,
      latest: null,
      comparison,
      totalViews: 0,
      totalClicks: 0,
      totalFavorites: 0,
      totalFollows: 0,
      totalComments: 0,
      totalPaidReads: 0,
      clickRatePercent: 0,
      favoriteRatePercent: 0,
      followRatePercent: 0,
      commentRatePercent: 0,
      paidReadRatePercent: 0,
      verdict: "还没有发布效果记录。别靠脑补判断平台喜不喜欢，先录一组真实数据。",
      nextAction: "发布后录入曝光、点击、收藏、追读、评论和编辑反馈。",
      history: [],
    };
  }

  const latestStatus = latest.contractStatus;
  if (latestStatus === "signed" || latestStatus === "invited") {
    return {
      status: "signed",
      records: history.length,
      latest,
      comparison,
      totalViews,
      totalClicks,
      totalFavorites,
      totalFollows,
      totalComments,
      totalPaidReads,
      clickRatePercent,
      favoriteRatePercent,
      followRatePercent,
      commentRatePercent,
      paidReadRatePercent,
      verdict: `${platform.name} 已经${contractStatusLabel(latestStatus)}，先稳住更新和质量，别乱改核心卖点。`,
      nextAction: "围绕已验证卖点继续加更，并记录编辑反馈里的明确要求。",
      history,
    };
  }

  const status = totalViews < 100
    ? "watch"
    : latestStatus === "rejected" || clickRatePercent < 5 || followRatePercent < 1
      ? "weak"
      : favoriteRatePercent >= 4 || followRatePercent >= 2 || paidReadRatePercent >= 1
        ? "promising"
        : "watch";
  const verdict = status === "weak"
    ? `${platform.name} 当前转化偏弱，别急着怪平台，先检查标题卖点和前三章兑现。`
    : status === "promising"
      ? `${platform.name} 有可追的苗头，别换方向，优先放大已产生收藏/追读的爽点。`
      : `样本还不够硬，${platform.name} 这组数据只能观察，别过早下结论。`;
  const nextAction = latestStatus === "rejected"
    ? "复盘编辑反馈，重做投稿资产，再生成一轮平台候选方案。"
    : clickRatePercent < 5 && totalViews >= 100
      ? "先改标题、一句话卖点和标签，解决读者点不进来的问题。"
      : followRatePercent < 1 && totalViews >= 100
        ? "重查前三章钩子、章末悬念和爽点兑现，解决点进来留不住的问题。"
        : "继续记录下一轮数据，至少保留两次复盘后再决定换平台或换卖点。";

  return {
    status,
    records: history.length,
    latest,
    comparison,
    totalViews,
    totalClicks,
    totalFavorites,
    totalFollows,
    totalComments,
    totalPaidReads,
    clickRatePercent,
    favoriteRatePercent,
    followRatePercent,
    commentRatePercent,
    paidReadRatePercent,
    verdict,
    nextAction,
    history,
  };
}

function effectAction(
  id: string,
  priority: PlatformPublishOptimizationAction["priority"],
  area: PlatformPublishOptimizationAction["area"],
  execution: PlatformPublishOptimizationAction["execution"],
  label: string,
  detail: string,
  evidence: string,
  target: string,
  href: string,
): PlatformPublishOptimizationAction {
  return { id, priority, area, execution, label, detail, evidence, target, href };
}

function buildPlatformEffectOptimization(
  platform: PlatformProfile,
  effect: PlatformPublishEffectSummary,
  assetAudit: PlatformSubmissionAssetAudit,
  chapters: PlatformPublishChapter[],
  adoption: PlatformSubmissionAssetAdoptionSummary,
): PlatformPublishEffectOptimization {
  if (effect.status === "empty") {
    return {
      status: "collect_data",
      headline: "先别玄学复盘，缺数据就只是在自我感动。",
      actions: [
        effectAction(
          `${platform.id}-collect-effect-data`,
          "high",
          "data",
          "open_target",
          "录入首轮发布数据",
          "至少补曝光、点击、收藏、追读、评论和编辑反馈，再判断平台是否吃这个卖点。",
          "当前没有任何发布效果记录。",
          "发布效果复盘",
          "#publish-effect-panel",
        ),
      ],
    };
  }

  const actions: PlatformPublishOptimizationAction[] = [];
  const firstThree = chapters.slice(0, 3);
  const weakOpening = firstThree.some((chapter) => chapter.preflight.score < 85 || !chapter.ready);

  if (effect.latest?.contractStatus === "rejected") {
    actions.push(effectAction(
      `${platform.id}-rebuild-rejected-package`,
      "high",
      "asset",
      "generate_asset_variants",
      "按拒稿反馈重做投稿资产",
      "把编辑反馈拆成标题、卖点、简介、前三章四类问题，重写后再生成一轮平台候选方案。",
      effect.latest.editorFeedback || "最新反馈状态为被拒。",
      "投稿资产",
      "#submission-asset-editor",
    ));
  }

  if (effect.totalViews >= 100 && effect.clickRatePercent < 5) {
    actions.push(effectAction(
      `${platform.id}-fix-click-package`,
      "high",
      "asset",
      "generate_asset_variants",
      "重做标题、卖点和标签",
      `${platform.name} 读者没点进来，先把标题从“像简介”改成“能一眼看懂冲突和爽点”。`,
      `点击率 ${effect.clickRatePercent}%，低于 5%。`,
      "投稿资产",
      "#submission-asset-editor",
    ));
  }

  if (effect.totalViews >= 100 && effect.clickRatePercent >= 5 && effect.followRatePercent < 1) {
    actions.push(effectAction(
      `${platform.id}-fix-first-three-retention`,
      "high",
      "opening",
      "rewrite_first_three",
      "重查前三章留存链路",
      "点击不算死，但追读没接住，优先重写第一章钩子、第二章兑现和第三章转折。",
      `点击率 ${effect.clickRatePercent}%，追读率只有 ${effect.followRatePercent}%。`,
      "前三章",
      "#first-three-rewrite",
    ));
  }

  if (effect.favoriteRatePercent < 2 && effect.totalViews >= 100) {
    actions.push(effectAction(
      `${platform.id}-increase-save-motive`,
      "medium",
      "opening",
      "rewrite_first_three",
      "补强收藏动机",
      "前三章需要更清楚的长期奖励、关系拉扯或主线谜团，否则读者看完也不会收藏。",
      `收藏率 ${effect.favoriteRatePercent}%。`,
      "人物弧光 / 主线钩子",
      "#first-three-rewrite",
    ));
  }

  if (assetAudit.status !== "ready") {
    actions.push(effectAction(
      `${platform.id}-repair-asset-audit`,
      "medium",
      "asset",
      "generate_asset_variants",
      "先修投稿资产质检问题",
      "投稿资产还没到平台判断门槛，别拿脏数据指导内容方向。",
      `资产质检 ${assetAudit.score} 分，状态 ${assetAudit.status}。`,
      "投稿资产",
      "#submission-asset-editor",
    ));
  }

  if (adoption.generatedVariants > 0 && adoption.adoptedVersions === 0) {
    actions.push(effectAction(
      `${platform.id}-adopt-candidate`,
      "medium",
      "asset",
      "open_target",
      "采纳一个 AI 候选做实测",
      "候选生成了但没有采纳，等于厨房炒了三盘菜却一口不尝。",
      `已生成 ${adoption.generatedVariants} 个候选，采纳 0 个。`,
      "AI 优化方案",
      "#submission-asset-editor",
    ));
  }

  if (platform.category === "overseas" && effect.status === "weak") {
    actions.push(effectAction(
      `${platform.id}-localize-overseas-package`,
      "medium",
      "platform",
      "generate_asset_variants",
      "重做海外平台表达",
      "海外弱转化时先检查英文标题、简介和标签是否像本土连载，不要把中文卖点硬翻过去。",
      `${platform.name} 属于海外平台，当前复盘状态偏弱。`,
      "海外简介 / 标签",
      "#submission-asset-editor",
    ));
  }

  if (effect.status === "promising" || effect.status === "signed") {
    actions.push(effectAction(
      `${platform.id}-scale-winning-signal`,
      "high",
      "cadence",
      "open_target",
      "放大已验证卖点",
      "保持标题卖点方向，下一轮优先加更、强化同类爽点，并记录新增章节后的转化变化。",
      effect.status === "signed" ? "平台已给出签约或邀约信号。" : `收藏率 ${effect.favoriteRatePercent}%，追读率 ${effect.followRatePercent}%。`,
      "更新节奏 / 主线爽点",
      "#create-chapter",
    ));
    actions.push(effectAction(
      `${platform.id}-protect-winning-package`,
      "medium",
      "asset",
      "open_target",
      "保留当前投稿包装",
      "数据已经说明这套包装能打，别因为手痒把标题和简介改散。",
      effect.verdict,
      "投稿资产",
      "#submission-asset-editor",
    ));
  }

  if (!actions.length) {
    actions.push(effectAction(
      `${platform.id}-collect-second-sample`,
      "medium",
      "data",
      "open_target",
      "补第二轮样本",
      "当前数据既不差也不够亮，至少再记录一轮，避免用一次偶然波动决定平台方向。",
      `当前记录 ${effect.records} 次，状态为 ${effect.status}。`,
      "发布效果复盘",
      "#publish-effect-panel",
    ));
  }

  const uniqueActions = dedupeOptimizationActions(actions).slice(0, 5);
  const status: PlatformPublishEffectOptimization["status"] = effect.status === "weak"
    ? "urgent_rework"
    : effect.status === "promising" || effect.status === "signed"
      ? "scale"
      : "iterate";

  return {
    status,
    headline: status === "urgent_rework"
      ? "二轮别大修世界观，先修最靠近转化漏斗的洞。"
      : status === "scale"
        ? "数据已经给方向了，现在要放大，不要乱换靶子。"
        : "继续迭代，但别把观察样本当平台结论。",
    actions: uniqueActions,
  };
}

function dedupeOptimizationActions(actions: PlatformPublishOptimizationAction[]) {
  const seen = new Set<string>();
  return actions.filter((action) => {
    const key = `${action.area}-${action.target}-${action.label}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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
  const submissionAsset = input.submissionAssets?.find((asset) => asset.platformId === platform.id) ?? null;
  const assetTags = submissionAsset?.tags.map((tag) => tag.trim()).filter(Boolean) ?? [];
  const title = textOrFallback(submissionAsset?.title, input.project.title);
  const logline = textOrFallback(submissionAsset?.logline, submissionPackage.logline);
  const synopsis = platform.category === "overseas"
    ? textOrFallback(submissionAsset?.overseasSynopsis, textOrFallback(submissionAsset?.synopsis, submissionPackage.overseasSynopsis))
    : textOrFallback(submissionAsset?.synopsis, submissionPackage.synopsis);
  const tags = assetTags.length ? assetTags : submissionPackage.tags;
  const submissionAssetAudit = buildSubmissionAssetAudit(platform, {
    title,
    logline,
    synopsis,
    overseasSynopsis: textOrFallback(submissionAsset?.overseasSynopsis, submissionPackage.overseasSynopsis),
    tags,
  });
  const publishNote = [
    buildPublishNote(platform, submissionPackage),
    submissionAsset?.note.trim() ? `投稿资产备注：${submissionAsset.note.trim()}` : "",
  ].filter(Boolean).join("\n");
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
  const submissionAssetVersions = (input.submissionAssetVersions ?? [])
    .filter((version) => version.platformId === platform.id)
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 5);
  const submissionAssetAdoption = buildSubmissionAssetAdoptionSummary(
    platform,
    input.aiTasks ?? [],
    input.submissionAssetVersions ?? [],
  );
  const publishEffect = buildPlatformPublishEffect(platform, input.platformPublishMetrics ?? []);
  const effectOptimization = buildPlatformEffectOptimization(
    platform,
    publishEffect,
    submissionAssetAudit,
    chapters,
    submissionAssetAdoption,
  );
  const packWithoutMarkdown = {
    platformId: platform.id,
    platformName: platform.name,
    category: platform.category,
    submissionAsset: submissionAsset ? {
      ...submissionAsset,
      tags: assetTags,
      persisted: true,
    } : null,
    submissionAssetAudit,
    submissionAssetVersions,
    submissionAssetAdoption,
    publishEffect,
    effectOptimization,
    title,
    logline,
    synopsis,
    tags,
    publishNote,
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
  const platformStrategy = buildPlatformStrategy(packages);
  const activeStrategy = platformStrategy.find((strategy) => strategy.platformId === input.targetPlatform.id) ?? null;
  const activePackage = packages.find((pack) => pack.platformId === input.targetPlatform.id);

  return {
    packages,
    recommendedPlatformId: input.targetPlatform.id,
    totalPublishableChapters: publishableChapters(input.chapters).length,
    workspace: buildPublishWorkspace(packages),
    platformStrategy,
    activeStrategyPlan: activeStrategy
      ? buildPlatformStrategySwitchPlan(activeStrategy, input.targetPlatform, activePackage)
      : null,
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
