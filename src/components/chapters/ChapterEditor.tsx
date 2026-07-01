"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { buildChapterUpdatePayload, type ChapterStatus } from "@/lib/chapters/chapterPayload";
import { countWords } from "@/lib/text/wordCount";

interface EditableChapter {
  id: string;
  title: string;
  content: string;
  goal: string;
  hook: string;
  conflict: string;
  valueShift: string;
  cliffhanger: string;
  status: string;
  wordCount: number;
}

export function ChapterEditor({ chapter }: { chapter: EditableChapter }) {
  const router = useRouter();
  const [title, setTitle] = useState(chapter.title);
  const [content, setContent] = useState(chapter.content);
  const [goal, setGoal] = useState(chapter.goal);
  const [hook, setHook] = useState(chapter.hook);
  const [conflict, setConflict] = useState(chapter.conflict);
  const [valueShift, setValueShift] = useState(chapter.valueShift);
  const [cliffhanger, setCliffhanger] = useState(chapter.cliffhanger);
  const [status, setStatus] = useState<ChapterStatus>((chapter.status as ChapterStatus) || "draft");
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const wordCount = useMemo(() => countWords(content), [content]);

  async function saveChapter() {
    setIsSaving(true);
    setMessage(null);

    const payload = buildChapterUpdatePayload({
      title,
      content,
      goal,
      hook,
      conflict,
      valueShift,
      cliffhanger,
      status,
    });

    try {
      const response = await fetch(`/api/chapters/${chapter.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("保存失败，请稍后重试。");
      }

      setMessage("已保存");
      router.refresh();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "保存失败。");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-md border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <input
            className="min-w-0 flex-1 rounded-md border border-transparent px-2 py-1 font-medium outline-none focus:border-slate-200"
            onChange={(event) => setTitle(event.target.value)}
            value={title}
          />
          <span className="text-sm text-slate-500">{wordCount} 字</span>
        </div>
        <textarea
          className="min-h-[420px] w-full resize-y rounded-md border border-slate-200 p-3 leading-7 outline-none focus:border-slate-400"
          onChange={(event) => setContent(event.target.value)}
          value={content}
        />
      </div>
      <div className="grid gap-3 rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-600">
        <label className="grid gap-1">
          章节目标
          <input className="rounded-md border border-slate-200 px-3 py-2" onChange={(e) => setGoal(e.target.value)} value={goal} />
        </label>
        <label className="grid gap-1">
          开头钩子
          <input className="rounded-md border border-slate-200 px-3 py-2" onChange={(e) => setHook(e.target.value)} value={hook} />
        </label>
        <label className="grid gap-1">
          冲突
          <input className="rounded-md border border-slate-200 px-3 py-2" onChange={(e) => setConflict(e.target.value)} value={conflict} />
        </label>
        <label className="grid gap-1">
          价值变化
          <input className="rounded-md border border-slate-200 px-3 py-2" onChange={(e) => setValueShift(e.target.value)} value={valueShift} />
        </label>
        <label className="grid gap-1">
          章末悬念
          <input className="rounded-md border border-slate-200 px-3 py-2" onChange={(e) => setCliffhanger(e.target.value)} value={cliffhanger} />
        </label>
        <label className="grid gap-1">
          状态
          <select
            className="rounded-md border border-slate-200 px-3 py-2"
            onChange={(e) => setStatus(e.target.value as ChapterStatus)}
            value={status}
          >
            <option value="outline">大纲</option>
            <option value="draft">草稿</option>
            <option value="revising">修订</option>
            <option value="final">定稿</option>
          </select>
        </label>
        <div className="flex items-center gap-3">
          <button
            className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            disabled={isSaving}
            onClick={saveChapter}
            type="button"
          >
            {isSaving ? "保存中" : "保存章节"}
          </button>
          {message ? <span>{message}</span> : null}
        </div>
      </div>
    </div>
  );
}
