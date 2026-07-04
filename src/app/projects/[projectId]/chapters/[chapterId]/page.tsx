import { ChapterWorkflowPanel } from "@/components/ai/ChapterWorkflowPanel";
import { AppShell } from "@/components/app-shell/AppShell";
import { ChapterEditor } from "@/components/chapters/ChapterEditor";
import { ChapterRevisionWorkbench } from "@/components/chapters/ChapterRevisionWorkbench";
import { ChapterSecondPassPanel } from "@/components/chapters/ChapterSecondPassPanel";
import { buildStoryTreeExperienceSecondPassAdvice } from "@/lib/ai/storyTreeExperience";
import { prisma } from "@/lib/db/prisma";
import { getPlatformProfile, type PlatformId } from "@/lib/platforms/platformProfiles";
import { gatePlatformDispatchTaskFromRecord } from "@/lib/projects/gateDispatchTaskRecords";
import { notFound } from "next/navigation";

export default async function ChapterPage({
  params,
}: {
  params: Promise<{ projectId: string; chapterId: string }>;
}) {
  const { chapterId } = await params;
  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    include: {
      project: {
        include: {
          gateDispatchTasks: {
            where: {
              state: "completed",
              dispatchKey: { startsWith: "story-tree-experience:" },
              href: { contains: `/chapters/${chapterId}` },
            },
            orderBy: { completedAt: "desc" },
            take: 12,
          },
        },
      },
    },
  });

  if (!chapter) {
    notFound();
  }
  const platform = getPlatformProfile(chapter.project.targetPlatform as PlatformId);
  const storyTreeExperienceAdvice = buildStoryTreeExperienceSecondPassAdvice(
    chapter.project.gateDispatchTasks.map(gatePlatformDispatchTaskFromRecord),
    chapter.id,
  );
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
          <div id="chapter-editor">
            <ChapterEditor
              key={`${chapter.id}-${chapter.updatedAt.toISOString()}`}
              chapter={editableChapter}
            />
          </div>
          <div id="chapter-second-pass">
            <ChapterSecondPassPanel
              chapterId={chapter.id}
              currentWordCount={chapter.wordCount}
              storyTreeExperienceAdvice={storyTreeExperienceAdvice}
            />
          </div>
          <div id="chapter-revisions">
            <ChapterRevisionWorkbench chapter={editableChapter} />
          </div>
        </div>
        <div id="chapter-workflow">
          <ChapterWorkflowPanel chapterCard={editableChapter} chapterId={chapterId} platform={platform} />
        </div>
      </div>
    </AppShell>
  );
}
