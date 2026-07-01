import { buildPlatformStyleScore, type PlatformStyleScore } from "../chapters/platformStyleScore.ts";
import type { PlatformProfile } from "../platforms/platformProfiles.ts";

export interface BatchDraftChapter {
  id: string;
  order: number;
  title: string;
  wordCount: number;
  goal: string;
  hook: string;
  conflict: string;
  valueShift: string;
  cliffhanger: string;
  status: string;
}

export interface BatchDraftTask {
  chapterId: string | null;
  status: string;
}

export interface BatchDraftCandidate {
  chapterId: string;
  order: number;
  title: string;
  status: "ready" | "needs_card" | "weak_style" | "has_draft" | "running";
  wordCount: number;
  missingFields: string[];
  styleScore: number | null;
  styleVerdict: string | null;
  priorityFixes: string[];
  reason: string;
  recommended: boolean;
}

export interface BatchDraftQueue {
  totalCandidates: number;
  readyCandidates: number;
  recommendedChapterIds: string[];
  warnings: string[];
  candidates: BatchDraftCandidate[];
}

function compact(text: string) {
  return text.trim();
}

function missingFields(chapter: BatchDraftChapter) {
  const fields = [
    ["目标", chapter.goal],
    ["钩子", chapter.hook],
    ["冲突", chapter.conflict],
    ["转变", chapter.valueShift],
    ["章末悬念", chapter.cliffhanger],
  ] as const;
  return fields.filter(([, value]) => !compact(value)).map(([label]) => label);
}

function hasRunningDraft(chapter: BatchDraftChapter, tasks: BatchDraftTask[]) {
  return tasks.some((task) => (
    task.chapterId === chapter.id
    && (task.status === "queued" || task.status === "running")
  ));
}

function baseCandidate(
  chapter: BatchDraftChapter,
  status: BatchDraftCandidate["status"],
  missingFields: string[],
  reason: string,
  recommended: boolean,
  styleScore: Pick<PlatformStyleScore, "score" | "verdict" | "priorityFixes"> | null = null,
): BatchDraftCandidate {
  return {
    chapterId: chapter.id,
    order: chapter.order,
    title: chapter.title,
    status,
    wordCount: chapter.wordCount,
    missingFields,
    styleScore: styleScore?.score ?? null,
    styleVerdict: styleScore?.verdict ?? null,
    priorityFixes: styleScore?.priorityFixes ?? [],
    reason,
    recommended,
  };
}

function candidateFor(chapter: BatchDraftChapter, tasks: BatchDraftTask[], platform?: PlatformProfile): BatchDraftCandidate {
  const missing = missingFields(chapter);
  if (hasRunningDraft(chapter, tasks)) {
    return baseCandidate(chapter, "running", missing, "已有初稿任务在运行，等它完成后再决定是否重跑。", false);
  }
  if (chapter.wordCount > 0) {
    return baseCandidate(chapter, "has_draft", missing, "已有正文，建议先审稿或手动保存版本后再覆盖。", false);
  }
  if (missing.length > 0) {
    return baseCandidate(chapter, "needs_card", missing, `章节卡缺${missing.join("、")}，不建议批量生成。`, false);
  }
  const styleScore = platform ? buildPlatformStyleScore({ platform, chapter }) : null;
  if (styleScore && !styleScore.canGenerate) {
    return baseCandidate(
      chapter,
      "weak_style",
      [],
      `平台风格体检 ${styleScore.score} 分：${styleScore.verdict}`,
      false,
      styleScore,
    );
  }
  return baseCandidate(
    chapter,
    "ready",
    [],
    styleScore ? `平台风格体检 ${styleScore.score} 分，可以进入批量初稿。` : "章节卡完整且没有正文，可以进入批量初稿。",
    true,
    styleScore,
  );
}

export function buildBatchDraftQueue(
  chapters: BatchDraftChapter[],
  tasks: BatchDraftTask[],
  platform?: PlatformProfile,
  limit = 5,
): BatchDraftQueue {
  const candidates = [...chapters]
    .sort((left, right) => left.order - right.order || left.title.localeCompare(right.title))
    .map((chapter) => candidateFor(chapter, tasks, platform));
  const ready = candidates.filter((candidate) => candidate.status === "ready");
  const recommendedChapterIds = ready.slice(0, limit).map((candidate) => candidate.chapterId);
  const warnings: string[] = [];

  if (chapters.length === 0) warnings.push("还没有章节卡，先从章节生产排期生成章节卡。");
  if (ready.length === 0 && chapters.length > 0) warnings.push("当前没有适合批量生成的章节，先补章节卡或处理已有正文。");
  if (candidates.some((candidate) => candidate.status === "needs_card")) warnings.push("存在章节卡缺口，直接批量生成会导致正文空转。");
  if (candidates.some((candidate) => candidate.status === "weak_style")) warnings.push("存在平台风格体检未达标章节，先补强钩子、冲突或章末悬念。");
  if (candidates.some((candidate) => candidate.status === "has_draft")) warnings.push("已有正文的章节默认不进批量队列，避免覆盖作者稿。");
  if (ready.length > limit) warnings.push(`一次建议最多生成 ${limit} 章，先跑前 ${limit} 章检查风格稳定性。`);

  return {
    totalCandidates: candidates.length,
    readyCandidates: ready.length,
    recommendedChapterIds,
    warnings,
    candidates,
  };
}
