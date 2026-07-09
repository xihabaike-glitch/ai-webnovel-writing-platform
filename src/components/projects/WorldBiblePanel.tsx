"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { worldEntryTypes, type WorldEntryType } from "@/lib/projects/worldBible";

interface WorldBibleEntry {
  id: string;
  type: WorldEntryType;
  title: string;
  content: string;
}

interface WorldBibleTypeSummary {
  type: WorldEntryType;
  label: string;
  count: number;
  status: "pass" | "warn" | "fail";
  note: string;
}

interface WorldBibleEntrySummary {
  id: string;
  type: WorldEntryType;
  label: string;
  title: string;
  completeness: number;
  status: "complete" | "partial" | "empty";
  preview: string;
}

interface WorldBibleDashboard {
  totalEntries: number;
  completeEntries: number;
  typeSummaries: WorldBibleTypeSummary[];
  entrySummaries: WorldBibleEntrySummary[];
  warnings: string[];
  nextActions: string[];
}

const emptyDraft = {
  type: "system_rule" as WorldEntryType,
  title: "系统任务规则",
  content: "系统只能在主角做出高风险选择时触发任务，奖励必须伴随代价，并且每次使用都会留下可追踪痕迹。",
};

function statusLabel(status: WorldBibleEntrySummary["status"]) {
  if (status === "complete") return "完整";
  if (status === "partial") return "待补";
  return "空壳";
}

function typeStatusLabel(status: WorldBibleTypeSummary["status"]) {
  if (status === "pass") return "已建";
  if (status === "warn") return "可补";
  return "缺失";
}

function typeLabel(type: WorldEntryType) {
  return worldEntryTypes.find((entry) => entry.id === type)?.label ?? "其他设定";
}

export function WorldBiblePanel({ projectId }: { projectId: string }) {
  const [entries, setEntries] = useState<WorldBibleEntry[]>([]);
  const [dashboard, setDashboard] = useState<WorldBibleDashboard | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<WorldBibleEntry | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const selectedSummary = useMemo(
    () => dashboard?.entrySummaries.find((summary) => summary.id === editingId) ?? null,
    [dashboard, editingId],
  );

  const loadWorldEntries = useCallback(async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/world-entries`);
      if (!response.ok) {
        throw new Error("读取设定资料库失败。");
      }
      const payload = (await response.json()) as {
        worldEntries: WorldBibleEntry[];
        dashboard: WorldBibleDashboard;
      };
      setEntries(payload.worldEntries);
      setDashboard(payload.dashboard);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "读取设定资料库失败。");
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  async function createEntry() {
    setIsSaving(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/world-entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!response.ok) {
        throw new Error("创建设定失败。");
      }
      const payload = (await response.json()) as {
        worldEntry: WorldBibleEntry;
        worldEntries: WorldBibleEntry[];
        dashboard: WorldBibleDashboard;
      };
      setEntries(payload.worldEntries);
      setDashboard(payload.dashboard);
      setDraft({ ...emptyDraft, title: "", content: "" });
      setMessage("已创建设定卡");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "创建设定失败。");
    } finally {
      setIsSaving(false);
    }
  }

  async function updateEntry() {
    if (!editingDraft) return;
    setIsSaving(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/world-entries/${editingDraft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingDraft),
      });
      if (!response.ok) {
        throw new Error("保存设定失败。");
      }
      const payload = (await response.json()) as {
        worldEntry: WorldBibleEntry;
        dashboard: WorldBibleDashboard;
      };
      setEntries((current) => current.map((entry) => (
        entry.id === payload.worldEntry.id ? payload.worldEntry : entry
      )));
      setDashboard(payload.dashboard);
      setEditingId(null);
      setEditingDraft(null);
      setMessage("已保存设定卡");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "保存设定失败。");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteEntry(entryId: string) {
    setIsSaving(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/world-entries/${entryId}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error("删除设定失败。");
      }
      const payload = (await response.json()) as { dashboard: WorldBibleDashboard };
      setEntries((current) => current.filter((entry) => entry.id !== entryId));
      setDashboard(payload.dashboard);
      if (editingId === entryId) {
        setEditingId(null);
        setEditingDraft(null);
      }
      setMessage("已删除设定卡");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "删除设定失败。");
    } finally {
      setIsSaving(false);
    }
  }

  function startEditing(entry: WorldBibleEntry) {
    setEditingId(entry.id);
    setEditingDraft(entry);
  }

  useEffect(() => {
    void loadWorldEntries();
  }, [loadWorldEntries]);

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-medium">世界观与设定资料库</h2>
          <p className="mt-1 text-sm text-slate-600">沉淀系统规则、禁忌、地点、组织、道具和平台土壤，给长篇防止设定漂移。</p>
        </div>
        <button
          className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
          disabled={isLoading}
          onClick={loadWorldEntries}
          type="button"
        >
          {isLoading ? "读取中" : "刷新资料库"}
        </button>
      </div>

      {dashboard ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-xs text-slate-500">设定卡</div>
            <div className="mt-1 text-2xl font-semibold text-slate-950">{dashboard.totalEntries}</div>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-xs text-slate-500">完整卡</div>
            <div className="mt-1 text-2xl font-semibold text-slate-950">{dashboard.completeEntries}</div>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-xs text-slate-500">风险提醒</div>
            <div className="mt-1 text-2xl font-semibold text-slate-950">{dashboard.warnings.length}</div>
          </div>
        </div>
      ) : null}

      {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-md border border-slate-200 p-3">
          <div className="font-medium text-slate-950">新设定卡</div>
          <div className="mt-3 grid gap-2 text-sm text-slate-600">
            <select
              className="rounded-md border border-slate-200 px-3 py-2"
              onChange={(event) => setDraft({ ...draft, type: event.target.value as WorldEntryType })}
              value={draft.type}
            >
              {worldEntryTypes.map((entryType) => (
                <option key={entryType.id} value={entryType.id}>{entryType.label}</option>
              ))}
            </select>
            <input
              className="rounded-md border border-slate-200 px-3 py-2"
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              placeholder="设定标题"
              value={draft.title}
            />
            <textarea
              className="min-h-28 rounded-md border border-slate-200 px-3 py-2"
              onChange={(event) => setDraft({ ...draft, content: event.target.value })}
              placeholder="写清规则、限制、剧情用途和可能制造的冲突"
              value={draft.content}
            />
            <button
              className="w-fit rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              disabled={isSaving || !draft.title.trim()}
              onClick={createEntry}
              type="button"
            >
              {isSaving ? "保存中" : "创建设定"}
            </button>
          </div>
        </div>

        <div className="grid gap-3">
          <div className="rounded-md border border-slate-200 p-3">
            <div className="font-medium text-slate-950">类型覆盖</div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {dashboard?.typeSummaries.map((summary) => (
                <div className="rounded-md bg-slate-50 p-3 text-sm" key={summary.type}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-slate-950">{summary.label}</span>
                    <span className="text-xs text-slate-500">{typeStatusLabel(summary.status)} · {summary.count}</span>
                  </div>
                  <p className="mt-1 text-slate-600">{summary.note}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-slate-200 p-3">
            <div className="font-medium text-slate-950">风险与下一步</div>
            <div className="mt-3 grid gap-3 text-sm">
              <div className="grid gap-2 text-slate-600">
                {(dashboard?.warnings.length ? dashboard.warnings : ["暂无明显设定风险。"]).map((warning) => (
                  <div className="rounded-md bg-slate-50 p-2" key={warning}>{warning}</div>
                ))}
              </div>
              <div className="grid gap-2 text-slate-600">
                {dashboard?.nextActions.map((action, index) => (
                  <div key={action}>{index + 1}. {action}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {entries.map((entry) => {
          const summary = dashboard?.entrySummaries.find((item) => item.id === entry.id);
          return (
            <div className="rounded-md border border-slate-200 p-3 text-sm" key={entry.id}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-xs text-slate-500">{typeLabel(entry.type)}</div>
                  <div className="mt-1 font-medium text-slate-950">{entry.title || "未命名设定"}</div>
                </div>
                <div className="text-xs text-slate-500">
                  {summary ? `${statusLabel(summary.status)} · ${summary.completeness}%` : "未诊断"}
                </div>
              </div>
              <p className="mt-2 text-slate-600">{summary?.preview ?? entry.content}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
                  onClick={() => startEditing(entry)}
                  type="button"
                >
                  编辑
                </button>
                <button
                  className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  disabled={isSaving}
                  onClick={() => deleteEntry(entry.id)}
                  type="button"
                >
                  删除
                </button>
              </div>
            </div>
          );
        })}
        {entries.length === 0 ? (
          <p className="rounded-md border border-slate-200 p-3 text-sm text-slate-600">还没有设定卡，先建立系统规则、禁忌和平台土壤。</p>
        ) : null}
      </div>

      {editingDraft ? (
        <div className="mt-4 rounded-md border border-slate-200 p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="font-medium text-slate-950">编辑设定卡</div>
              {selectedSummary ? (
                <p className="mt-1 text-sm text-slate-600">{selectedSummary.label} · {statusLabel(selectedSummary.status)} · {selectedSummary.completeness}%</p>
              ) : null}
            </div>
            <button
              className="w-fit rounded-md border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50"
              onClick={() => {
                setEditingId(null);
                setEditingDraft(null);
              }}
              type="button"
            >
              取消
            </button>
          </div>
          <div className="mt-3 grid gap-2 text-sm text-slate-600">
            <select
              className="rounded-md border border-slate-200 px-3 py-2"
              onChange={(event) => setEditingDraft({ ...editingDraft, type: event.target.value as WorldEntryType })}
              value={editingDraft.type}
            >
              {worldEntryTypes.map((entryType) => (
                <option key={entryType.id} value={entryType.id}>{entryType.label}</option>
              ))}
            </select>
            <input
              className="rounded-md border border-slate-200 px-3 py-2"
              onChange={(event) => setEditingDraft({ ...editingDraft, title: event.target.value })}
              placeholder="设定标题"
              value={editingDraft.title}
            />
            <textarea
              className="min-h-32 rounded-md border border-slate-200 px-3 py-2"
              onChange={(event) => setEditingDraft({ ...editingDraft, content: event.target.value })}
              placeholder="写清规则、限制、剧情用途和可能制造的冲突"
              value={editingDraft.content}
            />
            <button
              className="w-fit rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              disabled={isSaving || !editingDraft.title.trim()}
              onClick={updateEntry}
              type="button"
            >
              {isSaving ? "保存中" : "保存设定"}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
