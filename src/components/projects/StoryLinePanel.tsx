"use client";

import { useCallback, useEffect, useState } from "react";

interface ChapterOption {
  id: string;
  order: number;
  title: string;
}

interface CharacterOption {
  id: string;
  name: string;
  role: string;
}

interface ForeshadowItem {
  id: string;
  title: string;
  setupChapterId: string | null;
  payoffChapterId: string | null;
  status: string;
  notes: string;
}

interface PlotThreadItem {
  id: string;
  type: string;
  title: string;
  startChapterId: string | null;
  endChapterId: string | null;
  status: string;
}

interface StoryLineSummary {
  id: string;
  title: string;
  status: "complete" | "partial" | "risk";
  evidence: string;
  suggestion: string;
}

interface StoryLineDashboard {
  foreshadowTotal: number;
  foreshadowReady: number;
  threadTotal: number;
  threadResolved: number;
  summaries: StoryLineSummary[];
  warnings: string[];
  nextActions: string[];
}

interface StoryLinePayload {
  chapters: ChapterOption[];
  characters: CharacterOption[];
  foreshadows: ForeshadowItem[];
  plotThreads: PlotThreadItem[];
  dashboard: StoryLineDashboard;
}

function statusLabel(status: StoryLineSummary["status"]) {
  if (status === "complete") return "完整";
  if (status === "partial") return "待回收";
  return "风险";
}

function chapterName(chapters: ChapterOption[], chapterId: string | null) {
  const chapter = chapters.find((item) => item.id === chapterId);
  return chapter ? `第 ${chapter.order} 章 ${chapter.title}` : "未绑定";
}

export function StoryLinePanel({ projectId }: { projectId: string }) {
  const [payload, setPayload] = useState<StoryLinePayload | null>(null);
  const [foreshadowDraft, setForeshadowDraft] = useState({
    title: "系统来源异常",
    setupChapterId: "",
    payoffChapterId: "",
    status: "planned",
    notes: "第一章埋异常，第三章给出第一轮解释。",
  });
  const [threadDraft, setThreadDraft] = useState({
    type: "main",
    title: "系统主线",
    startChapterId: "",
    endChapterId: "",
    status: "active",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadStoryLines = useCallback(async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/story-lines`);
      if (!response.ok) throw new Error("读取故事线失败。");
      setPayload((await response.json()) as StoryLinePayload);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "读取故事线失败。");
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  async function createForeshadow() {
    setIsSaving(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/story-lines`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...foreshadowDraft,
          setupChapterId: foreshadowDraft.setupChapterId || undefined,
          payoffChapterId: foreshadowDraft.payoffChapterId || undefined,
          relatedCharacterIds: [],
        }),
      });
      if (!response.ok) throw new Error("创建伏笔失败。");
      setPayload((await response.json()) as StoryLinePayload);
      setMessage("已创建伏笔");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "创建伏笔失败。");
    } finally {
      setIsSaving(false);
    }
  }

  async function createThread() {
    setIsSaving(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/story-lines`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "plot_thread",
          ...threadDraft,
          startChapterId: threadDraft.startChapterId || undefined,
          endChapterId: threadDraft.endChapterId || undefined,
        }),
      });
      if (!response.ok) throw new Error("创建剧情线失败。");
      setPayload((await response.json()) as StoryLinePayload);
      setMessage("已创建剧情线");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "创建剧情线失败。");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteForeshadow(id: string) {
    setIsSaving(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/foreshadows/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("删除伏笔失败。");
      await loadStoryLines();
      setMessage("已删除伏笔");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "删除伏笔失败。");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteThread(id: string) {
    setIsSaving(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/plot-threads/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("删除剧情线失败。");
      await loadStoryLines();
      setMessage("已删除剧情线");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "删除剧情线失败。");
    } finally {
      setIsSaving(false);
    }
  }

  useEffect(() => {
    void loadStoryLines();
  }, [loadStoryLines]);

  const chapters = payload?.chapters ?? [];

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-medium">伏笔与主线支线</h2>
          <p className="mt-1 text-sm text-slate-600">管理伏笔埋点/回收章，以及主线支线的起止位置。</p>
        </div>
        <button
          className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
          disabled={isLoading}
          onClick={loadStoryLines}
          type="button"
        >
          {isLoading ? "读取中" : "刷新故事线"}
        </button>
      </div>

      {payload ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-xs text-slate-500">伏笔</div>
            <div className="mt-1 text-2xl font-semibold text-slate-950">{payload.dashboard.foreshadowTotal}</div>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-xs text-slate-500">已回收</div>
            <div className="mt-1 text-2xl font-semibold text-slate-950">{payload.dashboard.foreshadowReady}</div>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-xs text-slate-500">剧情线</div>
            <div className="mt-1 text-2xl font-semibold text-slate-950">{payload.dashboard.threadTotal}</div>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-xs text-slate-500">有终点</div>
            <div className="mt-1 text-2xl font-semibold text-slate-950">{payload.dashboard.threadResolved}</div>
          </div>
        </div>
      ) : null}

      {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-md border border-slate-200 p-3">
          <div className="font-medium text-slate-950">新伏笔</div>
          <div className="mt-3 grid gap-2 text-sm text-slate-600">
            <input className="rounded-md border border-slate-200 px-3 py-2" onChange={(event) => setForeshadowDraft({ ...foreshadowDraft, title: event.target.value })} placeholder="伏笔标题" value={foreshadowDraft.title} />
            <div className="grid gap-2 sm:grid-cols-2">
              <select className="rounded-md border border-slate-200 px-3 py-2" onChange={(event) => setForeshadowDraft({ ...foreshadowDraft, setupChapterId: event.target.value })} value={foreshadowDraft.setupChapterId}>
                <option value="">埋点章</option>
                {chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>第 {chapter.order} 章 {chapter.title}</option>)}
              </select>
              <select className="rounded-md border border-slate-200 px-3 py-2" onChange={(event) => setForeshadowDraft({ ...foreshadowDraft, payoffChapterId: event.target.value })} value={foreshadowDraft.payoffChapterId}>
                <option value="">回收章</option>
                {chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>第 {chapter.order} 章 {chapter.title}</option>)}
              </select>
            </div>
            <select className="rounded-md border border-slate-200 px-3 py-2" onChange={(event) => setForeshadowDraft({ ...foreshadowDraft, status: event.target.value })} value={foreshadowDraft.status}>
              <option value="planned">计划中</option>
              <option value="setup">已埋</option>
              <option value="paid_off">已回收</option>
            </select>
            <textarea className="min-h-20 rounded-md border border-slate-200 px-3 py-2" onChange={(event) => setForeshadowDraft({ ...foreshadowDraft, notes: event.target.value })} placeholder="伏笔说明" value={foreshadowDraft.notes} />
            <button className="w-fit rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-50" disabled={isSaving || !foreshadowDraft.title.trim()} onClick={createForeshadow} type="button">
              {isSaving ? "保存中" : "创建伏笔"}
            </button>
          </div>
        </div>

        <div className="rounded-md border border-slate-200 p-3">
          <div className="font-medium text-slate-950">新剧情线</div>
          <div className="mt-3 grid gap-2 text-sm text-slate-600">
            <div className="grid gap-2 sm:grid-cols-[140px_1fr]">
              <select className="rounded-md border border-slate-200 px-3 py-2" onChange={(event) => setThreadDraft({ ...threadDraft, type: event.target.value })} value={threadDraft.type}>
                <option value="main">主线</option>
                <option value="branch">支线</option>
                <option value="character">人物线</option>
                <option value="relationship">关系线</option>
                <option value="villain">反派线</option>
              </select>
              <input className="rounded-md border border-slate-200 px-3 py-2" onChange={(event) => setThreadDraft({ ...threadDraft, title: event.target.value })} placeholder="剧情线标题" value={threadDraft.title} />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <select className="rounded-md border border-slate-200 px-3 py-2" onChange={(event) => setThreadDraft({ ...threadDraft, startChapterId: event.target.value })} value={threadDraft.startChapterId}>
                <option value="">起点章</option>
                {chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>第 {chapter.order} 章 {chapter.title}</option>)}
              </select>
              <select className="rounded-md border border-slate-200 px-3 py-2" onChange={(event) => setThreadDraft({ ...threadDraft, endChapterId: event.target.value })} value={threadDraft.endChapterId}>
                <option value="">终点章</option>
                {chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>第 {chapter.order} 章 {chapter.title}</option>)}
              </select>
            </div>
            <select className="rounded-md border border-slate-200 px-3 py-2" onChange={(event) => setThreadDraft({ ...threadDraft, status: event.target.value })} value={threadDraft.status}>
              <option value="active">推进中</option>
              <option value="planned">计划中</option>
              <option value="resolved">已解决</option>
            </select>
            <button className="w-fit rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-50" disabled={isSaving || !threadDraft.title.trim()} onClick={createThread} type="button">
              {isSaving ? "保存中" : "创建剧情线"}
            </button>
          </div>
        </div>
      </div>

      {payload ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="grid gap-3">
            {payload.foreshadows.map((foreshadow) => (
              <div className="rounded-md border border-slate-200 p-3 text-sm" key={foreshadow.id}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium text-slate-950">{foreshadow.title}</div>
                    <div className="mt-1 text-slate-500">{foreshadow.status} · 埋点 {chapterName(chapters, foreshadow.setupChapterId)} · 回收 {chapterName(chapters, foreshadow.payoffChapterId)}</div>
                  </div>
                  <button className="rounded-md border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50" disabled={isSaving} onClick={() => deleteForeshadow(foreshadow.id)} type="button">删除</button>
                </div>
                <p className="mt-2 text-slate-600">{foreshadow.notes || "未填写说明"}</p>
              </div>
            ))}
            {payload.foreshadows.length === 0 ? <p className="text-sm text-slate-600">还没有伏笔。</p> : null}
          </div>

          <div className="grid gap-3">
            {payload.plotThreads.map((thread) => (
              <div className="rounded-md border border-slate-200 p-3 text-sm" key={thread.id}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium text-slate-950">{thread.title}</div>
                    <div className="mt-1 text-slate-500">{thread.type} · {thread.status} · {chapterName(chapters, thread.startChapterId)} → {chapterName(chapters, thread.endChapterId)}</div>
                  </div>
                  <button className="rounded-md border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50" disabled={isSaving} onClick={() => deleteThread(thread.id)} type="button">删除</button>
                </div>
              </div>
            ))}
            {payload.plotThreads.length === 0 ? <p className="text-sm text-slate-600">还没有剧情线。</p> : null}
          </div>
        </div>
      ) : null}

      {payload ? (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <div className="rounded-md bg-slate-50 p-3 text-sm">
            <div className="font-medium text-slate-950">风险</div>
            <div className="mt-2 grid gap-2 text-slate-600">
              {payload.dashboard.warnings.length > 0 ? payload.dashboard.warnings.map((warning) => <div key={warning}>{warning}</div>) : <div>故事线暂时可用。</div>}
            </div>
          </div>
          <div className="rounded-md bg-slate-50 p-3 text-sm">
            <div className="font-medium text-slate-950">下一步</div>
            <div className="mt-2 grid gap-2 text-slate-600">
              {payload.dashboard.nextActions.map((action) => <div key={action}>{action}</div>)}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
