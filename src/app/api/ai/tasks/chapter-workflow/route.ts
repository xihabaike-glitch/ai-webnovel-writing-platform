import { NextResponse } from "next/server";
import { summarizeAiTasks } from "@/lib/ai/taskWorkflow";
import { prisma } from "@/lib/db/prisma";
import { getActiveModelProvider, getModelProviderCandidates } from "@/lib/model-gateway/activeProvider";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chapterId = searchParams.get("chapterId");

  if (!chapterId) {
    return NextResponse.json({ error: "chapterId is required" }, { status: 400 });
  }

  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    select: {
      id: true,
      title: true,
      status: true,
      wordCount: true,
    },
  });

  if (!chapter) {
    return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
  }

  const [{ provider }, modelCandidates, tasks] = await Promise.all([
    getActiveModelProvider("chapter_draft"),
    getModelProviderCandidates("chapter_draft"),
    prisma.aiTask.findMany({
      where: {
        chapterId,
        taskType: {
          in: ["chapter_draft", "chapter_review", "chapter_second_pass", "chapter_adopt_candidate"],
        },
      },
      include: {
        modelProvider: {
          select: {
            providerId: true,
            displayName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
  ]);

  return NextResponse.json({
    chapter,
    activeProvider: {
      id: provider.id,
      providerId: provider.providerId,
      displayName: provider.displayName,
      model: provider.defaultModel,
      enabled: provider.enabled,
      hasApiKey: Boolean(provider.encryptedApiKey),
      baseUrl: provider.baseUrl,
    },
    modelRoute: modelCandidates.map((candidate) => ({
      role: candidate.role,
      providerId: candidate.provider.providerId,
      displayName: candidate.provider.displayName,
      model: candidate.provider.defaultModel,
      enabled: candidate.provider.enabled,
      hasApiKey: Boolean(candidate.provider.encryptedApiKey),
    })),
    tasks: summarizeAiTasks(tasks),
  });
}
