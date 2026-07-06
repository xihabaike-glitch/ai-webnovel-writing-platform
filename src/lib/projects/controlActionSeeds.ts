import { buildDefaultOutlineNodes } from "../outlines/defaultOutline.ts";
import type { PlatformProfile } from "../platforms/platformProfiles.ts";
import type { BatchDraftQueue } from "../ai/batchDrafts.ts";
import { buildChapterCardFromOutline, type ChapterCardDraft } from "../chapters/chapterFromOutline.ts";
import { buildTaskQueueBatchHealthReview, type TaskQueueBatchHealthAudit } from "./taskQueueBatchHealth.ts";

export interface SeedProject {
  id: string;
  title: string;
  genre: string;
  sellingPoint: string;
}

export interface SeedCharacter {
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

export interface SeedWorldEntry {
  type: string;
  title: string;
  content: string;
}

export interface SeedChapter {
  id: string;
  order: number;
  title: string;
}

export interface SeedForeshadow {
  title: string;
}

export interface SeedPlotThread {
  type: string;
}

export interface SeedOutlineNode {
  id: string;
  chapterId?: string | null;
  type: string;
  title: string;
  summary?: string;
  goal?: string;
  hook?: string;
  conflict?: string;
  valueShift?: string;
  platformNote?: string;
  order?: number;
  depth?: number;
}

export interface OutlineNodeCreateSeed {
  id: string;
  parentId: string | null;
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

export interface ChapterCardActionSeed extends ChapterCardDraft {
  outlineNodeId: string;
}

export interface ChapterCardDraftHandoff {
  readyDraftCount: number;
  recommendedChapterIds: string[];
  headline: string;
  nextAction: string;
  targetAnchor: string;
}

export interface AiPipelineControlActionPlan {
  status: "repair" | "watch" | "continue" | "seed_sample";
  label: string;
  detail: string;
  targetAnchor: string;
  created: string[];
  message: string;
  payload: {
    status: AiPipelineControlActionPlan["status"];
    tacticLabel: string;
    tacticTitle: string;
    sampleBatches: number;
    successRatePercent: number | null;
    averageQualityScore: number | null;
    failedTasks: number;
    items: Array<{ id: string; label: string; completed: boolean }>;
    nextActions: string[];
  };
}

function includesPattern(value: string, pattern: RegExp) {
  return pattern.test(value.trim());
}

function hasNamedSeed(items: Array<{ name?: string; title?: string }>, label: string) {
  return items.some((item) => (item.name ?? item.title ?? "").includes(label));
}

function requiredOutlineCount(type: string) {
  if (type === "branch") return 3;
  if (type === "leaf") return 2;
  return 1;
}

const chapterCardNodeTypes = new Set(["opening", "trunk", "branch", "leaf", "ending"]);

function checklistItems(labels: string[]) {
  return labels.map((label, index) => ({
    id: `item-${index + 1}`,
    label,
    completed: false,
  }));
}

function objectRecord(value: unknown): Record<string, unknown> | null {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

export function updateAiPipelineControlPlanItem(payload: string, itemId: string, completed: boolean) {
  let parsed: Record<string, unknown>;
  try {
    const root = JSON.parse(payload) as unknown;
    const record = objectRecord(root);
    if (!record) return null;
    parsed = record;
  } catch {
    return null;
  }

  const plan = objectRecord(parsed.aiPipelineControlPlan);
  const items = Array.isArray(plan?.items) ? plan.items : [];
  let itemLabel = "";
  const updatedItems = items.map((item) => {
    const record = objectRecord(item);
    if (!record) return item;
    if (record.id !== itemId) return item;
    itemLabel = typeof record.label === "string" ? record.label : "";
    return {
      ...record,
      completed,
    };
  });
  if (!itemLabel || !plan) return null;

  const normalizedItems = updatedItems
    .map((item) => objectRecord(item))
    .filter((item): item is Record<string, unknown> => Boolean(item));
  const completedCount = normalizedItems.filter((item) => item.completed === true).length;
  const totalCount = normalizedItems.length;
  parsed.aiPipelineControlPlan = {
    ...plan,
    items: updatedItems,
    completedCount,
    totalCount,
    updatedAt: new Date().toISOString(),
  };

  return {
    payload: JSON.stringify(parsed),
    itemLabel,
    completedCount,
    totalCount,
  };
}

export function recheckAiPipelineControlPlan(
  payload: string,
  health: { status: string; label: string; detail: string },
  dispatch?: { dispatchKey: string; dispatchTitle: string },
) {
  let parsed: Record<string, unknown>;
  try {
    const root = JSON.parse(payload) as unknown;
    const record = objectRecord(root);
    if (!record) return null;
    parsed = record;
  } catch {
    return null;
  }

  const plan = objectRecord(parsed.aiPipelineControlPlan);
  const items = Array.isArray(plan?.items)
    ? plan.items.map((item) => objectRecord(item)).filter((item): item is Record<string, unknown> => Boolean(item))
    : [];
  if (!plan || items.length === 0 || items.some((item) => item.completed !== true)) return null;

  const status = health.status === "usable"
    ? "small_batch_ready"
    : health.status === "watch"
      ? "sample_required"
      : "sample_required";
  const message = status === "small_batch_ready"
    ? `复检完成：${health.label}。可以恢复小批生产，但继续审稿和二改留痕。`
    : `复检完成：${health.label}。清单修完了，但批量健康还没站稳，只能恢复小样本复验。`;

  parsed.aiPipelineControlPlan = {
    ...plan,
    recheck: {
      status,
      healthStatus: health.status,
      healthLabel: health.label,
      detail: health.detail,
      dispatchKey: dispatch?.dispatchKey ?? "",
      dispatchTitle: dispatch?.dispatchTitle ?? "",
      checkedAt: new Date().toISOString(),
    },
  };

  return {
    payload: JSON.stringify(parsed),
    status,
    message,
  };
}

export function buildAiPipelineRecheckDispatchPlan(input: {
  projectId: string;
  receiptId: string;
  recheckStatus: "small_batch_ready" | "sample_required";
  healthLabel: string;
  healthDetail: string;
}) {
  const sampleRequired = input.recheckStatus === "sample_required";
  const suffix = sampleRequired ? "sample" : "scale";
  return {
    dispatchKey: `ai-pipeline-recheck:${input.projectId}:${input.receiptId}:${suffix}`,
    projectId: input.projectId,
    platformId: "ai-pipeline",
    platformName: "AI 写审改",
    stage: sampleRequired ? "ai_pipeline_sample_recheck" : "ai_pipeline_small_batch",
    state: "queued",
    priorityScore: sampleRequired ? 94 : 72,
    ownerRole: sampleRequired ? "写作制片 / 审稿负责人" : "写作制片",
    title: sampleRequired ? "AI 写审改：跑 1 章小样本复验" : "AI 写审改：回推荐批量队列",
    detail: sampleRequired
      ? `复检结论「${input.healthLabel}」还不支持放量：${input.healthDetail} 先跑 1 章样本，把质量、失败和成本证据补回来。`
      : `复检结论「${input.healthLabel}」已允许小批：${input.healthDetail} 回到推荐批量队列，但仍按小批生产、审稿、二改留痕。`,
    dueLabel: sampleRequired ? "今天先跑 1 章" : "下一批前处理",
    actionLabel: sampleRequired ? "跑小样本复验" : "回推荐批量",
    href: `/projects/${input.projectId}#ai-pipeline`,
    acceptanceCriteria: sampleRequired
      ? [
        "只选择 1 章进入初稿、审稿或二改复验",
        "记录成功率、质量分、失败原因和成本",
        "复验完成前不能批量放量",
      ]
      : [
        "只恢复小批推荐队列，不跳过审稿和二改",
        "保留本轮批量健康复检结果",
        "下一批完成后继续回填质量和失败证据",
      ],
    evidence: [
      `来源清单：${input.receiptId}`,
      `复检结论：${input.healthLabel}`,
      input.healthDetail,
    ],
    execution: sampleRequired
      ? {
        mode: "sample_recheck",
        maxSampleCount: 1,
        primaryActionLabel: "运行 1 章复验",
      }
      : {
        mode: "small_batch_resume",
        maxSampleCount: 3,
        primaryActionLabel: "恢复小批执行",
      },
    sourceReceiptId: input.receiptId,
    completionEvidence: "",
    reviewLatestAt: new Date().toISOString(),
  };
}

function dispatchSafeReceiptId(receiptId: string) {
  return receiptId.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
}

export interface AiPipelinePromptMemoryRollbackSourceChapter {
  id: string;
  order?: number | null;
  title: string;
  content?: string | null;
  wordCount?: number | null;
  hook?: string | null;
  goal?: string | null;
}

export function resolveAiPipelinePromptMemoryRollbackSource(chapters: AiPipelinePromptMemoryRollbackSourceChapter[]) {
  const ordered = [...chapters].sort((left, right) => (left.order ?? 0) - (right.order ?? 0));
  const target = ordered.find((chapter) => (chapter.wordCount ?? 0) > 0 || Boolean(chapter.content?.trim())) ?? ordered[0] ?? null;
  if (!target) return null;
  const hook = target.hook?.trim();
  const goal = target.goal?.trim();
  return {
    chapterId: target.id,
    chapterTitle: target.title,
    label: "总控闸口回滚",
    detail: "总控闸口触发 AI 写审改恢复记忆回滚，先用这一章验证恢复证据是否还可靠。",
    evidence: [
      `目标章节：${target.title}`,
      hook ? `章节钩子：${hook}` : null,
      goal ? `章节目标：${goal}` : null,
    ].filter((item): item is string => Boolean(item)),
  };
}

export function buildAiPipelinePromptMemoryRollbackDispatchPlan(input: {
  projectId: string;
  receiptId: string;
  chapterId: string;
  chapterTitle: string;
  diagnosticLabel: string;
  diagnosticDetail: string;
  evidence: string[];
}) {
  const safeReceiptId = dispatchSafeReceiptId(input.receiptId);
  return {
    dispatchKey: `ai-pipeline-recheck:${input.projectId}:${safeReceiptId}:sample`,
    projectId: input.projectId,
    platformId: "ai-pipeline",
    platformName: "AI 写审改",
    stage: "ai_pipeline_sample_recheck",
    state: "queued",
    priorityScore: 96,
    ownerRole: "写作制片 / 审稿负责人",
    title: "AI 写审改：恢复记忆回滚 1 章复验",
    detail: `章节「${input.chapterTitle}」触发恢复记忆回滚：${input.diagnosticDetail} 只用这 1 章重跑初稿、审稿或二改复验，补回质量、失败原因和成本证据。`,
    dueLabel: "今天跑 1 章",
    actionLabel: "运行 1 章复验",
    href: `/projects/${input.projectId}/chapters/${input.chapterId}#chapter-workflow`,
    acceptanceCriteria: [
      "只选择这 1 章进入初稿、审稿或二改复验",
      "记录新审稿分、ai_recovery 问题是否消失、失败原因和成本",
      "复验完成前不要恢复小批放量",
    ],
    evidence: [
      `来源回执：${input.receiptId}`,
      `诊断结论：${input.diagnosticLabel}`,
      input.diagnosticDetail,
      `目标章节：${input.chapterTitle}`,
      ...input.evidence,
    ],
    execution: {
      mode: "sample_recheck",
      maxSampleCount: 1,
      primaryActionLabel: "运行 1 章复验",
    },
    sourceReceiptId: input.receiptId,
    completionEvidence: "",
    reviewLatestAt: new Date().toISOString(),
  };
}

function outlineSortWeight(type: string) {
  if (type === "opening") return 10;
  if (type === "trunk") return 20;
  if (type === "branch") return 30;
  if (type === "leaf") return 40;
  if (type === "ending") return 90;
  return 50;
}

export function buildCharacterActionSeeds(project: SeedProject, characters: SeedCharacter[]): SeedCharacter[] {
  const seeds: SeedCharacter[] = [];
  const sellingPoint = project.sellingPoint || "围绕核心卖点持续制造选择压力";
  const hasProtagonist = characters.some((character) => includesPattern(`${character.role}${character.name}`, /主角|男主|女主|protagonist/i));
  const hasAntagonist = characters.some((character) => includesPattern(`${character.role}${character.name}`, /反派|敌人|对手|antagonist/i));

  if (!hasProtagonist && !hasNamedSeed(characters, "主角占位卡")) {
    seeds.push({
      name: "主角占位卡",
      role: "主角",
      desire: `抓住「${sellingPoint}」带来的翻盘机会。`,
      need: "学会主动选择，而不是被设定和事件推着走。",
      flaw: "开局容易逃避代价，只想用最短路径解决眼前危机。",
      arcStart: "被动卷入危机，靠本能和运气撑住第一轮。",
      arcEnd: "主动承担代价，能用自己的规则解决终局问题。",
      voice: "紧绷、直接，遇到压力时先判断收益和风险。",
      relationshipNotes: "需要绑定一个反派压力源和一个情绪镜像角色，形成选择拉扯。",
    });
  }

  if (!hasAntagonist && !hasNamedSeed(characters, "反派压力源")) {
    seeds.push({
      name: "反派压力源",
      role: "反派",
      desire: "阻止主角拿到关键资源，维护原有秩序或个人利益。",
      need: "暴露主角真正的弱点，让每次胜利都带来更高代价。",
      flaw: "过度相信控制和规则，低估主角的成长速度。",
      arcStart: "把主角当作可以随手压下的小麻烦。",
      arcEnd: "被主角逼到亲自下场，成为终局选择的压力核心。",
      voice: "冷静、克制，擅长用利益和规则压人。",
      relationshipNotes: "和主角的欲望直接冲突，每次出手都要改变局面。",
    });
  }

  if (characters.length + seeds.length < 3 && !hasNamedSeed(characters, "关系镜像角色")) {
    seeds.push({
      name: "关系镜像角色",
      role: "重要关系",
      desire: "希望主角保留人性、承诺或情感连接。",
      need: "把爽点背后的情绪重量落到具体关系上。",
      flaw: "容易用保护或误解干扰主角选择。",
      arcStart: "和主角目标不完全一致，制造关系摩擦。",
      arcEnd: "在关键节点成为主角愿意付出代价的理由。",
      voice: "更情绪化，能把压力说成人话。",
      relationshipNotes: "用于承接亲情、友情、爱情或师徒线，避免剧情只剩任务推进。",
    });
  }

  return seeds.slice(0, 3);
}

export function buildWorldActionSeeds(project: SeedProject, platform: PlatformProfile, worldEntries: SeedWorldEntry[]): SeedWorldEntry[] {
  const existingTypes = new Set(worldEntries.map((entry) => entry.type));
  const sellingPoint = project.sellingPoint || "核心卖点";
  const seeds: SeedWorldEntry[] = [];

  if (!existingTypes.has("system_rule")) {
    seeds.push({
      type: "system_rule",
      title: "核心规则",
      content: `围绕「${sellingPoint}」建立规则：每次能力、资源或机会出现，都必须绑定限制、代价和下一轮压力，不能无成本解决问题。`,
    });
  }
  if (!existingTypes.has("taboo")) {
    seeds.push({
      type: "taboo",
      title: "不可轻易打破的禁忌",
      content: "禁止无代价复活、无代价洗白和无铺垫开挂。任何突破都要交换记忆、关系、资源或身份安全，反过来推动主线升级。",
    });
  }
  if (!existingTypes.has("platform_soil")) {
    seeds.push({
      type: "platform_soil",
      title: `${platform.name}平台土壤`,
      content: `${platform.name}读者期待：${platform.reviewFocus.join("、")}。章节填充必须服务钩子、冲突、爽点和章末追读，设定解释不能连续拖慢节奏。`,
    });
  }

  return seeds;
}

export function buildStoryLineActionSeeds(
  project: SeedProject,
  chapters: SeedChapter[],
  characters: Array<{ id: string }>,
  foreshadows: SeedForeshadow[],
  plotThreads: SeedPlotThread[],
) {
  const firstChapter = [...chapters].sort((left, right) => left.order - right.order)[0] ?? null;
  const lastChapter = [...chapters].sort((left, right) => right.order - left.order)[0] ?? null;
  const seeds: {
    plotThreads: Array<{ type: string; title: string; startChapterId: string | null; endChapterId: string | null; status: string }>;
    foreshadows: Array<{ title: string; setupChapterId: string | null; payoffChapterId: string | null; relatedCharacterIds: string[]; status: string; notes: string }>;
  } = {
    plotThreads: [],
    foreshadows: [],
  };

  if (!plotThreads.some((thread) => thread.type === "main")) {
    seeds.plotThreads.push({
      type: "main",
      title: `${project.title}主线问题`,
      startChapterId: firstChapter?.id ?? null,
      endChapterId: lastChapter && lastChapter.id !== firstChapter?.id ? lastChapter.id : null,
      status: "active",
    });
  }

  if (foreshadows.length === 0) {
    seeds.foreshadows.push({
      title: "开局异常伏笔",
      setupChapterId: firstChapter?.id ?? null,
      payoffChapterId: null,
      relatedCharacterIds: characters[0]?.id ? [characters[0].id] : [],
      status: "planned",
      notes: "先在开头埋一个异常细节，中段回收时揭示更大的规则、身份或代价。",
    });
  }

  return seeds;
}

export function buildOutlineActionSeeds(
  project: SeedProject,
  platform: PlatformProfile,
  outlineNodes: SeedOutlineNode[],
): OutlineNodeCreateSeed[] {
  const defaultNodes = buildDefaultOutlineNodes({
    projectId: project.id,
    title: project.title,
    genre: project.genre,
    sellingPoint: project.sellingPoint,
    platform,
  });
  if (outlineNodes.length === 0) return defaultNodes;

  const createdByDefaultId = new Map<string, string>();
  const existingByType = new Map(outlineNodes.map((node) => [node.type, node.id]));
  const countsByType = new Map<string, number>();
  for (const node of outlineNodes) {
    countsByType.set(node.type, (countsByType.get(node.type) ?? 0) + 1);
  }
  const seeds: OutlineNodeCreateSeed[] = [];

  for (const node of defaultNodes) {
    if ((countsByType.get(node.type) ?? 0) >= requiredOutlineCount(node.type)) continue;
    const defaultParent = defaultNodes.find((item) => item.id === node.parentId);
    const parentId = defaultParent
      ? existingByType.get(defaultParent.type) ?? createdByDefaultId.get(defaultParent.id) ?? null
      : null;

    seeds.push({
      ...node,
      parentId,
    });
    createdByDefaultId.set(node.id, node.id);
    existingByType.set(node.type, existingByType.get(node.type) ?? node.id);
    countsByType.set(node.type, (countsByType.get(node.type) ?? 0) + 1);
  }

  return seeds;
}

export function buildChapterCardActionSeeds(input: {
  project: SeedProject;
  platform: PlatformProfile;
  outlineNodes: SeedOutlineNode[];
  existingChapterCount: number;
  limit?: number;
}): ChapterCardActionSeed[] {
  const limit = Math.max(1, input.limit ?? 5);
  const candidates = input.outlineNodes
    .filter((node) => chapterCardNodeTypes.has(node.type) && !node.chapterId)
    .sort((left, right) => (
      outlineSortWeight(left.type) - outlineSortWeight(right.type)
      || (left.depth ?? 0) - (right.depth ?? 0)
      || (left.order ?? 0) - (right.order ?? 0)
      || left.title.localeCompare(right.title)
    ))
    .slice(0, limit);

  return candidates.map((node, index) => ({
    outlineNodeId: node.id,
    ...buildChapterCardFromOutline({
      projectTitle: input.project.title,
      platform: input.platform,
      nextOrder: input.existingChapterCount + index + 1,
      outlineNode: {
        type: node.type,
        title: node.title,
        summary: node.summary ?? "",
        goal: node.goal ?? "",
        hook: node.hook ?? "",
        conflict: node.conflict ?? "",
        valueShift: node.valueShift ?? "",
        platformNote: node.platformNote ?? "",
      },
    }),
  }));
}

export function buildChapterCardDraftHandoff(queue: BatchDraftQueue): ChapterCardDraftHandoff {
  const readyDraftCount = queue.readyCandidates;
  const recommendedChapterIds = queue.recommendedChapterIds;
  if (readyDraftCount > 0) {
    return {
      readyDraftCount,
      recommendedChapterIds,
      headline: `已接入批量初稿队列，当前 ${readyDraftCount} 章可生成正文。`,
      nextAction: recommendedChapterIds.length > 1
        ? `先跑前 ${recommendedChapterIds.length} 章小批初稿，生成后立刻审稿和二改。`
        : "先跑 1 章初稿样本，确认平台风格和质量后再放量。",
      targetAnchor: "ai-pipeline",
    };
  }

  const warning = queue.warnings[0] ?? "当前章节卡还不能进入初稿队列。";
  return {
    readyDraftCount,
    recommendedChapterIds,
    headline: "章节卡已生成，但暂时还不能进入批量初稿。",
    nextAction: warning,
    targetAnchor: "ai-pipeline",
  };
}

export function buildAiPipelineControlActionPlan(audits: TaskQueueBatchHealthAudit[]): AiPipelineControlActionPlan {
  const review = buildTaskQueueBatchHealthReview(audits, 5);
  const primary = review.items[0] ?? null;

  if (!primary) {
    const created = [
      "先跑 1 个推荐批次样本",
      "记录成功率、质量分和失败原因",
      "样本过线后再考虑扩大到 2-3 章",
    ];
    return {
      status: "seed_sample",
      label: "建立批量样本",
      detail: "本书还没有可复盘的批量打法样本。",
      targetAnchor: "ai-pipeline",
      created,
      message: "还没有样本，别凭感觉放量。先按推荐队列跑一个小样本，再让总控判断能不能继续。",
      payload: {
        status: "seed_sample",
        tacticLabel: "",
        tacticTitle: "",
        sampleBatches: 0,
        successRatePercent: null,
        averageQualityScore: null,
        failedTasks: 0,
        items: checklistItems(created),
        nextActions: created,
      },
    };
  }

  const nextActions = primary.nextAction
    ? [primary.nextAction, ...primary.evidence]
    : primary.evidence;

  if (primary.status === "blocked") {
    const created = [
      `停用「${primary.label}」继续放量`,
      `复盘 ${primary.failedTasks || "失败"} 个失败任务的错误原因`,
      "拆成 1 章小样本，先修提示词、模型路由和章节输入",
    ];
    return {
      status: "repair",
      label: "批量打法修复清单",
      detail: `${primary.label}：成功率 ${primary.successRatePercent ?? 0}%，质量 ${primary.averageQualityScore ?? "-"}，失败 ${primary.failedTasks}。`,
      targetAnchor: "ai-pipeline",
      created,
      message: "已生成批量打法修复清单：先停用失败打法，修失败原因和质量缺口，再用 1 章样本复验。",
      payload: {
        status: "repair",
        tacticLabel: primary.label,
        tacticTitle: primary.tacticTitle,
        sampleBatches: primary.sampleBatches,
        successRatePercent: primary.successRatePercent,
        averageQualityScore: primary.averageQualityScore,
        failedTasks: primary.failedTasks,
        items: checklistItems(created),
        nextActions: created.concat(nextActions).slice(0, 6),
      },
    };
  }

  if (primary.status === "watch") {
    const recoveryWatch = primary.recoveryBatches > 0;
    const created = recoveryWatch
      ? [
        `围绕「${primary.label}」再跑 1 轮 2-3 章稳定批次`,
        "回填成功率、质量分、失败样本、成本和模型路由证据",
        "连续稳定前不写入平台打法经验库",
      ]
      : [
        `限制「${primary.label}」下一批只跑 1-2 章`,
        "补齐质量分、失败样本和成本记录",
        "复验通过前不进入连续批量生产",
      ];
    return {
      status: "watch",
      label: recoveryWatch ? "恢复放量稳定批次清单" : "批量小样本复验清单",
      detail: recoveryWatch
        ? `${primary.label}：恢复样本还薄，先再跑一轮稳定批次。`
        : `${primary.label}：样本还薄，暂时只能小步验证。`,
      targetAnchor: "ai-pipeline",
      created,
      message: recoveryWatch
        ? "已生成恢复放量稳定批次清单：再跑一轮稳定批次，证据够了再写入经验库。"
        : "已生成小样本复验清单：下一批只跑少量章节，回填质量和失败证据后再决定是否放量。",
      payload: {
        status: "watch",
        tacticLabel: primary.label,
        tacticTitle: primary.tacticTitle,
        sampleBatches: primary.sampleBatches,
        successRatePercent: primary.successRatePercent,
        averageQualityScore: primary.averageQualityScore,
        failedTasks: primary.failedTasks,
        items: checklistItems(created),
        nextActions: created.concat(nextActions).slice(0, 6),
      },
    };
  }

  const created = [
    `保留「${primary.label}」作为参考打法`,
    "下一批仍按小批执行，不跳过审稿和二改",
    "继续记录成功率、质量分和成本",
  ];
  return {
    status: "continue",
    label: "批量放量前检查清单",
    detail: `${primary.label}：成功率 ${primary.successRatePercent ?? "-"}%，质量 ${primary.averageQualityScore ?? "-"}。`,
    targetAnchor: "ai-pipeline",
    created,
    message: "这套打法可以参考，但仍然别一口气放飞。按小批生产、审稿、二改继续留痕。",
    payload: {
      status: "continue",
      tacticLabel: primary.label,
      tacticTitle: primary.tacticTitle,
      sampleBatches: primary.sampleBatches,
      successRatePercent: primary.successRatePercent,
      averageQualityScore: primary.averageQualityScore,
      failedTasks: primary.failedTasks,
      items: checklistItems(created),
      nextActions: created.concat(nextActions).slice(0, 6),
    },
  };
}
