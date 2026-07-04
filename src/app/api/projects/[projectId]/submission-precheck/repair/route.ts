import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getPlatformProfile, type PlatformId } from "@/lib/platforms/platformProfiles";
import { persistServerGateDispatchTask } from "@/lib/projects/gateDispatchTaskPersistence";
import { buildSubmissionChecklist } from "@/lib/projects/submissionChecklist";
import { buildSubmissionPrecheckRepairDispatches } from "@/lib/projects/submissionPrecheckRepair";

interface Params {
  params: Promise<{ projectId: string }>;
}

export async function POST(_request: Request, { params }: Params) {
  const { projectId } = await params;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      chapters: { orderBy: { order: "asc" } },
      aiTasks: {
        where: { taskType: { in: ["chapter_review", "chapter_second_pass"] } },
        orderBy: { createdAt: "desc" },
      },
      gateDispatchTasks: {
        where: { dispatchKey: { startsWith: "submission-precheck:" } },
        select: { dispatchKey: true, state: true },
      },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const platform = getPlatformProfile(project.targetPlatform as PlatformId);
  const checklist = buildSubmissionChecklist({
    title: project.title,
    genre: project.genre,
    sellingPoint: project.sellingPoint,
    currentWordCount: project.currentWordCount,
    targetWordCount: project.targetWordCount,
    platform,
    chapters: project.chapters,
    aiTasks: project.aiTasks.map((task) => ({
      taskType: task.taskType,
      status: task.status,
      chapter: task.chapterId ? { id: task.chapterId } : null,
    })),
  });
  const dispatches = buildSubmissionPrecheckRepairDispatches({
    projectId: project.id,
    projectTitle: project.title,
    platform,
    items: checklist.items,
    existingDispatchKeys: project.gateDispatchTasks
      .filter((task) => task.state !== "completed")
      .map((task) => task.dispatchKey),
  });
  const tasks = await Promise.all(dispatches.map(persistServerGateDispatchTask));

  return NextResponse.json({
    dispatches,
    tasks,
    summary: {
      readinessPercent: checklist.readinessPercent,
      failedItems: checklist.todoCount + checklist.riskCount,
      createdDispatches: tasks.length,
    },
  });
}
