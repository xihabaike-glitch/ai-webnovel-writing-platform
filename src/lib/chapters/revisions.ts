export interface ChapterRevisionInput {
  id: string;
  source: string;
  sourceTaskId: string | null;
  title: string;
  content: string;
  wordCount: number;
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
  status: string;
  notes: string;
  createdAt: string;
}

const sourceLabels: Record<string, string> = {
  ai_draft_before_overwrite: "AI 生成前旧稿",
  manual_snapshot: "手动快照",
  restore_before_overwrite: "回滚前旧稿",
};

export function previewRevisionContent(content: string) {
  const compact = content.replace(/\s+/g, " ").trim();
  if (!compact) return "空正文";
  return compact.length > 120 ? `${compact.slice(0, 120)}...` : compact;
}

export function summarizeChapterRevisions(revisions: ChapterRevisionInput[]): ChapterRevisionSummary[] {
  return revisions.map((revision) => ({
    id: revision.id,
    source: revision.source,
    sourceLabel: sourceLabels[revision.source] ?? revision.source,
    sourceTaskId: revision.sourceTaskId,
    title: revision.title,
    content: revision.content,
    preview: previewRevisionContent(revision.content),
    wordCount: revision.wordCount,
    status: revision.status,
    notes: revision.notes,
    createdAt: new Date(revision.createdAt).toISOString(),
  }));
}
