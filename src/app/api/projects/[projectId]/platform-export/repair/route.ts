import { NextResponse } from "next/server";
import { buildBatchRunGuard } from "@/lib/ai/batchRunGuard";
import { reviewChapterDraft } from "@/lib/ai/chapterReviewGeneration";
import { generateChapterSecondPass } from "@/lib/ai/chapterSecondPassGeneration";
import { prisma } from "@/lib/db/prisma";
import {
  buildPublishRepairTaskSnapshot,
  buildPublishRepairSecondPassInstruction,
  canExecutePublishRepairAction,
} from "@/lib/projects/publishRepairActionExecution";
import type { PublishRepairAction, PublishRepairActionKind } from "@/lib/projects/platformPublishExport";

interface Params {
  params: Promise<{ projectId: string }>;
}

interface RepairBody {
  kind?: PublishRepairActionKind;
  chapterId?: string;
  chapterTitle?: string;
  detail?: string;
  actions?: RepairBody[];
}

function actionFromBody(body: RepairBody): PublishRepairAction {
  return {
    id: `${body.chapterId ?? "project"}-${body.kind ?? "unknown"}`,
    kind: body.kind ?? "open_submission_package",
    priority: "high",
    label: body.kind === "run_second_pass" ? "执行二改" : "补章节审稿",
    detail: body.detail?.trim() || "根据发布前质检结果修复。",
    chapterId: body.chapterId,
    chapterTitle: body.chapterTitle,
  };
}

async function markPublishRepairTask(task: { id: string; inputSnapshot: string }, action: PublishRepairAction) {
  return prisma.aiTask.update({
    where: { id: task.id },
    data: {
      inputSnapshot: buildPublishRepairTaskSnapshot(action, task.inputSnapshot),
    },
  });
}

function normalizeBatchActions(body: RepairBody) {
  if (Array.isArray(body.actions)) return body.actions.slice(0, 5).map(actionFromBody);
  return [actionFromBody(body)];
}

async function runPublishRepairAction(projectId: string, action: PublishRepairAction) {
  if (!canExecutePublishRepairAction(action)) {
    return {
      action: action.kind,
      chapterId: action.chapterId ?? null,
      chapterTitle: action.chapterTitle ?? "项目资料",
      status: "failed",
      error: "该修复动作需要人工处理或跳转处理。",
    };
  }

  const chapter = await prisma.chapter.findFirst({
    where: {
      id: action.chapterId,
      projectId,
    },
    select: {
      id: true,
      title: true,
      wordCount: true,
    },
  });

  if (!chapter) {
    return {
      action: action.kind,
      chapterId: action.chapterId ?? null,
      chapterTitle: action.chapterTitle ?? "未知章节",
      status: "failed",
      error: "Chapter not found in project",
    };
  }

  if (action.kind === "run_chapter_review") {
    const review = await reviewChapterDraft(chapter.id);
    const markedTask = await markPublishRepairTask(review.task, {
      ...action,
      chapterTitle: action.chapterTitle ?? chapter.title,
    });
    if ("error" in review) {
      return {
        action: action.kind,
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        status: "failed",
        taskId: markedTask.id,
        score: null,
        error: review.error,
      };
    }

    return {
      action: action.kind,
      chapterId: chapter.id,
      chapterTitle: chapter.title,
      status: "succeeded",
      message: "已完成章节审稿。",
      taskId: markedTask.id,
      score: review.result.score,
      issueCount: review.result.issues.length,
    };
  }

  if (action.kind === "run_second_pass") {
    const secondPass = await generateChapterSecondPass({
      chapterId: chapter.id,
      instruction: buildPublishRepairSecondPassInstruction({
        chapterTitle: action.chapterTitle ?? chapter.title,
        detail: action.detail,
      }),
      mode: "platform_fit",
      targetWords: Math.max(1200, chapter.wordCount),
    });

    const markedTask = await markPublishRepairTask(secondPass.task, {
      ...action,
      chapterTitle: action.chapterTitle ?? chapter.title,
    });
    if ("error" in secondPass) {
      return {
        action: action.kind,
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        status: "failed",
        taskId: markedTask.id,
        score: null,
        error: secondPass.error,
      };
    }

    return {
      action: action.kind,
      chapterId: chapter.id,
      chapterTitle: chapter.title,
      status: "succeeded",
      message: `已完成二改，复检 ${secondPass.secondPassAudit.score} 分。`,
      taskId: markedTask.id,
      score: secondPass.secondPassAudit.score,
      shouldSecondPass: secondPass.secondPassAudit.shouldSecondPass,
      issueCount: secondPass.secondPassAudit.issues.length,
      wordCount: secondPass.chapter.wordCount,
    };
  }

  return {
    action: action.kind,
    chapterId: action.chapterId ?? null,
    chapterTitle: action.chapterTitle ?? "项目资料",
    status: "failed",
    error: "Unsupported repair action",
  };
}

export async function POST(request: Request, { params }: Params) {
  const { projectId } = await params;
  const body = (await request.json().catch(() => ({}))) as RepairBody;
  const isBatch = Array.isArray(body.actions);
  const actions = normalizeBatchActions(body);

  if (actions.length === 0) {
    return NextResponse.json({ error: "没有可执行的修复动作。" }, { status: 400 });
  }

  if (isBatch && Array.isArray(body.actions) && body.actions.length > 5) {
    return NextResponse.json({ error: "一次最多执行 5 个发布修复动作。" }, { status: 400 });
  }

  if (actions.some((action) => !canExecutePublishRepairAction(action))) {
    return NextResponse.json(
      {
        error: isBatch
          ? "批量修复只能包含可自动执行的章节审稿或二改动作。"
          : "该修复动作需要人工处理或跳转处理。",
      },
      { status: 400 },
    );
  }

  if (isBatch) {
    const guard = buildBatchRunGuard({
      action: actions.some((action) => action.kind === "run_second_pass") ? "second_pass" : "review",
      batchSize: actions.length,
      tasks: await prisma.aiTask.findMany({
        select: {
          status: true,
          inputTokens: true,
          outputTokens: true,
          costUsd: true,
        },
        take: 500,
        orderBy: { createdAt: "desc" },
      }),
    });
    if (!guard.allowed) {
      return NextResponse.json({ error: guard.summary, guard }, { status: 429 });
    }
  }

  const results = [];
  for (const action of actions) {
    results.push(await runPublishRepairAction(projectId, action));
  }

  const failed = results.filter((result) => result.status === "failed");
  if (!isBatch && failed.length) {
    return NextResponse.json(failed[0], { status: failed[0].error === "Chapter not found in project" ? 404 : 500 });
  }
  if (!isBatch) {
    return NextResponse.json({
      message: results[0].message ?? "修复动作已完成。",
      result: results[0],
      results,
    });
  }

  return NextResponse.json({
    message: failed.length
      ? `已执行 ${results.length} 个修复动作，其中 ${failed.length} 个失败。`
      : `已执行 ${results.length} 个修复动作。`,
    results,
  });
}
