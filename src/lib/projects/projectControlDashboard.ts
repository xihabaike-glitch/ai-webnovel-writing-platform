import type { PlatformProfile } from "../platforms/platformProfiles.ts";
import { buildBatchDraftQueue, type BatchDraftTask } from "../ai/batchDrafts.ts";
import { buildReviewPipelineQueue } from "../ai/batchReviewPipeline.ts";
import { buildCharacterArcDashboard } from "./characterArc.ts";
import { buildChapterProductionSchedule } from "./chapterProductionSchedule.ts";
import { buildPlatformPublishExportCenter } from "./platformPublishExport.ts";
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
  submissionChecklist: SubmissionChecklist;
}

export interface ControlArea {
  id: string;
  label: string;
  score: number;
  status: "good" | "watch" | "blocked";
  evidence: string;
  nextAction: string;
}

export interface ProjectControlDashboard {
  overallScore: number;
  verdict: string;
  areas: ControlArea[];
  criticalActions: string[];
  metrics: {
    chapters: number;
    words: number;
    outlineNodes: number;
    characters: number;
    worldEntries: number;
    publishableChapters: number;
  };
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function area(id: string, label: string, score: number, evidence: string, nextAction: string): ControlArea {
  const normalized = clampScore(score);
  return {
    id,
    label,
    score: normalized,
    status: normalized >= 80 ? "good" : normalized >= 55 ? "watch" : "blocked",
    evidence,
    nextAction,
  };
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
    submissionChecklist: input.submissionChecklist,
  });
  const targetPackage = platformExport.packages.find((pack) => pack.platformId === input.platform.id) ?? platformExport.packages[0];
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
    area("outline", "大纲骨架", outline, `${input.outlineNodes.length} 个大纲节点。`, "补齐开头、结尾、主干、分支、叶片和土壤。"),
    area("characters", "人物弧光", characterDashboard.averageCompleteness, `${characterDashboard.completeCharacters}/${characterDashboard.totalCharacters} 个人物完整。`, characterDashboard.nextActions[0]),
    area("world", "世界观资料", ratio(worldDashboard.completeEntries, Math.max(worldDashboard.totalEntries, 3)) * 100, `${worldDashboard.completeEntries}/${worldDashboard.totalEntries} 条设定完整。`, worldDashboard.nextActions[0]),
    area("story-lines", "伏笔主线", ratio(storyLineDashboard.foreshadowReady + storyLineDashboard.threadResolved, Math.max(storyLineDashboard.foreshadowTotal + storyLineDashboard.threadTotal, 2)) * 100, `${storyLineDashboard.foreshadowReady} 个伏笔已回收，${storyLineDashboard.threadResolved} 条剧情线有终点。`, storyLineDashboard.nextActions[0]),
    area("production", "章节生产", productionScore, `${production.dashboard.totalItems} 张排期卡，${production.dashboard.blockedItems} 张卡住。`, production.dashboard.nextActions[0]),
    area("ai-pipeline", "AI 写审改", aiPipelineScore, `${batchDraft.readyCandidates} 章可初稿，${reviewPipeline.reviewReadyCount} 章待审，${reviewPipeline.secondPassReadyCount} 章可二改。`, "按批量初稿、批量审稿、批量二改顺序清队列。"),
    area("ops", "连载运营", average([serialization.submissionReadinessPercent, serialization.publishReadyCount > 0 ? 100 : 40]), `${serialization.publishReadyCount} 章可发布，投稿准备度 ${serialization.submissionReadinessPercent}%。`, serialization.actions[0]?.detail ?? "继续推进运营动作。"),
    area(
      "export",
      "平台导出",
      targetPackage.canExport ? 95 : platformExport.totalPublishableChapters > 0 ? targetPackage.preflight.score : 30,
      `${platformExport.packages.length} 个平台发布包，${platformExport.totalPublishableChapters} 章有正文，${targetPackage.platformName} 质检 ${targetPackage.preflight.score} 分。`,
      targetPackage.canExport ? "下载发布包并人工最终检查。" : targetPackage.repairPath.headline,
    ),
  ];
  const overallScore = clampScore(average(areas.map((item) => item.score)));
  const criticalActions = [...areas]
    .sort((left, right) => left.score - right.score || left.label.localeCompare(right.label))
    .slice(0, 4)
    .map((item) => `${item.label}：${item.nextAction}`);

  return {
    overallScore,
    verdict: verdict(overallScore),
    areas,
    criticalActions,
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
