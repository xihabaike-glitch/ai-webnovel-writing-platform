import { NextResponse } from "next/server";
import { z } from "zod";
import { buildStoryTreeRewriteDispatchItems } from "@/lib/ai/storyTreeDispatch";
import { buildStoryTreeQualityAudit } from "@/lib/ai/storyTreeQualityAudit";
import { prisma } from "@/lib/db/prisma";
import { getPlatformProfile, type PlatformId } from "@/lib/platforms/platformProfiles";
import { persistServerGateDispatchTask } from "@/lib/projects/gateDispatchTaskPersistence";
import { buildProjectContextPack } from "@/lib/projects/projectContextPack";
import { findProjectStartTacticSummary } from "@/lib/projects/projectStartTactics";

interface Params {
  params: Promise<{ projectId: string }>;
}

const storyTreeRecheckSchema = z.object({
  chapterIds: z.array(z.string().min(1)).min(1).max(5),
  source: z.enum(["chapter_draft", "chapter_second_pass", "first_three_rewrite"]).default("chapter_draft"),
});

export async function POST(request: Request, { params }: Params) {
  const { projectId } = await params;
  const parsed = storyTreeRecheckSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid story tree recheck request" }, { status: 400 });
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      chapters: { orderBy: { order: "asc" } },
      characters: { orderBy: { createdAt: "asc" } },
      worldEntries: { orderBy: [{ type: "asc" }, { createdAt: "asc" }] },
      foreshadows: { orderBy: { createdAt: "asc" } },
      plotThreads: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const chapterById = new Map(project.chapters.map((chapter) => [chapter.id, chapter]));
  const chapters = parsed.data.chapterIds.map((chapterId) => chapterById.get(chapterId));
  const rejected = chapters.filter((chapter) => !chapter || chapter.wordCount <= 0);

  if (rejected.length > 0) {
    return NextResponse.json({
      error: "Some chapters are not ready for story tree recheck",
      rejected: parsed.data.chapterIds.filter((chapterId) => {
        const chapter = chapterById.get(chapterId);
        return !chapter || chapter.wordCount <= 0;
      }),
    }, { status: 400 });
  }

  const platform = getPlatformProfile(project.targetPlatform as PlatformId);
  const startTactic = findProjectStartTacticSummary(project.worldEntries);
  const results = [];

  for (const chapter of chapters) {
    if (!chapter) continue;
    const projectContext = buildProjectContextPack({
      currentChapterId: chapter.id,
      chapters: project.chapters,
      characters: project.characters,
      worldEntries: project.worldEntries,
      foreshadows: project.foreshadows,
      plotThreads: project.plotThreads,
    });
    const audit = buildStoryTreeQualityAudit({
      content: chapter.content,
      projectContext,
      startTactic,
      chapter: {
        title: chapter.title,
        goal: chapter.goal,
        hook: chapter.hook,
        conflict: chapter.conflict,
        valueShift: chapter.valueShift,
        cliffhanger: chapter.cliffhanger,
      },
    });
    const dispatches = await Promise.all(buildStoryTreeRewriteDispatchItems({
      source: parsed.data.source,
      projectId: project.id,
      projectTitle: project.title,
      chapterId: chapter.id,
      chapterOrder: chapter.order,
      chapterTitle: chapter.title,
      platform,
      audit,
    }).map(persistServerGateDispatchTask));

    results.push({
      chapterId: chapter.id,
      chapterTitle: chapter.title,
      score: audit.score,
      shouldRewrite: audit.shouldRewrite,
      dispatchCount: dispatches.length,
      dispatchKeys: dispatches.map((dispatch) => dispatch.dispatchKey),
    });
  }

  return NextResponse.json({
    results,
    summary: {
      totalChapters: results.length,
      rewriteChapters: results.filter((result) => result.shouldRewrite).length,
      dispatches: results.reduce((sum, result) => sum + result.dispatchCount, 0),
    },
  });
}
