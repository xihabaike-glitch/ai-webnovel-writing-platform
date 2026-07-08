import { buildModelTaskAuditDashboard, type ModelAuditProvider, type ModelAuditTask } from "../ai/modelTaskAudit.ts";
import { getPlatformProfile, platformDeliveryScope, type PlatformId } from "../platforms/platformProfiles.ts";
import { buildFirstDayContinuationAction } from "./firstDayContinuation.ts";
import { buildFirstDayRiskProfile, buildFirstDayWorkflow, type FirstDayAiTask, type FirstDayChapter, type FirstDayCharacter, type FirstDayOutlineNode, type FirstDayRiskLevel, type FirstDayWorldEntry } from "./firstDayWorkflow.ts";
import { buildFirstDayDispatchCenterHref } from "./firstDayWorkflowView.ts";
import { findProjectStartTacticSummary } from "./projectStartTactics.ts";
import { buildSubmissionChecklist } from "./submissionChecklist.ts";
import { buildReferenceCaseRolePlaybook } from "../references/openSourceCases.ts";
import { buildDevelopmentOverview } from "../development/developmentOverview.ts";

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
  productionClosure: ProjectListProductionClosureItem[];
  roleClosureProgress: ProjectListRoleClosureProgress | null;
}

export type ProjectListProductionClosureId = "batch-health" | "ai-pipeline" | "model-route";
export type ProjectListProductionClosureStatus = "allow" | "watch" | "block";

export interface ProjectListProductionClosureItem {
  id: ProjectListProductionClosureId;
  label: string;
  status: ProjectListProductionClosureStatus;
  statusLabel: string;
  detail: string;
  actionLabel: string;
  actionHref: string;
}

export interface ProjectListProductionClosureLane {
  id: ProjectListProductionClosureId;
  label: string;
  allowCount: number;
  watchCount: number;
  blockCount: number;
  primaryProjectId: string | null;
  primaryProjectTitle: string | null;
  statusLabel: string;
  detail: string;
  actionLabel: string;
  actionHref: string;
}

export interface ProjectListProductionClosureSummary {
  headline: string;
  totalProjects: number;
  lanes: ProjectListProductionClosureLane[];
}

export interface ProjectListRoleClosureLane {
  id: "story-structure" | "context-recall" | "platform-export";
  label: string;
  status: "done" | "missing";
  evidence: string;
}

export interface ProjectListRoleClosureProgress {
  headline: string;
  completedRoles: number;
  totalRoles: number;
  completedLabels: string[];
  missingLabels: string[];
  lanes: ProjectListRoleClosureLane[];
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
  validationReceipt: ProjectListPipelineValidationReceipt;
  stepCounts: Array<{
    id: ProjectListPipelineStep["id"];
    label: string;
    count: number;
    href: string;
    filterHref: string;
    validationReceipt: ProjectListPipelineValidationReceipt;
    recommendedProjectId: string | null;
    recommendedProjectTitle: string | null;
    recommendedActionLabel: string;
    recommendedActionHref: string;
  }>;
}

export interface ProjectListPipelineAcceptanceSummary {
  headline: string;
  verdict: string;
  totalProjects: number;
  passCount: number;
  repairCount: number;
  holdBatchCount: number;
  primaryActionLabel: string;
  primaryActionHref: string;
}

export type ProjectListRealSampleAcceptanceOutcome = "repair" | "hold_batch" | "pass";

export interface ProjectListRealSampleAcceptanceReceiptField {
  label: "验收状态" | "已收证据" | "缺口" | "下一步";
  value: string;
}

export interface ProjectListRealSampleAcceptanceReceipt {
  title: string;
  ownerRole: string;
  outcomeLabel: string;
  evidenceHref: string;
  gateRecheckHref: string;
  finalReleaseHref: string;
  finalReleaseLabel: string;
  fields: ProjectListRealSampleAcceptanceReceiptField[];
  stopRule: string;
  ownerConfirmation: string;
}

export interface ProjectListRealSampleRunbookStep {
  stepId: ProjectListPipelineStep["id"];
  title: string;
  owner: string;
  sampleAction: string;
  proofToCapture: string;
  rollbackIfWeak: string;
}

export interface ProjectListRealSampleAcceptanceQueueItem {
  projectId: string;
  projectTitle: string;
  platformName: string;
  outcome: ProjectListRealSampleAcceptanceOutcome;
  outcomeLabel: string;
  reason: string;
  completedEvidence: string[];
  missingEvidence: string[];
  actionLabel: string;
  actionHref: string;
  runbookStep: ProjectListRealSampleRunbookStep;
  receipt: ProjectListRealSampleAcceptanceReceipt;
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
  pipelineAcceptanceSummary: ProjectListPipelineAcceptanceSummary;
  realSampleAcceptanceQueue: ProjectListRealSampleAcceptanceQueueItem[];
  productionClosureSummary: ProjectListProductionClosureSummary;
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
  dispatchIntent: {
    roleId: string;
    roleName: string;
    ownerRole: string;
    modelOwner: string;
    actionLabel: string;
    trigger: string;
    acceptance: string;
  };
  skillBriefs: Array<{
    roleName: string;
    modelOwner: string;
    trigger: string;
    acceptance: string;
  }>;
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

function firstDayCompleteGateHref(projectId: string) {
  const params = new URLSearchParams({
    focus: "first-day-complete",
    projectId,
  });
  return `/gate?${params.toString()}`;
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
      proofPrompt: "记录模型执行角色、输入、输出、任务回执、完成依据、人工验收和下一步任务。",
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
  const pendingDispatch = (input.project.gateDispatchTasks ?? []).find((task) => (
    task.dispatchKey.startsWith(`first-day:${input.project.id}:`)
    && task.state !== "completed"
  )) ?? null;
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
      evidence: hasAcceptedDispatch
        ? "已有派单完成证据。"
        : pendingDispatch
          ? "派单已生成，等待填写完成依据和人工验收。"
          : "首章样本、审稿、二改或发布预检还缺派单回执。",
      href: pendingDispatch
        ? buildFirstDayDispatchCenterHref({
          projectId: input.project.id,
          dispatchKey: pendingDispatch.dispatchKey,
          source: "real-sample",
          gaps: ["派单已生成，但还缺完成依据和人工验收。"],
        })
        : `/dispatch?firstDayProject=${input.project.id}#first-day-dispatch`,
    },
    {
      id: "gate_check",
      label: "总闸门放大检查",
      done: input.continuationStatus === "ready" || input.continuationStatus === "complete",
      evidence: input.continuationStatus === "ready" || input.continuationStatus === "complete"
        ? "首日链路可进入总闸门复查。"
        : "缺样本、复查或交接证据时不允许放量。",
      href: hasAcceptedDispatch ? firstDayCompleteGateHref(input.project.id) : "/gate",
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

const roleClosureProgressLanes = [
  { id: "story-structure", label: "结构主编" },
  { id: "context-recall", label: "资料官" },
  { id: "platform-export", label: "平台包装" },
] as const;

function buildProjectListRoleClosureProgress(project: ProjectListProject): ProjectListRoleClosureProgress | null {
  const roleDispatches = (project.gateDispatchTasks ?? []).filter((task) => task.dispatchKey.startsWith(`role-intent:${project.id}:`));
  if (roleDispatches.length === 0) return null;

  const lanes = roleClosureProgressLanes.map((lane) => {
    const completedDispatch = roleDispatches.find((task) => (
      task.dispatchKey.startsWith(`role-intent:${project.id}:${lane.id}:`)
      && task.state === "completed"
      && task.completionEvidence.trim().length >= 20
    ));

    return {
      id: lane.id,
      label: lane.label,
      status: completedDispatch ? "done" : "missing",
      evidence: completedDispatch?.completionEvidence.trim() || `${lane.label}还缺完成依据。`,
    } satisfies ProjectListRoleClosureLane;
  });
  const completedLabels = lanes.filter((lane) => lane.status === "done").map((lane) => lane.label);
  const missingLabels = lanes.filter((lane) => lane.status === "missing").map((lane) => lane.label);

  return {
    headline: missingLabels.length === 0
      ? `角色闭环 ${completedLabels.length}/${lanes.length}：三类角色已闭合`
      : `角色闭环 ${completedLabels.length}/${lanes.length}：还缺${missingLabels.join("、")}`,
    completedRoles: completedLabels.length,
    totalRoles: lanes.length,
    completedLabels,
    missingLabels,
    lanes,
  };
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
      nextActionHref: firstDayCompleteGateHref(input.project.id),
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

function closureStatusLabel(status: ProjectListProductionClosureStatus) {
  if (status === "allow") return "可推进";
  if (status === "watch") return "先观察";
  return "先修复";
}

function latestProjectDispatch(project: ProjectListProject, prefix: string) {
  return (project.gateDispatchTasks ?? []).find((task) => task.dispatchKey.startsWith(prefix)) ?? null;
}

function buildProjectListProductionClosure(input: {
  project: ProjectListProject;
  modelAuditScore: number;
  realSampleValidation: ProjectListRealSampleValidation;
}): ProjectListProductionClosureItem[] {
  const baseHref = `/projects/${input.project.id}`;
  const sampleReady = hasUsableOpeningSample(input.project);
  const reviewReady = hasSucceededTask(input.project, "chapter_review");
  const secondPassReady = hasSucceededTask(input.project, "chapter_second_pass");
  const dispatchAccepted = hasAcceptedDispatch(input.project);
  const modelRouteDispatch = latestProjectDispatch(input.project, `model-route-repair:${input.project.id}:`);
  const modelRouteDispatchAccepted = modelRouteDispatch?.state === "completed" && modelRouteDispatch.completionEvidence.trim().length >= 20;
  const modelRouteStatus: ProjectListProductionClosureStatus = modelRouteDispatch
    ? modelRouteDispatchAccepted ? "allow" : "block"
    : input.modelAuditScore >= 75
      ? "allow"
      : input.project.aiTasks.some((task) => task.status === "succeeded")
        ? "watch"
        : "block";
  const batchStatus: ProjectListProductionClosureStatus = input.realSampleValidation.status === "ready_for_publish_review"
    ? "allow"
    : input.realSampleValidation.status === "ready_for_gate"
      ? "watch"
      : "block";
  const aiPipelineStatus: ProjectListProductionClosureStatus = reviewReady && secondPassReady && dispatchAccepted
    ? "allow"
    : sampleReady && (reviewReady || secondPassReady || dispatchAccepted)
      ? "watch"
      : "block";

  return [
    {
      id: "batch-health",
      label: "批量健康",
      status: batchStatus,
      statusLabel: closureStatusLabel(batchStatus),
      detail: input.realSampleValidation.headline,
      actionLabel: input.realSampleValidation.nextActionLabel,
      actionHref: input.realSampleValidation.nextActionHref,
    },
    {
      id: "ai-pipeline",
      label: "AI 写审改",
      status: aiPipelineStatus,
      statusLabel: closureStatusLabel(aiPipelineStatus),
      detail: aiPipelineStatus === "allow"
        ? "首章样本、审稿、二改和派单验收已经形成回流。"
        : aiPipelineStatus === "watch"
          ? "AI 写审改链路已有样本，但还缺二改或人工验收闭环。"
          : "AI 写审改链路还缺可用样本、审稿或派单证据。",
      actionLabel: aiPipelineStatus === "allow" ? "查看写审改" : "补写审改",
      actionHref: aiPipelineStatus === "block" && !sampleReady
        ? baseHref
        : `${baseHref}#ai-pipeline`,
    },
    {
      id: "model-route",
      label: "模型路线",
      status: modelRouteStatus,
      statusLabel: closureStatusLabel(modelRouteStatus),
      detail: modelRouteDispatch
        ? modelRouteDispatchAccepted
          ? modelRouteDispatch.completionEvidence.trim()
          : "模型路线修复派单已生成，但还缺完成依据和复检证据。"
        : modelRouteStatus === "allow"
          ? "模型任务审计分已过线，继续保留小样本复检。"
          : input.project.aiTasks.some((task) => task.status === "succeeded")
            ? "已有模型任务记录，但还需要路线复检确认。"
            : "还没有足够模型执行证据，先补模型路线或小样本。",
      actionLabel: modelRouteDispatch && !modelRouteDispatchAccepted ? "处理模型路线" : "查看模型路线",
      actionHref: modelRouteDispatch && !modelRouteDispatchAccepted
        ? `/dispatch#dispatch-${modelRouteDispatch.dispatchKey}`
        : `${baseHref}#ai-pipeline`,
    },
  ];
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
  const stepCounts = fallbackSteps.map((step) => {
    const stepItems = items.filter((item) => item.pipelineProof.currentStepId === step.id);
    const stepProject = stepItems[0] ?? null;

    return {
      id: step.id,
      label: step.label,
      href: step.href,
      filterHref: `/projects?pipelineStep=${step.id}#pipeline-projects`,
      count: stepItems.length,
      validationReceipt: buildPipelineValidationReceipt(step),
      recommendedProjectId: stepProject?.id ?? null,
      recommendedProjectTitle: stepProject?.title ?? null,
      recommendedActionLabel: stepProject?.pipelineProof.nextActionLabel ?? (items.length > 0 ? "查看全部作品" : "创建作品"),
      recommendedActionHref: stepProject?.pipelineProof.nextActionHref ?? (items.length > 0 ? "/projects#pipeline-projects" : "#create-project"),
    };
  });
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
  const bottleneckStep = fallbackSteps.find((step) => step.id === bottleneck.id) ?? fallbackSteps[0];

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
    validationReceipt: buildPipelineValidationReceipt(bottleneckStep),
    stepCounts,
  };
}

function buildPipelineAcceptanceSummary(items: ProjectListItem[]): ProjectListPipelineAcceptanceSummary {
  const passItems = items.filter((item) => item.realSampleValidation.status === "ready_for_publish_review");
  const holdItems = items.filter((item) => item.realSampleValidation.status === "ready_for_gate");
  const repairItems = items.filter((item) => item.realSampleValidation.status === "blocked" || item.realSampleValidation.status === "needs_acceptance");
  const primaryItem = repairItems[0] ?? holdItems[0] ?? passItems[0] ?? null;

  return {
    headline: items.length === 0
      ? "真实流水线验收：还没有作品样本。"
      : `真实流水线验收：${passItems.length}/${items.length} 本可进入发布复盘。`,
    verdict: items.length === 0
      ? "先创建作品，再开始开书、首章样本、审稿二改、发布包和复盘验收。"
      : repairItems.length > 0
        ? `先修复 ${repairItems.length} 本作品的真实样本证据，补齐后再考虑批量。`
        : holdItems.length > 0
          ? `${holdItems.length} 本作品证据已到总闸门，先暂停批量，等总闸门确认放大。`
          : "所有作品都已到发布复盘口径，可以开始检查平台包和反馈记录。",
    totalProjects: items.length,
    passCount: passItems.length,
    repairCount: repairItems.length,
    holdBatchCount: holdItems.length,
    primaryActionLabel: primaryItem?.realSampleValidation.nextActionLabel ?? "创建作品",
    primaryActionHref: primaryItem?.realSampleValidation.nextActionHref ?? "#create-project",
  };
}

function realSampleOutcome(status: ProjectListRealSampleValidationStatus): {
  outcome: ProjectListRealSampleAcceptanceOutcome;
  outcomeLabel: string;
  priority: number;
} {
  if (status === "ready_for_publish_review") return { outcome: "pass", outcomeLabel: "通过", priority: 3 };
  if (status === "ready_for_gate") return { outcome: "hold_batch", outcomeLabel: "暂停批量", priority: 2 };
  return { outcome: "repair", outcomeLabel: "退回修复", priority: 1 };
}

function buildRealSampleAcceptanceReceipt(
  item: ProjectListItem,
  outcome: ReturnType<typeof realSampleOutcome>,
): ProjectListRealSampleAcceptanceReceipt {
  const completedEvidence = item.realSampleValidation.completedEvidence.length
    ? item.realSampleValidation.completedEvidence.join("；")
    : "暂无已收证据";
  const missingEvidence = item.realSampleValidation.missingEvidence.length
    ? item.realSampleValidation.missingEvidence.join("；")
    : "没有缺口，等待下一道闸门";
  const params = new URLSearchParams({
    focus: "action-recheck",
    projectId: item.id,
    source: "real-sample-receipt",
  });

  return {
    title: `真实作品流水线样本回执：${item.title}`,
    ownerRole: "毒舌产品经理 + 作者",
    outcomeLabel: outcome.outcomeLabel,
    evidenceHref: item.realSampleValidation.nextActionHref,
    gateRecheckHref: `/gate?${params.toString()}#gate-focus-notice`,
    finalReleaseHref: `/gate?${params.toString()}#pipeline-final-review`,
    finalReleaseLabel: "查看最终交付正式放行卡",
    fields: [
      { label: "验收状态", value: outcome.outcomeLabel },
      { label: "已收证据", value: completedEvidence },
      { label: "缺口", value: missingEvidence },
      { label: "下一步", value: item.realSampleValidation.nextActionLabel },
    ],
    stopRule: outcome.outcome === "pass"
      ? "发布复盘缺版本基线、样章或反馈记录时，仍要退回补证据。"
      : outcome.outcome === "hold_batch"
        ? "总闸门未复检前暂停批量，不允许直接扩大生产。"
        : "缺口未补齐前退回修复，不允许宣称真实作品流水线跑通。",
    ownerConfirmation: "负责人必须人工确认：证据入口可打开、缺口已处理、下一步能回总闸门复检。",
  };
}

function buildRealSampleRunbookStep(item: ProjectListItem): ProjectListRealSampleRunbookStep {
  const overview = buildDevelopmentOverview();
  const step = item.pipelineProof.steps.find((entry) => entry.id === item.pipelineProof.currentStepId)
    ?? item.pipelineProof.steps[0];
  const runbookItem = overview.currentPipelineValidation.runbook.items.find((entry) => entry.stepId === item.pipelineProof.currentStepId)
    ?? overview.currentPipelineValidation.runbook.items[0];

  return {
    stepId: runbookItem.stepId,
    title: step?.label ?? runbookItem.stepId,
    owner: runbookItem.owner,
    sampleAction: runbookItem.sampleAction,
    proofToCapture: runbookItem.proofToCapture,
    rollbackIfWeak: runbookItem.rollbackIfWeak,
  };
}

function buildRealSampleAcceptanceQueue(items: ProjectListItem[]): ProjectListRealSampleAcceptanceQueueItem[] {
  return items
    .map((item) => {
      const outcome = realSampleOutcome(item.realSampleValidation.status);

      return {
        projectId: item.id,
        projectTitle: item.title,
        platformName: item.platformName,
        outcome: outcome.outcome,
        outcomeLabel: outcome.outcomeLabel,
        reason: item.realSampleValidation.headline,
        completedEvidence: item.realSampleValidation.completedEvidence,
        missingEvidence: item.realSampleValidation.missingEvidence,
        actionLabel: item.realSampleValidation.nextActionLabel,
        actionHref: item.realSampleValidation.nextActionHref,
        runbookStep: buildRealSampleRunbookStep(item),
        receipt: buildRealSampleAcceptanceReceipt(item, outcome),
        priority: outcome.priority,
      };
    })
    .sort((left, right) => left.priority - right.priority)
    .slice(0, 5)
    .map(({ priority: _priority, ...item }) => item);
}

function productionClosurePriority(status: ProjectListProductionClosureStatus) {
  if (status === "block") return 0;
  if (status === "watch") return 1;
  return 2;
}

function productionClosureActionPriority(closure: ProjectListProductionClosureItem) {
  if (closure.id === "model-route" && closure.actionHref.startsWith("/dispatch#dispatch-model-route-repair:")) return -1;
  return 0;
}

function buildProductionClosureSummary(items: ProjectListItem[]): ProjectListProductionClosureSummary {
  const laneSeeds: Array<{ id: ProjectListProductionClosureId; label: string }> = [
    { id: "batch-health", label: "批量健康" },
    { id: "ai-pipeline", label: "AI 写审改" },
    { id: "model-route", label: "模型路线" },
  ];
  const lanes = laneSeeds.map((seed) => {
    const laneItems = items
      .map((item) => ({
        project: item,
        closure: item.productionClosure.find((closure) => closure.id === seed.id),
      }))
      .filter((entry): entry is { project: ProjectListItem; closure: ProjectListProductionClosureItem } => Boolean(entry.closure));
    const primary = [...laneItems].sort((left, right) => (
      productionClosureActionPriority(left.closure) - productionClosureActionPriority(right.closure)
      || productionClosurePriority(left.closure.status) - productionClosurePriority(right.closure.status)
      || left.project.healthScore - right.project.healthScore
      || new Date(right.project.updatedAt).getTime() - new Date(left.project.updatedAt).getTime()
    ))[0] ?? null;

    return {
      id: seed.id,
      label: seed.label,
      allowCount: laneItems.filter((entry) => entry.closure.status === "allow").length,
      watchCount: laneItems.filter((entry) => entry.closure.status === "watch").length,
      blockCount: laneItems.filter((entry) => entry.closure.status === "block").length,
      primaryProjectId: primary?.project.id ?? null,
      primaryProjectTitle: primary?.project.title ?? null,
      statusLabel: primary?.closure.statusLabel ?? "暂无作品",
      detail: primary?.closure.detail ?? "还没有作品进入这条闭环。",
      actionLabel: primary?.closure.actionLabel ?? "创建作品",
      actionHref: primary?.closure.actionHref ?? "#create-project",
    } satisfies ProjectListProductionClosureLane;
  });
  const blockedLane = lanes.find((lane) => lane.blockCount > 0);
  const watchLane = lanes.find((lane) => lane.watchCount > 0);
  const focusLane = blockedLane ?? watchLane ?? lanes[0];

  return {
    headline: items.length === 0
      ? "组合生产闭环：还没有作品样本。"
      : focusLane.blockCount > 0
        ? `组合生产闭环：先处理「${focusLane.label}」的 ${focusLane.blockCount} 个阻塞。`
        : focusLane.watchCount > 0
          ? `组合生产闭环：${focusLane.label} 还有 ${focusLane.watchCount} 本需要观察。`
          : "组合生产闭环：三条生产线都可以继续小步推进。",
    totalProjects: items.length,
    lanes,
  };
}

export function buildProjectRoleWorkflowEntrypoints(): ProjectRoleWorkflowEntrypoint[] {
  const roleById = new Map(buildReferenceCaseRolePlaybook().map((role) => [role.id, role]));
  const withSkillBriefs = (
    entry: Omit<ProjectRoleWorkflowEntrypoint, "skillBriefs" | "dispatchIntent">,
  ): ProjectRoleWorkflowEntrypoint => ({
    ...entry,
    skillBriefs: entry.roleIds.flatMap((roleId) => {
      const role = roleById.get(roleId);
      if (!role) return [];

      return {
        roleName: role.roleName,
        modelOwner: role.modelOwner,
        trigger: role.skillBrief.trigger,
        acceptance: role.skillBrief.acceptance,
      };
    }),
    dispatchIntent: (() => {
      const primaryRoleId = entry.roleIds.find((roleId) => roleId !== "toxic_pm") ?? entry.roleIds[0];
      const role = primaryRoleId ? roleById.get(primaryRoleId) : null;
      return {
        roleId: primaryRoleId ?? "toxic_pm",
        roleName: role?.roleName ?? entry.title,
        ownerRole: role?.roleName ?? entry.title,
        modelOwner: role?.modelOwner ?? "GPT / Claude",
        actionLabel: `派给${role?.roleName ?? entry.title}`,
        trigger: role?.skillBrief.trigger ?? entry.detail,
        acceptance: role?.skillBrief.acceptance ?? "必须输出可验收产物，并说明下一步动作。",
      };
    })(),
  });

  const entries: Array<Omit<ProjectRoleWorkflowEntrypoint, "skillBriefs" | "dispatchIntent">> = [
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

  return entries.map(withSkillBriefs);
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
      targetLengthType: project.targetLengthType,
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
        targetLengthType: project.targetLengthType,
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
    const productionClosure = buildProjectListProductionClosure({
      project,
      modelAuditScore: modelAudit.score,
      realSampleValidation,
    });
    const roleClosureProgress = buildProjectListRoleClosureProgress(project);
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
      productionClosure,
      roleClosureProgress,
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
    pipelineAcceptanceSummary: buildPipelineAcceptanceSummary(items),
    realSampleAcceptanceQueue: buildRealSampleAcceptanceQueue(items),
    productionClosureSummary: buildProductionClosureSummary(items),
    roleEntrypoints: buildProjectRoleWorkflowEntrypoints(),
    items,
  };
}
