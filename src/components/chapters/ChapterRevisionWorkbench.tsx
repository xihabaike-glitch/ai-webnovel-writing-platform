"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  buildChapterRevisionComparison,
  type ChapterRevisionComparable,
  type ChapterRevisionComparison,
} from "@/lib/chapters/revisions";

interface ChapterRevisionSummary {
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

interface EditableChapter extends ChapterRevisionComparable {
  id: string;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function wordDeltaLabel(comparison: ChapterRevisionComparison) {
  if (comparison.wordDelta === 0) return "字数持平";
  if (comparison.wordDelta > 0) return `当前稿多 ${comparison.wordDelta} 字`;
  return `当前稿少 ${Math.abs(comparison.wordDelta)} 字`;
}

export function ChapterRevisionWorkbench({ chapter }: { chapter: EditableChapter }) {
  const router = useRouter();
  const [revisions, setRevisions] = useState<ChapterRevisionSummary[]>([]);
  const [selectedRevisionId, setSelectedRevisionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSnapshotting, setIsSnapshotting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const selectedRevision = useMemo(
    () => revisions.find((revision) => revision.id === selectedRevisionId) ?? revisions[0] ?? null,
    [revisions, selectedRevisionId],
  );
  const comparison = selectedRevision ? buildChapterRevisionComparison(chapter, selectedRevision) : null;

  async function loadRevisions(nextSelectedId?: string) {
    setIsLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/chapters/${chapter.id}/revisions`);
      if (!response.ok) {
        throw new Error("读取修订记录失败。");
      }
      const payload = (await response.json()) as { revisions: ChapterRevisionSummary[] };
      setRevisions(payload.revisions);
      setSelectedRevisionId(nextSelectedId ?? payload.revisions[0]?.id ?? null);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "读取修订记录失败。");
    } finally {
      setIsLoading(false);
    }
  }

  async function createSnapshot() {
    setIsSnapshotting(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/chapters/${chapter.id}/revisions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: "作者手动保存，用于对比和回滚。" }),
      });
      if (!response.ok) {
        throw new Error("保存快照失败。");
      }
      const payload = (await response.json()) as { revision: ChapterRevisionSummary };
      await loadRevisions(payload.revision.id);
      setMessage("已保存当前稿快照");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "保存快照失败。");
    } finally {
      setIsSnapshotting(false);
    }
  }

  async function restoreRevision() {
    if (!selectedRevision) return;
    setIsRestoring(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/chapters/${chapter.id}/revisions/${selectedRevision.id}/restore`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("恢复版本失败。");
      }
      setMessage("已恢复旧稿，页面正在刷新");
      router.refresh();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "恢复版本失败。");
    } finally {
      setIsRestoring(false);
    }
  }

  useEffect(() => {
    void loadRevisions();
  }, []);

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-medium">改写稿对比与回滚</h2>
          <p className="mt-1 text-sm text-slate-600">对比当前稿和历史快照，必要时恢复旧稿。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
            disabled={isLoading}
            onClick={() => loadRevisions()}
            type="button"
          >
            {isLoading ? "读取中" : "刷新记录"}
          </button>
          <button
            className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
            disabled={isSnapshotting}
            onClick={createSnapshot}
            type="button"
          >
            {isSnapshotting ? "保存中" : "保存当前快照"}
          </button>
          {selectedRevision ? (
            <button
              className="rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              disabled={isRestoring}
              onClick={restoreRevision}
              type="button"
            >
              {isRestoring ? "恢复中" : "恢复此版本"}
            </button>
          ) : null}
        </div>
      </div>

      {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}

      {revisions.length > 0 ? (
        <div className="mt-4 grid gap-4">
          <div className="grid gap-3 lg:grid-cols-[280px_1fr]">
            <div className="grid gap-2">
              {revisions.map((revision) => (
                <button
                  className={`rounded-md border p-3 text-left text-sm ${
                    selectedRevision?.id === revision.id
                      ? "border-slate-950 bg-slate-50"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                  key={revision.id}
                  onClick={() => setSelectedRevisionId(revision.id)}
                  type="button"
                >
                  <div className="font-medium text-slate-950">{revision.sourceLabel}</div>
                  <div className="mt-1 text-xs text-slate-500">{formatDate(revision.createdAt)}</div>
                  <div className="mt-2 line-clamp-2 text-slate-600">{revision.preview}</div>
                </button>
              ))}
            </div>

            {selectedRevision && comparison ? (
              <div className="grid gap-3">
                <div className="rounded-md bg-slate-50 p-3 text-sm">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="font-medium text-slate-950">{selectedRevision.sourceLabel}</div>
                      <div className="mt-1 text-slate-500">
                        {selectedRevision.wordCount} 字 · {selectedRevision.status} · {formatDate(selectedRevision.createdAt)}
                      </div>
                    </div>
                    <div className="text-slate-600">{wordDeltaLabel(comparison)}</div>
                  </div>
                  <div className="mt-3 text-slate-600">
                    变化字段：{comparison.changedFields.length > 0 ? comparison.changedFields.join("、") : "无明显变化"}
                  </div>
                  <div className="mt-2 text-slate-500">{selectedRevision.notes}</div>
                </div>

                <div className="grid gap-3 xl:grid-cols-2">
                  <div className="rounded-md border border-slate-200 p-3">
                    <div className="text-sm font-medium text-slate-950">历史快照</div>
                    <div className="mt-1 text-xs text-slate-500">{selectedRevision.title}</div>
                    <pre className="mt-3 max-h-[420px] overflow-auto whitespace-pre-wrap text-sm leading-6 text-slate-600">
                      {selectedRevision.content || "空正文"}
                    </pre>
                  </div>
                  <div className="rounded-md border border-slate-200 p-3">
                    <div className="text-sm font-medium text-slate-950">当前稿</div>
                    <div className="mt-1 text-xs text-slate-500">{chapter.title}</div>
                    <pre className="mt-3 max-h-[420px] overflow-auto whitespace-pre-wrap text-sm leading-6 text-slate-600">
                      {chapter.content || "空正文"}
                    </pre>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-600">暂无历史快照。生成 AI 改写稿或手动保存快照后，会在这里显示对比。</p>
      )}
    </section>
  );
}
