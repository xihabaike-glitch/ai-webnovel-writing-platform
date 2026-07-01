"use client";

import { useMemo, useState } from "react";
import { countWords } from "@/lib/text/wordCount";

export function ChapterEditor() {
  const [content, setContent] = useState("林晚推开门，系统提示音在雨夜响起。");
  const wordCount = useMemo(() => countWords(content), [content]);

  return (
    <div className="grid gap-4">
      <div className="rounded-md border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium">第一章 雨夜系统</h2>
          <span className="text-sm text-slate-500">{wordCount} 字</span>
        </div>
        <textarea
          className="min-h-[420px] w-full resize-y rounded-md border border-slate-200 p-3 leading-7 outline-none focus:border-slate-400"
          onChange={(event) => setContent(event.target.value)}
          value={content}
        />
      </div>
      <div className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-600">
        <div>章节目标：让主角在第一章遭遇不可逆事件。</div>
        <div>开头钩子：雨夜、系统、门后未知风险。</div>
        <div>章末悬念：系统给出第一个选择。</div>
      </div>
    </div>
  );
}

