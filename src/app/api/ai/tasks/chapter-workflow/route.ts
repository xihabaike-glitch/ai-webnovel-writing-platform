import { NextResponse } from "next/server";
import { summarizeAiTasks } from "@/lib/ai/taskWorkflow";
import { prisma } from "@/lib/db/prisma";
import { getActiveModelProvider } from "@/lib/model-gateway/activeProvider";

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

  const [{ provider }, tasks] = await Promise.all([
    getActiveModelProvider(),
    prisma.aiTask.findMany({
      where: {
        chapterId,
        taskType: {
          in: ["chapter_draft", "chapter_review"],
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
    tasks: summarizeAiTasks(tasks),
  });
}
