import type { PlatformProfile } from "../platforms/platformProfiles.ts";
import { buildBatchDraftQueue, type BatchDraftTask } from "../ai/batchDrafts.ts";
import { buildReviewPipelineQueue } from "../ai/batchReviewPipeline.ts";
import { buildCharacterArcDashboard } from "./characterArc.ts";
import { buildChapterProductionSchedule } from "./chapterProductionSchedule.ts";
import {
  buildPlatformPublishExportCenter,
  type PlatformPublishMetricInput,
  type PlatformStrategyAutoVerdict,
  type PlatformSubmissionAssetInput,
  type PlatformSubmissionAssetVersionInput,
  type PublishPackageVersionItem,
} from "./platformPublishExport.ts";
import { buildSerializationOpsDashboard } from "./serializationOps.ts";
import { buildStoryLineDashboard } from "./storyLines.ts";
import type { SubmissionChecklist } from "./submissionChecklist.ts";
import { buildWorldBibleDashboard } from "./worldBible.ts";

export interface ControlProject {
  title: string;
  genre: string;
  sellingPoint: string;
  targetLengthType: string;
  targetWordCount: number;
  currentWordCount: number;
  updateCadence: string;
}

export interface ControlChapter {
  id: string;
  order: number;
  title: string;
  content: string;
  wordCount: number;
  goal: string;
  hook: string;
  conflict: string;
  valueShift: string;
  cliffhanger: string;
  status: string;
  updatedAt: Date | string;
}

export interface ControlOutlineNode {
  id: string;
  parentId: string | null;
  chapterId: string | null;
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

export interface ControlCharacter {
  id: string;
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

export interface ControlWorldEntry {
  id: string;
  type: string;
  title: string;
  content: string;
}

export interface ControlForeshadow {
  id: string;
  title: string;
  setupChapterId: string | null;
  payoffChapterId: string | null;
  relatedCharacterIds: string;
  status: string;
  notes: string;
}

export interface ControlPlotThread {
  id: string;
  type: string;
  title: string;
  startChapterId: string | null;
  endChapterId: string | null;
  status: string;
}

export interface ControlAiTask {
  id: string;
  chapterId: string | null;
  taskType: string;
  status: string;
  outputText: string | null;
  inputSnapshot?: string;
  errorMessage: string | null;
  createdAt: Date | string;
}

export interface ProjectControlDashboardInput {
  project: ControlProject;
  platform: PlatformProfile;
  chapters: ControlChapter[];
  outlineNodes: ControlOutlineNode[];
  characters: ControlCharacter[];
  worldEntries: ControlWorldEntry[];
  foreshadows: ControlForeshadow[];
  plotThreads: ControlPlotThread[];
  aiTasks: ControlAiTask[];
  publishSnapshots?: PublishPackageVersionItem[];
  submissionAssets?: PlatformSubmissionAssetInput[];
  submissionAssetVersions?: PlatformSubmissionAssetVersionInput[];
  platformPublishMetrics?: PlatformPublishMetricInput[];
  submissionChecklist: SubmissionChecklist;
}

export interface ControlArea {
  id: string;
  label: string;
  score: number;
  status: "good" | "watch" | "blocked";
  evidence: string;
  nextAction: string;
  actionLabel: string;
  targetAnchor: string;
  canExecute: boolean;
  executeLabel: string;
  canGenerate: boolean;
  generateLabel: string;
}

export interface ControlPriorityAction {
  id: string;
  areaId: string;
  label: string;
  score: number;
  severity: "high" | "medium" | "low";
  reason: string;
  actionLabel: string;
  targetAnchor: string;
  canExecute: boolean;
  executeLabel: string;
  canGenerate: boolean;
  generateLabel: string;
}

export interface ControlAssetQualityReport {
  taskId: string;
  areaId: string;
  areaLabel: string;
  score: number;
  status: "pass" | "warn" | "fail";
  repaired: boolean;
  createdCount: number;
  issues: string[];
  nextActions: string[];
  createdAt: string;
}

export interface ProjectControlDashboard {
  overallScore: number;
  verdict: string;
  platformVerdict: PlatformControlVerdictSummary;
  areas: ControlArea[];
  priorityActions: ControlPriorityAction[];
  criticalActions: string[];
  controlAssetQualityReports: ControlAssetQualityReport[];
  metrics: {
    chapters: number;
    words: number;
    outlineNodes: number;
    characters: number;
    worldEntries: number;
    publishableChapters: number;
  };
}

export interface PlatformControlVerdictSummary {
  status: PlatformStrategyAutoVerdict["status"];
  headline: string;
  nextAction: string;
  actionKind: "save_evidence_baseline" | "generate_asset_variants" | "rewrite_first_three" | "open_target";
  actionLabel: string;
  actionExecutable: boolean;
  actionAnchor: string;
  primaryPlatformName: string | null;
  primaryPlatformId: string | null;
  primaryScore: number;
  primaryEvidenceScore: number;
  backupPlatformNames: string[];
  blockedPlatformNames: string[];
  evidenceGaps: string[];
  targetAnchor: string;
}

function platformVerdictAction(
  primaryPlatformId: string | null,
  nextAction: string,
  evidenceGaps: string[],
): Pick<PlatformControlVerdictSummary, "actionKind" | "actionLabel" | "actionExecutable" | "actionAnchor"> {
  const firstGap = evidenceGaps[0] ?? "";
  const gapText = evidenceGaps.join(" ");
  if (primaryPlatformId && firstGap.includes("发布包版本")) {
    return {
      actionKind: "save_evidence_baseline",
      actionLabel: "保存证据基准",
      actionExecutable: true,
      actionAnchor: "package-version-history",
    };
  }
  if (primaryPlatformId && (firstGap.includes("投稿资产") || nextAction.includes("投稿资产") || nextAction.includes("入口"))) {
    return {
      actionKind: "generate_asset_variants",
      actionLabel: "生成投稿资产候选",
      actionExecutable: true,
      actionAnchor: "submission-asset-editor",
    };
  }
  if (
    primaryPlatformId
    && (
      gapText.includes("前三章")
      || gapText.includes("发布质检修复")
      || nextAction.includes("前三章")
      || nextAction.includes("开头")
    )
  ) {
    return {
      actionKind: "rewrite_first_three",
      actionLabel: "重写前三章",
      actionExecutable: true,
      actionAnchor: "first-three-rewrite",
    };
  }
  if (firstGap.includes("真实曝光") || firstGap.includes("点击") || firstGap.includes("追读")) {
    return {
      actionKind: "open_target",
      actionLabel: "录入发布效果",
      actionExecutable: false,
      actionAnchor: "publish-effect-panel",
    };
  }
  return {
    actionKind: "open_target",
    actionLabel: "看裁决面板",
    actionExecutable: false,
    actionAnchor: "platform-strategy-verdict",
  };
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function area(
  id: string,
  label: string,
  score: number,
  evidence: string,
  nextAction: string | undefined,
  actionLabel: string,
  targetAnchor: string,
  canExecute = false,
  executeLabel = "一键执行",
  canGenerate = false,
  generateLabel = "AI 生成",
): ControlArea {
  const normalized = clampScore(score);
  return {
    id,
    label,
    score: normalized,
    status: normalized >= 80 ? "good" : normalized >= 55 ? "watch" : "blocked",
    evidence,
    nextAction: nextAction ?? "补齐该模块的硬缺口。",
    actionLabel,
    targetAnchor,
    canExecute,
    executeLabel,
    canGenerate,
    generateLabel,
  };
}

function actionSeverity(status: ControlArea["status"]): ControlPriorityAction["severity"] {
  if (status === "blocked") return "high";
  if (status === "watch") return "medium";
  return "low";
}

function ratio(part: number, total: number) {
  if (total <= 0) return 0;
  return part / total;
}

function countByType(nodes: ControlOutlineNode[], type: string) {
  return nodes.filter((node) => node.type === type).length;
}

function outlineScore(nodes: ControlOutlineNode[]) {
  const checks = [
    countByType(nodes, "root") >= 1,
    countByType(nodes, "opening") >= 1,
    countByType(nodes, "ending") >= 1,
    countByType(nodes, "trunk") >= 1,
    countByType(nodes, "branch") >= 3,
    countByType(nodes, "leaf") >= 2,
    countByType(nodes, "soil") >= 1,
  ];
  return ratio(checks.filter(Boolean).length, checks.length) * 100;
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function verdict(score: number) {
  if (score >= 85) return "项目进入可持续生产状态，可以集中做发布和增长。";
  if (score >= 70) return "项目生产链基本打通，但仍有模块会拖慢发布。";
  if (score >= 50) return "项目有雏形，但缺口会导致写作和发布互相卡住。";
  return "项目还在搭骨架，先别急着批量扩写或投放。";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseJsonObject(value: string | null | undefined) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function controlAssetAreaLabel(areaId: string) {
  if (areaId === "characters") return "人物弧光";
  if (areaId === "world") return "世界观资料";
  if (areaId === "story-lines") return "主线伏笔";
  return "资料生成";
}

function normalizeControlAssetStatus(status: unknown, score: number): ControlAssetQualityReport["status"] {
  if (status === "pass" || status === "warn" || status === "fail") return status;
  if (score >= 75) return "pass";
  if (score >= 60) return "warn";
  return "fail";
}

function arrayCount(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

function inferControlAssetArea(generated: Record<string, unknown> | null) {
  if (!generated) return "unknown";
  if (arrayCount(generated.characters) > 0) return "characters";
  if (arrayCount(generated.worldEntries) > 0) return "world";
  if (arrayCount(generated.plotThreads) > 0 || arrayCount(generated.foreshadows) > 0) return "story-lines";
  return "unknown";
}

function generatedAssetCount(generated: Record<string, unknown> | null, areaId: string) {
  if (!generated) return 0;
  if (areaId === "characters") return arrayCount(generated.characters);
  if (areaId === "world") return arrayCount(generated.worldEntries);
  if (areaId === "story-lines") return arrayCount(generated.plotThreads) + arrayCount(generated.foreshadows);
  return arrayCount(generated.characters) + arrayCount(generated.worldEntries) + arrayCount(generated.plotThreads) + arrayCount(generated.foreshadows);
}

function buildControlAssetQualityReports(tasks: ControlAiTask[]): ControlAssetQualityReport[] {
  return tasks
    .filter((task) => task.taskType === "control_asset_generate" && task.outputText)
    .map((task) => {
      const output = parseJsonObject(task.outputText);
      if (!output) return null;
      const qualityGate = isRecord(output.qualityGate) ? output.qualityGate : null;
      if (!qualityGate) return null;

      const generated = isRecord(output.generated) ? output.generated : null;
      const snapshot = parseJsonObject(task.inputSnapshot);
      const snapshotArea = typeof snapshot?.areaId === "string" ? snapshot.areaId : null;
      const areaId = snapshotArea ?? inferControlAssetArea(generated);
      const score = clampScore(typeof qualityGate.score === "number" ? qualityGate.score : 0);
      const repair = isRecord(output.repair) ? output.repair : null;

      return {
        taskId: task.id,
        areaId,
        areaLabel: controlAssetAreaLabel(areaId),
        score,
        status: normalizeControlAssetStatus(qualityGate.status, score),
        repaired: repair?.attempted === true,
        createdCount: generatedAssetCount(generated, areaId),
        issues: stringArray(qualityGate.issues),
        nextActions: stringArray(qualityGate.nextActions),
        createdAt: new Date(task.createdAt).toISOString(),
      } satisfies ControlAssetQualityReport;
    })
    .filter((report): report is ControlAssetQualityReport => Boolean(report))
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 3);
}

export function buildProjectControlDashboard(input: ProjectControlDashboardInput): ProjectControlDashboard {
  const characterDashboard = buildCharacterArcDashboard(input.characters);
  const worldDashboard = buildWorldBibleDashboard(input.worldEntries);
  const storyLineDashboard = buildStoryLineDashboard(input.chapters, input.foreshadows, input.plotThreads);
  const production = buildChapterProductionSchedule({
    project: input.project,
    platform: input.platform,
    chapters: input.chapters,
    outlineNodes: input.outlineNodes,
    characters: input.characters,
    worldEntries: input.worldEntries,
    foreshadows: input.foreshadows,
    plotThreads: input.plotThreads,
  });
  const batchDraft = buildBatchDraftQueue(input.chapters, input.aiTasks as BatchDraftTask[], input.platform);
  const reviewPipeline = buildReviewPipelineQueue(input.chapters, input.aiTasks);
  const serialization = buildSerializationOpsDashboard({
    project: input.project,
    platform: input.platform,
    chapters: input.chapters,
    aiTasks: input.aiTasks,
    submissionChecklist: input.submissionChecklist,
  });
  const platformExport = buildPlatformPublishExportCenter({
    project: input.project,
    targetPlatform: input.platform,
    chapters: input.chapters,
    aiTasks: input.aiTasks,
    publishSnapshots: input.publishSnapshots,
    submissionAssets: input.submissionAssets,
    submissionAssetVersions: input.submissionAssetVersions,
    platformPublishMetrics: input.platformPublishMetrics,
    submissionChecklist: input.submissionChecklist,
  });
  const targetPackage = platformExport.packages.find((pack) => pack.platformId === input.platform.id) ?? platformExport.packages[0];
  const primaryPlatformId = platformExport.strategyVerdict.primary?.platformId ?? null;
  const evidenceGaps = platformExport.strategyVerdict.primary
    ? platformExport.platformStrategy.find((item) => item.platformId === platformExport.strategyVerdict.primary?.platformId)?.reviewDecision.evidenceLedger.missingSignals.slice(0, 3) ?? []
    : [];
  const verdictAction = platformVerdictAction(primaryPlatformId, platformExport.strategyVerdict.nextAction, evidenceGaps);
  const platformVerdict: PlatformControlVerdictSummary = {
    status: platformExport.strategyVerdict.status,
    headline: platformExport.strategyVerdict.headline,
    nextAction: platformExport.strategyVerdict.nextAction,
    ...verdictAction,
    primaryPlatformName: platformExport.strategyVerdict.primary?.platformName ?? null,
    primaryPlatformId,
    primaryScore: platformExport.strategyVerdict.primary?.score ?? 0,
    primaryEvidenceScore: platformExport.strategyVerdict.primary?.evidenceScore ?? 0,
    backupPlatformNames: platformExport.strategyVerdict.backups.map((item) => item.platformName),
    blockedPlatformNames: platformExport.strategyVerdict.blocked.map((item) => item.platformName),
    evidenceGaps,
    targetAnchor: "platform-strategy-verdict",
  };
  const outline = outlineScore(input.outlineNodes);
  const productionScore = production.dashboard.totalItems > 0
    ? ratio(
      production.dashboard.outlineReadyItems + production.dashboard.chapterCardItems + production.dashboard.draftingItems + production.dashboard.doneItems,
      production.dashboard.totalItems,
    ) * 100
    : 0;
  const aiPipelineScore = input.chapters.length > 0
    ? ratio(
      input.chapters.filter((chapter) => chapter.wordCount > 0).length
        + input.aiTasks.filter((task) => task.taskType === "chapter_review" && task.status === "succeeded").length
        + input.aiTasks.filter((task) => task.taskType === "chapter_second_pass" && task.status === "succeeded").length,
      input.chapters.length * 3,
    ) * 100
    : 0;

  const areas = [
    area("outline", "大纲骨架", outline, `${input.outlineNodes.length} 个大纲节点。`, "补齐开头、结尾、主干、分支、叶片和土壤。", "补大纲骨架", "outline-tree", true, "生成骨架"),
    area("characters", "人物弧光", characterDashboard.averageCompleteness, `${characterDashboard.completeCharacters}/${characterDashboard.totalCharacters} 个人物完整。`, characterDashboard.nextActions[0], "补人物弧光", "character-arc", true, "补人物卡", true, "AI 生成人物"),
    area("world", "世界观资料", ratio(worldDashboard.completeEntries, Math.max(worldDashboard.totalEntries, 3)) * 100, `${worldDashboard.completeEntries}/${worldDashboard.totalEntries} 条设定完整。`, worldDashboard.nextActions[0], "补世界观", "world-bible", true, "补设定卡", true, "AI 生成设定"),
    area("story-lines", "伏笔主线", ratio(storyLineDashboard.foreshadowReady + storyLineDashboard.threadResolved, Math.max(storyLineDashboard.foreshadowTotal + storyLineDashboard.threadTotal, 2)) * 100, `${storyLineDashboard.foreshadowReady} 个伏笔已回收，${storyLineDashboard.threadResolved} 条剧情线有终点。`, storyLineDashboard.nextActions[0], "补主线伏笔", "story-lines", true, "补线索卡", true, "AI 生成线索"),
    area("production", "章节生产", productionScore, `${production.dashboard.totalItems} 张排期卡，${production.dashboard.blockedItems} 张卡住。`, production.dashboard.nextActions[0], "排章节生产", "chapter-production"),
    area("ai-pipeline", "AI 写审改", aiPipelineScore, `${batchDraft.readyCandidates} 章可初稿，${reviewPipeline.reviewReadyCount} 章待审，${reviewPipeline.secondPassReadyCount} 章可二改。`, "按批量初稿、批量审稿、批量二改顺序清队列。", "清写审改队列", "ai-pipeline"),
    area("ops", "连载运营", average([serialization.submissionReadinessPercent, serialization.publishReadyCount > 0 ? 100 : 40]), `${serialization.publishReadyCount} 章可发布，投稿准备度 ${serialization.submissionReadinessPercent}%。`, serialization.actions[0]?.detail ?? "继续推进运营动作。", "看运营动作", "serialization-ops"),
    area(
      "export",
      "平台导出",
      targetPackage.canExport ? 95 : platformExport.totalPublishableChapters > 0 ? targetPackage.preflight.score : 30,
      `${platformExport.packages.length} 个平台发布包，${platformExport.totalPublishableChapters} 章有正文，${targetPackage.platformName} 质检 ${targetPackage.preflight.score} 分。`,
      targetPackage.canExport ? "下载发布包并人工最终检查。" : targetPackage.repairPath.headline,
      "处理发布缺口",
      "platform-export",
    ),
  ];
  const overallScore = clampScore(average(areas.map((item) => item.score)));
  const priorityActions = [...areas]
    .sort((left, right) => left.score - right.score || left.label.localeCompare(right.label))
    .slice(0, 4)
    .map((item): ControlPriorityAction => ({
      id: `priority-${item.id}`,
      areaId: item.id,
      label: item.label,
      score: item.score,
      severity: actionSeverity(item.status),
      reason: item.nextAction,
      actionLabel: item.actionLabel,
      targetAnchor: item.targetAnchor,
      canExecute: item.canExecute,
      executeLabel: item.executeLabel,
      canGenerate: item.canGenerate,
      generateLabel: item.generateLabel,
    }));
  const criticalActions = priorityActions.map((item) => `${item.label}：${item.reason}`);
  const controlAssetQualityReports = buildControlAssetQualityReports(input.aiTasks);

  return {
    overallScore,
    verdict: verdict(overallScore),
    platformVerdict,
    areas,
    priorityActions,
    criticalActions,
    controlAssetQualityReports,
    metrics: {
      chapters: input.chapters.length,
      words: input.project.currentWordCount,
      outlineNodes: input.outlineNodes.length,
      characters: input.characters.length,
      worldEntries: input.worldEntries.length,
      publishableChapters: platformExport.totalPublishableChapters,
    },
  };
}
