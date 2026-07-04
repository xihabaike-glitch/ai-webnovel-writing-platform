"use client";

import { useState } from "react";

interface RetentionChapterSignal {
  chapterId: string;
  order: number;
  title: string;
  score: number;
  hook: string;
  payoff: string;
  cliffhanger: string;
  risk: string;
}

interface RetentionDiagnosticItem {
  id: string;
  label: string;
  status: "pass" | "warn" | "fail";
  score: number;
  evidence: string;
  suggestion: string;
}

interface RetentionDiagnostic {
  score: number;
  verdict: string;
  platformName: string;
  chapterSignals: RetentionChapterSignal[];
  items: RetentionDiagnosticItem[];
  rewritePlan: string[];
  quickFixes: RetentionQuickFix[];
  markdown: string;
}

interface RetentionQuickFix {
  id: string;
  label: string;
  description: string;
  method: "PATCH";
  endpoint: string;
  payload: Record<string, string>;
}

function statusLabel(status: RetentionDiagnosticItem["status"]) {
  const labels = {
    pass: "通过",
    warn: "预警",
    fail: "失败",
  };
  return labels[status];
}

function fieldLabel(field: string) {
  const labels: Record<string, string> = {
    goal: "目标",
    hook: "开头钩子",
    conflict: "本章冲突",
    cliffhanger: "章末悬念",
  };

  return labels[field] ?? field;
}

export function RetentionDiagnosticPanel({ projectId }: { projectId: string }) {
  const [diagnostic, setDiagnostic] = useState<RetentionDiagnostic | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [savingFixId, setSavingFixId] = useState<string | null>(null);
  const [fixDrafts, setFixDrafts] = useState<Record<string, Record<string, string>>>({});
  const [message, setMessage] = useState<string | null>(null);

  async function loadDiagnostic() {
    setIsLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/retention-diagnostic`);
      if (!response.ok) {
        throw new Error("生成追读诊断失败。");
      }
      const payload = (await response.json()) as { diagnostic: RetentionDiagnostic };
      setDiagnostic(payload.diagnostic);
      setFixDrafts(Object.fromEntries(payload.diagnostic.quickFixes.map((fix) => [fix.id, fix.payload])));
      setMessage("已生成前三章追读诊断");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "生成追读诊断失败。");
    } finally {
      setIsLoading(false);
    }
  }

  function updateFixDraft(fixId: string, field: string, value: string) {
    setFixDrafts((current) => ({
      ...current,
      [fixId]: {
        ...(current[fixId] ?? {}),
        [field]: value,
      },
    }));
  }

  async function applyQuickFix(fix: RetentionQuickFix) {
    setSavingFixId(fix.id);
    setMessage(null);
    try {
      const response = await fetch(fix.endpoint, {
        method: fix.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fixDrafts[fix.id] ?? fix.payload),
      });
      if (!response.ok) {
        throw new Error("保存追读卡失败，请检查字段后重试。");
      }
      await loadDiagnostic();
      setMessage(`已保存：${fix.label}`);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "保存追读卡失败。");
    } finally {
      setSavingFixId(null);
    }
  }

  async function copyMarkdown() {
    if (!diagnostic) return;
    await navigator.clipboard.writeText(diagnostic.markdown);
    setMessage("已复制前三章追读诊断");
  }

  async function downloadMarkdown() {
    setIsDownloading(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/retention-diagnostic?format=markdown`);
      if (!response.ok) {
        throw new Error("下载追读诊断失败。");
      }
      const markdown = await response.text();
      const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "前三章追读诊断.md";
      link.click();
      URL.revokeObjectURL(url);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "下载追读诊断失败。");
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-medium">前三章追读诊断</h2>
          <p className="mt-1 text-sm text-slate-600">检查钩子递进、爽点兑现、章末悬念和主线压力。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {diagnostic ? (
            <button
              className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50"
              onClick={copyMarkdown}
              type="button"
            >
              复制诊断
            </button>
          ) : null}
          {diagnostic ? (
            <button
              className="rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              disabled={isDownloading}
              onClick={downloadMarkdown}
              type="button"
            >
              {isDownloading ? "下载中" : "下载诊断"}
            </button>
          ) : null}
          <button
            className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
            disabled={isLoading}
            onClick={loadDiagnostic}
            type="button"
          >
            {isLoading ? "诊断中" : "生成诊断"}
          </button>
        </div>
      </div>
      {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}
      {diagnostic ? (
        <div className="mt-4 grid gap-4">
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-xs text-slate-500">{diagnostic.platformName} · 总分</div>
            <div className="mt-1 text-2xl font-semibold text-slate-950">{diagnostic.score}</div>
            <p className="mt-2 text-sm text-slate-600">{diagnostic.verdict}</p>
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            {diagnostic.chapterSignals.map((chapter) => (
              <div className="rounded-md bg-slate-50 p-3 text-sm" key={chapter.chapterId}>
                <div className="flex items-start justify-between gap-3">
                  <div className="font-medium text-slate-950">第 {chapter.order} 章 · {chapter.title}</div>
                  <div className="text-xs text-slate-500">{chapter.score}</div>
                </div>
                <p className="mt-2 text-slate-600">钩子：{chapter.hook}</p>
                <p className="mt-2 text-slate-600">兑现：{chapter.payoff}</p>
                <p className="mt-2 text-slate-600">悬念：{chapter.cliffhanger}</p>
                <p className="mt-2 text-slate-500">风险：{chapter.risk}</p>
              </div>
            ))}
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {diagnostic.items.map((item) => (
              <div className="rounded-md border border-slate-200 p-3 text-sm" key={item.id}>
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium text-slate-950">{item.label}</div>
                  <div className="text-xs text-slate-500">{statusLabel(item.status)} · {item.score}</div>
                </div>
                <p className="mt-2 text-slate-600">{item.evidence}</p>
                <p className="mt-2 text-slate-500">{item.suggestion}</p>
              </div>
            ))}
          </div>
          <div className="rounded-md bg-slate-50 p-3 text-sm">
            <div className="font-medium text-slate-950">修订顺序</div>
            <div className="mt-2 grid gap-2 text-slate-600">
              {diagnostic.rewritePlan.map((step, index) => (
                <div key={step}>{index + 1}. {step}</div>
              ))}
            </div>
          </div>
          {diagnostic.quickFixes.length ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">
              <div className="font-medium text-slate-950">追读卡快修</div>
              <div className="mt-3 grid gap-3">
                {diagnostic.quickFixes.map((fix) => {
                  const draft = fixDrafts[fix.id] ?? fix.payload;

                  return (
                    <div className="rounded-md border border-amber-200 bg-white p-3" key={fix.id}>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="font-medium text-slate-950">{fix.label}</div>
                          <p className="mt-1 text-slate-600">{fix.description}</p>
                        </div>
                        <button
                          className="w-fit rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                          disabled={savingFixId === fix.id}
                          onClick={() => void applyQuickFix(fix)}
                          type="button"
                        >
                          {savingFixId === fix.id ? "保存中" : "保存追读卡"}
                        </button>
                      </div>
                      <div className="mt-3 grid gap-2 lg:grid-cols-2">
                        {Object.entries(draft).map(([field, value]) => (
                          <label className="grid gap-1" key={`${fix.id}:${field}`}>
                            <span className="text-xs font-medium text-slate-600">{fieldLabel(field)}</span>
                            <textarea
                              className="min-h-20 resize-y rounded-md border border-amber-200 px-3 py-2 text-sm leading-6 outline-none focus:border-amber-400"
                              onChange={(event) => updateFixDraft(fix.id, field, event.target.value)}
                              value={value}
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-600">生成后会显示前三章留存评分、逐章风险和修订顺序。</p>
      )}
    </section>
  );
}
