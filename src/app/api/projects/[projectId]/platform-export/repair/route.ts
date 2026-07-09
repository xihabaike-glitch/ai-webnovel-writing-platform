import { NextResponse } from "next/server";
import { buildBatchRunGuard } from "@/lib/ai/batchRunGuard";
import { ChapterGenerationFailureError, mapBatchChapterGenerationError, mapChapterGenerationError } from "@/lib/ai/chapterGenerationHttp";
import { reviewChapterDraft } from "@/lib/ai/chapterReviewGeneration";
import { generateChapterSecondPass } from "@/lib/ai/chapterSecondPassGeneration";
import { isChapterRevisionCandidate } from "@/lib/chapters/revisions";
import { prisma } from "@/lib/db/prisma";
import { getActiveModelProvider } from "@/lib/model-gateway/activeProvider";
import {
  buildPublishRepairTaskSnapshot,
  buildPublishRepairSecondPassInstruction,
  canExecutePublishRepairAction,
} from "@/lib/projects/publishRepairActionExecution";
import { countWords } from "@/lib/text/wordCount";
import {
  buildPublishRepairNextAction,
  normalizeRunResult,
  type RawPublishRepairRunResult,
} from "@/lib/projects/publishRepairRunResults";
import type { PublishRepairAction, PublishRepairActionKind } from "@/lib/projects/platformPublishExport";

interface Params {
  params: Promise<{ projectId: string }>;
}

interface RepairBody {
  kind?: PublishRepairActionKind;
  chapterId?: string;
  chapterTitle?: string;
  candidateRevisionId?: string;
  detail?: string;
  actions?: RepairBody[];
}

function actionFromBody(body: RepairBody): PublishRepairAction {
  const label = body.kind === "adopt_candidate"
    ? "采纳候选稿"
    : body.kind === "run_second_pass"
      ? "执行二改"
      : "补章节审稿";
  return {
    id: `${body.chapterId ?? "project"}-${body.kind ?? "unknown"}`,
    kind: body.kind ?? "open_submission_package",
    priority: "high",
    label,
    detail: body.detail?.trim() || "根据发布前质检结果修复。",
    chapterId: body.chapterId,
    chapterTitle: body.chapterTitle,
    candidateRevisionId: body.candidateRevisionId,
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

async function runPublishRepairAction(projectId: string, action: PublishRepairAction): Promise<RawPublishRepairRunResult> {
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

  if (action.kind === "adopt_candidate") {
    const revision = action.candidateRevisionId
      ? await prisma.chapterRevision.findFirst({
        where: {
          id: action.candidateRevisionId,
          chapterId: chapter.id,
        },
      })
      : null;

    if (!revision) {
      return {
        action: action.kind,
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        status: "failed",
        error: "Revision not found in chapter",
      };
    }

    if (!isChapterRevisionCandidate(revision.source)) {
      return {
        action: action.kind,
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        status: "failed",
        error: "Only AI candidate revisions can be adopted.",
      };
    }

    const sourceTask = revision.sourceTaskId
      ? await prisma.aiTask.findUnique({
        where: { id: revision.sourceTaskId },
        select: { providerConfigId: true, model: true },
      })
      : null;
    const fallbackProvider = sourceTask ? null : await getActiveModelProvider();
    const providerConfigId = sourceTask?.providerConfigId ?? fallbackProvider?.provider.id;
    const model = sourceTask?.model ?? fallbackProvider?.provider.defaultModel;
    if (!providerConfigId || !model) {
      return {
        action: action.kind,
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        status: "failed",
        error: "No active model provider available for adoption record.",
      };
    }

    const fullChapter = await prisma.chapter.findFirst({
      where: {
        id: chapter.id,
        projectId,
      },
    });
    if (!fullChapter) {
      return {
        action: action.kind,
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        status: "failed",
        error: "Chapter not found in project",
      };
    }

    const adoptedWordCount = countWords(revision.content);
    const adoptionTask = await prisma.$transaction(async (tx) => {
      await tx.chapterRevision.create({
        data: {
          chapterId: fullChapter.id,
          source: "adopt_candidate_before_overwrite",
          sourceTaskId: revision.sourceTaskId,
          title: fullChapter.title,
          content: fullChapter.content,
          wordCount: fullChapter.wordCount,
          goal: fullChapter.goal,
          hook: fullChapter.hook,
          conflict: fullChapter.conflict,
          valueShift: fullChapter.valueShift,
          cliffhanger: fullChapter.cliffhanger,
          status: fullChapter.status,
          notes: `发布修复采纳候选稿 ${revision.id} 前自动保存。`,
        },
      });

      await tx.chapter.update({
        where: { id: fullChapter.id },
        data: {
          title: revision.title,
          content: revision.content,
          wordCount: adoptedWordCount,
          goal: revision.goal,
          hook: revision.hook,
          conflict: revision.conflict,
          valueShift: revision.valueShift,
          cliffhanger: revision.cliffhanger,
          status: revision.status,
        },
      });

      const task = await tx.aiTask.create({
        data: {
          projectId,
          chapterId: fullChapter.id,
          taskType: "chapter_adopt_candidate",
          providerConfigId,
          model,
          status: "succeeded",
          inputSnapshot: buildPublishRepairTaskSnapshot({
            ...action,
            chapterTitle: action.chapterTitle ?? fullChapter.title,
          }, JSON.stringify({
            chapterId: fullChapter.id,
            revisionId: revision.id,
            revisionSource: revision.source,
            sourceTaskId: revision.sourceTaskId,
            previousWordCount: fullChapter.wordCount,
            adoptedWordCount,
          })),
          outputText: JSON.stringify({
            adopted: true,
            nextAction: "chapter_review",
            message: "候选稿已采纳，正文发生变化。下一步应重新审稿，再决定二改或发布质检。",
          }),
        },
      });

      const chapters = await tx.chapter.findMany({
        where: { projectId },
        select: { wordCount: true },
      });
      await tx.project.update({
        where: { id: projectId },
        data: {
          currentWordCount: chapters.reduce((sum, item) => sum + item.wordCount, 0),
        },
      });

      return task;
    });

    return {
      action: action.kind,
      chapterId: chapter.id,
      chapterTitle: revision.title || chapter.title,
      status: "succeeded",
      message: "已采纳候选稿，下一步请重新审稿。",
      taskId: adoptionTask.id,
      wordCount: adoptedWordCount,
      candidateRevisionId: revision.id,
    };
  }

  if (action.kind === "run_chapter_review") {
    const review = await reviewChapterDraft(chapter.id);
    const markedTask = await markPublishRepairTask(review.task, {
      ...action,
      chapterTitle: action.chapterTitle ?? chapter.title,
    });
    if ("error" in review) {
      throw new ChapterGenerationFailureError({ ...review, task: markedTask });
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
      shouldSecondPass: review.result.score < 85 || review.result.issues.length > 0,
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
      throw new ChapterGenerationFailureError({ ...secondPass, task: markedTask });
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
      candidateRevisionId: secondPass.candidateRevision.id,
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

  const modelActions = actions.filter((action) => action.kind === "run_chapter_review" || action.kind === "run_second_pass");
  if (isBatch && modelActions.length > 0) {
    const guard = buildBatchRunGuard({
      action: modelActions.some((action) => action.kind === "run_second_pass") ? "second_pass" : "review",
      batchSize: modelActions.length,
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
    try {
      results.push(await runPublishRepairAction(projectId, action));
    } catch (error) {
      if (isBatch) {
        const mapped = mapBatchChapterGenerationError(error, {
          chapterId: action.chapterId ?? "",
          requestedCount: actions.length,
          completedResults: results,
        });
        return NextResponse.json(mapped.body, { status: mapped.status });
      }
      const mapped = mapChapterGenerationError(error, "Publish repair generation failed");
      return NextResponse.json({ ...mapped.body, action: action.kind, chapterId: action.chapterId ?? null }, { status: mapped.status });
    }
  }

  const failed = results.filter((result) => result.status === "failed");
  const nextAction = buildPublishRepairNextAction(results.map(normalizeRunResult), projectId);
  if (!isBatch && failed.length) {
    return NextResponse.json({
      ...failed[0],
      nextAction,
    }, { status: failed[0].error === "Chapter not found in project" ? 404 : 500 });
  }
  if (!isBatch) {
    return NextResponse.json({
      message: nextAction
        ? `${results[0].message ?? "修复动作已完成。"} 下一步：${nextAction.label}。`
        : results[0].message ?? "修复动作已完成。",
      result: results[0],
      results,
      nextAction,
    });
  }

  return NextResponse.json({
    message: failed.length
      ? `已执行 ${results.length} 个修复动作，其中 ${failed.length} 个失败。${nextAction ? ` 下一步：${nextAction.label}。` : ""}`
      : `已执行 ${results.length} 个修复动作。${nextAction ? ` 下一步：${nextAction.label}。` : ""}`,
    results,
    nextAction,
  });
}
