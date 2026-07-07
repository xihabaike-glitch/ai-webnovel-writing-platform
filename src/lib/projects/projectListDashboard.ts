import { buildModelTaskAuditDashboard, type ModelAuditProvider, type ModelAuditTask } from "../ai/modelTaskAudit.ts";
import { getPlatformProfile, platformDeliveryScope, type PlatformId } from "../platforms/platformProfiles.ts";
import { buildFirstDayContinuationAction } from "./firstDayContinuation.ts";
import { buildFirstDayRiskProfile, buildFirstDayWorkflow, type FirstDayAiTask, type FirstDayChapter, type FirstDayCharacter, type FirstDayOutlineNode, type FirstDayRiskLevel, type FirstDayWorldEntry } from "./firstDayWorkflow.ts";
import { buildFirstDayDispatchCenterHref } from "./firstDayWorkflowView.ts";
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
  pipelineProof: ProjectListPipelineProof;
  realSampleValidation: ProjectListRealSampleValidation;
}

export type ProjectListRealSampleValidationStatus =
  | "blocked"
  | "needs_acceptance"
  | "ready_for_gate"
  | "ready_for_publish_review";

export interface ProjectListRealSampleValidation {
  status: ProjectListRealSampleValidationStatus;
  label: string;
  headline: string;
  detail: string;
  completedEvidence: string[];
  missingEvidence: string[];
  nextActionLabel: string;
  nextActionHref: string;
}

export type ProjectListPipelineStepStatus = "done" | "current" | "blocked";

export interface ProjectListPipelineStep {
  id: "project_start" | "sample_draft" | "task_dispatch" | "gate_check" | "failure_repair" | "publish_package";
  label: string;
  status: ProjectListPipelineStepStatus;
  evidence: string;
  href: string;
}

export interface ProjectListPipelineValidationReceipt {
  stepId: ProjectListPipelineStep["id"];
  headline: string;
  proofPrompt: string;
  requiredEvidence: string[];
  stopIfMissing: string[];
}

export interface ProjectListPipelineProof {
  currentStepId: ProjectListPipelineStep["id"];
  headline: string;
  nextActionLabel: string;
  nextActionHref: string;
  validationReceipt: ProjectListPipelineValidationReceipt;
  steps: ProjectListPipelineStep[];
}

export interface ProjectListPipelineProofSummary {
  headline: string;
  totalProjects: number;
  bottleneckStepId: ProjectListPipelineStep["id"] | null;
  bottleneckLabel: string;
  bottleneckCount: number;
  recommendedProjectId: string | null;
  recommendedProjectTitle: string | null;
  recommendedActionLabel: string;
  recommendedActionHref: string;
  stepCounts: Array<{
    id: ProjectListPipelineStep["id"];
    label: string;
    count: number;
    href: string;
    filterHref: string;
  }>;
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
  pmFocus: ProjectListPmFocus;
  pipelineProofSummary: ProjectListPipelineProofSummary;
  roleEntrypoints: ProjectRoleWorkflowEntrypoint[];
  items: ProjectListItem[];
}

export interface ProjectListPmFocus {
  status: "empty" | "blocked" | "needs_action" | "ready";
  headline: string;
  detail: string;
  scopeLabel: string;
  projectId: string | null;
  projectTitle: string | null;
  actionLabel: string;
  actionHref: string;
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

function buildPipelineValidationReceipt(step: ProjectListPipelineStep): ProjectListPipelineValidationReceipt {
  const receipts: Record<ProjectListPipelineStep["id"], Omit<ProjectListPipelineValidationReceipt, "stepId" | "headline">> = {
    project_start: {
      proofPrompt: "记录作品名、目标平台、篇幅、开头钩子、结尾承诺、主干和土壤是否齐备。",
      requiredEvidence: ["目标平台已选", "开头钩子和结尾承诺已填写", "主干和基础土壤可用于首章样本"],
      stopIfMissing: ["没有目标平台时停在作品工作台", "开头钩子为空时停在作品工作台", "结尾承诺缺失时停在作品工作台"],
    },
    sample_draft: {
      proofPrompt: "记录首章样本、审稿问题、二改候选和人工采用结论。",
      requiredEvidence: ["首章样本已生成", "钩子和爽点过线", "人工采用或明确二改"],
      stopIfMissing: ["候选稿直接覆盖正文时退回", "没有人工采用时停手", "样本质量不足时不允许批量"],
    },
    task_dispatch: {
      proofPrompt: "记录模型执行角色、输入、输出、任务回执、人工验收和下一步任务。",
      requiredEvidence: ["角色与模型匹配", "回执有可读证据", "下一步入口明确"],
      stopIfMissing: ["回执证据太薄时停在派单中心", "没有人工验收时停手", "任务没有下一步时不进总闸门"],
    },
    gate_check: {
      proofPrompt: "记录样本、复查、成本、质量、失败率和是否允许小批量。",
      requiredEvidence: ["样本稳定", "复查通过", "成本和失败率可控"],
      stopIfMissing: ["缺少复查时不允许批量", "失败率过高时不允许批量", "没有恢复证据时不允许批量"],
    },
    failure_repair: {
      proofPrompt: "记录失败原因、修复泳道、重试样本、恢复观察和是否仍需暂停批量。",
      requiredEvidence: ["失败原因已归类", "未恢复失败已处理", "恢复样本可观察"],
      stopIfMissing: ["模型配置未修复时暂停批量", "上下文失败未修复时暂停批量", "未恢复失败仍存在时暂停批量"],
    },
    publish_package: {
      proofPrompt: "记录平台包、样章、标签、卖点、版本基线和反馈复盘。",
      requiredEvidence: ["8 个核心平台都有发布证据", "样章和卖点齐备", "反馈复盘能回到作品"],
      stopIfMissing: ["发布包缺样章时停在发布修复", "平台卖点不清时停在发布修复", "反馈记录缺失时不宣称跑通"],
    },
  };
  const receipt = receipts[step.id];

  return {
    stepId: step.id,
    headline: `当前步骤验收回执：${step.label}`,
    ...receipt,
  };
}

function buildProjectPipelineProof(input: {
  project: ProjectListProject;
  outlinePercent: number;
  supportPercent: number;
  reviewPercent: number;
  aiFailureRate: number;
  riskLevel: FirstDayRiskLevel;
  continuationStatus: ProjectListItem["continuationStatus"];
}): ProjectListPipelineProof {
  const hasDraftedChapter = input.project.chapters.some((chapter) => chapter.wordCount > 0);
  const hasAcceptedDispatch = (input.project.gateDispatchTasks ?? []).some((task) => (
    task.state === "completed" && task.completionEvidence.trim().length >= 20
  ));
  const hasPublishReadyShape = input.project.chapters.length >= 3 && input.reviewPercent >= 60;
  const baseHref = `/projects/${input.project.id}`;
  const stepDefinitions: Array<Omit<ProjectListPipelineStep, "status"> & { done: boolean }> = [
    {
      id: "project_start",
      label: "开书与大树骨架",
      done: input.outlinePercent >= 70 && input.supportPercent >= 50,
      evidence: input.outlinePercent >= 70 && input.supportPercent >= 50
        ? "开头、结尾、主干、分支、叶片和土壤已有基础材料。"
        : "先补目标平台、开头钩子、结尾承诺、主干和土壤。",
      href: baseHref,
    },
    {
      id: "sample_draft",
      label: "首章样本生成",
      done: hasDraftedChapter,
      evidence: hasDraftedChapter ? "已有可审稿正文样本。" : "还缺首章样本，不能进入批量生产。",
      href: baseHref,
    },
    {
      id: "task_dispatch",
      label: "任务与派单回执",
      done: hasAcceptedDispatch,
      evidence: hasAcceptedDispatch ? "已有派单完成证据。" : "首章样本、审稿、二改或发布预检还缺派单回执。",
      href: `/dispatch?firstDayProject=${input.project.id}#first-day-dispatch`,
    },
    {
      id: "gate_check",
      label: "总闸门放大检查",
      done: input.continuationStatus === "ready" || input.continuationStatus === "complete",
      evidence: input.continuationStatus === "ready" || input.continuationStatus === "complete"
        ? "首日链路可进入总闸门复查。"
        : "缺样本、复查或交接证据时不允许放量。",
      href: "/gate",
    },
    {
      id: "failure_repair",
      label: "失败修复与恢复观察",
      done: input.aiFailureRate < 20 && input.riskLevel === "standard",
      evidence: input.aiFailureRate < 20 && input.riskLevel === "standard"
        ? "当前没有高失败率或止损恢复压力。"
        : "模型失败、观察期或止损状态未清，不允许扩大批量。",
      href: "/failures",
    },
    {
      id: "publish_package",
      label: "发布包与平台复盘",
      done: hasPublishReadyShape,
      evidence: hasPublishReadyShape ? "已有前三章和审稿基础，可以推进平台包。" : "发布包还缺前三章、审稿或平台复盘证据。",
      href: `${baseHref}#platform-export`,
    },
  ];
  const currentIndex = Math.max(0, stepDefinitions.findIndex((step) => !step.done));
  const normalizedCurrentIndex = currentIndex === -1 ? stepDefinitions.length - 1 : currentIndex;
  const steps = stepDefinitions.map((step, index) => ({
    id: step.id,
    label: step.label,
    evidence: step.evidence,
    href: step.href,
    status: index < normalizedCurrentIndex ? "done" : index === normalizedCurrentIndex ? "current" : "blocked",
  })) satisfies ProjectListPipelineStep[];
  const current = steps[normalizedCurrentIndex];

  return {
    currentStepId: current.id,
    headline: `当前验收卡：${current.label}`,
    nextActionLabel: current.status === "done" ? "复查发布闭环" : current.label,
    nextActionHref: current.href,
    validationReceipt: buildPipelineValidationReceipt(current),
    steps,
  };
}

function hasUsableOpeningSample(project: ProjectListProject) {
  const firstChapter = project.chapters.find((chapter) => chapter.order === 1) ?? project.chapters[0];
  if (!firstChapter) return false;

  return firstChapter.wordCount > 0
    && firstChapter.hook.trim().length > 0
    && firstChapter.conflict.trim().length > 0
    && firstChapter.valueShift.trim().length > 0
    && firstChapter.cliffhanger.trim().length > 0;
}

function hasSucceededTask(project: ProjectListProject, taskType: string) {
  return project.aiTasks.some((task) => task.taskType === taskType && task.status === "succeeded");
}

function hasAcceptedDispatch(project: ProjectListProject) {
  return (project.gateDispatchTasks ?? []).some((task) => (
    task.state === "completed" && task.completionEvidence.trim().length >= 20
  ));
}

function pendingFirstDayDispatch(project: ProjectListProject, stepId: string) {
  return (project.gateDispatchTasks ?? []).find((task) => (
    task.dispatchKey === `first-day:${project.id}:${stepId}`
    && task.state !== "completed"
  )) ?? null;
}

function buildRealSampleValidation(input: {
  project: ProjectListProject;
  outlinePercent: number;
  supportPercent: number;
  continuationStatus: ProjectListItem["continuationStatus"];
}): ProjectListRealSampleValidation {
  const baseHref = `/projects/${input.project.id}`;
  const startReady = input.outlinePercent >= 70 && input.supportPercent >= 50;
  const sampleReady = hasUsableOpeningSample(input.project);
  const reviewReady = hasSucceededTask(input.project, "chapter_review");
  const secondPassReady = hasSucceededTask(input.project, "chapter_second_pass");
  const dispatchAccepted = hasAcceptedDispatch(input.project);
  const publishShapeReady = input.project.chapters.length >= 3
    && reviewReady
    && secondPassReady
    && dispatchAccepted
    && (input.continuationStatus === "ready" || input.continuationStatus === "complete");
  const completedEvidence = [
    startReady ? "开书骨架已覆盖开头、结尾、主干、分支和土壤。" : null,
    sampleReady ? "首章样本已有钩子、冲突、价值变化和章末追读。" : null,
    reviewReady ? "审稿任务已有成功记录。" : null,
    secondPassReady ? "二改任务已有成功记录。" : null,
    dispatchAccepted ? "派单验收已有完成证据。" : null,
    publishShapeReady ? "前三章、审稿、二改和派单证据已能进入总闸门。" : null,
  ].filter((item): item is string => Boolean(item));
  const missingEvidence = [
    startReady ? null : "开书骨架缺开头钩子、结尾承诺、主干、支线或平台土壤。",
    sampleReady ? null : "首章样本缺钩子、冲突、价值变化或章末追读证据。",
    reviewReady ? null : "首章样本还缺审稿成功记录。",
    secondPassReady ? null : "审稿后还缺二改成功记录。",
    dispatchAccepted ? null : "审稿、二改或平台预检还缺派单回执和人工验收。",
  ].filter((item): item is string => Boolean(item));

  if (!startReady) {
    return {
      status: "blocked",
      label: "先补骨架",
      headline: "真实样本验收卡：开书骨架没过线。",
      detail: "别急着让模型写正文。先把目标平台、开头钩子、结尾承诺、主干和土壤补齐。",
      completedEvidence,
      missingEvidence,
      nextActionLabel: "补开书骨架",
      nextActionHref: baseHref,
    };
  }

  if (!sampleReady) {
    return {
      status: "blocked",
      label: "先补首章",
      headline: "真实样本验收卡：首章样本还不能拿去审。",
      detail: "首章必须能看见钩子、冲突、价值变化和章末追读，再进入审稿或二改。",
      completedEvidence,
      missingEvidence,
      nextActionLabel: "补首章样本",
      nextActionHref: baseHref,
    };
  }

  if (!reviewReady || !secondPassReady || !dispatchAccepted) {
    const stepId = !reviewReady ? "first-review" : !secondPassReady ? "first-rewrite" : "publish-precheck";
    const pendingDispatch = pendingFirstDayDispatch(input.project, stepId);
    if (pendingDispatch) {
      const pendingGap = "派单已生成，但还缺完成依据和人工验收。";
      return {
        status: "needs_acceptance",
        label: "待验收",
        headline: "真实样本验收卡：派单已生成，先填写验收依据。",
        detail: "这一步不用再生成派单。直接去派单中心填完成依据，让人工验收把缺口闭上。",
        completedEvidence: [
          ...completedEvidence,
          `派单已生成：${pendingDispatch.dispatchKey}`,
        ],
        missingEvidence: [pendingGap],
        nextActionLabel: "填写派单验收",
        nextActionHref: buildFirstDayDispatchCenterHref({
          projectId: input.project.id,
          stepId,
          source: "real-sample",
          gaps: [pendingGap],
        }),
      };
    }
    return {
      status: "needs_acceptance",
      label: "待验收",
      headline: "真实样本验收卡：首章样本要审稿、二改和派单验收。",
      detail: "有样本不等于能批量。先让审稿、二改和人工验收留下回执，再考虑总闸门。",
      completedEvidence,
      missingEvidence,
      nextActionLabel: "补派单验收",
      nextActionHref: buildFirstDayDispatchCenterHref({
        projectId: input.project.id,
        stepId,
        source: "real-sample",
        gaps: missingEvidence,
      }),
    };
  }

  if (!publishShapeReady) {
    return {
      status: "ready_for_gate",
      label: "进总闸门",
      headline: "真实样本验收卡：样本证据够了，去总闸门决定能不能放大。",
      detail: "当前已经有样本、审稿、二改和派单验收；下一步看成本、失败率和恢复证据。",
      completedEvidence,
      missingEvidence,
      nextActionLabel: "去总闸门",
      nextActionHref: "/gate",
    };
  }

  return {
    status: "ready_for_publish_review",
    label: "做发布复盘",
    headline: "真实样本验收卡：可以进入发布包和平台复盘。",
    detail: "别再加平台。把 8 个核心平台的样章、卖点、版本基线和反馈记录打穿。",
    completedEvidence,
    missingEvidence,
    nextActionLabel: "做平台包",
    nextActionHref: `${baseHref}#platform-export`,
  };
}

function buildProjectListPmFocus(items: ProjectListItem[]): ProjectListPmFocus {
  const scopeLabel = `${platformDeliveryScope.statusLabel} · ${platformDeliveryScope.expansionLabel}`;
  if (items.length === 0) {
    return {
      status: "empty",
      headline: "先开一本书，别在空工作台里谈平台战略。",
      detail: "当前没有作品。先创建项目、选定 8 个核心平台之一，再让大纲、人物、章节和平台包进入同一条生产线。",
      scopeLabel,
      projectId: null,
      projectTitle: null,
      actionLabel: "创建作品",
      actionHref: "#create-project",
    };
  }

  const target = items[0];
  const status = target.healthScore < 50
    ? "blocked"
    : target.healthScore < 75
      ? "needs_action"
      : "ready";
  const leadingRisk = target.riskFlags.find((flag) => flag !== "暂无明显阻塞") ?? target.riskFlags[0] ?? "暂无明显阻塞";
  const headline = status === "ready"
    ? `${target.title} 可以继续推进，但别跳过验收。`
    : `${target.title} 先处理：${target.nextAction}`;
  const detail = status === "ready"
    ? `当前最健康的作品是 ${target.platformName} · ${target.genre}，下一步仍要按写作、审稿、发布预检逐段留痕。`
    : `当前最该盯的是 ${target.platformName} · ${target.genre}：${leadingRisk}。先完成这个动作，再谈批量生成或新增入口。`;

  return {
    status,
    headline,
    detail,
    scopeLabel,
    projectId: target.id,
    projectTitle: target.title,
    actionLabel: target.nextAction,
    actionHref: target.nextActionHref,
  };
}

function buildPipelineProofSummary(items: ProjectListItem[]): ProjectListPipelineProofSummary {
  const fallbackSteps = items[0]?.pipelineProof.steps ?? [
    { id: "project_start", label: "开书与大树骨架", href: "/projects", status: "blocked", evidence: "" },
    { id: "sample_draft", label: "首章样本生成", href: "/projects", status: "blocked", evidence: "" },
    { id: "task_dispatch", label: "任务与派单回执", href: "/dispatch", status: "blocked", evidence: "" },
    { id: "gate_check", label: "总闸门放大检查", href: "/gate", status: "blocked", evidence: "" },
    { id: "failure_repair", label: "失败修复与恢复观察", href: "/failures", status: "blocked", evidence: "" },
    { id: "publish_package", label: "发布包与平台复盘", href: "/projects", status: "blocked", evidence: "" },
  ] satisfies ProjectListPipelineStep[];
  const stepCounts = fallbackSteps.map((step) => ({
    id: step.id,
    label: step.label,
    href: step.href,
    filterHref: `/projects?pipelineStep=${step.id}#pipeline-projects`,
    count: items.filter((item) => item.pipelineProof.currentStepId === step.id).length,
  }));
  const bottleneckSeed = stepCounts[0] ?? {
    id: "project_start",
    label: "开书与大树骨架",
    href: "/projects",
    filterHref: "/projects?pipelineStep=project_start#pipeline-projects",
    count: 0,
  };
  const bottleneck = stepCounts.reduce((current, next) => {
    if (next.count > current.count) return next;
    return current;
  }, bottleneckSeed);
  const recommendedProject = items.find((item) => item.pipelineProof.currentStepId === bottleneck.id) ?? null;

  return {
    headline: items.length === 0
      ? "流水线还没有作品样本，先开一本书。"
      : `${items.length} 本作品的流水线瓶颈在「${bottleneck.label}」。`,
    totalProjects: items.length,
    bottleneckStepId: items.length === 0 ? null : bottleneck.id,
    bottleneckLabel: items.length === 0 ? "暂无作品" : bottleneck.label,
    bottleneckCount: items.length === 0 ? 0 : bottleneck.count,
    recommendedProjectId: recommendedProject?.id ?? null,
    recommendedProjectTitle: recommendedProject?.title ?? null,
    recommendedActionLabel: recommendedProject?.pipelineProof.nextActionLabel ?? "创建作品",
    recommendedActionHref: recommendedProject?.pipelineProof.nextActionHref ?? "#create-project",
    stepCounts,
  };
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
    const outlinePercent = outlineCoverage(project.outlineNodes);
    const supportPercent = supportCoverage(project);
    const realSampleValidation = buildRealSampleValidation({
      project,
      outlinePercent,
      supportPercent,
      continuationStatus: continuation.status,
    });
    const rawHealthScore = Math.round(average([
      firstDay.progressPercent,
      outlinePercent,
      supportPercent,
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
      pipelineProof: buildProjectPipelineProof({
        project,
        outlinePercent,
        supportPercent,
        reviewPercent: reviewCoveragePercent,
        aiFailureRate: aiFailureRatePercent,
        riskLevel: riskProfile.level,
        continuationStatus: continuation.status,
      }),
      realSampleValidation,
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
    pmFocus: buildProjectListPmFocus(items),
    pipelineProofSummary: buildPipelineProofSummary(items),
    roleEntrypoints: buildProjectRoleWorkflowEntrypoints(),
    items,
  };
}
