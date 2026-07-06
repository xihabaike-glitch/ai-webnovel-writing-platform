import { buildModelTaskAuditDashboard, type ModelAuditProvider, type ModelAuditTask } from "../ai/modelTaskAudit.ts";
import { getPlatformProfile, type PlatformId } from "../platforms/platformProfiles.ts";
import { buildFirstDayContinuationAction } from "./firstDayContinuation.ts";
import { buildFirstDayRiskProfile, buildFirstDayWorkflow, type FirstDayAiTask, type FirstDayChapter, type FirstDayCharacter, type FirstDayOutlineNode, type FirstDayRiskLevel, type FirstDayWorldEntry } from "./firstDayWorkflow.ts";
import { findProjectStartTacticSummary } from "./projectStartTactics.ts";
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
  gateDispatchTasks?: Array<{
    dispatchKey: string;
    state: string;
    completionEvidence: string;
  }>;
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
  riskLevel: FirstDayRiskLevel;
  riskLabel: string;
  riskHeadline: string;
  riskDetail: string;
  riskFlags: string[];
  continuationStatus: "first_day_active" | "ready" | "blocked" | "complete";
}

export interface ProjectListDashboard {
  overview: {
    totalProjects: number;
    activeProjects: number;
    averageHealthScore: number;
    totalWords: number;
    totalAiCostUsd: number;
    projectsNeedingAction: number;
    standardProjects: number;
    watchProjects: number;
    blockedProjects: number;
  };
  roleEntrypoints: ProjectRoleWorkflowEntrypoint[];
  items: ProjectListItem[];
}

export interface ProjectRoleWorkflowEntrypoint {
  id: "story-structure" | "context-recall" | "platform-export";
  title: string;
  detail: string;
  actionLabel: string;
  projectAnchor: "#story-structure" | "#context-recall" | "#platform-export";
  roleIds: string[];
  workflowSteps: Array<{
    stage: "先判断" | "再生产" | "最后验收";
    ownerRole: string;
    action: string;
    output: string;
  }>;
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
  riskLevel: FirstDayRiskLevel;
  riskLabel: string;
  continuationStatus: ProjectListItem["continuationStatus"];
  nextAction: string;
}) {
  const flags: string[] = [];
  if (input.continuationStatus === "blocked") flags.push(`下一步阻塞：${input.nextAction}`);
  if (input.riskLevel === "blocked") flags.push(`开书策略：${input.riskLabel}，先止损恢复`);
  if (input.riskLevel === "watch") flags.push(`开书策略：${input.riskLabel}，只跑小样本`);
  if (input.chapterCount === 0) flags.push("没有章节卡");
  if (input.firstDayProgress < 50) flags.push("首日链路未过半");
  if (input.aiFailureRate >= 20) flags.push(`AI 失败率 ${input.aiFailureRate}%`);
  if (input.reviewCoveragePercent < 60 && input.wordProgressPercent > 0) flags.push("有正文但审稿不足");
  if (input.wordProgressPercent < 1 && input.chapterCount > 0) flags.push("还没进入有效字数生产");
  if (flags.length === 0) flags.push("暂无明显阻塞");
  return flags;
}

export function buildProjectRoleWorkflowEntrypoints(): ProjectRoleWorkflowEntrypoint[] {
  return [
    {
      id: "story-structure",
      title: "结构主编入口",
      detail: "选择作品后进入结构诊断，检查开头、结尾、主干、支线、人物弧光和伏笔回收。",
      actionLabel: "选作品做结构诊断",
      projectAnchor: "#story-structure",
      roleIds: ["toxic_pm", "structure_editor", "draft_writer"],
      workflowSteps: [
        {
          stage: "先判断",
          ownerRole: "毒舌产品经理",
          action: "先判定题材、平台和开篇钩子是不是值得继续投入。",
          output: "开书判断报告",
        },
        {
          stage: "再生产",
          ownerRole: "结构主编",
          action: "把开头、结尾、主干、支线、人物弧光和伏笔拆成树状骨架。",
          output: "故事大树结构图",
        },
        {
          stage: "最后验收",
          ownerRole: "正文写手",
          action: "按结构骨架写首章和前三章样稿，检查钩子、冲突和章末追读。",
          output: "首章样稿包验收",
        },
      ],
    },
    {
      id: "context-recall",
      title: "资料官入口",
      detail: "选择作品后查看项目土壤与上下文召回，确认人物、设定、线索和历史章节来源。",
      actionLabel: "选作品看项目土壤",
      projectAnchor: "#context-recall",
      roleIds: ["context_librarian", "structure_editor", "draft_writer"],
      workflowSteps: [
        {
          stage: "先判断",
          ownerRole: "上下文资料官",
          action: "先找人物、设定、禁忌、伏笔和历史章节里最容易被模型写错的地方。",
          output: "设定风险清单",
        },
        {
          stage: "再生产",
          ownerRole: "结构主编",
          action: "把土壤资料绑定到主线、支线和章节节点，标出每章必须继承的信息。",
          output: "章节上下文包",
        },
        {
          stage: "最后验收",
          ownerRole: "正文写手",
          action: "用上下文包重写或续写章节，核对人物口吻、设定边界和伏笔连续性。",
          output: "一致性修订稿件",
        },
      ],
    },
    {
      id: "platform-export",
      title: "平台包装入口",
      detail: "选择作品后进入平台发布包，处理标题、简介、标签、样章、版本和发布效果。",
      actionLabel: "选作品做平台包",
      projectAnchor: "#platform-export",
      roleIds: ["overseas_packager", "feedback_operator", "toxic_pm"],
      workflowSteps: [
        {
          stage: "先判断",
          ownerRole: "平台包装官",
          action: "先按 8 个核心平台检查标题、简介、标签、样章和长度是否匹配。",
          output: "平台适配结论",
        },
        {
          stage: "再生产",
          ownerRole: "海外包装官",
          action: "为 WebNovel、Royal Road、Wattpad 生成英文卖点、简介和标签版本。",
          output: "出海平台发布包",
        },
        {
          stage: "最后验收",
          ownerRole: "数据复盘官",
          action: "记录发布效果、读者反馈和下一轮改稿动作，决定继续、观察或止损。",
          output: "复盘动作执行单",
        },
      ],
    },
  ];
}

export function buildProjectListDashboard(
  projects: ProjectListProject[],
  providers: ModelAuditProvider[],
): ProjectListDashboard {
  const items = projects.map((project) => {
    const platform = getPlatformProfile(project.targetPlatform as PlatformId);
    const startTactic = findProjectStartTacticSummary(project.worldEntries);
    const riskProfile = buildFirstDayRiskProfile(startTactic);
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
      dispatchTasks: project.gateDispatchTasks ?? [],
      startTactic,
      submissionChecklist,
    });
    const continuation = buildFirstDayContinuationAction({
      project: {
        id: project.id,
        title: project.title,
        targetPlatform: project.targetPlatform,
        targetWordCount: project.targetWordCount,
        currentWordCount: project.currentWordCount,
        genre: project.genre,
        sellingPoint: project.sellingPoint,
        chapters: project.chapters,
        aiTasks: project.aiTasks.map((task) => ({
          id: task.id,
          chapterId: task.chapterId,
          taskType: task.taskType,
          status: task.status,
          outputText: task.outputText ?? null,
          errorMessage: task.errorMessage ?? null,
          createdAt: task.createdAt,
        })),
        worldEntries: project.worldEntries,
        gateDispatchTasks: project.gateDispatchTasks ?? [],
      },
      workflow: firstDay,
    });
    const modelAudit = buildModelTaskAuditDashboard(project.aiTasks, providers);
    const wordProgressPercent = project.targetWordCount > 0
      ? clampPercent((project.currentWordCount / project.targetWordCount) * 100)
      : 0;
    const reviewCoveragePercent = reviewCoverage(project.chapters, project.aiTasks);
    const rawHealthScore = Math.round(average([
      firstDay.progressPercent,
      outlineCoverage(project.outlineNodes),
      supportCoverage(project),
      modelAudit.score,
      project.chapters.length > 0 ? 60 : 20,
      reviewCoveragePercent > 0 ? reviewCoveragePercent : project.currentWordCount > 0 ? 30 : 50,
    ]));
    const healthScore = riskProfile.level === "blocked"
      ? Math.min(rawHealthScore, 49)
      : riskProfile.level === "watch"
        ? Math.min(rawHealthScore, 74)
        : continuation.status === "blocked"
          ? Math.min(rawHealthScore, 74)
        : rawHealthScore;
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
      nextAction: continuation.primaryLabel,
      nextActionHref: continuation.primaryHref,
      aiCostUsd: money(modelAudit.summary.knownCostUsd),
      aiFailureRatePercent,
      reviewCoveragePercent,
      riskLevel: riskProfile.level,
      riskLabel: riskProfile.label,
      riskHeadline: riskProfile.headline,
      riskDetail: riskProfile.instruction,
      riskFlags: riskFlags({
        firstDayProgress: firstDay.progressPercent,
        aiFailureRate: aiFailureRatePercent,
        reviewCoveragePercent,
        wordProgressPercent,
        chapterCount: project.chapters.length,
        riskLevel: riskProfile.level,
        riskLabel: riskProfile.label,
        continuationStatus: continuation.status,
        nextAction: continuation.primaryLabel,
      }),
      continuationStatus: continuation.status,
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
      standardProjects: items.filter((item) => item.riskLevel === "standard").length,
      watchProjects: items.filter((item) => item.riskLevel === "watch").length,
      blockedProjects: items.filter((item) => item.riskLevel === "blocked").length,
    },
    roleEntrypoints: buildProjectRoleWorkflowEntrypoints(),
    items,
  };
}
