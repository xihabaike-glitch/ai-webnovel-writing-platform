import { buildTaskRetryPlan } from "../ai/taskRetry.ts";
import { buildProjectContextPack, type ProjectContextPack, type ProjectContextPlotThread, type ProjectContextForeshadow, type ProjectContextStatus } from "./projectContextPack.ts";

export type WorkbenchStatus = "pass" | "warn" | "fail";

export interface WritingWorkbenchProject {
  id: string;
  title: string;
  genre: string;
  sellingPoint: string;
  targetPlatformName: string;
  targetWordCount: number;
  currentWordCount: number;
}

export interface WritingWorkbenchChapter {
  id: string;
  title: string;
  order: number;
  status: string;
  wordCount: number;
  content?: string;
  hook: string;
  conflict: string;
  cliffhanger: string;
}

export interface WritingWorkbenchOutlineNode {
  id: string;
  type: string;
  title: string;
  goal: string;
  hook: string;
  conflict: string;
  valueShift: string;
  status: string;
}

export interface WritingWorkbenchCharacter {
  id: string;
  name: string;
  role: string;
  desire: string;
  need: string;
  flaw: string;
  arcStart: string;
  arcEnd: string;
  relationshipNotes: string;
}

export interface WritingWorkbenchWorldEntry {
  id: string;
  type: string;
  title: string;
  content: string;
}

export interface WritingWorkbenchAiTask {
  id: string;
  chapterId?: string | null;
  taskType: string;
  status: string;
  model: string;
  inputSnapshot?: string | null;
  createdAt: Date | string;
  outputText?: string | null;
  costUsd?: number | null;
  errorMessage?: string | null;
}

export interface WritingWorkbenchInput {
  project: WritingWorkbenchProject;
  chapters: WritingWorkbenchChapter[];
  outlineNodes: WritingWorkbenchOutlineNode[];
  characters: WritingWorkbenchCharacter[];
  worldEntries: WritingWorkbenchWorldEntry[];
  foreshadows?: ProjectContextForeshadow[];
  plotThreads?: ProjectContextPlotThread[];
  aiTasks: WritingWorkbenchAiTask[];
}

export interface WritingWorkbenchTreeBlock {
  type: "opening" | "ending" | "trunk" | "branch" | "leaf" | "soil";
  label: string;
  status: WorkbenchStatus;
  count: number;
  note: string;
}

export interface WritingWorkbench {
  projectTitle: string;
  summary: {
    targetPlatformName: string;
    progressPercent: number;
    maturityScore: number;
    oneLineBrief: string;
  };
  heroAction: {
    label: string;
    href: string;
    reason: string;
  };
  treeBlocks: WritingWorkbenchTreeBlock[];
  chapterFocus: {
    nextChapter: WritingWorkbenchChapter | null;
    hookStatus: WorkbenchStatus;
    nextAction: string;
  };
  characterFocus: {
    completeCharacters: number;
    totalCharacters: number;
    nextAction: string;
  };
  contextFocus: {
    status: ProjectContextPack["status"];
    summary: string;
    warnings: string[];
    sourceCounts: ProjectContextPack["sourceCounts"];
  };
  modelFocus: {
    failedTaskCount: number;
    nextRoutes: Array<{
      task: string;
      reason: string;
    }>;
  };
  modelActions: WritingWorkbenchModelAction[];
  modelTimeline: WritingWorkbenchModelTimeline;
  quickLinks: Array<{
    label: string;
    href: string;
  }>;
  quickFixes: WritingWorkbenchQuickFix[];
}

export interface WritingWorkbenchQuickFix {
  id: string;
  kind: "chapter_hook" | "chapter_card" | "character_seed" | "story_line_seed" | "world_seed";
  label: string;
  description: string;
  method: "PATCH" | "POST";
  endpoint: string;
  payload: Record<string, string>;
}

export interface WritingWorkbenchModelAction {
  id: string;
  kind: "opening_diagnostic" | "chapter_draft" | "chapter_review";
  label: string;
  description: string;
  method: "GET" | "POST";
  endpoint: string;
  payload: Record<string, string | number>;
  refreshHref: string;
  disabledReason: string | null;
}

export interface WritingWorkbenchModelTimeline {
  totalRuns: number;
  emptyState: string;
  items: WritingWorkbenchModelTimelineItem[];
}

export interface WritingWorkbenchModelTimelineItem {
  id: string;
  taskType: string;
  label: string;
  status: string;
  model: string;
  createdAt: string;
  summary: string;
  costLabel: string;
  nextAction: string;
  sourceContext: WritingWorkbenchModelSourceContext | null;
  retryAction: WritingWorkbenchModelTimelineRetryAction | null;
  recovery: WritingWorkbenchModelTimelineRecovery | null;
}

export interface WritingWorkbenchModelSourceContext {
  status: ProjectContextStatus;
  summary: string;
  warnings: string[];
  sourceCounts: ProjectContextPack["sourceCounts"];
}

export interface WritingWorkbenchModelTimelineRetryAction {
  supported: boolean;
  label: string;
  reason: string;
  endpoint: string | null;
}

export interface WritingWorkbenchModelTimelineRecovery {
  status: "recovered" | "unresolved";
  label: string;
  detail: string;
  recoveredByTaskId: string | null;
}

const treeRequirements: Array<{
  type: WritingWorkbenchTreeBlock["type"];
  label: string;
  required: number;
}> = [
  { type: "opening", label: "开头", required: 1 },
  { type: "ending", label: "结尾", required: 1 },
  { type: "trunk", label: "主干", required: 1 },
  { type: "branch", label: "分支", required: 3 },
  { type: "leaf", label: "叶片", required: 2 },
  { type: "soil", label: "土壤", required: 1 },
];

function hasText(value: string | null | undefined) {
  return Boolean(value?.trim());
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function buildTreeBlocks(nodes: WritingWorkbenchOutlineNode[], worldEntries: WritingWorkbenchWorldEntry[]): WritingWorkbenchTreeBlock[] {
  return treeRequirements.map((requirement) => {
    const count = requirement.type === "soil"
      ? nodes.filter((node) => node.type === "soil").length + worldEntries.length
      : nodes.filter((node) => node.type === requirement.type).length;
    const completeNode = requirement.type === "soil"
      ? count >= requirement.required
      : nodes.some((node) => (
        node.type === requirement.type
        && hasText(node.goal)
        && hasText(node.hook)
        && hasText(node.conflict)
        && hasText(node.valueShift)
      ));
    const status: WorkbenchStatus = count >= requirement.required && completeNode
      ? "pass"
      : count > 0
        ? "warn"
        : "fail";

    return {
      type: requirement.type,
      label: requirement.label,
      status,
      count,
      note: status === "pass"
        ? `${requirement.label}已具备，可以进入章节承接。`
        : status === "warn"
          ? `${requirement.label}已有素材，但数量或关键字段还不够。`
          : `缺少${requirement.label}，大树结构还断着。`,
    };
  });
}

function isCharacterComplete(character: WritingWorkbenchCharacter) {
  return [
    character.desire,
    character.need,
    character.flaw,
    character.arcStart,
    character.arcEnd,
    character.relationshipNotes,
  ].every(hasText);
}

function pickNextChapter(chapters: WritingWorkbenchChapter[]) {
  return chapters.find((chapter) => chapter.status !== "final")
    ?? chapters.at(-1)
    ?? null;
}

function buildHeroAction(input: WritingWorkbenchInput, nextChapter: WritingWorkbenchChapter | null) {
  if (!nextChapter) {
    return {
      label: "创建第一章",
      href: `/projects/${input.project.id}#create-chapter`,
      reason: "还没有章节，先把大纲落成可写章节卡。",
    };
  }

  if (!hasText(nextChapter.hook)) {
    return {
      label: "修开头钩子",
      href: `/projects/${input.project.id}/chapters/${nextChapter.id}#chapter-editor`,
      reason: "下一章缺少开头钩子，首屏留存会先掉。",
    };
  }

  if (!hasText(nextChapter.conflict) || !hasText(nextChapter.cliffhanger)) {
    return {
      label: "补章节卡",
      href: `/projects/${input.project.id}/chapters/${nextChapter.id}#chapter-editor`,
      reason: "章节冲突或章末悬念不足，生成正文前先补卡。",
    };
  }

  return {
    label: "继续写作",
    href: `/projects/${input.project.id}/chapters/${nextChapter.id}#chapter-editor`,
    reason: "下一章章节卡具备，可以进入正文和复审。",
  };
}

function buildModelRoutes(input: WritingWorkbenchInput, nextChapter: WritingWorkbenchChapter | null) {
  const routes = [
    {
      task: "开头钩子诊断",
      reason: nextChapter && !hasText(nextChapter.hook)
        ? "当前下一章缺少钩子，优先让强推理模型给 3 个开场压力方案。"
        : "用于检查前三段是否有危机、反差和继续阅读理由。",
    },
    {
      task: "章节正文生成",
      reason: "把章节卡扩写成平台节奏正文，保留冲突、价值变化和章末悬念。",
    },
    {
      task: "人物弧光复核",
      reason: "检查主角欲望、缺陷、关系压力是否真的进入本章选择。",
    },
    {
      task: "平台风格复审",
      reason: `按${input.project.targetPlatformName}的阅读习惯检查爽点、节奏和投稿风险。`,
    },
  ];

  return input.aiTasks.some((task) => task.status === "failed")
    ? [
      {
        task: "失败任务复盘",
        reason: "最近有模型任务失败，先确认路由、提示词和备用模型。",
      },
      ...routes,
    ]
    : routes;
}

function buildQuickFixes(
  input: WritingWorkbenchInput,
  nextChapter: WritingWorkbenchChapter | null,
  projectContext: ProjectContextPack,
): WritingWorkbenchQuickFix[] {
  const fixes: WritingWorkbenchQuickFix[] = [];
  const projectHook = input.project.sellingPoint
    ? `${input.project.sellingPoint}但第一段必须先给危机、选择和不可逆代价。`
    : `${input.project.title}第一段必须先给危机、选择和不可逆代价。`;

  if (nextChapter && !hasText(nextChapter.hook)) {
    fixes.push({
      id: `chapter-hook-${nextChapter.id}`,
      kind: "chapter_hook",
      label: "一键补开头钩子",
      description: `给「${nextChapter.title}」补一个能抓住读者的首段压力点。`,
      method: "PATCH",
      endpoint: `/api/chapters/${nextChapter.id}`,
      payload: {
        hook: projectHook.slice(0, 500),
      },
    });
  }

  if (nextChapter && (!hasText(nextChapter.conflict) || !hasText(nextChapter.cliffhanger))) {
    fixes.push({
      id: `chapter-card-${nextChapter.id}`,
      kind: "chapter_card",
      label: "补章节冲突和悬念",
      description: `把「${nextChapter.title}」补成可生成正文的章节卡。`,
      method: "PATCH",
      endpoint: `/api/chapters/${nextChapter.id}`,
      payload: {
        conflict: nextChapter.conflict || "主角必须在保住当前利益和承担更大代价之间做选择。",
        cliffhanger: nextChapter.cliffhanger || "章末抛出新的证据或更高风险，让读者必须点下一章。",
      },
    });
  }

  const hasCompleteCharacter = input.characters.some(isCharacterComplete);
  if (!hasCompleteCharacter) {
    const existingLead = input.characters[0];
    fixes.push({
      id: "character-seed",
      kind: "character_seed",
      label: existingLead ? "补关系镜像角色" : "创建主角人物卡",
      description: existingLead
        ? "主角弧光未闭合，先补一个能制造关系压力的镜像角色。"
        : "还没有人物卡，先建立主角欲望、缺陷和终局变化。",
      method: "POST",
      endpoint: `/api/projects/${input.project.id}/characters`,
      payload: existingLead
        ? {
          name: "关系镜像角色",
          role: "关系压力源",
          desire: `逼迫${existingLead.name || "主角"}面对真实欲望`,
          need: "在冲突中暴露主角缺口",
          flaw: "把控制误认为保护",
          arcStart: "以阻碍者身份进入主线",
          arcEnd: "成为主角变化的镜子或代价",
          voice: "直接、尖锐、带压迫感",
          relationshipNotes: "每次出现都要让主角在逃避和承担之间做选择。",
        }
        : {
          name: "主角",
          role: "主角",
          desire: `完成「${input.project.title}」的核心目标`,
          need: "学会主动选择并承担代价",
          flaw: "在压力下会用旧办法逃避真正问题",
          arcStart: "被危机推着走",
          arcEnd: "主动定义自己的规则和归宿",
          voice: "克制、敏锐，关键时刻有狠劲",
          relationshipNotes: "至少绑定一个反派、一个盟友和一个关系代价。",
        },
    });
  }

  const storyLineBlock = projectContext.blocks.find((block) => block.id === "story_lines");
  if (storyLineBlock?.missing.includes("缺少主线/支线")) {
    fixes.push({
      id: "story-line-seed",
      kind: "story_line_seed",
      label: "补故事主线卡",
      description: "上下文召回缺少主线或支线，先补一条能约束后续章节的追读链。",
      method: "POST",
      endpoint: `/api/projects/${input.project.id}/story-lines`,
      payload: {
        kind: "plot_thread",
        type: "main",
        title: `${input.project.title}主线`,
        startChapterId: nextChapter?.id ?? "",
        endChapterId: "",
        status: "active",
      },
    });
  }

  const hasSoil = input.worldEntries.length > 0 || input.outlineNodes.some((node) => node.type === "soil");
  if (!hasSoil) {
    fixes.push({
      id: "world-platform-soil",
      kind: "world_seed",
      label: "补平台土壤",
      description: `沉淀${input.project.targetPlatformName}的节奏、钩子和风险，后续生成不再凭感觉。`,
      method: "POST",
      endpoint: `/api/projects/${input.project.id}/world-entries`,
      payload: {
        type: "platform_soil",
        title: `${input.project.targetPlatformName}土壤`,
        content: `目标平台：${input.project.targetPlatformName}。题材：${input.project.genre}。卖点：${input.project.sellingPoint || "待补"}。每章优先检查开头危机、明确冲突、价值变化和章末悬念。`,
      },
    });
  }

  return fixes.slice(0, 5);
}

function buildModelActions(input: WritingWorkbenchInput, nextChapter: WritingWorkbenchChapter | null): WritingWorkbenchModelAction[] {
  const noChapterReason = nextChapter ? null : "先创建第一章，再执行模型任务。";
  const chapterId = nextChapter?.id ?? "";
  const chapterHref = nextChapter
    ? `/projects/${input.project.id}/chapters/${nextChapter.id}#chapter-workflow`
    : `/projects/${input.project.id}#create-chapter`;
  const chapterNeedsCard = nextChapter
    ? !hasText(nextChapter.hook) || !hasText(nextChapter.conflict) || !hasText(nextChapter.cliffhanger)
    : false;

  return [
    {
      id: "opening-diagnostic",
      kind: "opening_diagnostic",
      label: "诊断开头",
      description: "检查前三秒钩子、危机进入速度和平台留存风险。",
      method: "GET",
      endpoint: nextChapter ? `/api/chapters/${nextChapter.id}/opening-diagnostic` : "",
      payload: {},
      refreshHref: chapterHref,
      disabledReason: noChapterReason,
    },
    {
      id: "chapter-draft",
      kind: "chapter_draft",
      label: "生成正文",
      description: "按章节卡扩写正文，并记录草稿质量与模型任务。",
      method: "POST",
      endpoint: "/api/ai/tasks/chapter-draft",
      payload: {
        chapterId,
        targetWords: input.project.targetPlatformName.includes("起点") ? 2600 : 1800,
      },
      refreshHref: chapterHref,
      disabledReason: noChapterReason ?? (chapterNeedsCard ? "先补齐开头钩子、冲突和章末悬念。" : null),
    },
    {
      id: "chapter-review",
      kind: "chapter_review",
      label: "平台复审",
      description: `按${input.project.targetPlatformName}口味检查节奏、爽点、人物选择和投稿风险。`,
      method: "POST",
      endpoint: "/api/ai/tasks/chapter-review",
      payload: { chapterId },
      refreshHref: chapterHref,
      disabledReason: noChapterReason ?? (nextChapter && nextChapter.wordCount <= 0 ? "先生成或粘贴正文，再执行平台复审。" : null),
    },
  ];
}

function taskLabel(taskType: string) {
  const labels: Record<string, string> = {
    chapter_draft: "正文生成",
    chapter_review: "平台复审",
    chapter_second_pass: "章节二改",
    first_three_rewrite: "前三章改写",
    submission_package_optimize: "投稿资料优化",
    control_asset_generate: "总控资料生成",
  };

  return labels[taskType] ?? taskType;
}

function summarizeTask(task: WritingWorkbenchAiTask) {
  if (task.status === "failed") {
    return task.errorMessage?.trim() || "模型任务失败，缺少可用输出。";
  }

  return task.outputText?.trim().slice(0, 80) || "任务已记录，暂无输出摘要。";
}

function nextActionForTask(task: WritingWorkbenchAiTask) {
  if (task.status === "failed") return "先复盘模型路由、预算和提示词，再重试。";
  if (task.taskType === "chapter_draft") return "进入平台复审，检查节奏、爽点和人物选择。";
  if (task.taskType === "chapter_review") return "按审稿结论补强章节卡或执行二改。";
  if (task.taskType === "chapter_second_pass") return "回到发布检查，确认是否可进入投稿包。";
  return "把结果沉淀到项目土壤或下一轮动作里。";
}

function buildTimelineRetryAction(task: WritingWorkbenchAiTask): WritingWorkbenchModelTimelineRetryAction | null {
  if (task.status !== "failed") return null;

  const plan = buildTaskRetryPlan({
    chapterId: task.chapterId ?? null,
    taskType: task.taskType,
    status: task.status,
    inputSnapshot: task.inputSnapshot ?? "{}",
  });

  return {
    supported: plan.supported,
    label: plan.actionLabel,
    reason: plan.reason,
    endpoint: plan.supported ? `/api/ai/tasks/${task.id}/retry` : null,
  };
}

function buildTimelineRecovery(task: WritingWorkbenchAiTask, tasks: WritingWorkbenchAiTask[]): WritingWorkbenchModelTimelineRecovery | null {
  if (task.status !== "failed") return null;

  const taskCreatedAt = new Date(task.createdAt).getTime();
  const recoveredBy = tasks
    .filter((candidate) => (
      candidate.id !== task.id
      && candidate.status === "succeeded"
      && candidate.taskType === task.taskType
      && candidate.chapterId === task.chapterId
      && new Date(candidate.createdAt).getTime() > taskCreatedAt
    ))
    .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime())[0];

  if (!recoveredBy) {
    return {
      status: "unresolved",
      label: "未恢复",
      detail: "还没有看到同章节同任务类型的成功记录。",
      recoveredByTaskId: null,
    };
  }

  return {
    status: "recovered",
    label: "已恢复",
    detail: `后续 ${taskLabel(recoveredBy.taskType)} 已成功，恢复任务：${recoveredBy.id}。`,
    recoveredByTaskId: recoveredBy.id,
  };
}

function parseJsonObject(value: string | null | undefined): Record<string, unknown> | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function isSourceContext(value: unknown): value is WritingWorkbenchModelSourceContext {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const counts = record.sourceCounts;
  return (
    (record.status === "pass" || record.status === "warn" || record.status === "fail")
    && typeof record.summary === "string"
    && Array.isArray(record.warnings)
    && Boolean(counts && typeof counts === "object" && !Array.isArray(counts))
  );
}

function findSourceContext(value: unknown, depth = 0): WritingWorkbenchModelSourceContext | null {
  if (depth > 4) return null;
  if (isSourceContext(value)) return value;
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (isSourceContext(record.sourceContext)) return record.sourceContext;
  for (const key of ["input", "prompt", "payload"]) {
    const found = findSourceContext(record[key], depth + 1);
    if (found) return found;
  }
  return null;
}

function sourceContextForTask(task: WritingWorkbenchAiTask) {
  return findSourceContext(parseJsonObject(task.inputSnapshot));
}

function buildModelTimeline(tasks: WritingWorkbenchAiTask[]): WritingWorkbenchModelTimeline {
  const items = [...tasks]
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 5)
    .map((task) => ({
      id: task.id,
      taskType: task.taskType,
      label: taskLabel(task.taskType),
      status: task.status,
      model: task.model,
      createdAt: new Date(task.createdAt).toISOString(),
      summary: summarizeTask(task),
      costLabel: typeof task.costUsd === "number" ? `$${task.costUsd.toFixed(3)}` : "未记录费用",
      nextAction: nextActionForTask(task),
      sourceContext: sourceContextForTask(task),
      retryAction: buildTimelineRetryAction(task),
      recovery: buildTimelineRecovery(task, tasks),
    }));

  return {
    totalRuns: tasks.length,
    emptyState: "还没有模型执行记录。",
    items,
  };
}

export function buildWritingWorkbench(input: WritingWorkbenchInput): WritingWorkbench {
  const treeBlocks = buildTreeBlocks(input.outlineNodes, input.worldEntries);
  const nextChapter = pickNextChapter(input.chapters);
  const projectContext = buildProjectContextPack({
    currentChapterId: nextChapter?.id ?? null,
    chapters: input.chapters.map((chapter) => ({
      id: chapter.id,
      order: chapter.order,
      title: chapter.title,
      content: chapter.content ?? "",
      hook: chapter.hook,
      conflict: chapter.conflict,
      cliffhanger: chapter.cliffhanger,
      status: chapter.status,
    })),
    characters: input.characters,
    worldEntries: input.worldEntries,
    foreshadows: input.foreshadows ?? [],
    plotThreads: input.plotThreads ?? [],
  });
  const hookStatus: WorkbenchStatus = nextChapter
    ? hasText(nextChapter.hook)
      ? "pass"
      : "fail"
    : "warn";
  const completeCharacters = input.characters.filter(isCharacterComplete).length;
  const treeScore = treeBlocks.reduce((sum, block) => sum + (block.status === "pass" ? 12 : block.status === "warn" ? 6 : 0), 0);
  const chapterScore = input.chapters.length > 0 ? 14 : 0;
  const hookScore = hookStatus === "pass" ? 14 : hookStatus === "warn" ? 6 : 0;
  const characterScore = completeCharacters > 0 ? 14 : input.characters.length > 0 ? 7 : 0;
  const maturityScore = clampPercent(treeScore + chapterScore + hookScore + characterScore);

  return {
    projectTitle: input.project.title,
    summary: {
      targetPlatformName: input.project.targetPlatformName,
      progressPercent: input.project.targetWordCount > 0
        ? clampPercent((input.project.currentWordCount / input.project.targetWordCount) * 100)
        : 0,
      maturityScore,
      oneLineBrief: `${input.project.genre}｜${input.project.sellingPoint}`,
    },
    heroAction: buildHeroAction(input, nextChapter),
    treeBlocks,
    chapterFocus: {
      nextChapter,
      hookStatus,
      nextAction: nextChapter
        ? hookStatus === "pass"
          ? `继续推进「${nextChapter.title}」正文和复审。`
          : `先补「${nextChapter.title}」的开头钩子，再进入正文扩写。`
        : "先创建第一章，把开头节点落成章节卡。",
    },
    characterFocus: {
      completeCharacters,
      totalCharacters: input.characters.length,
      nextAction: completeCharacters > 0
        ? "把人物弧光绑定到下一章选择和关系压力里。"
        : input.characters.length > 0
          ? "补齐人物弧光：真正需求、终局变化和关系压力。"
          : "先创建主角人物卡，写清欲望、缺陷和终局变化。",
    },
    contextFocus: {
      status: projectContext.status,
      summary: projectContext.summary,
      warnings: projectContext.warnings,
      sourceCounts: projectContext.sourceCounts,
    },
    modelFocus: {
      failedTaskCount: input.aiTasks.filter((task) => task.status === "failed").length,
      nextRoutes: buildModelRoutes(input, nextChapter),
    },
    modelActions: buildModelActions(input, nextChapter),
    modelTimeline: buildModelTimeline(input.aiTasks),
    quickLinks: [
      { label: "大树结构", href: `/projects/${input.project.id}#outline-tree` },
      { label: "人物弧光", href: `/projects/${input.project.id}#character-arc` },
      { label: "项目土壤", href: `/projects/${input.project.id}#world-bible` },
      { label: "模型任务", href: `/projects/${input.project.id}#ai-pipeline` },
      { label: "发布包", href: `/projects/${input.project.id}#platform-export` },
    ],
    quickFixes: buildQuickFixes(input, nextChapter, projectContext),
  };
}
