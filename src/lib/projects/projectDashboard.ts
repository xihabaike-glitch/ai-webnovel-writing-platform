import type { PlatformProfile } from "@/lib/platforms/platformProfiles";
import { buildDevelopmentOverview, type DevelopmentOverviewPipelineProofStep } from "../development/developmentOverview.ts";

export interface DashboardChapter {
  id: string;
  title: string;
  order: number;
  status: string;
  wordCount: number;
  goal?: string | null;
  hook?: string | null;
  conflict?: string | null;
  valueShift?: string | null;
  cliffhanger?: string | null;
  updatedAt?: Date | string;
  aiTasks?: Array<{
    taskType: string;
    status: string;
    createdAt: Date | string;
  }>;
}

export interface DashboardAiTask {
  id: string;
  taskType: string;
  status: string;
  model: string;
  createdAt: Date | string;
  chapter?: {
    id: string;
    title: string;
  } | null;
  modelProvider?: {
    providerId: string;
    displayName: string;
  };
}

export interface DashboardGateDispatchTask {
  dispatchKey: string;
  state: string;
  completionEvidence: string;
}

export interface ProjectDashboardInput {
  projectId?: string;
  currentWordCount: number;
  targetWordCount: number;
  platform: PlatformProfile;
  chapters: DashboardChapter[];
  aiTasks: DashboardAiTask[];
  gateDispatchTasks?: DashboardGateDispatchTask[];
}

export type ProjectAcceptanceStepStatus = "done" | "current" | "blocked";

export interface ProjectAcceptanceStep {
  id: "project_start" | "opening_sample" | "chapter_review" | "second_pass" | "dispatch_receipt" | "role_dispatch" | "publish_package";
  label: string;
  status: ProjectAcceptanceStepStatus;
  evidence: string;
  stopRule: string;
  href: string;
}

export interface ProjectAcceptanceMissingEvidence {
  stepId: ProjectAcceptanceStep["id"];
  label: string;
  reason: string;
  stopRule: string;
  href: string;
  actionLabel: string;
  ownerRole: string;
  actionMode: "workspace" | "ai_task" | "dispatch" | "publish";
  executionHint: string;
  runbookStep: ProjectAcceptanceRunbookStep;
  receiptTemplate: string[];
  dispatchDraftHref: string;
}

export interface ProjectAcceptanceRunbookStep {
  stepId: DevelopmentOverviewPipelineProofStep["id"];
  title: string;
  owner: string;
  sampleAction: string;
  proofToCapture: string;
  rollbackIfWeak: string;
}

export interface ProjectRoleClosureLane {
  id: "story-structure" | "context-recall" | "platform-export";
  label: string;
  status: "done" | "missing";
  evidence: string;
}

export interface ProjectRoleClosureProgress {
  headline: string;
  completedRoles: number;
  totalRoles: number;
  completedLabels: string[];
  missingLabels: string[];
  lanes: ProjectRoleClosureLane[];
}

export interface ProjectRealSampleAcceptanceSheet {
  title: string;
  verdict: string;
  currentStepId: ProjectAcceptanceStep["id"];
  actionLabel: string;
  actionHref: string;
  finalReleaseHref: string;
  finalReleaseLabel: string;
  gateStatus: "ready" | "blocked";
  completedSteps: number;
  totalSteps: number;
  missingEvidence: ProjectAcceptanceMissingEvidence[];
  blockReason: string;
  steps: ProjectAcceptanceStep[];
  roleClosureProgress: ProjectRoleClosureProgress | null;
}

export interface ProjectDashboardSummary {
  progressPercent: number;
  totalChapters: number;
  totalWords: number;
  targetWords: number;
  statusCounts: Record<string, number>;
  reviewedChapterIds: string[];
  unreviewedChapters: DashboardChapter[];
  nextChapter: DashboardChapter | null;
  recentTasks: DashboardAiTask[];
  platformWarnings: string[];
  realSampleAcceptanceSheet: ProjectRealSampleAcceptanceSheet;
}

const chapterStatusOrder = ["outline", "draft", "revising", "final"];

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function hasText(value: string | null | undefined) {
  return Boolean(value?.trim());
}

const requiredRoleDispatchIntents = [
  { id: "story-structure", label: "结构主编" },
  { id: "context-recall", label: "资料官" },
  { id: "platform-export", label: "平台包装" },
] as const;

const missingEvidenceActionLabels: Record<ProjectAcceptanceStep["id"], string> = {
  project_start: "补开书基础",
  opening_sample: "补首章样本",
  chapter_review: "启动审稿",
  second_pass: "启动二改",
  dispatch_receipt: "回填派单验收",
  role_dispatch: "补角色派单",
  publish_package: "打开发布包",
};

const missingEvidenceExecutionSpecs: Record<
  ProjectAcceptanceStep["id"],
  Pick<ProjectAcceptanceMissingEvidence, "ownerRole" | "actionMode" | "executionHint">
> = {
  project_start: {
    ownerRole: "主编",
    actionMode: "workspace",
    executionHint: "回作品工作台补目标平台、篇幅和开书基础，再进入模型生成。",
  },
  opening_sample: {
    ownerRole: "开头编辑",
    actionMode: "workspace",
    executionHint: "打开第一章补正文、钩子、冲突、价值变化和章末追读。",
  },
  chapter_review: {
    ownerRole: "审稿编辑",
    actionMode: "ai_task",
    executionHint: "在 AI 流水线里启动章节审稿，保留成功任务记录和人工判断。",
  },
  second_pass: {
    ownerRole: "二改编辑",
    actionMode: "ai_task",
    executionHint: "在 AI 流水线里启动章节二改，二改结果通过后再进总闸门放量。",
  },
  dispatch_receipt: {
    ownerRole: "派单验收负责人",
    actionMode: "dispatch",
    executionHint: "去派单中心补完成依据、人工验收和下一步判断。",
  },
  role_dispatch: {
    ownerRole: "角色验收负责人",
    actionMode: "dispatch",
    executionHint: "补齐结构、资料、平台包装角色派单闭环，再回总闸门复检。",
  },
  publish_package: {
    ownerRole: "平台包装编辑",
    actionMode: "publish",
    executionHint: "打开发布包补前三章、卖点、标签、简介和平台复盘入口。",
  },
};

function buildAcceptanceGapDispatchDraftHref(
  input: ProjectDashboardInput,
  step: Omit<ProjectAcceptanceStep, "status">,
  execution: Pick<ProjectAcceptanceMissingEvidence, "ownerRole" | "executionHint">,
) {
  const projectId = input.projectId ?? "";
  const returnHref = step.href.startsWith("/projects/")
    ? step.href
    : projectId ? `/projects/${projectId}${step.href.startsWith("#") ? step.href : ""}` : "/projects";
  const params = new URLSearchParams({
    roleIntent: "acceptance-gap",
    projectId,
    roleId: step.id,
    roleName: execution.ownerRole,
    role: execution.ownerRole,
    modelOwner: "按模型岗位矩阵选择",
    acceptance: `完成「${step.label}」证据：${step.evidence}${step.stopRule} ${execution.executionHint} 处理后回总闸门复检。`,
    returnHref,
  });

  return `/dispatch?${params.toString()}#dispatch-task-center`;
}

function buildAcceptanceGapReceiptTemplate(
  step: Omit<ProjectAcceptanceStep, "status">,
  execution: Pick<ProjectAcceptanceMissingEvidence, "ownerRole" | "executionHint">,
) {
  return [
    `完成项：${step.label}`,
    `执行角色：${execution.ownerRole}`,
    `输入：验收缺口“${step.label}”与停手线“${step.stopRule}”`,
    "输出：已修复/已补齐的作品材料与产物链接",
    "验收证据：人工验收记录、产物位置、回总闸门复检结论",
    "产物链接/位置：",
    "人工验收：通过 / 退回",
    `回总闸门复检结论：${step.label}缺口已解除 / 卡点仍在`,
    `下一动作：${execution.executionHint}`,
    `停手线：${step.stopRule}`,
  ];
}

function proofRouteStepIdForAcceptanceStep(stepId: ProjectAcceptanceStep["id"]): DevelopmentOverviewPipelineProofStep["id"] {
  if (stepId === "project_start") return "project_start";
  if (stepId === "publish_package") return "publish_package";
  if (stepId === "dispatch_receipt" || stepId === "role_dispatch") return "task_dispatch";
  return "sample_draft";
}

function buildProjectAcceptanceRunbookStep(stepId: ProjectAcceptanceStep["id"]): ProjectAcceptanceRunbookStep {
  const overview = buildDevelopmentOverview();
  const proofStepId = proofRouteStepIdForAcceptanceStep(stepId);
  const runbookItem = overview.currentPipelineValidation.runbook.items.find((item) => item.stepId === proofStepId)
    ?? overview.currentPipelineValidation.runbook.items[0];
  const proofStep = overview.pipelineProofRoute.steps.find((step) => step.id === runbookItem.stepId);

  return {
    stepId: runbookItem.stepId,
    title: proofStep?.title ?? runbookItem.stepId,
    owner: runbookItem.owner,
    sampleAction: runbookItem.sampleAction,
    proofToCapture: runbookItem.proofToCapture,
    rollbackIfWeak: runbookItem.rollbackIfWeak,
  };
}

function roleDispatchPrefix(projectId: string | undefined, intentId: string) {
  return projectId ? `role-intent:${projectId}:${intentId}:` : `role-intent:`;
}

function hasCompletedDispatchEvidence(task: DashboardGateDispatchTask) {
  return task.state === "completed" && task.completionEvidence.trim().length >= 20;
}

function completionValueAfterLabel(label: string, text: string) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = text.match(new RegExp(`${escaped}\\s*[：:=]\\s*([^\\n]+)`, "u"));
  return match?.[1]?.trim() ?? "";
}

function hasPublishPackageRecheckReceipt(input: ProjectDashboardInput) {
  const projectPrefix = input.projectId
    ? `project-acceptance-next:${input.projectId}:publish_package`
    : "project-acceptance-next:";
  return (input.gateDispatchTasks ?? []).some((task) => {
    if (!task.dispatchKey.startsWith(projectPrefix)) return false;
    if (input.projectId === undefined && !task.dispatchKey.endsWith(":publish_package")) return false;
    if (!hasCompletedDispatchEvidence(task)) return false;

    const text = task.completionEvidence;
    const completedItem = completionValueAfterLabel("完成项", text);
    const artifact = completionValueAfterLabel("产物链接/位置", text);
    const manualAcceptance = completionValueAfterLabel("人工验收", text);
    const gateConclusion = completionValueAfterLabel("回总闸门复检结论", text);
    const packageSignals = ["发布包", "标题", "简介", "标签", "样章", "前三章"].filter((signal) => completedItem.includes(signal));

    return packageSignals.length >= 4
      && artifact.length >= 8
      && /通过|已验收|确认|合格/u.test(manualAcceptance)
      && /验收缺口已解除|已解除|通过/u.test(gateConclusion);
  });
}

function roleClosureRecheckReceipt(input: ProjectDashboardInput) {
  const projectPrefix = input.projectId
    ? `project-acceptance-next:${input.projectId}:role_dispatch`
    : "project-acceptance-next:";
  return (input.gateDispatchTasks ?? []).find((task) => {
    if (!task.dispatchKey.startsWith(projectPrefix)) return false;
    if (input.projectId === undefined && !task.dispatchKey.endsWith(":role_dispatch")) return false;
    if (!hasCompletedDispatchEvidence(task)) return false;

    const text = task.completionEvidence;
    const completedItem = completionValueAfterLabel("完成项", text);
    const artifact = completionValueAfterLabel("产物链接/位置", text);
    const manualAcceptance = completionValueAfterLabel("人工验收", text);
    const gateConclusion = completionValueAfterLabel("回总闸门复检结论", text);
    const roleSignals = ["资料官", "平台包装"].filter((signal) => completedItem.includes(signal));

    return roleSignals.length >= 2
      && artifact.length >= 8
      && /通过|已验收|确认|合格/u.test(manualAcceptance)
      && /验收缺口已解除|已解除|通过/u.test(gateConclusion);
  }) ?? null;
}

function buildRoleDispatchAcceptance(input: ProjectDashboardInput) {
  const tasks = input.gateDispatchTasks ?? [];
  const recheckReceipt = roleClosureRecheckReceipt(input);
  const roleDispatchTasks = tasks.filter((task) => (
    input.projectId
      ? task.dispatchKey.startsWith(`role-intent:${input.projectId}:`)
      : task.dispatchKey.startsWith("role-intent:")
  ));
  const active = roleDispatchTasks.length > 0;
  const lanes = requiredRoleDispatchIntents.map((intent) => {
    const completedTask = roleDispatchTasks.find((task) => (
      task.dispatchKey.startsWith(roleDispatchPrefix(input.projectId, intent.id))
      && hasCompletedDispatchEvidence(task)
    ));
    const coveredByRecheck = Boolean(
      recheckReceipt
      && (intent.id === "context-recall" || intent.id === "platform-export")
      && recheckReceipt.completionEvidence.includes(intent.label),
    );
    return {
      id: intent.id,
      label: intent.label,
      status: completedTask || coveredByRecheck ? "done" : "missing",
      evidence: completedTask?.completionEvidence.trim()
        || (coveredByRecheck ? `复检分流收据已补齐${intent.label}角色闭环：${recheckReceipt?.completionEvidence.trim()}` : `${intent.label}还缺完成依据。`),
    } satisfies ProjectRoleClosureLane;
  });
  const completedLabels = lanes.filter((lane) => lane.status === "done").map((lane) => lane.label);
  const missingLabels = lanes.filter((lane) => lane.status === "missing").map((lane) => lane.label);
  const roleClosureProgress: ProjectRoleClosureProgress | null = active
    ? {
      headline: missingLabels.length === 0
        ? `角色闭环 ${completedLabels.length}/${lanes.length}：三类角色已闭合`
        : `角色闭环 ${completedLabels.length}/${lanes.length}：还缺${missingLabels.join("、")}`,
      completedRoles: completedLabels.length,
      totalRoles: lanes.length,
      completedLabels,
      missingLabels,
      lanes,
    }
    : null;

  return {
    active,
    done: active && missingLabels.length === 0,
    completedLabels,
    missingLabels,
    roleClosureProgress,
  };
}

function buildProjectRealSampleAcceptanceSheet(input: ProjectDashboardInput): ProjectRealSampleAcceptanceSheet {
  const projectHref = input.projectId ? `/projects/${input.projectId}` : "#";
  const firstChapter = input.chapters.find((chapter) => chapter.order === 1) ?? input.chapters[0] ?? null;
  const hasProjectStart = input.targetWordCount > 0 && input.platform.name.trim().length > 0;
  const hasOpeningSample = Boolean(firstChapter)
    && (firstChapter?.wordCount ?? 0) > 0
    && hasText(firstChapter?.hook)
    && hasText(firstChapter?.conflict)
    && hasText(firstChapter?.valueShift)
    && hasText(firstChapter?.cliffhanger);
  const firstChapterId = firstChapter?.id ?? null;
  const hasReview = input.aiTasks.some((task) => (
    task.taskType === "chapter_review"
    && task.status === "succeeded"
    && (!firstChapterId || task.chapter?.id === firstChapterId)
  ));
  const hasSecondPass = input.aiTasks.some((task) => (
    task.taskType === "chapter_second_pass"
    && task.status === "succeeded"
    && (!firstChapterId || task.chapter?.id === firstChapterId)
  ));
  const hasDispatchReceipt = (input.gateDispatchTasks ?? []).some((task) => (
    task.dispatchKey.startsWith("first-day:")
    && hasCompletedDispatchEvidence(task)
  ));
  const roleDispatchAcceptance = buildRoleDispatchAcceptance(input);
  const hasRoleDispatchClosure = !roleDispatchAcceptance.active || roleDispatchAcceptance.done;
  const hasPublishPackageRecheck = hasPublishPackageRecheckReceipt(input);
  const hasPublishPackagePrerequisites = hasReview && hasSecondPass && hasDispatchReceipt && hasRoleDispatchClosure;
  const hasPublishPackageShape = hasPublishPackagePrerequisites && (input.chapters.length >= 3 || hasPublishPackageRecheck);
  const definitions: Array<Omit<ProjectAcceptanceStep, "status"> & { done: boolean }> = [
    {
      id: "project_start",
      label: "开书基础",
      done: hasProjectStart,
      evidence: hasProjectStart ? `${input.platform.name} 目标平台和篇幅已确定。` : "目标平台或目标字数缺失。",
      stopRule: "没有平台和篇幅时，先补作品基础，不进入模型生成。",
      href: projectHref,
    },
    {
      id: "opening_sample",
      label: "首章样本",
      done: hasOpeningSample,
      evidence: hasOpeningSample ? "首章已有钩子、冲突、价值变化和章末追读。" : "首章缺正文、钩子、冲突、价值变化或章末追读。",
      stopRule: "首章样本不完整时，不允许批量生成后续章节。",
      href: firstChapter ? `${projectHref}/chapters/${firstChapter.id}` : `${projectHref}#create-chapter`,
    },
    {
      id: "chapter_review",
      label: "审稿",
      done: hasReview,
      evidence: hasReview ? "首章审稿任务已有成功记录。" : "首章还缺审稿成功记录。",
      stopRule: "没有审稿前，不要把样本当成可放大的正文。",
      href: "#ai-pipeline",
    },
    {
      id: "second_pass",
      label: "二改",
      done: hasSecondPass,
      evidence: hasSecondPass ? "首章二改任务已有成功记录。" : "审稿后还缺二改成功记录。",
      stopRule: "没有二改闭环时，只能继续修样本，不能进总闸门放量。",
      href: "#ai-pipeline",
    },
    {
      id: "dispatch_receipt",
      label: "派单回执",
      done: hasDispatchReceipt,
      evidence: hasDispatchReceipt ? "首日派单已有完成依据和人工验收。" : "还缺首日派单完成依据和人工验收。",
      stopRule: "派单缺人工验收时，不能宣称真实样本跑通。",
      href: input.projectId ? `/dispatch?firstDayProject=${input.projectId}#first-day-dispatch` : "/dispatch#first-day-dispatch",
    },
    ...(roleDispatchAcceptance.active ? [{
      id: "role_dispatch" as const,
      label: "角色闭环",
      done: roleDispatchAcceptance.done,
      evidence: roleDispatchAcceptance.done
        ? `角色派单已闭合：${roleDispatchAcceptance.completedLabels.join("、")}均有完成依据。`
        : `角色派单还缺${roleDispatchAcceptance.missingLabels.join("、")}完成依据。`,
      stopRule: "结构、资料和平台包装角色没有闭环时，不允许把发布包当成可投放版本。",
      href: `${projectHref}#story-structure`,
    }] : []),
    {
      id: "publish_package",
      label: "发布包",
      done: hasPublishPackageShape,
      evidence: hasPublishPackageShape
        ? hasPublishPackageRecheck
          ? "发布包复检分流已补齐标题、简介、标签、前三章样章和人工验收。"
          : "前三章、审稿、二改和派单回执已能进入发布包。"
        : "发布包还缺前三章、二改或派单回执。",
      stopRule: "发布包证据不齐时，不要新增平台，也不要扩大投放。",
      href: "#platform-export",
    },
  ];
  const firstMissingIndex = definitions.findIndex((step) => !step.done);
  const currentIndex = firstMissingIndex === -1 ? definitions.length - 1 : firstMissingIndex;
  const allDone = firstMissingIndex === -1;
  const completedSteps = definitions.filter((step) => step.done).length;
  const missingEvidence = definitions
    .filter((step) => !step.done)
    .map((step) => {
      const execution = missingEvidenceExecutionSpecs[step.id];

      return {
        stepId: step.id,
        label: step.label,
        reason: step.evidence,
        stopRule: step.stopRule,
        href: step.href,
        actionLabel: missingEvidenceActionLabels[step.id],
        ...execution,
        runbookStep: buildProjectAcceptanceRunbookStep(step.id),
        receiptTemplate: buildAcceptanceGapReceiptTemplate(step, execution),
        dispatchDraftHref: buildAcceptanceGapDispatchDraftHref(input, step, execution),
      };
    }) satisfies ProjectAcceptanceMissingEvidence[];
  const steps = definitions.map((step, index) => ({
    id: step.id,
    label: step.label,
    evidence: step.evidence,
    stopRule: step.stopRule,
    href: step.href,
    status: allDone || index < currentIndex ? "done" : index === currentIndex ? "current" : "blocked",
  })) satisfies ProjectAcceptanceStep[];
  const current = steps[currentIndex];
  const gateStatus = missingEvidence.length === 0 ? "ready" : "blocked";
  const finalReleaseParams = new URLSearchParams({
    focus: "action-recheck",
    source: "real-sample-receipt",
  });
  if (input.projectId) finalReleaseParams.set("projectId", input.projectId);

  return {
    title: "单本作品验收单",
    verdict: firstMissingIndex === -1
      ? "样本证据已闭合，可以进入发布包和平台复盘。"
      : `当前先补「${current.label}」：${current.evidence}`,
    currentStepId: current.id,
    actionLabel: gateStatus === "ready" ? "复查发布包" : `处理${current.label}`,
    actionHref: current.href,
    finalReleaseHref: `/gate?${finalReleaseParams.toString()}#pipeline-final-review`,
    finalReleaseLabel: "查看最终交付正式放行卡",
    gateStatus,
    completedSteps,
    totalSteps: definitions.length,
    missingEvidence,
    blockReason: gateStatus === "ready" ? "样本证据已闭合，可以进入发布包和平台复盘。" : current.stopRule,
    steps,
    roleClosureProgress: roleDispatchAcceptance.roleClosureProgress,
  };
}

export function buildProjectDashboard(input: ProjectDashboardInput): ProjectDashboardSummary {
  const statusCounts = chapterStatusOrder.reduce<Record<string, number>>((counts, status) => {
    counts[status] = 0;
    return counts;
  }, {});

  for (const chapter of input.chapters) {
    statusCounts[chapter.status] = (statusCounts[chapter.status] ?? 0) + 1;
  }

  const reviewedChapterIds = input.aiTasks
    .filter((task) => task.taskType === "chapter_review" && task.status === "succeeded" && task.chapter)
    .map((task) => task.chapter?.id)
    .filter((id): id is string => Boolean(id));
  const reviewedSet = new Set(reviewedChapterIds);
  const unreviewedChapters = input.chapters.filter((chapter) => chapter.wordCount > 0 && !reviewedSet.has(chapter.id));
  const nextChapter = input.chapters.find((chapter) => chapter.status !== "final") ?? input.chapters.at(-1) ?? null;
  const progressPercent = input.targetWordCount > 0
    ? clampPercent((input.currentWordCount / input.targetWordCount) * 100)
    : 0;
  const platformWarnings = [
    ...input.platform.risks,
    ...(unreviewedChapters.length > 0 ? [`${unreviewedChapters.length} 章已有正文但未审稿`] : []),
    ...(input.chapters.length === 0 ? ["还没有章节，项目无法进入写作闭环"] : []),
  ];

  return {
    progressPercent,
    totalChapters: input.chapters.length,
    totalWords: input.currentWordCount,
    targetWords: input.targetWordCount,
    statusCounts,
    reviewedChapterIds,
    unreviewedChapters,
    nextChapter,
    recentTasks: input.aiTasks.slice(0, 6),
    platformWarnings,
    realSampleAcceptanceSheet: buildProjectRealSampleAcceptanceSheet(input),
  };
}
