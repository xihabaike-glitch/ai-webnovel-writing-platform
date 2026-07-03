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
  taskType: string;
  status: string;
  model: string;
  createdAt: Date | string;
}

export interface WritingWorkbenchInput {
  project: WritingWorkbenchProject;
  chapters: WritingWorkbenchChapter[];
  outlineNodes: WritingWorkbenchOutlineNode[];
  characters: WritingWorkbenchCharacter[];
  worldEntries: WritingWorkbenchWorldEntry[];
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
  modelFocus: {
    failedTaskCount: number;
    nextRoutes: Array<{
      task: string;
      reason: string;
    }>;
  };
  quickLinks: Array<{
    label: string;
    href: string;
  }>;
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

export function buildWritingWorkbench(input: WritingWorkbenchInput): WritingWorkbench {
  const treeBlocks = buildTreeBlocks(input.outlineNodes, input.worldEntries);
  const nextChapter = pickNextChapter(input.chapters);
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
    modelFocus: {
      failedTaskCount: input.aiTasks.filter((task) => task.status === "failed").length,
      nextRoutes: buildModelRoutes(input, nextChapter),
    },
    quickLinks: [
      { label: "大树结构", href: `/projects/${input.project.id}#outline-tree` },
      { label: "人物弧光", href: `/projects/${input.project.id}#character-arc` },
      { label: "项目土壤", href: `/projects/${input.project.id}#world-bible` },
      { label: "模型任务", href: `/projects/${input.project.id}#ai-pipeline` },
      { label: "发布包", href: `/projects/${input.project.id}#platform-export` },
    ],
  };
}
