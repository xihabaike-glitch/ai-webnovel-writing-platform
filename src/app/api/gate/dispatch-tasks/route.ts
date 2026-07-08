import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import {
  buildStoryTreeRecheck,
  storyTreeBaselineScore,
  storyTreeRecheckLine,
} from "@/lib/ai/storyTreeRecheck";
import { buildStoryTreeQualityAudit } from "@/lib/ai/storyTreeQualityAudit";
import { prisma } from "@/lib/db/prisma";
import {
  buildRouteConfirmationGovernanceAutoFollowUpDispatches,
  buildRouteConfirmationGovernanceEvidenceFromDispatchTasks,
} from "@/lib/model-gateway/routeConfirmation";
import { getPlatformProfile, type PlatformId } from "@/lib/platforms/platformProfiles";
import { buildFirstDayFollowUpDispatch, buildFirstDayWorkflow } from "@/lib/projects/firstDayWorkflow";
import { validateFirstDayDispatchCompletionEvidence } from "@/lib/projects/firstDayWorkflowView";
import { buildChapterProductionRecheckFollowUpTasks } from "@/lib/projects/chapterProductionRecheckFollowUp";
import { buildProjectControlDashboard } from "@/lib/projects/projectControlDashboard";
import {
  buildGateDispatchCompletionReceipt,
  buildGatePublishEffectReceipt,
  reviewGateDispatchCompletionEvidence,
} from "@/lib/projects/gateActionReceipts";
import type {
  GateEvidenceLoopRecheck,
  GateStoryTreeRecheck,
  GateStructureDiagnosticRecheck,
  GateActionReceipt,
  GatePlatformGrowthDispatchItem,
  GatePlatformGrowthDispatchState,
  PersistedGatePlatformDispatchTask,
} from "@/lib/projects/gateActionReceipts";
import { parsePublishSnapshotTags } from "@/lib/projects/platformPublishExport";
import { buildProjectContextPack } from "@/lib/projects/projectContextPack";
import { findProjectStartTacticSummary } from "@/lib/projects/projectStartTactics";
import { buildSubmissionChecklist } from "@/lib/projects/submissionChecklist";
import { buildSubmissionDecisionCompletionEffect } from "@/lib/projects/submissionDecisionCompletion";
import { buildStoryStructureDiagnostic } from "@/lib/projects/storyStructureDiagnostic";
import {
  autoDispatchSecondMetricDecision,
  autoDispatchSecondMetricFollowups,
  autoDispatchStartMetricDecision,
  autoDispatchStartMetricFollowups,
} from "@/lib/projects/startMetricDecisionAutoDispatch";

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function integer(value: unknown) {
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : 0;
  return Number.isFinite(number) ? Math.max(0, Math.round(number)) : 0;
}

function stringList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function date(value: unknown) {
  const parsed = new Date(text(value));
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function projectIdFromHref(href: string) {
  const match = href.match(/\/projects\/([^/#?]+)/);
  return match?.[1] ?? null;
}

function state(value: unknown): GatePlatformGrowthDispatchState {
  if (value === "completed") return "completed";
  if (value === "assigned") return "assigned";
  return "queued";
}

function parseJsonList(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return stringList(parsed);
  } catch {
    return [];
  }
}

function hasDispatchCompletionAcceptanceSignal(text: string) {
  return /人工验收|验收|通过|退回|采用|未采用|确认|驳回/.test(text);
}

function hasDispatchCompletionNextStepSignal(text: string) {
  return /下一步|下一动作|下一轮|下一批|继续|暂停|回总闸门|回作品|修复|复检|放量结论|复验结论|结论/.test(text);
}

function missingDispatchReceiptCloseoutLabels(task: {
  ownerRole: string;
  detail: string;
  actionLabel: string;
  href: string;
}, completionEvidence: string) {
  const text = completionEvidence.trim();
  const checks = [
    { label: "执行角色", ready: Boolean(task.ownerRole.trim()) },
    { label: "输入", ready: Boolean(task.detail.trim()) },
    { label: "输出", ready: text.length >= 8 },
    { label: "人工验收", ready: hasDispatchCompletionAcceptanceSignal(text) },
    { label: "下一步", ready: hasDispatchCompletionNextStepSignal(text) || Boolean(task.actionLabel.trim() && task.href.trim()) },
  ];

  return checks.filter((item) => !item.ready).map((item) => item.label);
}

function toTask(item: {
  id: string;
  dispatchKey: string;
  projectId: string | null;
  platformId: string;
  platformName: string;
  stage: string;
  state: string;
  priorityScore: number;
  ownerRole: string;
  title: string;
  detail: string;
  dueLabel: string;
  actionLabel: string;
  href: string;
  acceptanceCriteria: string;
  evidence: string;
  sourceReceiptId: string | null;
  completionEvidence: string;
  reviewLatestAt: Date;
  assignedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): PersistedGatePlatformDispatchTask {
  return {
    databaseId: item.id,
    dispatchKey: item.dispatchKey,
    id: item.dispatchKey,
    projectId: item.projectId,
    platformId: item.platformId,
    platformName: item.platformName,
    stage: item.stage as PersistedGatePlatformDispatchTask["stage"],
    state: state(item.state),
    priorityScore: item.priorityScore,
    ownerRole: item.ownerRole,
    title: item.title,
    detail: item.detail,
    dueLabel: item.dueLabel,
    actionLabel: item.actionLabel,
    href: item.href,
    acceptanceCriteria: parseJsonList(item.acceptanceCriteria),
    evidence: parseJsonList(item.evidence),
    sourceReceiptId: item.sourceReceiptId,
    completionEvidence: item.completionEvidence,
    reviewLatestAt: item.reviewLatestAt.toISOString(),
    assignedAt: item.assignedAt?.toISOString() ?? null,
    completedAt: item.completedAt?.toISOString() ?? null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

function shouldWriteKnowledgeFeedback(task: {
  projectId: string | null;
  platformId: string;
}) {
  return Boolean(task.projectId && task.platformId && task.platformId !== "model-routing");
}

async function writeDispatchCompletionKnowledgeFeedback(task: Awaited<ReturnType<typeof prisma.gateDispatchTask.update>>) {
  if (!shouldWriteKnowledgeFeedback(task)) return null;
  const receiptId = `gate-dispatch-completion:${task.dispatchKey}`;
  const evidence = task.completionEvidence.trim();
  if (!evidence) return null;

  return prisma.platformKnowledgeFeedbackReceipt.upsert({
    where: { receiptId },
    create: {
      receiptId,
      projectId: task.projectId as string,
      platformId: task.platformId,
      platformName: task.platformName,
      actionLabel: "Gate 派单完成回灌",
      title: `${task.platformName}｜Gate 派单完成回灌`,
      message: `Gate 派单「${task.title}」已完成：${evidence}`,
      completedStepLabel: `Gate 派单完成：${task.title}`,
      stopReason: "已收口派单完成证据，无需再次派单。",
      nextAction: "回到平台导出中心复核反哺历史，并刷新项目控制台。",
      href: task.href || "#platform-export",
      severity: "success",
      createdAt: task.completedAt ?? new Date(),
    },
    update: {
      platformId: task.platformId,
      platformName: task.platformName,
      actionLabel: "Gate 派单完成回灌",
      title: `${task.platformName}｜Gate 派单完成回灌`,
      message: `Gate 派单「${task.title}」已完成：${evidence}`,
      completedStepLabel: `Gate 派单完成：${task.title}`,
      stopReason: "已收口派单完成证据，无需再次派单。",
      nextAction: "回到平台导出中心复核反哺历史，并刷新项目控制台。",
      href: task.href || "#platform-export",
      severity: "success",
      createdAt: task.completedAt ?? new Date(),
    },
  });
}

async function writeSubmissionDecisionCompletionEffect(task: Awaited<ReturnType<typeof prisma.gateDispatchTask.update>>) {
  const effect = buildSubmissionDecisionCompletionEffect({
    projectId: task.projectId,
    platformId: task.platformId,
    platformName: task.platformName,
    dispatchKey: task.dispatchKey,
    stage: task.stage,
    completionEvidence: task.completionEvidence,
    completedAt: task.completedAt,
  });
  if (!effect) return null;

  const existingMetric = await prisma.platformPublishMetric.findFirst({
    where: {
      projectId: effect.projectId,
      platformId: effect.platformId,
      notes: { contains: effect.dispatchKey },
    },
    orderBy: { createdAt: "desc" },
  });
  const metricData = {
    platformName: effect.platformName,
    views: effect.views,
    clicks: effect.clicks,
    favorites: effect.favorites,
    follows: effect.follows,
    comments: effect.comments,
    paidReads: effect.paidReads,
    editorFeedback: effect.editorFeedback,
    contractStatus: effect.contractStatus,
    publishUrl: effect.publishUrl,
    notes: effect.notes,
    snapshotDate: effect.snapshotDate,
  };
  const metric = existingMetric
    ? await prisma.platformPublishMetric.update({
        where: { id: existingMetric.id },
        data: metricData,
      })
    : await prisma.platformPublishMetric.create({
        data: {
          projectId: effect.projectId,
          platformId: effect.platformId,
          ...metricData,
        },
      });
  const receipt = buildGatePublishEffectReceipt({
    projectId: effect.projectId,
    platformId: effect.platformId,
    platformName: effect.platformName,
    metric: {
      views: effect.views,
      clicks: effect.clicks,
      favorites: effect.favorites,
      follows: effect.follows,
      comments: effect.comments,
      paidReads: effect.paidReads,
      snapshotDate: effect.snapshotDate,
    },
    now: dateAfter(task.completedAt ?? new Date()),
  });

  await prisma.gateActionAudit.upsert({
    where: { receiptId: receipt.id },
    create: {
      receiptId: receipt.id,
      actionId: receipt.actionId,
      projectId: effect.projectId,
      platformId: receipt.platformId ?? effect.platformId,
      platformName: receipt.platformName ?? effect.platformName,
      label: receipt.label,
      detail: receipt.detail,
      href: receipt.href,
      status: receipt.status,
      message: `${receipt.message}${existingMetric ? " 已存在同派单效果记录，本次只刷新审计回执。" : ""}`,
      executionType: receipt.executionType,
      succeededCount: receipt.succeededCount,
      failedCount: receipt.failedCount,
      taskId: task.dispatchKey,
      recheckStatus: receipt.recheck.status,
      recheckLabel: receipt.recheck.label,
      recheckDetail: receipt.recheck.detail,
      recheckAction: receipt.recheck.actionLabel,
      payload: JSON.stringify({
        submissionDecisionCompletion: {
          dispatchKey: task.dispatchKey,
          review: effect.review,
        },
      }),
      createdAt: new Date(receipt.createdAt),
    },
    update: {
      projectId: effect.projectId,
      platformId: receipt.platformId ?? effect.platformId,
      platformName: receipt.platformName ?? effect.platformName,
      label: receipt.label,
      detail: receipt.detail,
      href: receipt.href,
      status: receipt.status,
      message: `${receipt.message}${existingMetric ? " 已存在同派单效果记录，本次只刷新审计回执。" : ""}`,
      executionType: receipt.executionType,
      succeededCount: receipt.succeededCount,
      failedCount: receipt.failedCount,
      taskId: task.dispatchKey,
      recheckStatus: receipt.recheck.status,
      recheckLabel: receipt.recheck.label,
      recheckDetail: receipt.recheck.detail,
      recheckAction: receipt.recheck.actionLabel,
      payload: JSON.stringify({
        submissionDecisionCompletion: {
          dispatchKey: task.dispatchKey,
          review: effect.review,
        },
      }),
      createdAt: new Date(receipt.createdAt),
    },
  });

  return {
    metricId: metric.id,
    receiptId: receipt.id,
    platformId: effect.platformId,
    platformName: effect.platformName,
    status: effect.review.status,
    headline: effect.review.headline,
    nextAction: effect.review.nextAction,
    evidence: effect.review.evidence,
  };
}

function dateAfter(value: Date | string) {
  return new Date(new Date(value).getTime() + 1);
}

async function writeDispatchCompletionActionReceipt(task: Awaited<ReturnType<typeof prisma.gateDispatchTask.update>>) {
  if (!shouldWriteKnowledgeFeedback(task)) return null;
  const completionEvidence = task.completionEvidence.trim();
  if (!completionEvidence) return null;

  const receipt = buildGateDispatchCompletionReceipt({
    dispatch: {
      id: task.dispatchKey,
      platformId: task.platformId,
      platformName: task.platformName,
      stage: task.stage as GatePlatformGrowthDispatchItem["stage"],
      state: state(task.state),
      priorityScore: task.priorityScore,
      ownerRole: task.ownerRole,
      title: task.title,
      detail: task.detail,
      dueLabel: task.dueLabel,
      actionLabel: task.actionLabel,
      href: task.href,
      acceptanceCriteria: parseJsonList(task.acceptanceCriteria),
      evidence: parseJsonList(task.evidence),
      reviewLatestAt: task.reviewLatestAt.toISOString(),
    },
    completionEvidence,
    now: dateAfter(task.completedAt ?? new Date()),
  });

  const payload = JSON.stringify({
    dispatchCompletion: {
      dispatchKey: task.dispatchKey,
      completionEvidence,
    },
  });
  await prisma.gateActionAudit.upsert({
    where: { receiptId: receipt.id },
    create: {
      receiptId: receipt.id,
      actionId: receipt.actionId,
      projectId: task.projectId,
      platformId: receipt.platformId ?? task.platformId,
      platformName: receipt.platformName ?? task.platformName,
      label: receipt.label,
      detail: receipt.detail,
      href: receipt.href,
      status: receipt.status,
      message: receipt.message,
      executionType: receipt.executionType,
      succeededCount: receipt.succeededCount,
      failedCount: receipt.failedCount,
      taskId: receipt.taskId,
      recheckStatus: receipt.recheck.status,
      recheckLabel: receipt.recheck.label,
      recheckDetail: receipt.recheck.detail,
      recheckAction: receipt.recheck.actionLabel,
      payload,
      createdAt: new Date(receipt.createdAt),
    },
    update: {
      projectId: task.projectId,
      platformId: receipt.platformId ?? task.platformId,
      platformName: receipt.platformName ?? task.platformName,
      label: receipt.label,
      detail: receipt.detail,
      href: receipt.href,
      status: receipt.status,
      message: receipt.message,
      executionType: receipt.executionType,
      succeededCount: receipt.succeededCount,
      failedCount: receipt.failedCount,
      taskId: receipt.taskId,
      recheckStatus: receipt.recheck.status,
      recheckLabel: receipt.recheck.label,
      recheckDetail: receipt.recheck.detail,
      recheckAction: receipt.recheck.actionLabel,
      payload,
      createdAt: new Date(receipt.createdAt),
    },
  });

  return receipt;
}

function baselineEvidenceLoopScore(task: Awaited<ReturnType<typeof prisma.gateDispatchTask.update>>) {
  const evidence = parseJsonList(task.evidence);
  for (const item of evidence) {
    const match = item.match(/证据闭环\s*(\d+)\s*分/);
    if (!match) continue;
    const parsed = Number(match[1]);
    if (Number.isFinite(parsed)) return Math.max(0, Math.min(100, Math.round(parsed)));
  }
  return null;
}

function recheckVerdict(previousScore: number | null, currentScore: number): GateEvidenceLoopRecheck["verdict"] {
  if (previousScore === null) return "unknown";
  const delta = currentScore - previousScore;
  if (delta >= 3) return "improved";
  if (delta <= -3) return "declined";
  return "unchanged";
}

function evidenceLoopRecheckLine(recheck: GateEvidenceLoopRecheck) {
  const scoreText = recheck.previousScore === null
    ? `${recheck.currentScore} 分`
    : `${recheck.previousScore} -> ${recheck.currentScore} 分`;
  const verdictText = recheck.verdict === "improved"
    ? "分数变好"
    : recheck.verdict === "declined"
      ? "分数变差"
      : recheck.verdict === "unchanged"
        ? "分数未变"
        : "无历史基准";
  return `证据闭环复检：${scoreText}，${verdictText}：${recheck.label}`;
}

function structureDiagnosticRecheckLine(recheck: GateStructureDiagnosticRecheck) {
  const scoreText = recheck.previousScore === null
    ? `${recheck.currentScore} 分`
    : `${recheck.previousScore} -> ${recheck.currentScore} 分`;
  const verdictText = recheck.verdict === "improved"
    ? "分数变好"
    : recheck.verdict === "declined"
      ? "分数变差"
      : recheck.verdict === "unchanged"
        ? "分数未变"
        : "无历史基准";
  return `整书结构复查：${scoreText}，${verdictText}：${recheck.label}`;
}

async function persistEvidenceLoopRecheck(
  task: Awaited<ReturnType<typeof prisma.gateDispatchTask.update>>,
  recheck: GateEvidenceLoopRecheck | null,
) {
  if (!recheck) return task;
  const line = evidenceLoopRecheckLine(recheck);
  const evidence = Array.from(new Set([...parseJsonList(task.evidence), line]));
  return prisma.gateDispatchTask.update({
    where: { dispatchKey: task.dispatchKey },
    data: { evidence: JSON.stringify(evidence) },
  });
}

async function persistStructureDiagnosticRecheck(
  task: Awaited<ReturnType<typeof prisma.gateDispatchTask.update>>,
  recheck: GateStructureDiagnosticRecheck | null,
) {
  if (!recheck) return task;
  const line = structureDiagnosticRecheckLine(recheck);
  const evidence = Array.from(new Set([
    ...parseJsonList(task.evidence),
    line,
    ...recheck.weakItems.slice(0, 3).map((item) => `${item.label}：${item.status}，${item.evidence}`),
  ]));
  return prisma.gateDispatchTask.update({
    where: { dispatchKey: task.dispatchKey },
    data: { evidence: JSON.stringify(evidence) },
  });
}

function storyTreeDispatchIds(dispatchKey: string) {
  const match = dispatchKey.match(/^story-tree:([^:]+):([^:]+):([^:]+):([^:]+)$/);
  if (match) {
    return {
      projectId: match[1],
      chapterId: match[2],
      source: match[3],
      axisId: match[4],
    };
  }

  const followUpMatch = dispatchKey.match(/^story-tree-followup:([^:]+):([^:]+):/);
  if (!followUpMatch) return null;
  return {
    projectId: followUpMatch[1],
    chapterId: followUpMatch[2],
    source: "followup",
    axisId: "recheck",
  };
}

function structureDiagnosticProjectId(dispatchKey: string, projectId: string | null) {
  if (projectId && (
    dispatchKey.startsWith("structure-recheck-followup:")
    || dispatchKey.includes(":length-structure")
  )) return projectId;

  const precheckMatch = dispatchKey.match(/^submission-precheck:([^:]+):length-structure(?::[^:]+)?$/);
  if (precheckMatch) return precheckMatch[1];

  const followUpMatch = dispatchKey.match(/^structure-recheck-followup:([^:]+):/);
  return followUpMatch?.[1] ?? null;
}

function baselineStructureDiagnosticScore(task: Awaited<ReturnType<typeof prisma.gateDispatchTask.update>>) {
  const values = [
    ...parseJsonList(task.evidence),
    task.detail,
    task.completionEvidence,
  ];
  let score: number | null = null;
  for (const value of values) {
    const arrow = value.match(/(?:整书结构复查|结构诊断|结构健康度)[^0-9]*(\d+)\s*->\s*(\d+)\s*分/);
    const single = value.match(/(?:整书结构复查|整书结构诊断|结构诊断|结构健康度)[^0-9]*(\d+)\s*分/);
    const parsed = arrow ? Number(arrow[2]) : single ? Number(single[1]) : Number.NaN;
    if (Number.isFinite(parsed)) score = Math.max(0, Math.min(100, Math.round(parsed)));
  }
  return score;
}

async function buildStructureDiagnosticTaskRecheck(
  task: Awaited<ReturnType<typeof prisma.gateDispatchTask.update>>,
): Promise<GateStructureDiagnosticRecheck | null> {
  const projectId = structureDiagnosticProjectId(task.dispatchKey, task.projectId);
  if (!projectId) return null;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      chapters: { orderBy: { order: "asc" } },
      characters: { orderBy: { createdAt: "asc" } },
      foreshadows: { orderBy: { createdAt: "asc" } },
      outlineNodes: { orderBy: [{ depth: "asc" }, { order: "asc" }, { createdAt: "asc" }] },
      plotThreads: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!project) return null;

  const platform = getPlatformProfile(project.targetPlatform as PlatformId);
  const diagnostic = buildStoryStructureDiagnostic({
    project: {
      id: project.id,
      title: project.title,
      genre: project.genre,
      sellingPoint: project.sellingPoint,
      targetLengthType: project.targetLengthType,
      targetWordCount: project.targetWordCount,
      currentWordCount: project.currentWordCount,
    },
    platform,
    chapters: project.chapters,
    outlineNodes: project.outlineNodes,
    characters: project.characters,
    foreshadows: project.foreshadows,
    plotThreads: project.plotThreads,
  });
  const weakItems = diagnostic.items
    .filter((item) => item.status !== "pass")
    .map((item) => ({
      id: item.id,
      label: item.label,
      status: item.status === "fail" ? "fail" as const : "warn" as const,
      evidence: item.evidence,
      suggestion: item.suggestion,
    }));
  const previousScore = baselineStructureDiagnosticScore(task);

  return {
    projectId: project.id,
    platformId: platform.id,
    platformName: platform.name,
    previousScore,
    currentScore: diagnostic.score,
    delta: previousScore === null ? null : diagnostic.score - previousScore,
    label: diagnostic.score >= 80 ? "结构已过线" : "结构仍未过线",
    verdict: recheckVerdict(previousScore, diagnostic.score),
    topAction: diagnostic.actionPlan[0] ?? "继续补人物弧光、主干压力和伏笔回收。",
    weakItems,
  };
}

async function buildStoryTreeTaskRecheck(task: Awaited<ReturnType<typeof prisma.gateDispatchTask.update>>): Promise<GateStoryTreeRecheck | null> {
  const ids = storyTreeDispatchIds(task.dispatchKey);
  if (!ids) return null;
  const projectId = task.projectId ?? ids.projectId;
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
  if (!project) return null;
  const chapter = project.chapters.find((item) => item.id === ids.chapterId);
  if (!chapter) return null;
  const platform = getPlatformProfile(project.targetPlatform as PlatformId);
  const projectContext = buildProjectContextPack({
    currentChapterId: chapter.id,
    chapters: project.chapters,
    characters: project.characters,
    worldEntries: project.worldEntries,
    foreshadows: project.foreshadows,
    plotThreads: project.plotThreads,
  });
  const audit = buildStoryTreeQualityAudit({
    content: chapter.content,
    projectContext,
    startTactic: findProjectStartTacticSummary(project.worldEntries),
    chapter: {
      title: chapter.title,
      goal: chapter.goal,
      hook: chapter.hook,
      conflict: chapter.conflict,
      valueShift: chapter.valueShift,
      cliffhanger: chapter.cliffhanger,
    },
  });

  return buildStoryTreeRecheck({
    projectId,
    chapterId: chapter.id,
    previousScore: storyTreeBaselineScore(parseJsonList(task.evidence)),
    audit,
  });
}

async function persistStoryTreeRecheck(
  task: Awaited<ReturnType<typeof prisma.gateDispatchTask.update>>,
  recheck: GateStoryTreeRecheck | null,
) {
  if (!recheck) return task;
  const line = storyTreeRecheckLine(recheck);
  const evidence = Array.from(new Set([...parseJsonList(task.evidence), line, ...recheck.axisSummary.slice(0, 3)]));
  return prisma.gateDispatchTask.update({
    where: { dispatchKey: task.dispatchKey },
    data: { evidence: JSON.stringify(evidence) },
  });
}

async function buildEvidenceLoopRecheck(task: Awaited<ReturnType<typeof prisma.gateDispatchTask.update>>): Promise<GateEvidenceLoopRecheck | null> {
  if (!task.projectId || task.platformId === "model-routing") return null;
  const project = await prisma.project.findUnique({
    where: { id: task.projectId },
    include: {
      chapters: { orderBy: { order: "asc" } },
      outlineNodes: { orderBy: [{ depth: "asc" }, { order: "asc" }, { createdAt: "asc" }] },
      characters: { orderBy: { createdAt: "asc" } },
      worldEntries: { orderBy: [{ type: "asc" }, { createdAt: "asc" }] },
      foreshadows: { orderBy: { createdAt: "asc" } },
      plotThreads: { orderBy: { createdAt: "asc" } },
      aiTasks: { orderBy: { createdAt: "desc" } },
      publishSnapshots: { orderBy: { createdAt: "desc" }, take: 80 },
      submissionAssets: { orderBy: { updatedAt: "desc" } },
      submissionAssetVersions: { orderBy: { createdAt: "desc" }, take: 80 },
      platformPublishMetrics: { orderBy: { snapshotDate: "desc" }, take: 80 },
      platformKnowledgeFeedbackReceipts: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!project) return null;

  const platform = getPlatformProfile(project.targetPlatform as PlatformId);
  const submissionChecklist = buildSubmissionChecklist({
    title: project.title,
    genre: project.genre,
    sellingPoint: project.sellingPoint,
    currentWordCount: project.currentWordCount,
    targetWordCount: project.targetWordCount,
    platform,
    chapters: project.chapters,
    aiTasks: project.aiTasks.map((aiTask) => ({
      taskType: aiTask.taskType,
      status: aiTask.status,
      chapter: aiTask.chapterId ? { id: aiTask.chapterId } : null,
    })),
  });
  const dashboard = buildProjectControlDashboard({
    project: {
      title: project.title,
      genre: project.genre,
      sellingPoint: project.sellingPoint,
      targetLengthType: project.targetLengthType,
      targetWordCount: project.targetWordCount,
      currentWordCount: project.currentWordCount,
      updateCadence: project.updateCadence,
    },
    platform,
    chapters: project.chapters,
    outlineNodes: project.outlineNodes,
    characters: project.characters,
    worldEntries: project.worldEntries,
    foreshadows: project.foreshadows,
    plotThreads: project.plotThreads,
    aiTasks: project.aiTasks,
    publishSnapshots: project.publishSnapshots,
    submissionAssets: project.submissionAssets.map((asset) => ({
      id: asset.id,
      platformId: asset.platformId,
      platformName: asset.platformName,
      title: asset.title,
      logline: asset.logline,
      synopsis: asset.synopsis,
      overseasSynopsis: asset.overseasSynopsis,
      tags: parsePublishSnapshotTags(asset.tags),
      note: asset.note,
      source: asset.source,
      updatedAt: asset.updatedAt,
    })),
    submissionAssetVersions: project.submissionAssetVersions.map((version) => ({
      id: version.id,
      platformId: version.platformId,
      platformName: version.platformName,
      title: version.title,
      logline: version.logline,
      synopsis: version.synopsis,
      overseasSynopsis: version.overseasSynopsis,
      tags: parsePublishSnapshotTags(version.tags),
      note: version.note,
      source: version.source,
      auditScore: version.auditScore,
      auditStatus: version.auditStatus === "ready" || version.auditStatus === "blocked" ? version.auditStatus : "needs_work",
      action: version.action,
      sourceTaskId: version.sourceTaskId,
      strategy: version.strategy,
      createdAt: version.createdAt,
    })),
    platformPublishMetrics: project.platformPublishMetrics.map((metric) => ({
      id: metric.id,
      platformId: metric.platformId,
      platformName: metric.platformName,
      views: metric.views,
      clicks: metric.clicks,
      favorites: metric.favorites,
      follows: metric.follows,
      comments: metric.comments,
      paidReads: metric.paidReads,
      editorFeedback: metric.editorFeedback,
      contractStatus: metric.contractStatus,
      publishUrl: metric.publishUrl,
      notes: metric.notes,
      snapshotDate: metric.snapshotDate,
      createdAt: metric.createdAt,
      updatedAt: metric.updatedAt,
    })),
    platformKnowledgeFeedbackReceipts: project.platformKnowledgeFeedbackReceipts.map((receipt) => ({
      id: receipt.receiptId,
      platformId: receipt.platformId,
      platformName: receipt.platformName,
      actionLabel: receipt.actionLabel,
      title: receipt.title,
      message: receipt.message,
      completedStepLabel: receipt.completedStepLabel,
      stopReason: receipt.stopReason,
      nextAction: receipt.nextAction,
      href: receipt.href,
      severity: receipt.severity === "success" ? "success" : "needs_action",
      createdAt: receipt.createdAt,
    })),
    submissionChecklist,
  });
  const loop = dashboard.platformEvidenceLoop;
  if (loop.platformId !== task.platformId) return null;
  const previousScore = baselineEvidenceLoopScore(task);
  return {
    projectId: project.id,
    platformId: loop.platformId,
    platformName: loop.platformName,
    previousScore,
    currentScore: loop.score,
    delta: previousScore === null ? null : loop.score - previousScore,
    status: loop.status,
    label: loop.label,
    verdict: recheckVerdict(previousScore, loop.score),
    headline: loop.headline,
    nextAction: loop.nextAction,
    evidence: loop.evidence,
  };
}

function takeLimit(value: string | null) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 50;
  return Math.min(100, Math.max(1, Math.round(parsed)));
}

async function persistGeneratedDispatch(dispatch: GatePlatformGrowthDispatchItem & { dispatchKey: string }) {
  const now = new Date();
  const projectId = projectIdFromHref(dispatch.href);
  const task = await prisma.gateDispatchTask.upsert({
    where: { dispatchKey: dispatch.dispatchKey },
    create: {
      dispatchKey: dispatch.dispatchKey,
      projectId,
      platformId: dispatch.platformId,
      platformName: dispatch.platformName,
      stage: dispatch.stage,
      state: dispatch.state,
      priorityScore: dispatch.priorityScore,
      ownerRole: dispatch.ownerRole,
      title: dispatch.title,
      detail: dispatch.detail,
      dueLabel: dispatch.dueLabel,
      actionLabel: dispatch.actionLabel,
      href: dispatch.href,
      acceptanceCriteria: JSON.stringify(dispatch.acceptanceCriteria),
      evidence: JSON.stringify(dispatch.evidence),
      sourceReceiptId: null,
      completionEvidence: "",
      reviewLatestAt: date(dispatch.reviewLatestAt),
      assignedAt: dispatch.state === "assigned" ? now : null,
      completedAt: dispatch.state === "completed" ? now : null,
    },
    update: {
      projectId,
      state: dispatch.state,
      priorityScore: dispatch.priorityScore,
      detail: dispatch.detail,
      acceptanceCriteria: JSON.stringify(dispatch.acceptanceCriteria),
      evidence: JSON.stringify(dispatch.evidence),
      assignedAt: dispatch.state === "assigned" ? now : undefined,
      completedAt: dispatch.state === "completed" ? now : null,
    },
  });
  return toTask(task);
}

function firstDayDispatchProjectId(dispatchKey: string, projectId: string | null) {
  if (projectId) return projectId;
  const match = dispatchKey.match(/^first-day:([^:]+):/);
  return match?.[1] ?? null;
}

async function buildFirstDayFollowUpTasks(task: Awaited<ReturnType<typeof prisma.gateDispatchTask.update>>) {
  if (!task.dispatchKey.startsWith("first-day:") || task.state !== "completed") return [];
  const projectId = firstDayDispatchProjectId(task.dispatchKey, task.projectId);
  if (!projectId) return [];

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      chapters: { orderBy: { order: "asc" } },
      outlineNodes: { orderBy: [{ depth: "asc" }, { order: "asc" }] },
      characters: { orderBy: { createdAt: "asc" } },
      worldEntries: { orderBy: [{ type: "asc" }, { createdAt: "asc" }] },
      aiTasks: { orderBy: { createdAt: "desc" } },
      gateDispatchTasks: {
        where: {
          dispatchKey: { startsWith: `first-day:${projectId}:` },
        },
        orderBy: { updatedAt: "desc" },
      },
    },
  });
  if (!project) return [];

  const platform = getPlatformProfile(project.targetPlatform as PlatformId);
  const submissionChecklist = buildSubmissionChecklist({
    title: project.title,
    genre: project.genre,
    sellingPoint: project.sellingPoint,
    currentWordCount: project.currentWordCount,
    targetWordCount: project.targetWordCount,
    platform,
    chapters: project.chapters,
    aiTasks: project.aiTasks.map((aiTask) => ({
      taskType: aiTask.taskType,
      status: aiTask.status,
      chapter: aiTask.chapterId ? { id: aiTask.chapterId } : null,
    })),
  });
  const workflowProject = {
    id: project.id,
    title: project.title,
    currentWordCount: project.currentWordCount,
  };
  const workflow = buildFirstDayWorkflow({
    project: workflowProject,
    platform,
    chapters: project.chapters,
    outlineNodes: project.outlineNodes,
    characters: project.characters,
    worldEntries: project.worldEntries,
    aiTasks: project.aiTasks,
    startTactic: findProjectStartTacticSummary(project.worldEntries),
    dispatchTasks: project.gateDispatchTasks.map((dispatchTask) => ({
      dispatchKey: dispatchTask.dispatchKey,
      state: dispatchTask.state,
      completionEvidence: dispatchTask.completionEvidence,
    })),
    submissionChecklist,
  });
  const dispatch = buildFirstDayFollowUpDispatch({
    workflow,
    project: workflowProject,
    platform,
    completedDispatchKey: task.dispatchKey,
    existingDispatchKeys: project.gateDispatchTasks.map((dispatchTask) => dispatchTask.dispatchKey),
  });

  return dispatch ? [await persistGeneratedDispatch({ ...dispatch, dispatchKey: dispatch.id })] : [];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const where: Prisma.GateDispatchTaskWhereInput = {};
  const requestedState = searchParams.get("state");
  const platformId = searchParams.get("platformId");

  if (requestedState === "queued" || requestedState === "assigned" || requestedState === "completed") where.state = requestedState;
  if (platformId) where.platformId = platformId;

  const tasks = await prisma.gateDispatchTask.findMany({
    where,
    orderBy: [
      { state: "asc" },
      { priorityScore: "desc" },
      { updatedAt: "desc" },
    ],
    take: takeLimit(searchParams.get("limit")),
  });

  return NextResponse.json({ tasks: tasks.map(toTask) });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    dispatch?: Partial<GatePlatformGrowthDispatchItem>;
    sourceReceipt?: Partial<GateActionReceipt>;
  } | null;
  const dispatch = body?.dispatch;

  if (!dispatch?.id || !dispatch.platformId || !dispatch.platformName || !dispatch.stage) {
    return NextResponse.json({ error: "缺少有效派单。" }, { status: 400 });
  }

  const href = text(dispatch.href, "/gate");
  const candidateProjectId = projectIdFromHref(href);
  const project = candidateProjectId
    ? await prisma.project.findUnique({
        where: { id: candidateProjectId },
        select: { id: true },
      })
    : null;
  const nextState = state(dispatch.state === "completed" ? "completed" : "assigned");
  const now = new Date();
  const data = {
    dispatchKey: text(dispatch.id),
    projectId: project?.id ?? null,
    platformId: text(dispatch.platformId),
    platformName: text(dispatch.platformName),
    stage: text(dispatch.stage),
    state: nextState,
    priorityScore: integer(dispatch.priorityScore),
    ownerRole: text(dispatch.ownerRole),
    title: text(dispatch.title),
    detail: text(dispatch.detail),
    dueLabel: text(dispatch.dueLabel),
    actionLabel: text(dispatch.actionLabel),
    href,
    acceptanceCriteria: JSON.stringify(stringList(dispatch.acceptanceCriteria)),
    evidence: JSON.stringify(stringList(dispatch.evidence)),
    sourceReceiptId: text(body?.sourceReceipt?.id) || null,
    completionEvidence: "",
    reviewLatestAt: date(dispatch.reviewLatestAt),
    assignedAt: nextState === "assigned" ? now : null,
    completedAt: nextState === "completed" ? now : null,
  };

  const task = await prisma.gateDispatchTask.upsert({
    where: { dispatchKey: data.dispatchKey },
    create: data,
    update: {
      ...data,
      assignedAt: data.assignedAt ?? undefined,
      completedAt: data.completedAt ?? undefined,
    },
  });

  return NextResponse.json({ task: toTask(task) }, { status: 201 });
}

export async function PATCH(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    dispatchKey?: string;
    state?: GatePlatformGrowthDispatchState;
    completionEvidence?: string;
  } | null;
  const dispatchKey = text(body?.dispatchKey);

  if (!dispatchKey) {
    return NextResponse.json({ error: "缺少派单编号。" }, { status: 400 });
  }

  const nextState = state(body?.state);
  const completionEvidence = text(body?.completionEvidence).trim();
  if (nextState === "completed" && completionEvidence.length < 8) {
    return NextResponse.json({ error: "完成派单前，请写清楚完成依据，至少 8 个字。" }, { status: 400 });
  }
  const existingTask = await prisma.gateDispatchTask.findUnique({
    where: { dispatchKey },
  });
  if (!existingTask) {
    return NextResponse.json({ error: "派单不存在。" }, { status: 404 });
  }
  if (nextState === "completed") {
    const missingCloseoutLabels = missingDispatchReceiptCloseoutLabels(existingTask, completionEvidence);
    if (missingCloseoutLabels.length) {
      return NextResponse.json({ error: `完成前请补齐派单回执字段：${missingCloseoutLabels.join("、")}。` }, { status: 400 });
    }
    const acceptanceCriteria = parseJsonList(existingTask.acceptanceCriteria);
    const evidence = parseJsonList(existingTask.evidence);
    const validation = validateFirstDayDispatchCompletionEvidence({
      dispatchKey,
      dueLabel: existingTask.dueLabel,
      title: existingTask.title,
      acceptanceCriteria,
      evidence,
      completionEvidence,
    });
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error ?? "完成派单前，请写清楚完成依据。" }, { status: 400 });
    }
    const gateCompletionIssue = reviewGateDispatchCompletionEvidence({
      stage: existingTask.stage as PersistedGatePlatformDispatchTask["stage"],
      title: existingTask.title,
      actionLabel: existingTask.actionLabel,
      platformName: existingTask.platformName,
      acceptanceCriteria,
      evidence,
    }, completionEvidence);
    if (gateCompletionIssue) {
      return NextResponse.json({ error: gateCompletionIssue }, { status: 400 });
    }
  }
  const now = new Date();
  const task = await prisma.gateDispatchTask.update({
    where: { dispatchKey },
    data: {
      state: nextState,
      assignedAt: nextState === "assigned" ? now : undefined,
      completedAt: nextState === "completed" ? now : nextState === "queued" || nextState === "assigned" ? null : undefined,
      completionEvidence: nextState === "completed" ? completionEvidence : nextState === "queued" || nextState === "assigned" ? "" : undefined,
    },
  });
  let followUpTasks: PersistedGatePlatformDispatchTask[] = [];
  if (nextState === "completed" && task.stage === "model_route_governance") {
    const existingTasks = await prisma.gateDispatchTask.findMany({
      where: { platformId: "model-routing" },
      select: { dispatchKey: true },
    });
    const evidence = buildRouteConfirmationGovernanceEvidenceFromDispatchTasks([{
      dispatchKey: task.dispatchKey,
      stage: task.stage,
      state: task.state,
      completionEvidence: task.completionEvidence,
      evidence: task.evidence,
      completedAt: task.completedAt,
    }]);
    const followUps = buildRouteConfirmationGovernanceAutoFollowUpDispatches(evidence, {
      existingDispatchKeys: existingTasks.map((item) => item.dispatchKey),
    });
    followUpTasks = await Promise.all(followUps.map(persistGeneratedDispatch));
  }
  if (nextState === "completed") {
    followUpTasks = [
      ...followUpTasks,
      ...await buildFirstDayFollowUpTasks(task),
    ];
  }
  const knowledgeFeedbackReceipt = nextState === "completed"
    ? await writeDispatchCompletionKnowledgeFeedback(task)
    : null;
  const submissionEffectReview = nextState === "completed"
    ? await writeSubmissionDecisionCompletionEffect(task)
    : null;
  const startMetricAutoDispatch = nextState === "completed" && submissionEffectReview && task.projectId
    ? await autoDispatchStartMetricDecision({ projectId: task.projectId, platformId: task.platformId })
    : null;
  const secondMetricAutoDispatch = nextState === "completed" && submissionEffectReview && task.projectId
    ? await autoDispatchSecondMetricDecision({ projectId: task.projectId, platformId: task.platformId })
    : null;
  const startMetricFollowupAutoDispatch = nextState === "completed" && task.projectId
    ? await autoDispatchStartMetricFollowups({ projectId: task.projectId, platformId: task.platformId })
    : null;
  const secondMetricFollowupAutoDispatch = nextState === "completed" && task.projectId
    ? await autoDispatchSecondMetricFollowups({ projectId: task.projectId, platformId: task.platformId })
    : null;
  const dispatchCompletionReceipt = nextState === "completed" && !submissionEffectReview
    ? await writeDispatchCompletionActionReceipt(task)
    : null;
  const evidenceLoopRecheck = nextState === "completed"
    ? await buildEvidenceLoopRecheck(task)
    : null;
  const storyTreeRecheck = nextState === "completed"
    ? await buildStoryTreeTaskRecheck(task)
    : null;
  const structureDiagnosticRecheck = nextState === "completed"
    ? await buildStructureDiagnosticTaskRecheck(task)
    : null;
  const evidenceLoopTask = await persistEvidenceLoopRecheck(task, evidenceLoopRecheck);
  const storyTreeTask = await persistStoryTreeRecheck(evidenceLoopTask, storyTreeRecheck);
  const responseTask = await persistStructureDiagnosticRecheck(storyTreeTask, structureDiagnosticRecheck);
  if (nextState === "completed" && (storyTreeRecheck || evidenceLoopRecheck || structureDiagnosticRecheck)) {
    const existingFollowUpTasks = await prisma.gateDispatchTask.findMany({
      where: {
        projectId: task.projectId ?? undefined,
        OR: [
          { dispatchKey: { startsWith: "story-tree-followup:" } },
          { dispatchKey: { startsWith: "submission-recheck-followup:" } },
          { dispatchKey: { startsWith: "structure-recheck-followup:" } },
        ],
      },
      select: { dispatchKey: true },
    });
    const recheckFollowUps = buildChapterProductionRecheckFollowUpTasks({
      projectTitle: task.title.split(" · ").at(0) || task.title,
      platformId: task.platformId,
      platformName: task.platformName,
      sourceDispatchKey: task.dispatchKey,
      existingDispatchKeys: existingFollowUpTasks.map((item) => item.dispatchKey),
      storyTreeRecheck,
      evidenceLoopRecheck,
      structureDiagnosticRecheck,
    });
    followUpTasks = [
      ...followUpTasks,
      ...await Promise.all(recheckFollowUps.map((dispatch) => persistGeneratedDispatch({ ...dispatch, dispatchKey: dispatch.id }))),
    ];
  }

  return NextResponse.json({
    task: toTask(responseTask),
    followUpTasks,
    knowledgeFeedbackReceipt: knowledgeFeedbackReceipt ? {
      id: knowledgeFeedbackReceipt.receiptId,
      projectId: knowledgeFeedbackReceipt.projectId,
      platformId: knowledgeFeedbackReceipt.platformId,
      platformName: knowledgeFeedbackReceipt.platformName,
      actionLabel: knowledgeFeedbackReceipt.actionLabel,
      title: knowledgeFeedbackReceipt.title,
      message: knowledgeFeedbackReceipt.message,
      completedStepLabel: knowledgeFeedbackReceipt.completedStepLabel,
      stopReason: knowledgeFeedbackReceipt.stopReason,
      nextAction: knowledgeFeedbackReceipt.nextAction,
      href: knowledgeFeedbackReceipt.href,
      severity: knowledgeFeedbackReceipt.severity,
      createdAt: knowledgeFeedbackReceipt.createdAt.toISOString(),
    } : null,
    dispatchCompletionReceipt,
    submissionEffectReview,
    startMetricAutoDispatch,
    secondMetricAutoDispatch,
    startMetricFollowupAutoDispatch,
    secondMetricFollowupAutoDispatch,
    evidenceLoopRecheck,
    storyTreeRecheck,
    structureDiagnosticRecheck,
  });
}
