import { ChapterReviewPanel } from "@/components/ai/ChapterReviewPanel";
import { AppShell } from "@/components/app-shell/AppShell";
import { ChapterEditor } from "@/components/chapters/ChapterEditor";
import { prisma } from "@/lib/db/prisma";
import { notFound } from "next/navigation";

export default async function ChapterPage({
  params,
}: {
  params: Promise<{ projectId: string; chapterId: string }>;
}) {
  const { chapterId } = await params;
  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    include: { project: true },
  });

  if (!chapter) {
    notFound();
  }

  return (
    <AppShell>
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <ChapterEditor
          chapter={{
            id: chapter.id,
            title: chapter.title,
            content: chapter.content,
            goal: chapter.goal,
            hook: chapter.hook,
            conflict: chapter.conflict,
            valueShift: chapter.valueShift,
            cliffhanger: chapter.cliffhanger,
            status: chapter.status,
            wordCount: chapter.wordCount,
          }}
        />
        <ChapterReviewPanel chapterId={chapterId} />
      </div>
    </AppShell>
  );
}
