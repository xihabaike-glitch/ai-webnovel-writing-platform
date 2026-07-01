"use client";

import { useState } from "react";

interface StructureTreeSignal {
  type: string;
  label: string;
  count: number;
  status: "pass" | "warn" | "fail";
  note: string;
}

interface StructureDiagnosticItem {
  id: string;
  label: string;
  status: "pass" | "warn" | "fail";
  score: number;
  evidence: string;
  suggestion: string;
}

interface StoryStructureDiagnostic {
  score: number;
  verdict: string;
  platformName: string;
  treeSignals: StructureTreeSignal[];
  items: StructureDiagnosticItem[];
  actionPlan: string[];
  markdown: string;
}

function statusLabel(status: StructureDiagnosticItem["status"]) {
  const labels = {
    pass: "通过",
    warn: "预警",
    fail: "失败",
  };
  return labels[status];
}

export function StoryStructureDiagnosticPanel({ projectId }: { projectId: string }) {
  const [diagnostic, setDiagnostic] = useState<StoryStructureDiagnostic | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function loadDiagnostic() {
    setIsLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/structure-diagnostic`);
      if (!response.ok) {
        throw new Error("生成整书结构诊断失败。");
      }
      const payload = (await response.json()) as { diagnostic: StoryStructureDiagnostic };
      setDiagnostic(payload.diagnostic);
      setMessage("已生成整书结构健康度诊断");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "生成整书结构诊断失败。");
    } finally {
      setIsLoading(false);
    }
  }

  async function copyMarkdown() {
    if (!diagnostic) return;
    await navigator.clipboard.writeText(diagnostic.markdown);
    setMessage("已复制整书结构诊断");
  }

  async function downloadMarkdown() {
    setIsDownloading(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/structure-diagnostic?format=markdown`);
      if (!response.ok) {
        throw new Error("下载整书结构诊断失败。");
      }
      const markdown = await response.text();
      const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "整书结构健康度诊断.md";
      link.click();
      URL.revokeObjectURL(url);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "下载整书结构诊断失败。");
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-medium">整书结构健康度</h2>
          <p className="mt-1 text-sm text-slate-600">检查大树结构、人物弧光、主线支线、伏笔回收和平台土壤。</p>
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
            {isLoading ? "诊断中" : "生成结构诊断"}
          </button>
        </div>
      </div>
      {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}
      {diagnostic ? (
        <div className="mt-4 grid gap-4">
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-xs text-slate-500">{diagnostic.platformName} · 结构分</div>
            <div className="mt-1 text-2xl font-semibold text-slate-950">{diagnostic.score}</div>
            <p className="mt-2 text-sm text-slate-600">{diagnostic.verdict}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {diagnostic.treeSignals.map((signal) => (
              <div className="rounded-md bg-slate-50 p-3 text-sm" key={signal.type}>
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium text-slate-950">{signal.label}</div>
                  <div className="text-xs text-slate-500">{statusLabel(signal.status)}</div>
                </div>
                <div className="mt-1 text-lg font-semibold text-slate-950">{signal.count}</div>
                <p className="mt-1 text-slate-600">{signal.note}</p>
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
            <div className="font-medium text-slate-950">下一步动作</div>
            <div className="mt-2 grid gap-2 text-slate-600">
              {diagnostic.actionPlan.map((step, index) => (
                <div key={step}>{index + 1}. {step}</div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-600">生成后会显示整书结构分、大树节点状态、风险项和下一步动作。</p>
      )}
    </section>
  );
}
