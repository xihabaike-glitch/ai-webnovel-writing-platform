import { NextResponse } from "next/server";
import { mapChapterGenerationError, mapChapterGenerationFailure } from "@/lib/ai/chapterGenerationHttp";
import { generateChapterDraft } from "@/lib/ai/chapterDraftGeneration";
import { reviewChapterDraft } from "@/lib/ai/chapterReviewGeneration";
import { generateChapterSecondPass } from "@/lib/ai/chapterSecondPassGeneration";
import { buildTaskRetryPlan, parseSecondPassRetryPayload, type TaskRetryPurpose } from "@/lib/ai/taskRetry";
import { prisma } from "@/lib/db/prisma";

interface Params {
  params: Promise<{ taskId: string }>;
}

function retryPurposeFromBody(body: unknown): TaskRetryPurpose {
  if (body && typeof body === "object" && !Array.isArray(body) && "purpose" in body) {
    const purpose = (body as { purpose?: unknown }).purpose;
    if (purpose === "archive_experience_repair") return purpose;
  }
  return "failure_retry";
}

export async function POST(request: Request, { params }: Params) {
  const { taskId } = await params;
  const requestBody = await request.json().catch(() => null);
  const purpose = retryPurposeFromBody(requestBody);
  const task = await prisma.aiTask.findUnique({
    where: { id: taskId },
  });

  if (!task) {
    const mapped = mapChapterGenerationError(new Error("Task not found"));
    return NextResponse.json(mapped.body, { status: mapped.status });
  }

  const retryPlan = buildTaskRetryPlan(task, { purpose });
  if (!task.chapterId) {
    const mapped = mapChapterGenerationError(new Error("Chapter not found"));
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
  if (!retryPlan.supported) {
    return NextResponse.json({ error: retryPlan.reason }, { status: 400 });
  }

  try {
    if (task.taskType === "chapter_draft") {
      const result = await generateChapterDraft({ chapterId: task.chapterId });
      if ("error" in result) {
        const mapped = mapChapterGenerationFailure(result);
        return NextResponse.json(mapped.body, { status: mapped.status });
      }
      return NextResponse.json({
        task: result.task,
        chapter: result.chapter,
        content: result.content,
        retryOfTaskId: task.id,
      });
    }

    if (task.taskType === "chapter_review") {
      const result = await reviewChapterDraft(task.chapterId);
      if ("error" in result) {
        const mapped = mapChapterGenerationFailure(result);
        return NextResponse.json(mapped.body, { status: mapped.status });
      }
      return NextResponse.json({
        task: result.task,
        result: result.result,
        retryOfTaskId: task.id,
      });
    }

    const payload = parseSecondPassRetryPayload(task.inputSnapshot);
    if (!payload) {
      return NextResponse.json({ error: "旧二改任务缺少作者指令，无法一键重试。" }, { status: 400 });
    }
    const result = await generateChapterSecondPass({
      chapterId: task.chapterId,
      instruction: payload.instruction,
      mode: payload.mode,
      targetWords: payload.targetWords,
    });
    if ("error" in result) {
      const mapped = mapChapterGenerationFailure(result);
      return NextResponse.json(mapped.body, { status: mapped.status });
    }
    return NextResponse.json({
      task: result.task,
      chapter: result.chapter,
      content: result.content,
      activeProvider: result.activeProvider,
      retryOfTaskId: task.id,
    });
  } catch (caught) {
    const mapped = mapChapterGenerationError(caught, "Task retry failed");
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
