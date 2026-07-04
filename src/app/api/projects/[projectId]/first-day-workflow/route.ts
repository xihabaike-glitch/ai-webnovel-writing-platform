import { NextResponse } from "next/server";
import { generateChapterDraft } from "@/lib/ai/chapterDraftGeneration";
import { generateChapterSecondPass } from "@/lib/ai/chapterSecondPassGeneration";
import { reviewChapterDraft } from "@/lib/ai/chapterReviewGeneration";
import { prisma } from "@/lib/db/prisma";
import { buildFirstDayExecutionRouteBlockMessage, buildFirstDayExecutionRouteStatus } from "@/lib/model-gateway/firstDayExecutionRoute";
import { getPlatformProfile, type PlatformId } from "@/lib/platforms/platformProfiles";
import { buildFirstDayDispatchItem, buildFirstDayModelExecutionPlan, buildFirstDayWorkflow } from "@/lib/projects/firstDayWorkflow";
import { generateControlAssets, type ControlAssetAreaId } from "@/lib/projects/controlAssetGeneration";
import { buildSubmissionChecklist } from "@/lib/projects/submissionChecklist";

interface Params {
  params: Promise<{ projectId: string }>;
}

async function buildWorkflowPayload(projectId: string) {
  const [project, providers, routes] = await Promise.all([
    prisma.project.findUnique({
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
    }),
    prisma.modelProvider.findMany({
      orderBy: { updatedAt: "desc" },
    }),
    prisma.modelTaskRoute.findMany({
      orderBy: { taskType: "asc" },
    }),
  ]);

  if (!project) {
    return null;
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
  const executionPlan = buildFirstDayModelExecutionPlan(workflow);

  return {
    workflow,
    executionPlan,
    modelRoute: buildFirstDayExecutionRouteStatus({
      taskType: executionPlan.taskType ?? null,
      providers,
      routes,
    }),
    dispatch: buildFirstDayDispatchItem({
      project: workflowProject,
      platform,
      workflow,
    }),
  };
}

export async function GET(_request: Request, { params }: Params) {
  const { projectId } = await params;
  const payload = await buildWorkflowPayload(projectId);

  if (!payload) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json(payload);
}

export async function POST(_request: Request, { params }: Params) {
  const { projectId } = await params;
  const payload = await buildWorkflowPayload(projectId);

  if (!payload) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const executionPlan = payload.executionPlan;
  if (!executionPlan.executable) {
    return NextResponse.json({
      workflow: payload.workflow,
      dispatch: payload.dispatch,
      executionPlan,
      modelRoute: payload.modelRoute,
      error: executionPlan.blockedReason ?? "当前首日节点暂不支持自动执行。",
    }, { status: 400 });
  }

  const routeBlockMessage = buildFirstDayExecutionRouteBlockMessage(payload.modelRoute);
  if (routeBlockMessage) {
    return NextResponse.json({
      workflow: payload.workflow,
      dispatch: payload.dispatch,
      executionPlan,
      modelRoute: payload.modelRoute,
      error: routeBlockMessage,
    }, { status: 400 });
  }

  try {
    let result: unknown;
    if (executionPlan.actionKind === "chapter_draft") {
      result = await generateChapterDraft({
        chapterId: executionPlan.chapterId ?? "",
        targetWords: 1200,
      });
    } else if (executionPlan.actionKind === "chapter_review") {
      result = await reviewChapterDraft(executionPlan.chapterId ?? "");
    } else if (executionPlan.actionKind === "chapter_second_pass") {
      result = await generateChapterSecondPass({
        chapterId: executionPlan.chapterId ?? "",
        instruction: payload.workflow.executionPackage.handoffNote,
        mode: "platform_fit",
      });
    } else if (executionPlan.actionKind === "control_assets") {
      const areaIds = executionPlan.controlAreaIds ?? [];
      result = await Promise.all(areaIds.map((areaId) => generateControlAssets(projectId, areaId as ControlAssetAreaId)));
    }

    const refreshed = await buildWorkflowPayload(projectId);
    return NextResponse.json({
      ...(refreshed ?? payload),
      executionPlan,
      result,
      completionEvidence: executionPlan.completionEvidence,
    });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "首日 AI 执行失败。";
    return NextResponse.json({
      workflow: payload.workflow,
      dispatch: payload.dispatch,
      executionPlan,
      modelRoute: payload.modelRoute,
      error: message,
    }, { status: message === "Chapter not found" ? 404 : 500 });
  }
}
