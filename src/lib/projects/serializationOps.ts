import type { PlatformProfile } from "../platforms/platformProfiles.ts";
import {
  buildSubmissionAssetAudit,
  type PlatformFinalSubmissionGate,
  type PlatformPublishEffectOptimization,
  type PlatformPublishEffectSummary,
  type PlatformSubmissionAssetAudit,
} from "./platformPublishExport.ts";
import type { SubmissionChecklist } from "./submissionChecklist.ts";

export interface SerializationProject {
  id?: string;
  title: string;
  currentWordCount: number;
  targetWordCount: number;
  updateCadence: string;
}

export interface SerializationChapter {
  id: string;
  order: number;
  title: string;
  status: string;
  wordCount: number;
  hook: string;
  cliffhanger: string;
  updatedAt: Date | string;
}

export interface SerializationTask {
  id: string;
  chapterId: string | null;
  taskType: string;
  status: string;
  inputSnapshot?: string | null;
  outputText: string | null;
  createdAt: Date | string;
}

export interface SerializationSubmissionAsset {
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

export interface SerializationSubmissionAssetVersion {
  platformId: string;
  auditScore: number;
  auditStatus: PlatformSubmissionAssetAudit["status"];
  action: string;
  strategy?: string | null;
  createdAt: Date | string;
}

export interface SerializationSubmissionAssetStatus {
  exists: boolean;
  score: number;
  status: PlatformSubmissionAssetAudit["status"] | "missing";
  adoptedVersions: number;
  generatedVariants: number;
  latestStrategy: string;
  verdict: string;
  href: string;
  actionLabel: string;
}

export interface SerializationFinalSubmissionGate {
  status: PlatformFinalSubmissionGate["status"] | "unknown";
  label: string;
  headline: string;
  verdict: string;
  nextAction: string;
  score: number;
  blockers: string[];
}

export interface SerializationPublishSnapshot {
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

export interface SerializationPublishBaselineStatus {
  exists: boolean;
  id: string | null;
  action: string;
  title: string;
  preflightScore: number;
  chapterCount: number;
  wordCount: number;
  createdAt: Date | string | null;
  verdict: string;
  href: string;
  downloadHref: string;
  actionLabel: string;
}

export interface SerializationPublishVersionHistoryItem {
  id: string;
  action: string;
  actionLabel: string;
  title: string;
  platformName: string;
  chapterCount: number;
  wordCount: number;
  preflightScore: number;
  canExport: boolean;
  createdAt: Date | string;
  href: string;
  downloadHref: string;
}

export interface SerializationPublishEffectAction {
  id: string;
  label: string;
  priority: "high" | "medium" | "low";
  area: string;
  detail: string;
  evidence: string;
  href: string;
  actionLabel: string;
}

export interface SerializationPublishEffectStatus {
  status: PlatformPublishEffectSummary["status"] | "unknown";
  label: string;
  records: number;
  totalViews: number;
  clickRatePercent: number;
  favoriteRatePercent: number;
  followRatePercent: number;
  comparisonStatus: PlatformPublishEffectSummary["comparison"]["status"];
  verdict: string;
  nextAction: string;
  href: string;
  actionLabel: string;
  optimizationStatus: PlatformPublishEffectOptimization["status"] | "unknown";
  optimizationHeadline: string;
  actions: SerializationPublishEffectAction[];
}

export interface SerializationOpsInput {
  project: SerializationProject;
  platform: PlatformProfile;
  chapters: SerializationChapter[];
  aiTasks: SerializationTask[];
  submissionChecklist: SubmissionChecklist;
  submissionAssets?: SerializationSubmissionAsset[];
  submissionAssetVersions?: SerializationSubmissionAssetVersion[];
  finalGate?: PlatformFinalSubmissionGate | null;
  publishSnapshots?: SerializationPublishSnapshot[];
  publishEffect?: PlatformPublishEffectSummary | null;
  effectOptimization?: PlatformPublishEffectOptimization | null;
}

export interface SerializationAction {
  id: string;
  label: string;
  priority: "high" | "medium" | "low";
  detail: string;
  chapterId?: string;
  href?: string;
  hrefLabel?: string;
  execution: SerializationActionExecution | null;
}

export interface SerializationActionExecution {
  label: string;
  method: "PATCH" | "POST";
  endpoint: string;
  payload: Record<string, string | number | boolean>;
}

export interface SerializationOpsDashboard {
  platformName: string;
  dailyWordTarget: number;
  progressPercent: number;
  publishReadyCount: number;
  reviewQueueCount: number;
  revisionQueueCount: number;
  submissionReadinessPercent: number;
  submissionAssetStatus: SerializationSubmissionAssetStatus;
  finalSubmissionGate: SerializationFinalSubmissionGate;
  publishBaselineStatus: SerializationPublishBaselineStatus;
  publishVersionHistory: SerializationPublishVersionHistoryItem[];
  publishEffectStatus: SerializationPublishEffectStatus;
  nextPublishChapter: SerializationChapter | null;
  actions: SerializationAction[];
  warnings: string[];
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function dailyWordTarget(project: SerializationProject, platform: PlatformProfile) {
  if (/6k|6000/.test(project.updateCadence)) return 6000;
  if (/4k|4000/.test(project.updateCadence)) return 4000;
  if (/2k|2000/.test(project.updateCadence)) return 2000;
  if (platform.category === "free") return 4000;
  if (platform.category === "paid") return 3000;
  if (platform.category === "short") return 2000;
  return 2500;
}

function latestTask(tasks: SerializationTask[], chapterId: string, taskType: string) {
  return tasks
    .filter((task) => task.chapterId === chapterId && task.taskType === taskType)
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0];
}

function parseReviewDecision(task: SerializationTask | undefined) {
  if (!task?.outputText) return null;
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

function reviewed(chapter: SerializationChapter, tasks: SerializationTask[]) {
  return latestTask(tasks, chapter.id, "chapter_review")?.status === "succeeded";
}

function secondPassed(chapter: SerializationChapter, tasks: SerializationTask[]) {
  return latestTask(tasks, chapter.id, "chapter_second_pass")?.status === "succeeded";
}

function normalizeFinalSubmissionGate(finalGate: PlatformFinalSubmissionGate | null | undefined): SerializationFinalSubmissionGate {
  if (!finalGate) {
    return {
      status: "unknown",
      label: "待判断",
      headline: "发布终检还没有生成。",
      verdict: "进入发布中心后才能得到最终投前判断。",
      nextAction: "查看发布中心",
      score: 0,
      blockers: [],
    };
  }

  return {
    status: finalGate.status,
    label: finalGate.label,
    headline: finalGate.headline,
    verdict: finalGate.verdict,
    nextAction: finalGate.nextAction,
    score: finalGate.score,
    blockers: finalGate.blockers,
  };
}

function actionLabel(action: string) {
  if (action === "snapshot") return "发布基准";
  if (action === "download") return "下载记录";
  if (action === "archive") return "全平台归档";
  if (action === "restore") return "恢复版本";
  if (action === "copy") return "复制记录";
  return "发布版本";
}

export function buildSerializationPublishBaselineStatus(input: Pick<SerializationOpsInput, "project" | "platform" | "publishSnapshots">): SerializationPublishBaselineStatus {
  const records = (input.publishSnapshots ?? [])
    .filter((snapshot) => snapshot.platformId === input.platform.id && snapshot.canExport)
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  const latest = records.find((snapshot) => snapshot.action === "snapshot") ?? records[0] ?? null;
  const downloadHref = `/api/projects/${input.project.id ?? "current"}/platform-export?format=markdown&platformId=${input.platform.id}`;

  if (!latest) {
    return {
      exists: false,
      id: null,
      action: "",
      title: "",
      preflightScore: 0,
      chapterCount: 0,
      wordCount: 0,
      createdAt: null,
      verdict: "还没有保存发布包基准。",
      href: "#platform-export",
      downloadHref,
      actionLabel: "保存发布基准",
    };
  }

  return {
    exists: true,
    id: latest.id,
    action: latest.action,
    title: latest.title,
    preflightScore: latest.preflightScore,
    chapterCount: latest.chapterCount,
    wordCount: latest.wordCount,
    createdAt: latest.createdAt,
    verdict: `最近${actionLabel(latest.action)}：${latest.title}，质检 ${latest.preflightScore} 分，${latest.chapterCount} 章 / ${latest.wordCount} 字。`,
    href: "#package-version-history",
    downloadHref,
    actionLabel: "下载发布包",
  };
}

export function buildSerializationPublishVersionHistory(input: Pick<SerializationOpsInput, "project" | "platform" | "publishSnapshots">): SerializationPublishVersionHistoryItem[] {
  return (input.publishSnapshots ?? [])
    .filter((snapshot) => snapshot.platformId === input.platform.id)
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 5)
    .map((snapshot) => ({
      id: snapshot.id,
      action: snapshot.action,
      actionLabel: actionLabel(snapshot.action),
      title: snapshot.title,
      platformName: snapshot.platformName,
      chapterCount: snapshot.chapterCount,
      wordCount: snapshot.wordCount,
      preflightScore: snapshot.preflightScore,
      canExport: snapshot.canExport,
      createdAt: snapshot.createdAt,
      href: "#package-version-history",
      downloadHref: `/api/projects/${input.project.id ?? "current"}/platform-export?versionId=${snapshot.id}&format=markdown`,
    }));
}

function publishEffectLabel(status: SerializationPublishEffectStatus["status"]) {
  if (status === "empty") return "待回收";
  if (status === "weak") return "偏弱";
  if (status === "watch") return "观察";
  if (status === "promising") return "有苗头";
  if (status === "signed") return "已验证";
  return "待判断";
}

function publishEffectActionLabel(execution: string) {
  if (execution === "generate_asset_variants") return "生成候选";
  if (execution === "rewrite_first_three") return "重写前三章";
  return "去处理";
}

export function buildSerializationPublishEffectStatus(input: Pick<SerializationOpsInput, "publishEffect" | "effectOptimization">): SerializationPublishEffectStatus {
  const effect = input.publishEffect ?? null;
  const optimization = input.effectOptimization ?? null;

  if (!effect) {
    return {
      status: "unknown",
      label: "待判断",
      records: 0,
      totalViews: 0,
      clickRatePercent: 0,
      favoriteRatePercent: 0,
      followRatePercent: 0,
      comparisonStatus: "none",
      verdict: "发布效果还没有生成判断。",
      nextAction: "进入发布中心录入真实数据。",
      href: "#publish-effect-panel",
      actionLabel: "录入发布效果",
      optimizationStatus: optimization?.status ?? "unknown",
      optimizationHeadline: optimization?.headline ?? "暂无发布效果优化动作。",
      actions: [],
    };
  }

  const actions = (optimization?.actions ?? []).slice(0, 3).map((action) => ({
    id: action.id,
    label: action.label,
    priority: action.priority,
    area: action.area,
    detail: action.detail,
    evidence: action.evidence,
    href: action.href,
    actionLabel: publishEffectActionLabel(action.execution),
  }));

  return {
    status: effect.status,
    label: publishEffectLabel(effect.status),
    records: effect.records,
    totalViews: effect.totalViews,
    clickRatePercent: effect.clickRatePercent,
    favoriteRatePercent: effect.favoriteRatePercent,
    followRatePercent: effect.followRatePercent,
    comparisonStatus: effect.comparison.status,
    verdict: effect.verdict,
    nextAction: effect.nextAction,
    href: effect.status === "empty" ? "#publish-effect-panel" : actions[0]?.href ?? "#publish-effect-panel",
    actionLabel: effect.status === "empty" ? "录入发布效果" : actions[0]?.actionLabel ?? "查看复盘",
    optimizationStatus: optimization?.status ?? "unknown",
    optimizationHeadline: optimization?.headline ?? "暂无发布效果优化动作。",
    actions,
  };
}

function parseJsonObject(text: string | null | undefined) {
  if (!text) return null;
  try {
    const parsed = JSON.parse(text) as unknown;
    return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function taskPlatformId(task: SerializationTask) {
  const parsed = parseJsonObject(task.inputSnapshot);
  return typeof parsed?.platformId === "string" ? parsed.platformId : null;
}

function countOptimizationVariants(task: SerializationTask) {
  if (task.status !== "succeeded") return 0;
  const parsed = parseJsonObject(task.outputText);
  const variants = parsed?.variants;
  return Array.isArray(variants) ? variants.length : 0;
}

export function buildSerializationSubmissionAssetStatus(input: Pick<SerializationOpsInput, "platform" | "submissionAssets" | "submissionAssetVersions" | "aiTasks">): SerializationSubmissionAssetStatus {
  const asset = input.submissionAssets?.find((item) => item.platformId === input.platform.id) ?? null;
  const versions = (input.submissionAssetVersions ?? []).filter((version) => version.platformId === input.platform.id);
  const adoptedVersions = versions.filter((version) => version.action === "adopt");
  const generatedVariants = input.aiTasks
    .filter((task) => task.taskType === "platform_submission_asset_optimize" && taskPlatformId(task) === input.platform.id)
    .reduce((sum, task) => sum + countOptimizationVariants(task), 0);
  const latestAdopted = adoptedVersions
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0];
  const audit = asset
    ? buildSubmissionAssetAudit(input.platform, {
      title: asset.title,
      logline: asset.logline,
      synopsis: asset.synopsis,
      overseasSynopsis: asset.overseasSynopsis,
      tags: asset.tags,
    })
    : null;

  if (!asset || !audit) {
    return {
      exists: false,
      score: 0,
      status: "missing",
      adoptedVersions: 0,
      generatedVariants,
      latestStrategy: "",
      verdict: "投稿资料还没有保存为发布资产。",
      href: "#submission-package",
      actionLabel: "保存发布资产",
    };
  }

  const latestStrategy = latestAdopted?.strategy?.trim() ?? "";
  const actionLabel = audit.status === "ready"
    ? generatedVariants > 0 && adoptedVersions.length === 0
      ? "采纳候选"
      : "查看发布资产"
    : "修投稿资产";
  const verdict = audit.status === "ready"
    ? adoptedVersions.length > 0
      ? `投稿资产可用，已采纳 ${adoptedVersions.length} 个候选${latestStrategy ? `：${latestStrategy}` : ""}。`
      : generatedVariants > 0
        ? `投稿资产可用，但 ${generatedVariants} 个 AI 候选还没采纳。`
        : "投稿资产可用，可以进入发布包检查。"
    : `投稿资产 ${audit.score} 分，仍有 ${audit.issues.length} 个字段问题。`;

  return {
    exists: true,
    score: audit.score,
    status: audit.status,
    adoptedVersions: adoptedVersions.length,
    generatedVariants,
    latestStrategy,
    verdict,
    href: audit.status === "ready" && generatedVariants > 0 && adoptedVersions.length === 0 ? "#submission-asset-editor" : "#platform-export",
    actionLabel,
  };
}

function buildActions(
  input: SerializationOpsInput,
  reviewQueue: SerializationChapter[],
  revisionQueue: SerializationChapter[],
  publishReady: SerializationChapter[],
  assetStatus: SerializationSubmissionAssetStatus,
  finalGate: SerializationFinalSubmissionGate,
  baselineStatus: SerializationPublishBaselineStatus,
  effectStatus: SerializationPublishEffectStatus,
) {
  const actions: SerializationAction[] = [];
  const failedChecklist = input.submissionChecklist.items.filter((item) => item.status === "todo" || item.status === "risk");

  if (reviewQueue[0]) {
    actions.push({
      id: "review-next",
      label: "先审稿",
      priority: "high",
      chapterId: reviewQueue[0].id,
      detail: `第 ${reviewQueue[0].order} 章《${reviewQueue[0].title}》已有正文但未审稿。`,
      execution: {
        label: "执行审稿",
        method: "POST",
        endpoint: "/api/ai/tasks/chapter-review",
        payload: { chapterId: reviewQueue[0].id },
      },
    });
  }
  if (revisionQueue[0]) {
    const chapter = revisionQueue[0];
    actions.push({
      id: "revise-next",
      label: "先二改",
      priority: "high",
      chapterId: chapter.id,
      detail: `第 ${chapter.order} 章《${chapter.title}》审稿分偏低或仍有问题。`,
      execution: {
        label: "执行二改",
        method: "POST",
        endpoint: `/api/chapters/${chapter.id}/second-pass`,
        payload: {
          instruction: "按最近一次审稿结论执行二改：强化开头钩子、爽点兑现、人物选择和章末追读，保留原主线事实。",
          mode: "platform_fit",
          targetWords: Math.max(chapter.wordCount, 1200),
        },
      },
    });
  }
  if (publishReady[0]) {
    const chapter = publishReady[0];
    actions.push({
      id: "publish-next",
      label: "可发布",
      priority: "medium",
      chapterId: chapter.id,
      detail: `第 ${chapter.order} 章《${chapter.title}》已审稿并二改，可进入发布/定稿检查。`,
      execution: {
        label: "标记定稿",
        method: "PATCH",
        endpoint: `/api/chapters/${chapter.id}`,
        payload: { status: "final" },
      },
    });
  }
  if (failedChecklist[0]) {
    const repairTarget = submissionGapRepairTarget(failedChecklist[0].id);
    actions.push({
      id: "submission-gap",
      label: "补投稿资料",
      priority: failedChecklist[0].status === "todo" ? "high" : "medium",
      detail: `${failedChecklist[0].label}：${failedChecklist[0].detail} 下一步：${repairTarget.nextStep}`,
      href: repairTarget.href,
      hrefLabel: repairTarget.label,
      execution: null,
    });
  }
  if (!failedChecklist[0] && assetStatus.status !== "ready") {
    actions.push({
      id: "submission-asset-gap",
      label: assetStatus.exists ? "修投稿资产" : "保存投稿资产",
      priority: assetStatus.status === "blocked" || assetStatus.status === "missing" ? "high" : "medium",
      detail: `${assetStatus.verdict} 下一步：${assetStatus.actionLabel}。`,
      href: assetStatus.href,
      hrefLabel: assetStatus.actionLabel,
      execution: null,
    });
  }
  if (!failedChecklist[0] && assetStatus.status === "ready" && assetStatus.generatedVariants > 0 && assetStatus.adoptedVersions === 0) {
    actions.push({
      id: "adopt-submission-asset",
      label: "采纳资产候选",
      priority: "medium",
      detail: assetStatus.verdict,
      href: assetStatus.href,
      hrefLabel: assetStatus.actionLabel,
      execution: null,
    });
  }
  if (!failedChecklist[0] && assetStatus.status === "ready" && finalGate.status === "ready_to_submit" && !baselineStatus.exists) {
    actions.push({
      id: "save-publish-baseline",
      label: "保存发布基准",
      priority: "high",
      detail: `${finalGate.headline} ${finalGate.nextAction}`,
      href: "#platform-export",
      hrefLabel: "查看发布包",
      execution: {
        label: "保存基准",
        method: "POST",
        endpoint: `/api/projects/${input.project.id ?? "current"}/platform-export`,
        payload: { action: "snapshot", platformId: input.platform.id },
      },
    });
  }
  if (!failedChecklist[0] && assetStatus.status === "ready" && finalGate.status === "ready_to_submit" && baselineStatus.exists) {
    actions.push({
      id: "download-publish-package",
      label: "下载发布包",
      priority: "medium",
      detail: `${baselineStatus.verdict} 可以下载当前发布包或查看版本历史。`,
      href: baselineStatus.downloadHref,
      hrefLabel: "下载发布包",
      execution: null,
    });
  }
  if (!failedChecklist[0] && baselineStatus.exists && effectStatus.status === "empty") {
    actions.push({
      id: "record-publish-effect",
      label: "回收发布效果",
      priority: "high",
      detail: `${effectStatus.verdict} ${effectStatus.nextAction}`,
      href: effectStatus.href,
      hrefLabel: effectStatus.actionLabel,
      execution: null,
    });
  }
  if (!failedChecklist[0] && baselineStatus.exists && effectStatus.status !== "empty" && effectStatus.actions[0]) {
    actions.push({
      id: "optimize-publish-effect",
      label: "按效果优化",
      priority: effectStatus.status === "weak" || effectStatus.comparisonStatus === "declined" ? "high" : "medium",
      detail: `${effectStatus.optimizationHeadline} 下一步：${effectStatus.actions[0].detail}`,
      href: effectStatus.actions[0].href,
      hrefLabel: effectStatus.actions[0].actionLabel,
      execution: null,
    });
  }
  if (actions.length === 0) {
    actions.push({
      id: "expand-production",
      label: "扩展生产",
      priority: "low",
      detail: "当前没有明显运营卡点，可以继续扩展章节排期或准备多平台投稿版本。",
      execution: null,
    });
  }

  return actions;
}

function submissionGapRepairTarget(itemId: string) {
  const targets: Record<string, { href: string; label: string; nextStep: string }> = {
    title: {
      href: "#submission-asset-editor",
      label: "编辑发布资料",
      nextStep: "进入发布资料编辑器，补标题和平台展示文案。",
    },
    genre: {
      href: "#submission-asset-editor",
      label: "编辑发布资料",
      nextStep: "进入发布资料编辑器，补题材标签和平台定位。",
    },
    "selling-point": {
      href: "#submission-asset-editor",
      label: "优化卖点",
      nextStep: "进入发布资料编辑器或投稿包，补一句话卖点。",
    },
    "word-count": {
      href: "#ai-pipeline",
      label: "补正文",
      nextStep: "进入批量初稿中心，先把可投稿正文量补上。",
    },
    "first-three": {
      href: "#chapter-production",
      label: "补前三章",
      nextStep: "补齐前三章卡片，再进入批量初稿生产。",
    },
    "opening-hooks": {
      href: "#retention-diagnostic",
      label: "补开头钩子",
      nextStep: "进入留存诊断，逐章补开头钩子。",
    },
    cliffhangers: {
      href: "#retention-diagnostic",
      label: "补章末悬念",
      nextStep: "进入留存诊断，逐章补章末悬念。",
    },
    "reviewed-first-three": {
      href: "#review-pipeline",
      label: "审前三章",
      nextStep: "进入批量审稿流水线，先审前三章。",
    },
    "final-readiness": {
      href: "#serialization-ops",
      label: "处理定稿",
      nextStep: "优先完成审稿、二改，再把可发布章节标记定稿。",
    },
    "platform-risk": {
      href: "#platform-export",
      label: "做平台适配",
      nextStep: "进入平台发布中心，生成平台适配版资料并留下版本记录。",
    },
  };

  return targets[itemId] ?? {
    href: "#submission-package",
    label: "查看投稿包",
    nextStep: "进入投稿资料区，按检查项补齐。",
  };
}

export function buildSerializationOpsDashboard(input: SerializationOpsInput): SerializationOpsDashboard {
  const submissionAssetStatus = buildSerializationSubmissionAssetStatus(input);
  const finalSubmissionGate = normalizeFinalSubmissionGate(input.finalGate);
  const publishBaselineStatus = buildSerializationPublishBaselineStatus(input);
  const publishVersionHistory = buildSerializationPublishVersionHistory(input);
  const publishEffectStatus = buildSerializationPublishEffectStatus(input);
  const draftedChapters = input.chapters.filter((chapter) => chapter.wordCount > 0);
  const reviewQueue = draftedChapters.filter((chapter) => !reviewed(chapter, input.aiTasks));
  const revisionQueue = draftedChapters.filter((chapter) => {
    const reviewTask = latestTask(input.aiTasks, chapter.id, "chapter_review");
    const decision = parseReviewDecision(reviewTask);
    return reviewed(chapter, input.aiTasks) && (decision?.shouldSecondPass ?? true);
  });
  const publishReady = draftedChapters.filter((chapter) => (
    reviewed(chapter, input.aiTasks)
    && !revisionQueue.some((item) => item.id === chapter.id)
    && (secondPassed(chapter, input.aiTasks) || chapter.status === "final")
  ));
  const progressPercent = input.project.targetWordCount > 0
    ? clampPercent((input.project.currentWordCount / input.project.targetWordCount) * 100)
    : 0;
  const target = dailyWordTarget(input.project, input.platform);
  const warnings: string[] = [];

  if (draftedChapters.length === 0) warnings.push("还没有可运营正文，先用批量初稿生产中心出稿。");
  if (reviewQueue.length > 0) warnings.push(`${reviewQueue.length} 章已有正文但未审稿，直接发布会放大留存风险。`);
  if (revisionQueue.length > 0) warnings.push(`${revisionQueue.length} 章需要二改后再发布。`);
  if (publishReady.length === 0 && draftedChapters.length > 0) warnings.push("暂无发布就绪章节，先完成审稿和二改。");
  if (input.submissionChecklist.readinessPercent < 80) warnings.push(`投稿准备度 ${input.submissionChecklist.readinessPercent}%，还不适合正式投放。`);
  if (submissionAssetStatus.status === "missing") warnings.push("投稿资料还没保存为发布资产，发布中心无法追踪采纳和质检。");
  if (submissionAssetStatus.status === "blocked") warnings.push(`投稿资产质检 ${submissionAssetStatus.score} 分，有阻塞项，不能直接投。`);
  if (submissionAssetStatus.status === "needs_work") warnings.push(`投稿资产质检 ${submissionAssetStatus.score} 分，还需要打磨。`);
  if (submissionAssetStatus.status === "ready" && submissionAssetStatus.generatedVariants > 0 && submissionAssetStatus.adoptedVersions === 0) {
    warnings.push(`已生成 ${submissionAssetStatus.generatedVariants} 个投稿资产候选，但还没有采纳版本。`);
  }
  if (finalSubmissionGate.status === "fix_first") warnings.push(`最终闸门 ${finalSubmissionGate.score} 分：${finalSubmissionGate.nextAction}`);
  if (finalSubmissionGate.status === "do_not_submit") warnings.push(`最终闸门 ${finalSubmissionGate.score} 分，别投：${finalSubmissionGate.blockers[0] ?? finalSubmissionGate.verdict}`);
  if (finalSubmissionGate.status === "ready_to_submit" && !publishBaselineStatus.exists) warnings.push("终检已过，但还没有保存发布基准。");
  if (publishBaselineStatus.exists && publishEffectStatus.status === "empty") warnings.push("发布包已有基准，但还没录入真实发布效果。");
  if (publishEffectStatus.status === "weak") warnings.push(`发布效果偏弱：${publishEffectStatus.nextAction}`);
  if (publishEffectStatus.comparisonStatus === "declined") warnings.push("最近一轮发布效果对照下滑，先复盘再继续加码。");

  return {
    platformName: input.platform.name,
    dailyWordTarget: target,
    progressPercent,
    publishReadyCount: publishReady.length,
    reviewQueueCount: reviewQueue.length,
    revisionQueueCount: revisionQueue.length,
    submissionReadinessPercent: input.submissionChecklist.readinessPercent,
    submissionAssetStatus,
    finalSubmissionGate,
    publishBaselineStatus,
    publishVersionHistory,
    publishEffectStatus,
    nextPublishChapter: publishReady[0] ?? null,
    actions: buildActions(input, reviewQueue, revisionQueue, publishReady, submissionAssetStatus, finalSubmissionGate, publishBaselineStatus, publishEffectStatus),
    warnings,
  };
}
