import type { PlatformProfile } from "../platforms/platformProfiles.ts";
import type { GatePlatformGrowthDispatchItem, GatePlatformGrowthReviewStage } from "./gateActionReceipts.ts";
import type { ProjectStartTacticSummary } from "./projectStartTactics.ts";
import type { SubmissionChecklist } from "./submissionChecklist.ts";

export interface FirstDayProject {
  id: string;
  title: string;
  currentWordCount: number;
}

export interface FirstDayChapter {
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
}

export interface FirstDayOutlineNode {
  type: string;
}

export interface FirstDayCharacter {
  name: string;
  role: string;
  desire: string;
  need: string;
  flaw: string;
  arcStart: string;
  arcEnd: string;
  voice: string;
}

export interface FirstDayWorldEntry {
  type: string;
  title: string;
  content: string;
}

export interface FirstDayAiTask {
  chapterId: string | null;
  taskType: string;
  status: string;
}

export interface FirstDayDispatchTask {
  dispatchKey: string;
  state: string;
  completionEvidence: string;
}

export interface FirstDayWorkflowInput {
  project: FirstDayProject;
  platform: PlatformProfile;
  chapters: FirstDayChapter[];
  outlineNodes: FirstDayOutlineNode[];
  characters: FirstDayCharacter[];
  worldEntries: FirstDayWorldEntry[];
  aiTasks: FirstDayAiTask[];
  dispatchTasks?: FirstDayDispatchTask[];
  startTactic?: ProjectStartTacticSummary | null;
  submissionChecklist: SubmissionChecklist;
}

export interface FirstDayWorkflowStep {
  id: string;
  label: string;
  status: "done" | "active" | "locked";
  owner: "策划" | "作者" | "AI" | "运营";
  evidence: string;
  instruction: string;
  actionLabel: string;
  href: string;
}

export interface FirstDayExecutionPackage {
  stepId: string;
  owner: FirstDayWorkflowStep["owner"];
  riskLevel: FirstDayRiskLevel;
  riskLabel: string;
  riskPriorityBoost: number;
  riskDueLabel: string;
  headline: string;
  actionLabel: string;
  href: string;
  chapterId?: string;
  acceptanceCriteria: string[];
  missingEvidence: string[];
  handoffNote: string;
  modelPrompt: string;
  completionEvidenceTemplate: string;
}

export type FirstDayRiskLevel = "standard" | "watch" | "blocked";

export interface FirstDayRiskProfile {
  level: FirstDayRiskLevel;
  label: string;
  headline: string;
  instruction: string;
  acceptanceCriteria: string[];
  missingEvidence: string[];
  priorityBoost: number;
  dueLabel: string;
}

export interface FirstDayModelExecutionPlan {
  executable: boolean;
  stepId: string;
  actionKind: "chapter_draft" | "chapter_review" | "chapter_second_pass" | "control_assets" | "manual";
  taskType?: "chapter_draft" | "chapter_review" | "chapter_second_pass" | "control_asset_generate";
  chapterId?: string;
  controlAreaIds?: Array<"characters" | "world" | "story-lines">;
  modelPrompt: string;
  completionEvidence: string;
  blockedReason?: string;
}

export interface FirstDayWorkflow {
  title: string;
  platformName: string;
  completedCount: number;
  totalSteps: number;
  progressPercent: number;
  verdict: string;
  nextStep: FirstDayWorkflowStep;
  executionPackage: FirstDayExecutionPackage;
  steps: FirstDayWorkflowStep[];
}

export interface FirstDayLaunchReceipt {
  title: string;
  platformName: string;
  message: string;
  nextStepId: string;
  owner: FirstDayWorkflowStep["owner"];
  actionLabel: string;
  href: string;
  completedCount: number;
  totalSteps: number;
  progressPercent: number;
  readyStepIds: string[];
}

export interface FirstDayLaunchPackage {
  receipt: FirstDayLaunchReceipt;
  dispatch: GatePlatformGrowthDispatchItem;
}

export interface FirstDayFollowUpDispatchInput extends FirstDayDispatchInput {
  completedDispatchKey?: string | null;
  existingDispatchKeys?: string[];
}

export interface FirstDayExecutionReceipt {
  success: boolean;
  summary: string;
  writeBackTarget: string;
  nextAction: string;
  completionEvidence: string;
  detailItems: string[];
}

export interface FirstDayDispatchInput {
  workflow: FirstDayWorkflow;
  project: FirstDayProject;
  platform: PlatformProfile;
}

function compact(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function hasText(text: string, minLength = 1) {
  return compact(text).length >= minLength;
}

function firstChapter(chapters: FirstDayChapter[]) {
  return [...chapters].sort((left, right) => left.order - right.order)[0] ?? null;
}

function hasSucceededTask(tasks: FirstDayAiTask[], taskType: string, chapterId?: string) {
  return tasks.some((task) => (
    task.taskType === taskType
    && task.status === "succeeded"
    && (!chapterId || task.chapterId === chapterId)
  ));
}

function completedDispatchForStep(input: FirstDayWorkflowInput, stepId: string) {
  const dispatchKey = `first-day:${input.project.id}:${stepId}`;
  return input.dispatchTasks?.find((task) => (
    task.dispatchKey === dispatchKey
    && task.state === "completed"
    && hasText(task.completionEvidence, 8)
  )) ?? null;
}

function evidenceWithDispatch(evidence: string, dispatch: FirstDayDispatchTask | null) {
  if (!dispatch) return evidence;
  return `${evidence} 任务中心已验收：${compact(dispatch.completionEvidence)}。`;
}

function outlineReady(nodes: FirstDayOutlineNode[]) {
  const types = new Set(nodes.map((node) => node.type));
  return ["root", "opening", "ending", "trunk", "branch", "leaf", "soil"].every((type) => types.has(type));
}

function characterReady(characters: FirstDayCharacter[]) {
  return characters.some((character) => (
    hasText(character.name)
    && hasText(character.role)
    && hasText(character.desire)
    && hasText(character.need)
    && hasText(character.flaw)
    && hasText(character.arcStart)
    && hasText(character.arcEnd)
    && hasText(character.voice)
  ));
}

function worldReady(entries: FirstDayWorldEntry[]) {
  const types = new Set(entries.map((entry) => entry.type));
  const hasCoreTypes = ["system_rule", "taboo", "platform_soil"].every((type) => types.has(type));
  const completeEntries = entries.filter((entry) => (
    hasText(entry.title) && hasText(entry.content, 40)
  )).length;
  return hasCoreTypes && completeEntries >= 3;
}

function chapterCardReady(chapter: FirstDayChapter | null) {
  if (!chapter) return false;
  return [chapter.goal, chapter.hook, chapter.conflict, chapter.valueShift, chapter.cliffhanger].every((field) => hasText(field));
}

function status(complete: boolean, unlocked: boolean): FirstDayWorkflowStep["status"] {
  if (complete) return "done";
  if (unlocked) return "active";
  return "locked";
}

function step(input: Omit<FirstDayWorkflowStep, "status"> & { complete: boolean; unlocked: boolean }): FirstDayWorkflowStep {
  const { complete, unlocked, ...rest } = input;
  return {
    ...rest,
    status: status(complete, unlocked),
  };
}

function verdict(completedCount: number, totalSteps: number) {
  if (completedCount === totalSteps) return "首日链路已跑通，可以进入批量生产和平台投放准备。";
  if (completedCount >= 4) return "首日链路过半，先把审稿和二改补完，别急着开新坑。";
  if (completedCount >= 2) return "项目骨架已经有了，下一步要把第一章变成可审稿正文。";
  return "新书还在冷启动，先把大纲、人物、设定和第一章钩子咬住。";
}

function startTacticRiskLevel(startTactic: ProjectStartTacticSummary | null | undefined): FirstDayRiskLevel {
  const label = startTactic?.label ?? "";
  if (/止损|避坑|blocked/i.test(label)) return "blocked";
  if (/观察|验收|动作|watch/i.test(label)) return "watch";
  return "standard";
}

export function buildFirstDayRiskProfile(startTactic?: ProjectStartTacticSummary | null): FirstDayRiskProfile {
  const level = startTacticRiskLevel(startTactic);

  if (level === "blocked") {
    return {
      level,
      label: startTactic?.label ?? "避坑",
      headline: "避坑平台首日只做恢复条件验证。",
      instruction: "先证明入口卖点、前三章兑现或平台匹配度已经改掉一项，再进入正文生成。",
      acceptanceCriteria: [
        "写清本次恢复条件：入口卖点、前三章兑现或平台匹配度至少改掉一项。",
        "首日只验证一个变量，不允许直接批量生成或平台加码。",
      ],
      missingEvidence: ["缺少避坑平台恢复条件确认。"],
      priorityBoost: 16,
      dueLabel: "今天止损验证",
    };
  }

  if (level === "watch") {
    return {
      level,
      label: startTactic?.label ?? "观察",
      headline: "观察平台首日只跑小样本验证。",
      instruction: "把通过线、不可接受项和复查证据写清楚，先看首轮数据再决定是否扩大。",
      acceptanceCriteria: [
        "写清首轮小样本通过线和不可接受项。",
        "保留第一章或前三章复查证据，后续按数据决定是否扩大。",
      ],
      missingEvidence: ["缺少观察平台首轮小样本验证口径。"],
      priorityBoost: 8,
      dueLabel: "今天小样本验证",
    };
  }

  return {
    level,
    label: startTactic?.label ?? "标准",
    headline: "标准首日验证。",
    instruction: "按普通首日流程推进。",
    acceptanceCriteria: [],
    missingEvidence: [],
    priorityBoost: 0,
    dueLabel: "今天收口",
  };
}

function completionEvidenceTemplate(step: FirstDayWorkflowStep, acceptanceCriteria: string[]) {
  if (step.id === "first-draft") return "第一章正文已生成并写回章节，已覆盖钩子、冲突和章末追读，可以进入审稿。";
  if (step.id === "first-review") return "第一章审稿已完成，已输出钩子、爽点、冲突、解释密度和追读问题，可以进入二改。";
  if (step.id === "first-rewrite") return "二改或前三章改写已完成，审稿问题已逐项处理，并保留了版本对照。";
  if (step.id === "publish-precheck") return "平台包预检已完成，标题、简介、标签、卖点、样章和风险清单已整理。";
  if (step.id === "story-support") return "人物弧光和核心设定已补齐，主角欲望、需求、缺陷、规则、禁忌和平台土壤可供后续生成引用。";
  if (step.id === "opening-hook") return "第一章章节卡已补齐，目标、钩子、冲突、转变和章末悬念已按平台开头规则检查。";
  return `首日节点已完成：${acceptanceCriteria.join("；")}。`;
}

function modelPrompt(input: {
  project: FirstDayProject;
  platform: PlatformProfile;
  step: FirstDayWorkflowStep;
  chapter: FirstDayChapter | null;
  acceptanceCriteria: string[];
  missingEvidence: string[];
  handoffNote: string;
}) {
  const chapterLine = input.chapter
    ? `第一章：${input.chapter.title}。目标：${input.chapter.goal || "未填写"}。钩子：${input.chapter.hook || "未填写"}。冲突：${input.chapter.conflict || "未填写"}。转变：${input.chapter.valueShift || "未填写"}。章末悬念：${input.chapter.cliffhanger || "未填写"}。`
    : "第一章：当前还没有章节卡，请先输出可落库的章节卡草稿。";
  return [
    "你是网文首日执行助手，按毒舌产品经理 5.0 的口径工作：只交付能推进平台验证的内容，不写空泛建议。",
    `项目：${input.project.title}`,
    `目标平台：${input.platform.name}`,
    `当前节点：${input.step.label}`,
    `节点目标：${input.step.instruction}`,
    chapterLine,
    `交接要求：${input.handoffNote}`,
    "验收标准：",
    ...input.acceptanceCriteria.map((criterion) => `- ${criterion}`),
    "当前缺失证据：",
    ...input.missingEvidence.map((evidence) => `- ${evidence}`),
    "输出格式：",
    "1. 先给可直接落库或复制到编辑器的正文/卡片/审稿内容。",
    "2. 再列出本次满足的验收标准。",
    "3. 最后给一句可粘贴到任务中心的完成依据。",
  ].join("\n");
}

function executionPackage(step: FirstDayWorkflowStep, context: {
  project: FirstDayProject;
  platform: PlatformProfile;
  chapter: FirstDayChapter | null;
  riskProfile: FirstDayRiskProfile;
}): FirstDayExecutionPackage {
  const withRiskCriteria = (criteria: string[]) => [...criteria, ...context.riskProfile.acceptanceCriteria];
  const withRiskEvidence = (evidence: string[]) => [...evidence, ...context.riskProfile.missingEvidence];
  const withRiskHandoff = (handoffNote: string) => context.riskProfile.level === "standard"
    ? handoffNote
    : `${context.riskProfile.headline}${context.riskProfile.instruction} ${handoffNote}`;
  const base = {
    stepId: step.id,
    owner: step.owner,
    riskLevel: context.riskProfile.level,
    riskLabel: context.riskProfile.label,
    riskPriorityBoost: context.riskProfile.priorityBoost,
    riskDueLabel: context.riskProfile.dueLabel,
    actionLabel: step.actionLabel,
    href: step.href,
    chapterId: context.chapter?.id,
  };

  if (step.id === "first-draft") {
    const acceptanceCriteria = withRiskCriteria(["第一章正文已生成并写回章节", "正文执行了第一章钩子、冲突和章末悬念", "本次生成留下可审稿的任务记录"]);
    const missingEvidence = withRiskEvidence(["缺少第一章正文或成功初稿任务"]);
    const handoffNote = withRiskHandoff("别批量开跑。先用第一章验证平台语气、模型路线和成本，再决定是否扩到前三章。");
    return {
      ...base,
      headline: "AI 接手第一章初稿，但作者先守住节奏和设定边界。",
      acceptanceCriteria,
      missingEvidence,
      handoffNote,
      modelPrompt: modelPrompt({ ...context, step, acceptanceCriteria, missingEvidence, handoffNote }),
      completionEvidenceTemplate: completionEvidenceTemplate(step, acceptanceCriteria),
    };
  }

  if (step.id === "first-review") {
    const acceptanceCriteria = withRiskCriteria(["第一章已有结构化审稿结果", "钩子、爽点、冲突、解释密度和章末追读均有判断", "低分问题进入二改或重写队列"]);
    const missingEvidence = withRiskEvidence(["缺少第一章成功审稿任务"]);
    const handoffNote = withRiskHandoff("审稿不是夸稿。必须把不适合平台的地方翻出来，下一步才有改稿抓手。");
    return {
      ...base,
      headline: "AI 先当毒舌审稿编辑，别急着自我感动。",
      acceptanceCriteria,
      missingEvidence,
      handoffNote,
      modelPrompt: modelPrompt({ ...context, step, acceptanceCriteria, missingEvidence, handoffNote }),
      completionEvidenceTemplate: completionEvidenceTemplate(step, acceptanceCriteria),
    };
  }

  if (step.id === "first-rewrite") {
    const acceptanceCriteria = withRiskCriteria(["二改或前三章改写任务已成功", "审稿问题被逐项处理", "改写后保留版本对照和复检入口"]);
    const missingEvidence = withRiskEvidence(["缺少二改或前三章改写结果"]);
    const handoffNote = withRiskHandoff("不要只换句子。重点修开头压力、爽点兑现和章末追读。");
    return {
      ...base,
      headline: "AI 做二改，目标是让前三章能被平台读者继续点下去。",
      acceptanceCriteria,
      missingEvidence,
      handoffNote,
      modelPrompt: modelPrompt({ ...context, step, acceptanceCriteria, missingEvidence, handoffNote }),
      completionEvidenceTemplate: completionEvidenceTemplate(step, acceptanceCriteria),
    };
  }

  if (step.id === "publish-precheck") {
    const acceptanceCriteria = withRiskCriteria(["标题、简介、标签、卖点和样章准备度达标", "平台风险清单已处理或明确保留", "首轮曝光、点击、收藏、追读回收口径已写清"]);
    const missingEvidence = withRiskEvidence(["投稿准备度或首轮数据回收口径不足"]);
    const handoffNote = withRiskHandoff("平台包不是装饰。它要能和正文前三章互相兑现，方便首轮数据复盘。");
    return {
      ...base,
      headline: "运营收口平台包，先做可验证的小投放基准。",
      acceptanceCriteria,
      missingEvidence,
      handoffNote,
      modelPrompt: modelPrompt({ ...context, step, acceptanceCriteria, missingEvidence, handoffNote }),
      completionEvidenceTemplate: completionEvidenceTemplate(step, acceptanceCriteria),
    };
  }

  if (step.id === "story-support") {
    const acceptanceCriteria = withRiskCriteria(["主角欲望、需求、缺陷、起点和终点完整", "系统规则、禁忌和平台土壤均已落库", "后续初稿能引用这些支撑材料"]);
    const missingEvidence = withRiskEvidence(["缺少完整人物弧光或核心设定土壤"]);
    const handoffNote = withRiskHandoff("人物和设定是土壤，不是百科摆设。每条都要能喂给第一章生成和审稿。");
    return {
      ...base,
      headline: "策划补齐人物和设定，别让模型在空地上编。",
      acceptanceCriteria,
      missingEvidence,
      handoffNote,
      modelPrompt: modelPrompt({ ...context, step, acceptanceCriteria, missingEvidence, handoffNote }),
      completionEvidenceTemplate: completionEvidenceTemplate(step, acceptanceCriteria),
    };
  }

  if (step.id === "opening-hook") {
    const acceptanceCriteria = withRiskCriteria(["第一章目标、钩子、冲突、转变和章末悬念完整", "开头动作贴合目标平台", "章节卡可以直接进入初稿生成"]);
    const missingEvidence = withRiskEvidence(["缺少第一章完整章节卡"]);
    const handoffNote = withRiskHandoff("这里决定读者会不会留下。先补高压选择、明确冲突和章末追读。");
    return {
      ...base,
      headline: "作者先咬住第一章钩子，别把开头写成说明书。",
      acceptanceCriteria,
      missingEvidence,
      handoffNote,
      modelPrompt: modelPrompt({ ...context, step, acceptanceCriteria, missingEvidence, handoffNote }),
      completionEvidenceTemplate: completionEvidenceTemplate(step, acceptanceCriteria),
    };
  }

  const acceptanceCriteria = withRiskCriteria(["大纲树包含开头、结尾、主干、分支、叶片和土壤", "至少有前三章章节卡", "下一步能打开第一章继续补钩子"]);
  const missingEvidence = withRiskEvidence(["缺少完整大纲树或前三章章节卡"]);
  const handoffNote = withRiskHandoff("骨架没落地前，不要进入正文生成。先让项目有开头、结尾、主干和可执行章节卡。");
  return {
    ...base,
    headline: "策划先把作品骨架落地，别让 AI 自由发挥。",
    acceptanceCriteria,
    missingEvidence,
    handoffNote,
    modelPrompt: modelPrompt({ ...context, step, acceptanceCriteria, missingEvidence, handoffNote }),
    completionEvidenceTemplate: completionEvidenceTemplate(step, acceptanceCriteria),
  };
}

export function buildFirstDayModelExecutionPlan(workflow: FirstDayWorkflow): FirstDayModelExecutionPlan {
  const execution = workflow.executionPackage;
  const base = {
    stepId: execution.stepId,
    modelPrompt: execution.modelPrompt,
    completionEvidence: execution.completionEvidenceTemplate,
  };
  const riskBlockedReason = execution.riskLevel === "blocked" && execution.stepId === "first-draft"
    ? "当前开书策略为止损验证，不能直接生成第一章正文。先写清恢复条件：入口卖点、前三章兑现或平台匹配度至少改掉一项，再进入正文生成。"
    : null;

  if (riskBlockedReason) {
    return {
      ...base,
      executable: false,
      actionKind: "manual",
      blockedReason: riskBlockedReason,
    };
  }

  if (execution.stepId === "story-support") {
    return {
      ...base,
      executable: true,
      actionKind: "control_assets",
      taskType: "control_asset_generate",
      controlAreaIds: ["characters", "world", "story-lines"],
    };
  }

  if (execution.stepId === "first-draft") {
    return {
      ...base,
      executable: Boolean(execution.chapterId),
      actionKind: "chapter_draft",
      taskType: "chapter_draft",
      chapterId: execution.chapterId,
      blockedReason: execution.chapterId ? undefined : "缺少第一章章节卡，不能生成正文。",
    };
  }

  if (execution.stepId === "first-review") {
    return {
      ...base,
      executable: Boolean(execution.chapterId),
      actionKind: "chapter_review",
      taskType: "chapter_review",
      chapterId: execution.chapterId,
      blockedReason: execution.chapterId ? undefined : "缺少第一章章节卡，不能审稿。",
    };
  }

  if (execution.stepId === "first-rewrite") {
    return {
      ...base,
      executable: Boolean(execution.chapterId),
      actionKind: "chapter_second_pass",
      taskType: "chapter_second_pass",
      chapterId: execution.chapterId,
      blockedReason: execution.chapterId ? undefined : "缺少第一章章节卡，不能二改。",
    };
  }

  return {
    ...base,
    executable: false,
    actionKind: "manual",
    blockedReason: "当前首日节点需要人工确认或运营收口，暂不自动调用模型。",
  };
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function textValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function arrayValue(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function resultError(result: unknown) {
  const item = record(result);
  return item ? textValue(item.error) : "";
}

function providerLabel(result: unknown) {
  const item = record(result);
  const provider = record(item?.provider) ?? record(item?.activeProvider);
  return textValue(provider?.displayName) || textValue(provider?.model) || "当前模型路线";
}

function chapterLabel(result: unknown) {
  const item = record(result);
  const chapter = record(item?.chapter);
  return textValue(chapter?.title) || "当前章节";
}

function chapterWordCount(result: unknown) {
  const item = record(result);
  const chapter = record(item?.chapter);
  return numberValue(chapter?.wordCount) ?? numberValue(item?.wordCount) ?? 0;
}

function auditScore(result: unknown, key: "draftQuality" | "secondPassAudit") {
  const item = record(result);
  const audit = record(item?.[key]);
  return numberValue(audit?.score);
}

function reviewResult(result: unknown) {
  const item = record(result);
  const review = record(item?.result);
  return {
    score: numberValue(review?.score),
    summary: textValue(review?.summary),
    issueCount: arrayValue(review?.issues).length,
  };
}

function controlAreaLabel(areaId: string) {
  if (areaId === "characters") return "人物弧光";
  if (areaId === "world") return "核心设定";
  if (areaId === "story-lines") return "主线支线";
  return "资料卡";
}

function controlAssetReceipt(result: unknown) {
  const items = arrayValue(result).map((item) => record(item)).filter((item): item is Record<string, unknown> => Boolean(item));
  const created = items.flatMap((item) => arrayValue(item.created).map((name) => textValue(name)).filter(Boolean));
  const failed = items.filter((item) => textValue(item.error)).map((item) => `${controlAreaLabel(textValue(item.areaId))}：${textValue(item.error)}`);
  const areaLabels = items.map((item) => controlAreaLabel(textValue(item.areaId)));
  return {
    created,
    failed,
    areaLabels: Array.from(new Set(areaLabels)),
  };
}

export function buildFirstDayExecutionReceipt(input: {
  plan: FirstDayModelExecutionPlan;
  result: unknown;
}): FirstDayExecutionReceipt {
  const error = resultError(input.result);
  if (error) {
    return {
      success: false,
      summary: `AI 执行未完成：${error}`,
      writeBackTarget: "未写回",
      nextAction: "修复模型路线、预算或素材问题后重试当前节点。",
      completionEvidence: "",
      detailItems: [error],
    };
  }

  if (input.plan.actionKind === "chapter_draft") {
    const title = chapterLabel(input.result);
    const wordCount = chapterWordCount(input.result);
    const provider = providerLabel(input.result);
    const score = auditScore(input.result, "draftQuality");
    return {
      success: true,
      summary: `第一章初稿已写回：${title}，当前 ${wordCount} 字。`,
      writeBackTarget: title,
      nextAction: "检查正文后完成派单验收，再进入第一章审稿。",
      completionEvidence: `第一章正文已生成并写回章节《${title}》，当前 ${wordCount} 字；使用 ${provider}，已留下初稿任务${score === null ? "" : `和 ${score} 分自动质检`}，可以进入审稿。`,
      detailItems: [
        `写回章节：${title}`,
        `当前字数：${wordCount}`,
        `执行模型：${provider}`,
        score === null ? "自动质检：待查看任务记录" : `自动质检：${score} 分`,
      ],
    };
  }

  if (input.plan.actionKind === "chapter_review") {
    const title = chapterLabel(input.result);
    const provider = providerLabel(input.result);
    const review = reviewResult(input.result);
    return {
      success: true,
      summary: `第一章审稿已完成：${title}${review.score === null ? "" : `，评分 ${review.score}`}。`,
      writeBackTarget: "AI 任务审稿记录",
      nextAction: "按审稿问题做二改，不要直接扩大批量生成。",
      completionEvidence: `第一章审稿已完成：《${title}》${review.score === null ? "" : `评分 ${review.score}`}，发现 ${review.issueCount} 个问题；使用 ${provider}，审稿结果已记录，可以进入二改。`,
      detailItems: [
        `审稿章节：${title}`,
        review.score === null ? "审稿评分：待查看任务记录" : `审稿评分：${review.score}`,
        `问题数量：${review.issueCount}`,
        review.summary ? `审稿摘要：${review.summary}` : `执行模型：${provider}`,
      ],
    };
  }

  if (input.plan.actionKind === "chapter_second_pass") {
    const title = chapterLabel(input.result);
    const wordCount = chapterWordCount(input.result);
    const provider = providerLabel(input.result);
    const score = auditScore(input.result, "secondPassAudit");
    return {
      success: true,
      summary: `第一章二改已写回：${title}，当前 ${wordCount} 字。`,
      writeBackTarget: title,
      nextAction: "检查改前版本对照和复检分数，再进入平台包预检。",
      completionEvidence: `二改已写回章节《${title}》，当前 ${wordCount} 字；使用 ${provider}，已保留改前版本${score === null ? "" : `并完成 ${score} 分复检`}，可以进入平台包预检。`,
      detailItems: [
        `写回章节：${title}`,
        `当前字数：${wordCount}`,
        `执行模型：${provider}`,
        score === null ? "复检：待查看任务记录" : `复检：${score} 分`,
      ],
    };
  }

  if (input.plan.actionKind === "control_assets") {
    const receipt = controlAssetReceipt(input.result);
    const createdPreview = receipt.created.slice(0, 6).join("、");
    return {
      success: receipt.failed.length === 0 && receipt.created.length > 0,
      summary: receipt.created.length > 0
        ? `人物和设定支撑已落库：新增 ${receipt.created.length} 项。`
        : "人物和设定支撑未生成可落库内容。",
      writeBackTarget: receipt.areaLabels.join("、") || "作品资料",
      nextAction: receipt.failed.length > 0 ? "先处理失败的资料区，再进入正文生成。" : "检查资料卡后完成派单验收，再生成第一章初稿。",
      completionEvidence: receipt.failed.length > 0 || receipt.created.length === 0
        ? ""
        : `人物和设定支撑已生成并落库：新增 ${receipt.created.length} 项${createdPreview ? `（${createdPreview}）` : ""}；覆盖 ${receipt.areaLabels.join("、")}，可以进入第一章初稿。`,
      detailItems: [
        `新增资料：${receipt.created.length} 项`,
        `覆盖范围：${receipt.areaLabels.join("、") || "待确认"}`,
        ...(createdPreview ? [`代表条目：${createdPreview}`] : []),
        ...receipt.failed,
      ],
    };
  }

  return {
    success: false,
    summary: "当前首日节点暂不支持自动执行。",
    writeBackTarget: "未写回",
    nextAction: input.plan.blockedReason ?? "请按当前节点说明人工处理。",
    completionEvidence: "",
    detailItems: [input.plan.blockedReason ?? "人工节点"],
  };
}

function dispatchStageForStep(stepId: string): GatePlatformGrowthReviewStage {
  if (stepId === "publish-precheck") return "start_platform_package";
  if (stepId === "first-draft" || stepId === "first-review" || stepId === "first-rewrite") return "start_first_three_review";
  return "start_opening_diagnostic";
}

export function buildFirstDayWorkflow(input: FirstDayWorkflowInput): FirstDayWorkflow {
  const chapter = firstChapter(input.chapters);
  const riskProfile = buildFirstDayRiskProfile(input.startTactic);
  const projectHref = `/projects/${input.project.id}`;
  const firstChapterHref = chapter ? `${projectHref}/chapters/${chapter.id}` : projectHref;
  const skeletonDispatch = completedDispatchForStep(input, "skeleton");
  const hookDispatch = completedDispatchForStep(input, "opening-hook");
  const supportDispatch = completedDispatchForStep(input, "story-support");
  const draftDispatch = completedDispatchForStep(input, "first-draft");
  const reviewDispatch = completedDispatchForStep(input, "first-review");
  const rewriteDispatch = completedDispatchForStep(input, "first-rewrite");
  const exportDispatch = completedDispatchForStep(input, "publish-precheck");
  const structureComplete = (outlineReady(input.outlineNodes) && input.chapters.length >= 3) || Boolean(skeletonDispatch);
  const characterComplete = characterReady(input.characters);
  const worldComplete = worldReady(input.worldEntries);
  const hookComplete = chapterCardReady(chapter) || Boolean(hookDispatch);
  const supportComplete = (characterComplete && worldComplete) || Boolean(supportDispatch);
  const draftComplete = Boolean(chapter && chapter.wordCount > 0) || hasSucceededTask(input.aiTasks, "chapter_draft", chapter?.id) || Boolean(draftDispatch);
  const reviewComplete = hasSucceededTask(input.aiTasks, "chapter_review", chapter?.id) || Boolean(reviewDispatch);
  const rewriteComplete = hasSucceededTask(input.aiTasks, "chapter_second_pass", chapter?.id)
    || hasSucceededTask(input.aiTasks, "first_three_rewrite")
    || Boolean(rewriteDispatch);
  const exportComplete = (input.submissionChecklist.readinessPercent >= 70 && draftComplete && reviewComplete) || Boolean(exportDispatch);

  const steps = [
    step({
      id: "skeleton",
      label: "作品骨架落地",
      owner: "策划",
      complete: structureComplete,
      unlocked: true,
      evidence: evidenceWithDispatch(`${input.outlineNodes.length} 个大纲节点，${input.chapters.length} 张章节卡。`, skeletonDispatch),
      instruction: "确认开头、结尾、主干、分支、叶片和土壤都已经生成。",
      actionLabel: "看项目总控",
      href: `${projectHref}#project-control`,
    }),
    step({
      id: "opening-hook",
      label: "第一章钩子确认",
      owner: "作者",
      complete: hookComplete,
      unlocked: structureComplete,
      evidence: evidenceWithDispatch(chapter ? `第一章：${chapter.title}。钩子：${chapter.hook || "未填写"}。` : "还没有第一章。", hookDispatch),
      instruction: `按${input.platform.name}开头规则，把目标、钩子、冲突、转变、章末悬念补完整。`,
      actionLabel: "打开第一章",
      href: firstChapterHref,
    }),
    step({
      id: "story-support",
      label: "人物和设定支撑",
      owner: "策划",
      complete: supportComplete,
      unlocked: hookComplete,
      evidence: evidenceWithDispatch(`${input.characters.length} 个人物，${input.worldEntries.length} 条设定。`, supportDispatch),
      instruction: "确认主角欲望、需求、缺陷、起点终点，以及系统规则、禁忌、平台土壤。",
      actionLabel: "补人物设定",
      href: `${projectHref}#character-arc`,
    }),
    step({
      id: "first-draft",
      label: "生成第一章正文",
      owner: "AI",
      complete: draftComplete,
      unlocked: hookComplete && supportComplete,
      evidence: evidenceWithDispatch(chapter ? `${chapter.wordCount} 字正文，初稿任务${hasSucceededTask(input.aiTasks, "chapter_draft", chapter.id) ? "已成功" : "未完成"}。` : "还没有可生成的章节。", draftDispatch),
      instruction: "用章节卡生成正文，先跑一章验证平台语气和节奏。",
      actionLabel: "生成第一章",
      href: firstChapterHref,
    }),
    step({
      id: "first-review",
      label: "第一章审稿",
      owner: "AI",
      complete: reviewComplete,
      unlocked: draftComplete,
      evidence: evidenceWithDispatch(hasSucceededTask(input.aiTasks, "chapter_review", chapter?.id) ? "第一章已有成功审稿任务。" : "第一章还没有成功审稿记录。", reviewDispatch),
      instruction: "先审第一章的钩子、爽点、冲突、解释密度和章末追读。",
      actionLabel: "去审稿",
      href: firstChapterHref,
    }),
    step({
      id: "first-rewrite",
      label: "二改或前三章改写",
      owner: "AI",
      complete: rewriteComplete,
      unlocked: reviewComplete,
      evidence: evidenceWithDispatch(hasSucceededTask(input.aiTasks, "chapter_second_pass", chapter?.id) || hasSucceededTask(input.aiTasks, "first_three_rewrite") ? "已有二改或前三章改写结果。" : "还没有二改或前三章改写结果。", rewriteDispatch),
      instruction: "按审稿问题做二改，再决定是否启动前三章整体改写。",
      actionLabel: "启动二改",
      href: firstChapterHref,
    }),
    step({
      id: "publish-precheck",
      label: "平台包预检",
      owner: "运营",
      complete: exportComplete,
      unlocked: draftComplete,
      evidence: evidenceWithDispatch(`投稿准备度 ${input.submissionChecklist.readinessPercent}%。`, exportDispatch),
      instruction: "生成简介、标签、卖点、样章和平台风险清单，准备小范围投放或投稿。",
      actionLabel: "看平台导出",
      href: `${projectHref}#platform-export`,
    }),
  ];
  const completedCount = steps.filter((item) => item.status === "done").length;
  const nextStep = steps.find((item) => item.status === "active") ?? steps.find((item) => item.status === "locked") ?? steps[steps.length - 1];

  return {
    title: "首日工作流",
    platformName: input.platform.name,
    completedCount,
    totalSteps: steps.length,
    progressPercent: Math.round((completedCount / steps.length) * 100),
    verdict: verdict(completedCount, steps.length),
    nextStep,
    executionPackage: executionPackage(nextStep, {
      project: input.project,
      platform: input.platform,
      chapter,
      riskProfile,
    }),
    steps,
  };
}

export function buildFirstDayDispatchItem(input: FirstDayDispatchInput): GatePlatformGrowthDispatchItem {
  const execution = input.workflow.executionPackage;
  const priorityScore = Math.min(99, Math.max(40, 100 - input.workflow.progressPercent + execution.riskPriorityBoost));
  const riskTitlePrefix = execution.riskLevel === "blocked"
    ? "止损验证 · "
    : execution.riskLevel === "watch"
      ? "小样本验证 · "
      : "";

  return {
    id: `first-day:${input.project.id}:${execution.stepId}`,
    platformId: input.platform.id,
    platformName: input.platform.name,
    stage: dispatchStageForStep(execution.stepId),
    state: "assigned",
    priorityScore,
    ownerRole: execution.owner,
    title: `${input.project.title} · ${riskTitlePrefix}${input.workflow.nextStep.label}`,
    detail: `${execution.headline}${execution.handoffNote ? ` ${execution.handoffNote}` : ""}`,
    dueLabel: execution.riskDueLabel,
    actionLabel: execution.actionLabel,
    href: execution.href,
    acceptanceCriteria: execution.acceptanceCriteria,
    evidence: execution.missingEvidence,
    reviewLatestAt: new Date().toISOString(),
  };
}

export function buildFirstDayLaunchReceipt(workflow: FirstDayWorkflow): FirstDayLaunchReceipt {
  const readyStepIds = workflow.steps.filter((item) => item.status === "done").map((item) => item.id);

  return {
    title: "首日启动回执",
    platformName: workflow.platformName,
    message: `已完成 ${workflow.completedCount}/${workflow.totalSteps} 个首日节点。下一步：${workflow.nextStep.label}。${workflow.nextStep.instruction}`,
    nextStepId: workflow.nextStep.id,
    owner: workflow.nextStep.owner,
    actionLabel: workflow.nextStep.actionLabel,
    href: workflow.nextStep.href,
    completedCount: workflow.completedCount,
    totalSteps: workflow.totalSteps,
    progressPercent: workflow.progressPercent,
    readyStepIds,
  };
}

export function buildFirstDayLaunchPackage(input: FirstDayDispatchInput): FirstDayLaunchPackage {
  return {
    receipt: buildFirstDayLaunchReceipt(input.workflow),
    dispatch: buildFirstDayDispatchItem(input),
  };
}

export function buildFirstDayFollowUpDispatch(input: FirstDayFollowUpDispatchInput): GatePlatformGrowthDispatchItem | null {
  if (input.workflow.completedCount >= input.workflow.totalSteps) return null;
  const dispatch = buildFirstDayDispatchItem(input);
  if (dispatch.id === input.completedDispatchKey) return null;
  if (input.existingDispatchKeys?.includes(dispatch.id)) return null;
  return dispatch;
}
