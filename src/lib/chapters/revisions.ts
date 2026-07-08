export interface ChapterRevisionInput {
  id: string;
  source: string;
  sourceTaskId: string | null;
  title: string;
  content: string;
  wordCount: number;
  goal?: string;
  hook?: string;
  conflict?: string;
  valueShift?: string;
  cliffhanger?: string;
  status: string;
  notes: string;
  createdAt: Date | string;
}

export interface ChapterRevisionSummary {
  id: string;
  source: string;
  sourceLabel: string;
  sourceTaskId: string | null;
  title: string;
  content: string;
  preview: string;
  wordCount: number;
  goal: string;
  hook: string;
  conflict: string;
  valueShift: string;
  cliffhanger: string;
  status: string;
  notes: string;
  createdAt: string;
}

export interface ChapterRevisionComparable {
  title: string;
  content: string;
  wordCount: number;
  goal?: string;
  hook?: string;
  conflict?: string;
  valueShift?: string;
  cliffhanger?: string;
  status: string;
}

export interface ChapterRevisionComparison {
  wordDelta: number;
  changedFields: string[];
  oldPreview: string;
  currentPreview: string;
}

export interface PendingCandidateGateInput {
  projectId: string;
  chapter: ChapterRevisionComparable & { id: string };
  revisions: ChapterRevisionInput[];
}

export interface PendingCandidateGate {
  status: "blocked" | "clear";
  revisionId: string | null;
  label: string;
  title: string;
  detail: string;
  actionLabel: string;
  href: string;
}

const sourceLabels: Record<string, string> = {
  ai_draft_candidate: "AI 初稿候选",
  ai_draft_before_overwrite: "AI 生成前旧稿",
  chapter_second_pass_candidate: "二改候选稿",
  chapter_second_pass_before_overwrite: "二改前旧稿",
  first_three_rewrite_candidate: "前三章改写候选",
  first_three_rewrite_before_overwrite: "前三章改写前旧稿",
  manual_snapshot: "手动快照",
  adopt_candidate_before_overwrite: "采纳候选前旧稿",
  restore_before_overwrite: "回滚前旧稿",
};

export function getChapterRevisionSourceLabel(source: string) {
  return sourceLabels[source] ?? source;
}

export function isChapterRevisionCandidate(source: string) {
  return source === "ai_draft_candidate"
    || source === "chapter_second_pass_candidate"
    || source === "first_three_rewrite_candidate";
}

export function previewRevisionContent(content: string) {
  const compact = content.replace(/\s+/g, " ").trim();
  if (!compact) return "空正文";
  return compact.length > 120 ? `${compact.slice(0, 120)}...` : compact;
}

export function summarizeChapterRevisions(revisions: ChapterRevisionInput[]): ChapterRevisionSummary[] {
  return revisions.map((revision) => ({
    id: revision.id,
    source: revision.source,
    sourceLabel: getChapterRevisionSourceLabel(revision.source),
    sourceTaskId: revision.sourceTaskId,
    title: revision.title,
    content: revision.content,
    preview: previewRevisionContent(revision.content),
    wordCount: revision.wordCount,
    goal: revision.goal ?? "",
    hook: revision.hook ?? "",
    conflict: revision.conflict ?? "",
    valueShift: revision.valueShift ?? "",
    cliffhanger: revision.cliffhanger ?? "",
    status: revision.status,
    notes: revision.notes,
    createdAt: new Date(revision.createdAt).toISOString(),
  }));
}

function normalized(text: string | undefined) {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

export function buildChapterRevisionComparison(
  current: ChapterRevisionComparable,
  revision: ChapterRevisionComparable,
): ChapterRevisionComparison {
  const fieldLabels: Array<[keyof ChapterRevisionComparable, string]> = [
    ["title", "标题"],
    ["content", "正文"],
    ["goal", "章节目标"],
    ["hook", "开头钩子"],
    ["conflict", "冲突"],
    ["valueShift", "价值变化"],
    ["cliffhanger", "章末悬念"],
    ["status", "状态"],
  ];
  const changedFields = fieldLabels
    .filter(([field]) => normalized(current[field]?.toString()) !== normalized(revision[field]?.toString()))
    .map(([, label]) => label);

  return {
    wordDelta: current.wordCount - revision.wordCount,
    changedFields,
    oldPreview: previewRevisionContent(revision.content),
    currentPreview: previewRevisionContent(current.content),
  };
}

function isCandidateAlreadyCurrent(chapter: ChapterRevisionComparable, revision: ChapterRevisionComparable) {
  return normalized(chapter.title) === normalized(revision.title)
    && normalized(chapter.content) === normalized(revision.content)
    && chapter.wordCount === revision.wordCount;
}

export function buildPendingCandidateGate(input: PendingCandidateGateInput): PendingCandidateGate {
  const latestCandidate = input.revisions
    .filter((revision) => isChapterRevisionCandidate(revision.source))
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0];
  const href = `/projects/${input.projectId}/chapters/${input.chapter.id}#chapter-revisions`;

  if (!latestCandidate || isCandidateAlreadyCurrent(input.chapter, latestCandidate)) {
    return {
      status: "clear",
      revisionId: null,
      label: "候选稿已处理",
      title: "当前正文没有待采纳候选。",
      detail: "可以继续审稿、二改或发布质检。",
      actionLabel: "查看版本区",
      href,
    };
  }

  const sourceLabel = getChapterRevisionSourceLabel(latestCandidate.source);

  return {
    status: "blocked",
    revisionId: latestCandidate.id,
    label: "待采纳候选稿",
    title: `先处理${sourceLabel}`,
    detail: `当前正文还不是最新修复稿。最新候选是「${latestCandidate.title}」，先采纳、保留当前稿或继续二改，再进入审稿和发布质检。`,
    actionLabel: "去采纳候选",
    href,
  };
}
