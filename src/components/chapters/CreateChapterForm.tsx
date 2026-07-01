"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CreateChapterForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("新章节");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function createChapter(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/projects/${projectId}/chapters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });

      if (!response.ok) {
        throw new Error("创建章节失败，请检查标题。");
      }

      const payload = (await response.json()) as { chapter: { id: string } };
      router.push(`/projects/${projectId}/chapters/${payload.chapter.id}`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "创建章节失败。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="grid gap-3 rounded-md border border-slate-200 bg-white p-4" onSubmit={createChapter}>
      <label className="text-sm font-medium" htmlFor="chapter-title">
        新建章节
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          className="min-w-0 flex-1 rounded-md border border-slate-200 px-3 py-2"
          id="chapter-title"
          onChange={(event) => setTitle(event.target.value)}
          value={title}
        />
        <button
          className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "创建中" : "创建章节"}
        </button>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </form>
  );
}

