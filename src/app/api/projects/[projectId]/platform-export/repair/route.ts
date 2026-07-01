import { NextResponse } from "next/server";
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

export async function POST(request: Request, { params }: Params) {
  const { projectId } = await params;
  const body = (await request.json().catch(() => ({}))) as RepairBody;
  const action = actionFromBody(body);

  if (!canExecutePublishRepairAction(action)) {
    return NextResponse.json({ error: "该修复动作需要人工处理或跳转处理。" }, { status: 400 });
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
    return NextResponse.json({ error: "Chapter not found in project" }, { status: 404 });
  }

  if (action.kind === "run_chapter_review") {
    const review = await reviewChapterDraft(chapter.id);
    const markedTask = await markPublishRepairTask(review.task, {
      ...action,
      chapterTitle: action.chapterTitle ?? chapter.title,
    });
    if ("error" in review) {
      return NextResponse.json({ action: action.kind, task: markedTask, error: review.error }, { status: 500 });
    }

    return NextResponse.json({
      action: action.kind,
      message: "已完成章节审稿。",
      task: markedTask,
      result: review.result,
    });
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
      return NextResponse.json({ action: action.kind, task: markedTask, error: secondPass.error }, { status: 500 });
    }

    return NextResponse.json({
      action: action.kind,
      message: `已完成二改，复检 ${secondPass.secondPassAudit.score} 分。`,
      task: markedTask,
      chapter: secondPass.chapter,
      secondPassAudit: secondPass.secondPassAudit,
    });
  }

  return NextResponse.json({ error: "Unsupported repair action" }, { status: 400 });
}
