import type { PlatformProfile } from "@/lib/platforms/platformProfiles";
import { chapterTaskFreshness } from "./chapterPublishReadiness.ts";

export interface SubmissionChapter {
  id: string;
  title: string;
  order: number;
  status: string;
  wordCount: number;
  hook: string;
  cliffhanger: string;
}

export interface SubmissionAiTask {
  chapterId?: string | null;
  taskType: string;
  status: string;
  chapter?: {
    id: string;
  } | null;
  createdAt?: Date | string;
}

export interface SubmissionChecklistInput {
  title: string;
  genre: string;
  sellingPoint: string;
  currentWordCount: number;
  targetLengthType?: string;
  targetWordCount: number;
  platform: PlatformProfile;
  chapters: SubmissionChapter[];
  aiTasks: SubmissionAiTask[];
  structureDiagnostic?: SubmissionStructureDiagnostic;
}

export interface SubmissionStructureDiagnostic {
  score: number;
  items: SubmissionStructureDiagnosticItem[];
}

export interface SubmissionStructureDiagnosticItem {
  id: string;
  label: string;
  status: "pass" | "warn" | "fail";
  evidence: string;
}

export interface SubmissionChecklistItem {
  id: string;
  label: string;
  status: "pass" | "todo" | "risk";
  detail: string;
}

export interface SubmissionChecklist {
  readinessPercent: number;
  items: SubmissionChecklistItem[];
  passCount: number;
  todoCount: number;
  riskCount: number;
}

function item(id: string, label: string, status: SubmissionChecklistItem["status"], detail: string): SubmissionChecklistItem {
  return { id, label, status, detail };
}

function hasSucceededReview(tasks: SubmissionAiTask[], chapterId: string) {
  return chapterTaskFreshness(tasks, chapterId, "chapter_review").isFresh;
}

function minimumSubmissionWords(platform: PlatformProfile) {
  if (platform.id === "zhihu_yanxuan") return 1000;
  if (platform.category === "overseas") return 3000;
  return 8000;
}

function lengthTypeFor(input: SubmissionChecklistInput) {
  if (input.targetLengthType) return input.targetLengthType;
  if (input.targetWordCount <= 20_000) return "short_10k";
  if (input.targetWordCount <= 80_000) return "mid_50k";
  if (input.targetWordCount >= 800_000) return "mega_1m_plus";
  return "long_300k_plus";
}

function lengthStructureItem(
  input: SubmissionChecklistInput,
  firstThree: SubmissionChapter[],
  finalChapters: SubmissionChapter[],
  hasHooks: boolean,
  hasCliffhangers: boolean,
) {
  const lengthType = lengthTypeFor(input);
  if (lengthType === "short_10k") {
    const closureReady = input.currentWordCount >= Math.min(input.targetWordCount * 0.8, 8000)
      && finalChapters.length > 0
      && input.chapters.some((chapter) => chapter.cliffhanger.trim().length > 0);
    return item(
      "length-structure",
      "篇幅结构验收",
      closureReady ? "pass" : "todo",
      closureReady
        ? "短篇已具备闭环结尾检查线：字数接近目标，有定稿章节和章末回收点。"
        : "1 万字短篇先补闭环结尾：核心反转、情绪峰值和回收点必须在投稿前收住。",
    );
  }

  if (lengthType === "mid_50k") {
    const midReady = firstThree.length >= 3 && hasHooks && hasCliffhangers && finalChapters.length >= 1;
    return item(
      "length-structure",
      "篇幅结构验收",
      midReady ? "pass" : "todo",
      midReady
        ? "中篇已有前三章钩子、章末悬念和定稿锚点，后续继续检查人物弧光收束。"
        : "5-6 万字中篇需要明确人物弧光、三段主干和可控支线，不能只靠单章爽点推进。",
    );
  }

  const diagnostic = input.structureDiagnostic;
  if (diagnostic) {
    const requiredIds = ["tree-skeleton", "trunk-pressure", "branch-coverage", "character-arc", "foreshadow-payoff"];
    const requiredItems = requiredIds
      .map((id) => diagnostic.items.find((entry) => entry.id === id))
      .filter((entry): entry is SubmissionStructureDiagnosticItem => Boolean(entry));
    const weakItems = requiredItems.filter((entry) => entry.status !== "pass");
    const diagnosticReady = diagnostic.score >= 72 && requiredItems.length === requiredIds.length && weakItems.length === 0;

    return item(
      "length-structure",
      "篇幅结构验收",
      diagnosticReady ? "pass" : "risk",
      diagnosticReady
        ? `结构诊断 ${diagnostic.score} 分：主干、支线、人物弧光和伏笔回收已通过，可进入投稿前包装。`
        : `结构诊断 ${diagnostic.score} 分，长篇投稿前先补${weakItems.map((entry) => entry.label).join("、") || "主干、支线、人物弧光和伏笔回收"}。`,
    );
  }

  const requiredChapters = lengthType === "mega_1m_plus" ? 12 : 6;
  const longReady = input.chapters.length >= requiredChapters && firstThree.length >= 3 && hasHooks && hasCliffhangers && finalChapters.length >= 3;
  return item(
    "length-structure",
    "篇幅结构验收",
    longReady ? "pass" : "risk",
    longReady
      ? "长篇结构已有足够章节锚点，可以继续复查主干、支线、人物弧光和伏笔回收。"
      : `长篇投稿前还要补主干、支线、人物弧光和伏笔回收证据；当前 ${input.chapters.length}/${requiredChapters} 个章节锚点。`,
  );
}

export function buildSubmissionChecklist(input: SubmissionChecklistInput): SubmissionChecklist {
  const firstThree = input.chapters.slice(0, 3);
  const minWords = minimumSubmissionWords(input.platform);
  const reviewedFirstThree = firstThree.filter((chapter) => hasSucceededReview(input.aiTasks, chapter.id));
  const hasHooks = firstThree.length > 0 && firstThree.every((chapter) => chapter.hook.trim().length > 0);
  const hasCliffhangers = firstThree.length > 0 && firstThree.every((chapter) => chapter.cliffhanger.trim().length > 0);
  const finalChapters = input.chapters.filter((chapter) => chapter.status === "final");

  const items: SubmissionChecklistItem[] = [
    item(
      "title",
      "作品标题",
      input.title.trim().length >= 2 ? "pass" : "todo",
      input.title.trim().length >= 2 ? "标题已填写。" : "标题过短，投稿前需要能被读者一眼识别。",
    ),
    item(
      "genre",
      "题材标签",
      input.genre.trim().length > 0 ? "pass" : "todo",
      input.genre.trim().length > 0 ? `题材：${input.genre}` : "题材为空，平台推荐和读者预期都会失焦。",
    ),
    item(
      "selling-point",
      "一句话卖点",
      input.sellingPoint.trim().length >= 10 ? "pass" : "todo",
      input.sellingPoint.trim().length >= 10 ? input.sellingPoint : "卖点太弱，至少写清主角、冲突和看点。",
    ),
    item(
      "word-count",
      "投稿字数",
      input.currentWordCount >= minWords ? "pass" : "todo",
      input.currentWordCount >= minWords
        ? `当前 ${input.currentWordCount} 字，达到 ${input.platform.name} 的最低检查线。`
        : `当前 ${input.currentWordCount} 字，建议至少准备 ${minWords} 字再投。`,
    ),
    item(
      "first-three",
      "前三章",
      firstThree.length >= 3 ? "pass" : "todo",
      firstThree.length >= 3 ? "前三章已建立。" : `目前只有 ${firstThree.length} 章，缺少首轮留存样章。`,
    ),
    item(
      "opening-hooks",
      "前三章钩子",
      hasHooks ? "pass" : "todo",
      hasHooks ? "前三章都有开头钩子。" : "前三章必须补齐开头钩子，尤其是第一章。",
    ),
    item(
      "cliffhangers",
      "章末悬念",
      hasCliffhangers ? "pass" : "todo",
      hasCliffhangers ? "章末悬念已覆盖前三章。" : "前三章缺少章末悬念，追读风险高。",
    ),
    item(
      "reviewed-first-three",
      "前三章审稿",
      reviewedFirstThree.length >= Math.min(3, firstThree.length) && firstThree.length >= 3 ? "pass" : "todo",
      firstThree.length >= 3
        ? `已审稿 ${reviewedFirstThree.length}/3 章。`
        : "先补齐前三章，再完成审稿。",
    ),
    item(
      "final-readiness",
      "定稿比例",
      finalChapters.length > 0 ? "pass" : "risk",
      finalChapters.length > 0 ? `已有 ${finalChapters.length} 章定稿。` : "还没有定稿章节，直接投稿会显得不稳。",
    ),
    lengthStructureItem(input, firstThree, finalChapters, hasHooks, hasCliffhangers),
    item(
      "platform-risk",
      "平台风险",
      input.platform.risks.length > 0 ? "risk" : "pass",
      input.platform.risks.join("、") || "暂无平台风险。",
    ),
  ];

  const passCount = items.filter((entry) => entry.status === "pass").length;
  const todoCount = items.filter((entry) => entry.status === "todo").length;
  const riskCount = items.filter((entry) => entry.status === "risk").length;
  const readinessPercent = Math.round((passCount / items.length) * 100);

  return {
    readinessPercent,
    items,
    passCount,
    todoCount,
    riskCount,
  };
}
