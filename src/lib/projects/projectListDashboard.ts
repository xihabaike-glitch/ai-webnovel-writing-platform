import { buildModelTaskAuditDashboard, type ModelAuditProvider, type ModelAuditTask } from "../ai/modelTaskAudit.ts";
import { getPlatformProfile, type PlatformId } from "../platforms/platformProfiles.ts";
import { buildFirstDayWorkflow, type FirstDayAiTask, type FirstDayChapter, type FirstDayCharacter, type FirstDayOutlineNode, type FirstDayWorldEntry } from "./firstDayWorkflow.ts";
import { buildSubmissionChecklist } from "./submissionChecklist.ts";

export interface ProjectListProject {
  id: string;
  title: string;
  targetPlatform: string;
  targetLengthType: string;
  targetWordCount: number;
  currentWordCount: number;
  genre: string;
  sellingPoint: string;
  updateCadence: string;
  updatedAt: Date | string;
  chapters: Array<FirstDayChapter & {
    status: string;
    updatedAt: Date | string;
  }>;
  outlineNodes: FirstDayOutlineNode[];
  characters: FirstDayCharacter[];
  worldEntries: FirstDayWorldEntry[];
  aiTasks: Array<ModelAuditTask & FirstDayAiTask>;
}

export interface ProjectListItem {
  id: string;
  title: string;
  platformName: string;
  genre: string;
  updatedAt: string;
  wordProgressPercent: number;
  currentWordCount: number;
  targetWordCount: number;
  chapterCount: number;
  healthScore: number;
  healthLabel: "可推进" | "需盯紧" | "先救火";
  firstDayProgressPercent: number;
  nextAction: string;
  nextActionHref: string;
  aiCostUsd: number;
  aiFailureRatePercent: number;
  reviewCoveragePercent: number;
  riskFlags: string[];
}

export interface ProjectListDashboard {
  overview: {
    totalProjects: number;
    activeProjects: number;
    averageHealthScore: number;
    totalWords: number;
    totalAiCostUsd: number;
    projectsNeedingAction: number;
  };
  items: ProjectListItem[];
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function money(value: number) {
  return Math.round(value * 1000000) / 1000000;
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function healthLabel(score: number): ProjectListItem["healthLabel"] {
  if (score >= 75) return "可推进";
  if (score >= 50) return "需盯紧";
  return "先救火";
}

function outlineCoverage(nodes: FirstDayOutlineNode[]) {
  const types = new Set(nodes.map((node) => node.type));
  const required = ["root", "opening", "ending", "trunk", "branch", "leaf", "soil"];
  return clampPercent((required.filter((type) => types.has(type)).length / required.length) * 100);
}

function supportCoverage(project: ProjectListProject) {
  const characterScore = project.characters.length > 0 ? 100 : 0;
  const worldTypes = new Set(project.worldEntries.map((entry) => entry.type));
  const worldScore = clampPercent((["system_rule", "taboo", "platform_soil"].filter((type) => worldTypes.has(type)).length / 3) * 100);
  return Math.round(average([characterScore, worldScore]));
}

function reviewCoverage(chapters: ProjectListProject["chapters"], tasks: ProjectListProject["aiTasks"]) {
  const drafted = chapters.filter((chapter) => chapter.wordCount > 0);
  if (drafted.length === 0) return 0;
  const reviewed = new Set(tasks
    .filter((task) => task.taskType === "chapter_review" && task.status === "succeeded" && task.chapterId)
    .map((task) => task.chapterId));
  return clampPercent((drafted.filter((chapter) => reviewed.has(chapter.id)).length / drafted.length) * 100);
}

function riskFlags(input: {
  firstDayProgress: number;
  aiFailureRate: number;
  reviewCoveragePercent: number;
  wordProgressPercent: number;
  chapterCount: number;
}) {
  const flags: string[] = [];
  if (input.chapterCount === 0) flags.push("没有章节卡");
  if (input.firstDayProgress < 50) flags.push("首日链路未过半");
  if (input.aiFailureRate >= 20) flags.push(`AI 失败率 ${input.aiFailureRate}%`);
  if (input.reviewCoveragePercent < 60 && input.wordProgressPercent > 0) flags.push("有正文但审稿不足");
  if (input.wordProgressPercent < 1 && input.chapterCount > 0) flags.push("还没进入有效字数生产");
  if (flags.length === 0) flags.push("暂无明显阻塞");
  return flags;
}

export function buildProjectListDashboard(
  projects: ProjectListProject[],
  providers: ModelAuditProvider[],
): ProjectListDashboard {
  const items = projects.map((project) => {
    const platform = getPlatformProfile(project.targetPlatform as PlatformId);
    const submissionChecklist = buildSubmissionChecklist({
      title: project.title,
      genre: project.genre,
      sellingPoint: project.sellingPoint,
      currentWordCount: project.currentWordCount,
      targetWordCount: project.targetWordCount,
      platform,
      chapters: project.chapters,
      aiTasks: project.aiTasks.map((task) => ({
        taskType: task.taskType,
        status: task.status,
        chapter: task.chapterId ? { id: task.chapterId } : null,
      })),
    });
    const firstDay = buildFirstDayWorkflow({
      project: {
        id: project.id,
        title: project.title,
        currentWordCount: project.currentWordCount,
      },
      platform,
      chapters: project.chapters,
      outlineNodes: project.outlineNodes,
      characters: project.characters,
      worldEntries: project.worldEntries,
      aiTasks: project.aiTasks,
      submissionChecklist,
    });
    const modelAudit = buildModelTaskAuditDashboard(project.aiTasks, providers);
    const wordProgressPercent = project.targetWordCount > 0
      ? clampPercent((project.currentWordCount / project.targetWordCount) * 100)
      : 0;
    const reviewCoveragePercent = reviewCoverage(project.chapters, project.aiTasks);
    const healthScore = Math.round(average([
      firstDay.progressPercent,
      outlineCoverage(project.outlineNodes),
      supportCoverage(project),
      modelAudit.score,
      project.chapters.length > 0 ? 60 : 20,
      reviewCoveragePercent > 0 ? reviewCoveragePercent : project.currentWordCount > 0 ? 30 : 50,
    ]));
    const aiFailureRatePercent = modelAudit.summary.failureRatePercent;

    return {
      id: project.id,
      title: project.title,
      platformName: platform.name,
      genre: project.genre,
      updatedAt: new Date(project.updatedAt).toISOString(),
      wordProgressPercent,
      currentWordCount: project.currentWordCount,
      targetWordCount: project.targetWordCount,
      chapterCount: project.chapters.length,
      healthScore,
      healthLabel: healthLabel(healthScore),
      firstDayProgressPercent: firstDay.progressPercent,
      nextAction: firstDay.nextStep.label,
      nextActionHref: firstDay.nextStep.href,
      aiCostUsd: money(modelAudit.summary.knownCostUsd),
      aiFailureRatePercent,
      reviewCoveragePercent,
      riskFlags: riskFlags({
        firstDayProgress: firstDay.progressPercent,
        aiFailureRate: aiFailureRatePercent,
        reviewCoveragePercent,
        wordProgressPercent,
        chapterCount: project.chapters.length,
      }),
    };
  }).sort((left, right) => (
    left.healthScore - right.healthScore
    || new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
  ));

  return {
    overview: {
      totalProjects: items.length,
      activeProjects: items.filter((item) => item.chapterCount > 0 || item.currentWordCount > 0).length,
      averageHealthScore: Math.round(average(items.map((item) => item.healthScore))),
      totalWords: items.reduce((sum, item) => sum + item.currentWordCount, 0),
      totalAiCostUsd: money(items.reduce((sum, item) => sum + item.aiCostUsd, 0)),
      projectsNeedingAction: items.filter((item) => item.healthScore < 75).length,
    },
    items,
  };
}
