"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export interface OutlineNodeView {
  id: string;
  parentId: string | null;
  chapterId: string | null;
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

type EditableNodeField = "title" | "summary" | "goal" | "hook" | "conflict" | "valueShift" | "platformNote" | "status";

const typeLabels: Record<string, string> = {
  root: "根",
  opening: "开头",
  ending: "结尾",
  trunk: "主干",
  branch: "分支",
  leaf: "叶片",
  soil: "土壤",
};

function buildChildrenMap(nodes: OutlineNodeView[]) {
  const map = new Map<string, OutlineNodeView[]>();
  for (const node of nodes) {
    const key = node.parentId ?? "root";
    const children = map.get(key) ?? [];
    children.push(node);
    map.set(key, children);
  }

  for (const children of map.values()) {
    children.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  }

  return map;
}

function OutlineBranch({
  node,
  childrenMap,
  projectId,
}: {
  node: OutlineNodeView;
  childrenMap: Map<string, OutlineNodeView[]>;
  projectId: string;
}) {
  const router = useRouter();
  const children = childrenMap.get(node.id) ?? [];
  const [draft, setDraft] = useState({
    title: node.title,
    summary: node.summary,
    goal: node.goal,
    hook: node.hook,
    conflict: node.conflict,
    valueShift: node.valueShift,
    platformNote: node.platformNote,
    status: node.status,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingChapter, setIsCreatingChapter] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function updateDraft(field: EditableNodeField, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  async function saveNode() {
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/outline-nodes/${node.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });

      if (!response.ok) {
        throw new Error("保存节点失败。");
      }

      setIsEditing(false);
      setMessage("已保存");
      router.refresh();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "保存节点失败。");
    } finally {
      setIsSaving(false);
    }
  }

  async function createChapterCard() {
    setIsCreatingChapter(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/chapters/from-outline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outlineNodeId: node.id }),
      });

      if (!response.ok) {
        throw new Error("生成章节卡失败。");
      }

      const payload = (await response.json()) as { chapter: { id: string } };
      router.push(`/projects/${projectId}/chapters/${payload.chapter.id}`);
      router.refresh();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "生成章节卡失败。");
    } finally {
      setIsCreatingChapter(false);
    }
  }

  return (
    <li className="border-l border-slate-200 pl-3">
      <div className="grid gap-2 py-3">
        {isEditing ? (
          <div className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-slate-950 px-2 py-1 text-xs font-medium text-white">
                {typeLabels[node.type] ?? node.type}
              </span>
              <select
                className="rounded-md border border-slate-200 px-2 py-1 text-xs"
                onChange={(event) => updateDraft("status", event.target.value)}
                value={draft.status}
              >
                <option value="planned">计划中</option>
                <option value="drafted">已细化</option>
                <option value="chapter_card">已生成章节卡</option>
                <option value="done">已完成</option>
              </select>
            </div>
            <label className="grid gap-1">
              标题
              <input
                className="rounded-md border border-slate-200 px-3 py-2"
                onChange={(event) => updateDraft("title", event.target.value)}
                value={draft.title}
              />
            </label>
            <label className="grid gap-1">
              摘要
              <textarea
                className="min-h-20 rounded-md border border-slate-200 px-3 py-2"
                onChange={(event) => updateDraft("summary", event.target.value)}
                value={draft.summary}
              />
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="grid gap-1">
                目标
                <textarea
                  className="min-h-16 rounded-md border border-slate-200 px-3 py-2"
                  onChange={(event) => updateDraft("goal", event.target.value)}
                  value={draft.goal}
                />
              </label>
              <label className="grid gap-1">
                钩子
                <textarea
                  className="min-h-16 rounded-md border border-slate-200 px-3 py-2"
                  onChange={(event) => updateDraft("hook", event.target.value)}
                  value={draft.hook}
                />
              </label>
              <label className="grid gap-1">
                冲突
                <textarea
                  className="min-h-16 rounded-md border border-slate-200 px-3 py-2"
                  onChange={(event) => updateDraft("conflict", event.target.value)}
                  value={draft.conflict}
                />
              </label>
              <label className="grid gap-1">
                转变
                <textarea
                  className="min-h-16 rounded-md border border-slate-200 px-3 py-2"
                  onChange={(event) => updateDraft("valueShift", event.target.value)}
                  value={draft.valueShift}
                />
              </label>
            </div>
            <label className="grid gap-1">
              平台备注
              <textarea
                className="min-h-16 rounded-md border border-slate-200 px-3 py-2"
                onChange={(event) => updateDraft("platformNote", event.target.value)}
                value={draft.platformNote}
              />
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <button
                className="rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                disabled={isSaving}
                onClick={saveNode}
                type="button"
              >
                {isSaving ? "保存中" : "保存节点"}
              </button>
              <button
                className="rounded-md border border-slate-200 px-3 py-2 text-xs font-medium"
                onClick={() => setIsEditing(false)}
                type="button"
              >
                取消
              </button>
              {message ? <span className="text-xs text-slate-500">{message}</span> : null}
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-slate-950 px-2 py-1 text-xs font-medium text-white">
                {typeLabels[node.type] ?? node.type}
              </span>
              <span className="font-medium text-slate-950">{node.title}</span>
              <span className="text-xs text-slate-500">{node.status}</span>
            </div>
            <p className="text-sm text-slate-600">{node.summary}</p>
            <div className="grid gap-1 text-xs text-slate-500 sm:grid-cols-2">
              <div>目标：{node.goal || "待补充"}</div>
              <div>钩子：{node.hook || "待补充"}</div>
              <div>冲突：{node.conflict || "待补充"}</div>
              <div>转变：{node.valueShift || "待补充"}</div>
            </div>
            {node.platformNote ? <p className="text-xs text-slate-500">平台：{node.platformNote}</p> : null}
            <div className="flex flex-wrap items-center gap-2">
              <button
                className="rounded-md border border-slate-200 px-3 py-2 text-xs font-medium hover:bg-slate-50"
                onClick={() => {
                  setDraft({
                    title: node.title,
                    summary: node.summary,
                    goal: node.goal,
                    hook: node.hook,
                    conflict: node.conflict,
                    valueShift: node.valueShift,
                    platformNote: node.platformNote,
                    status: node.status,
                  });
                  setIsEditing(true);
                }}
                type="button"
              >
                编辑
              </button>
              {node.chapterId ? (
                <button
                  className="rounded-md bg-slate-100 px-3 py-2 text-xs font-medium hover:bg-slate-200"
                  onClick={() => router.push(`/projects/${projectId}/chapters/${node.chapterId}`)}
                  type="button"
                >
                  打开章节
                </button>
              ) : (
                <button
                  className="rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                  disabled={isCreatingChapter}
                  onClick={createChapterCard}
                  type="button"
                >
                  {isCreatingChapter ? "生成中" : "生成章节卡"}
                </button>
              )}
              {message ? <span className="text-xs text-slate-500">{message}</span> : null}
            </div>
          </>
        )}
      </div>
      {children.length > 0 ? (
        <ol className="ml-2">
          {children.map((child) => (
            <OutlineBranch childrenMap={childrenMap} key={child.id} node={child} projectId={projectId} />
          ))}
        </ol>
      ) : null}
    </li>
  );
}

export function OutlineTreePanel({
  projectId,
  nodes,
}: {
  projectId: string;
  nodes: OutlineNodeView[];
}) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const childrenMap = useMemo(() => buildChildrenMap(nodes), [nodes]);
  const roots = childrenMap.get("root") ?? [];

  async function generateOutline() {
    setError(null);
    setIsGenerating(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/outline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replace: true }),
      });

      if (!response.ok) {
        throw new Error("生成大纲树失败。");
      }

      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "生成大纲树失败。");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-medium">大纲树</h2>
          <p className="mt-1 text-sm text-slate-600">先定开头和结尾，再搭主干，最后长出分支、叶片和土壤。</p>
        </div>
        <button
          className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          disabled={isGenerating}
          onClick={generateOutline}
          type="button"
        >
          {isGenerating ? "生成中" : nodes.length > 0 ? "重建骨架" : "生成骨架"}
        </button>
      </div>
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      {roots.length > 0 ? (
        <ol className="mt-4 grid gap-1">
          {roots.map((node) => (
            <OutlineBranch childrenMap={childrenMap} key={node.id} node={node} projectId={projectId} />
          ))}
        </ol>
      ) : (
        <p className="mt-4 text-sm text-slate-600">还没有大纲树。先生成一版作品骨架。</p>
      )}
    </section>
  );
}
