import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getPlatformProfile, type PlatformId } from "@/lib/platforms/platformProfiles";
import { buildFirstDayDispatchItem, buildFirstDayWorkflow } from "@/lib/projects/firstDayWorkflow";
import { buildSubmissionChecklist } from "@/lib/projects/submissionChecklist";

interface Params {
  params: Promise<{ projectId: string }>;
}

export async function GET(_request: Request, { params }: Params) {
  const { projectId } = await params;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      chapters: { orderBy: { order: "asc" } },
      outlineNodes: { orderBy: [{ depth: "asc" }, { order: "asc" }] },
      characters: { orderBy: { createdAt: "asc" } },
      worldEntries: { orderBy: [{ type: "asc" }, { createdAt: "asc" }] },
      aiTasks: { orderBy: { createdAt: "desc" } },
      gateDispatchTasks: {
        where: {
          dispatchKey: { startsWith: `first-day:${projectId}:` },
        },
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const platform = getPlatformProfile(project.targetPlatform as PlatformId);
  const submissionChecklist = buildSubmissionChecklist({
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

  const workflowProject = {
    id: project.id,
    title: project.title,
    currentWordCount: project.currentWordCount,
  };
  const workflow = buildFirstDayWorkflow({
    project: workflowProject,
    platform,
    chapters: project.chapters,
    outlineNodes: project.outlineNodes,
    characters: project.characters,
    worldEntries: project.worldEntries,
    aiTasks: project.aiTasks,
    dispatchTasks: project.gateDispatchTasks.map((task) => ({
      dispatchKey: task.dispatchKey,
      state: task.state,
      completionEvidence: task.completionEvidence,
    })),
    submissionChecklist,
  });

  return NextResponse.json({
    workflow,
    dispatch: buildFirstDayDispatchItem({
      project: workflowProject,
      platform,
      workflow,
    }),
  });
}
