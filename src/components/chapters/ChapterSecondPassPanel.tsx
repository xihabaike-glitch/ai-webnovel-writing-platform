"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SecondPassMode } from "@/lib/ai/buildChapterSecondPassPrompt";

interface SecondPassResult {
  task: {
    id: string;
    status: string;
    model: string;
  };
  chapter: {
    id: string;
    title: string;
    wordCount: number;
    status: string;
  };
  content: string;
  activeProvider: {
    displayName: string;
    model: string;
  };
}

const modeOptions: Array<{ value: SecondPassMode; label: string }> = [
  { value: "platform_fit", label: "更像目标平台" },
  { value: "more_hook", label: "钩子更强" },
  { value: "more_payoff", label: "爽点更多" },
  { value: "less_exposition", label: "减少解释" },
  { value: "more_emotion", label: "情绪更重" },
];

export function ChapterSecondPassPanel({ chapterId, currentWordCount }: { chapterId: string; currentWordCount: number }) {
  const router = useRouter();
  const [instruction, setInstruction] = useState("更像番茄，开头更快，减少解释，章末更想点下一章。");
  const [mode, setMode] = useState<SecondPassMode>("platform_fit");
  const [targetWords, setTargetWords] = useState(Math.max(1200, currentWordCount));
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<SecondPassResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function runSecondPass() {
    setIsRunning(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/chapters/${chapterId}/second-pass`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction, mode, targetWords }),
      });
      const payload = (await response.json()) as SecondPassResult & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "二改失败。");
      }
      setResult(payload);
      setMessage("已完成章节二改，并自动保存二改前旧稿");
      router.refresh();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "二改失败。");
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-medium">二改指令工作台</h2>
          <p className="mt-1 text-sm text-slate-600">基于当前稿继续改，不从头生成；覆盖前会自动保存快照。</p>
        </div>
        <button
          className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          disabled={isRunning || instruction.trim().length === 0}
          onClick={runSecondPass}
          type="button"
        >
          {isRunning ? "二改中" : "执行二改"}
        </button>
      </div>

      <div className="mt-4 grid gap-3 text-sm text-slate-600 lg:grid-cols-[180px_160px_1fr]">
        <label className="grid gap-1">
          方向
          <select
            className="rounded-md border border-slate-200 px-3 py-2"
            onChange={(event) => setMode(event.target.value as SecondPassMode)}
            value={mode}
          >
            {modeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          目标字数
          <input
            className="rounded-md border border-slate-200 px-3 py-2"
            min={400}
            onChange={(event) => setTargetWords(Number(event.target.value) || 1200)}
            type="number"
            value={targetWords}
          />
        </label>
        <label className="grid gap-1">
          具体指令
          <input
            className="rounded-md border border-slate-200 px-3 py-2"
            onChange={(event) => setInstruction(event.target.value)}
            value={instruction}
          />
        </label>
      </div>

      {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}

      {result ? (
        <div className="mt-4 rounded-md bg-slate-50 p-3 text-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div className="font-medium text-slate-950">{result.chapter.title}</div>
            <div className="text-xs text-slate-500">{result.activeProvider.displayName} · {result.activeProvider.model}</div>
          </div>
          <div className="mt-1 text-slate-500">
            {result.chapter.wordCount} 字 · {result.chapter.status} · {result.task.status}
          </div>
          <p className="mt-2 line-clamp-4 text-slate-600">{result.content}</p>
        </div>
      ) : null}
    </section>
  );
}
