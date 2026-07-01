import { NextResponse } from "next/server";
import { buildModelTaskAuditDashboard } from "@/lib/ai/modelTaskAudit";
import { prisma } from "@/lib/db/prisma";

interface Params {
  params: Promise<{ projectId: string }>;
}

export async function GET(_request: Request, { params }: Params) {
  const { projectId } = await params;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const [tasks, providers, chapters] = await Promise.all([
    prisma.aiTask.findMany({
      where: { projectId },
      include: {
        modelProvider: {
          select: {
            providerId: true,
            displayName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    prisma.modelProvider.findMany({
      orderBy: [{ enabled: "desc" }, { updatedAt: "desc" }],
    }),
    prisma.chapter.findMany({
      where: { projectId },
      select: { id: true, title: true },
    }),
  ]);
  const chaptersById = new Map(chapters.map((chapter) => [chapter.id, chapter]));

  return NextResponse.json({
    dashboard: buildModelTaskAuditDashboard(
      tasks.map((task) => ({
        ...task,
        chapter: task.chapterId ? chaptersById.get(task.chapterId) ?? null : null,
      })),
      providers,
    ),
  });
}
