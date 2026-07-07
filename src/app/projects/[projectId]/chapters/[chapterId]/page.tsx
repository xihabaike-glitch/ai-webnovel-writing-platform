import { ChapterWorkflowPanel } from "@/components/ai/ChapterWorkflowPanel";
import { AppShell } from "@/components/app-shell/AppShell";
import { ChapterEditor } from "@/components/chapters/ChapterEditor";
import { ChapterRevisionWorkbench } from "@/components/chapters/ChapterRevisionWorkbench";
import { ChapterSecondPassPanel } from "@/components/chapters/ChapterSecondPassPanel";
import { buildStoryTreeChapterExperienceRecommendations, buildStoryTreeExperienceGuide, buildStoryTreeExperienceReviewBacklog, buildStoryTreeExperienceSecondPassAdvice } from "@/lib/ai/storyTreeExperience";
import { buildStoryTreeQualityAudit } from "@/lib/ai/storyTreeQualityAudit";
import { prisma } from "@/lib/db/prisma";
import { getPlatformProfile, type PlatformId } from "@/lib/platforms/platformProfiles";
import { gatePlatformDispatchTaskFromRecord } from "@/lib/projects/gateDispatchTaskRecords";
import Link from "next/link";
import { notFound } from "next/navigation";

function gateReturnFromParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;

  if (!raw?.startsWith("/gate?focus=action-recheck")) {
    return null;
  }

  return raw;
}

export default async function ChapterPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string; chapterId: string }>;
  searchParams?: Promise<{ gateReturn?: string | string[] }>;
}) {
  const { projectId, chapterId } = await params;
  const query = await searchParams;
  const gateReturn = gateReturnFromParam(query?.gateReturn);
  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    include: {
      project: {
        include: {
          gateDispatchTasks: {
            where: {
              state: "completed",
              OR: [
                { dispatchKey: { startsWith: "story-tree:" } },
                { dispatchKey: { startsWith: "story-tree-experience:" } },
              ],
            },
            orderBy: { completedAt: "desc" },
            take: 80,
          },
        },
      },
    },
  });

  if (!chapter) {
    notFound();
  }
  const platform = getPlatformProfile(chapter.project.targetPlatform as PlatformId);
  const persistedStoryTreeTasks = chapter.project.gateDispatchTasks.map(gatePlatformDispatchTaskFromRecord);
  const storyTreeExperienceGuide = buildStoryTreeExperienceGuide(persistedStoryTreeTasks);
  const storyTreeAudit = buildStoryTreeQualityAudit({
    content: chapter.content,
    chapter: {
      title: chapter.title,
      goal: chapter.goal,
      hook: chapter.hook,
      conflict: chapter.conflict,
      valueShift: chapter.valueShift,
      cliffhanger: chapter.cliffhanger,
    },
  });
  const storyTreeExperienceAdvice = buildStoryTreeExperienceSecondPassAdvice(
    persistedStoryTreeTasks,
    chapter.id,
  );
  const storyTreeExperienceReviewBacklog = buildStoryTreeExperienceReviewBacklog(
    persistedStoryTreeTasks.filter((task) => task.href.includes(`/chapters/${chapter.id}`)),
  );
  const recommendedStoryTreeExperience = buildStoryTreeChapterExperienceRecommendations({
    guide: storyTreeExperienceGuide,
    audit: storyTreeAudit,
    excludeDispatchKeys: storyTreeExperienceAdvice.map((item) => item.id),
  });
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
          {gateReturn ? (
            <section className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <div className="font-medium">来自总闸门复检</div>
              <p className="mt-1 leading-5">
                先补齐首章样本钩子、冲突、价值变化和章末追读，处理后回总闸门确认剩余卡点是否减少。
              </p>
              <Link className="mt-3 inline-flex rounded-md bg-white px-3 py-2 text-xs font-medium text-amber-900 hover:bg-amber-100" href={gateReturn}>
                回总闸门复检
              </Link>
            </section>
          ) : null}
          <div id="chapter-editor">
            <ChapterEditor
              key={`${chapter.id}-${chapter.updatedAt.toISOString()}`}
              chapter={editableChapter}
            />
          </div>
          <div id="chapter-second-pass">
            <ChapterSecondPassPanel
              projectId={chapter.projectId}
              chapterId={chapter.id}
              currentWordCount={chapter.wordCount}
              recommendedStoryTreeExperience={recommendedStoryTreeExperience}
              storyTreeExperienceAdvice={storyTreeExperienceAdvice}
              storyTreeExperienceReviewBacklog={storyTreeExperienceReviewBacklog}
            />
          </div>
          <div id="chapter-revisions">
            <ChapterRevisionWorkbench chapter={editableChapter} />
          </div>
        </div>
        <div id="chapter-workflow">
          <ChapterWorkflowPanel chapterCard={editableChapter} chapterId={chapterId} platform={platform} projectId={projectId} />
        </div>
      </div>
    </AppShell>
  );
}
