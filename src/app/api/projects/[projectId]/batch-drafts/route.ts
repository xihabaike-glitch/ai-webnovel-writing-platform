import { NextResponse } from "next/server";
import { z } from "zod";
import { buildBatchDraftQueue } from "@/lib/ai/batchDrafts";
import { generateChapterDraft } from "@/lib/ai/chapterDraftGeneration";
import { prisma } from "@/lib/db/prisma";
import { getActiveModelProvider } from "@/lib/model-gateway/activeProvider";

interface Params {
  params: Promise<{ projectId: string }>;
}

const batchDraftSchema = z.object({
  chapterIds: z.array(z.string().min(1)).min(1).max(5),
  targetWords: z.number().int().min(500).max(5000).default(1200),
});

async function getQueue(projectId: string) {
  const chapters = await prisma.chapter.findMany({
    where: { projectId },
    orderBy: { order: "asc" },
  });
  const tasks = await prisma.aiTask.findMany({
    where: {
      projectId,
      taskType: "chapter_draft",
    },
    select: {
      chapterId: true,
      status: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return buildBatchDraftQueue(chapters, tasks);
}

async function activeProviderView() {
  const { provider } = await getActiveModelProvider();
  return {
    providerId: provider.providerId,
    displayName: provider.displayName,
    model: provider.defaultModel,
    enabled: provider.enabled,
    hasApiKey: Boolean(provider.encryptedApiKey),
    baseUrl: provider.baseUrl,
  };
}

export async function GET(_request: Request, { params }: Params) {
  const { projectId } = await params;
  const project = await prisma.project.findUnique({ where: { id: projectId } });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({
    queue: await getQueue(projectId),
    activeProvider: await activeProviderView(),
  });
}

export async function POST(request: Request, { params }: Params) {
  const { projectId } = await params;
  const project = await prisma.project.findUnique({ where: { id: projectId } });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const input = batchDraftSchema.parse(await request.json());
  const queue = await getQueue(projectId);
  const candidateById = new Map(queue.candidates.map((candidate) => [candidate.chapterId, candidate]));
  const rejected = input.chapterIds
    .map((chapterId) => candidateById.get(chapterId))
    .filter((candidate) => !candidate || candidate.status !== "ready");

  if (rejected.length > 0) {
    return NextResponse.json({
      error: "Some chapters are not ready for batch draft generation",
      rejected,
      queue,
    }, { status: 400 });
  }

  const results = [];
  for (const chapterId of input.chapterIds) {
    const result = await generateChapterDraft({
      chapterId,
      targetWords: input.targetWords,
    });

    results.push({
      chapterId,
      status: "error" in result ? "failed" : "succeeded",
      chapterTitle: result.chapter.title,
      taskId: result.task.id,
      wordCount: "error" in result ? result.chapter.wordCount : result.chapter.wordCount,
      error: "error" in result ? result.error : null,
    });
  }

  return NextResponse.json({
    results,
    queue: await getQueue(projectId),
    activeProvider: await activeProviderView(),
  });
}
