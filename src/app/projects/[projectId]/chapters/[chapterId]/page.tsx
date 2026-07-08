import { ChapterWorkflowPanel } from "@/components/ai/ChapterWorkflowPanel";
import { AppShell } from "@/components/app-shell/AppShell";
import { ChapterEditor } from "@/components/chapters/ChapterEditor";
import { ChapterRevisionWorkbench } from "@/components/chapters/ChapterRevisionWorkbench";
import { ChapterSecondPassPanel } from "@/components/chapters/ChapterSecondPassPanel";
import { buildStoryTreeChapterExperienceRecommendations, buildStoryTreeExperienceGuide, buildStoryTreeExperienceReviewBacklog, buildStoryTreeExperienceSecondPassAdvice } from "@/lib/ai/storyTreeExperience";
import { buildPendingCandidateGate } from "@/lib/chapters/revisions";
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

function hrefWithGateReturn(href: string, gateReturnHref?: string | null) {
  if (!gateReturnHref || !href.startsWith("/") || href.startsWith("/gate")) return href;

  const hashIndex = href.indexOf("#");
  const base = hashIndex >= 0 ? href.slice(0, hashIndex) : href;
  const hash = hashIndex >= 0 ? href.slice(hashIndex) : "";
  if (base.includes("gateReturn=")) return href;
  const separator = base.includes("?") ? "&" : "?";

  return `${base}${separator}gateReturn=${encodeURIComponent(gateReturnHref)}${hash}`;
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
      revisions: {
        orderBy: { createdAt: "desc" },
        take: 12,
      },
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
  const candidateProductionGate = buildPendingCandidateGate({
    projectId,
    chapter: editableChapter,
    revisions: chapter.revisions,
  });

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
          {candidateProductionGate.status === "blocked" ? (
            <section className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-xs font-medium text-emerald-700">章节生产闸 · {candidateProductionGate.label}</div>
                  <h2 className="mt-1 font-medium text-slate-950">{candidateProductionGate.title}</h2>
                  <p className="mt-1 leading-6 text-slate-700">{candidateProductionGate.detail}</p>
                </div>
                <Link className="w-fit rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800" href={hrefWithGateReturn(candidateProductionGate.href, gateReturn)}>
                  {candidateProductionGate.actionLabel}
                </Link>
              </div>
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
            <ChapterRevisionWorkbench chapter={editableChapter} gateReturnHref={gateReturn} />
          </div>
        </div>
        <div id="chapter-workflow">
          <ChapterWorkflowPanel chapterCard={editableChapter} chapterId={chapterId} gateReturnHref={gateReturn} platform={platform} projectId={projectId} />
        </div>
      </div>
    </AppShell>
  );
}
