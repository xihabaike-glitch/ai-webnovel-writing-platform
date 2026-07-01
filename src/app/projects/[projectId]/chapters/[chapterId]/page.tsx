import { ChapterWorkflowPanel } from "@/components/ai/ChapterWorkflowPanel";
import { AppShell } from "@/components/app-shell/AppShell";
import { ChapterEditor } from "@/components/chapters/ChapterEditor";
import { ChapterRevisionWorkbench } from "@/components/chapters/ChapterRevisionWorkbench";
import { ChapterSecondPassPanel } from "@/components/chapters/ChapterSecondPassPanel";
import { prisma } from "@/lib/db/prisma";
import { getPlatformProfile, type PlatformId } from "@/lib/platforms/platformProfiles";
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
  const platform = getPlatformProfile(chapter.project.targetPlatform as PlatformId);
  const editableChapter = {
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
  };

  return (
    <AppShell>
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="grid gap-4">
          <ChapterEditor
            key={`${chapter.id}-${chapter.updatedAt.toISOString()}`}
            chapter={editableChapter}
          />
          <ChapterSecondPassPanel chapterId={chapter.id} currentWordCount={chapter.wordCount} />
          <ChapterRevisionWorkbench chapter={editableChapter} />
        </div>
        <ChapterWorkflowPanel chapterCard={editableChapter} chapterId={chapterId} platform={platform} />
      </div>
    </AppShell>
  );
}
