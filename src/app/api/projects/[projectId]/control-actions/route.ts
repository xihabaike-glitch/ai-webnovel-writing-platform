import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { buildBatchDraftQueue } from "@/lib/ai/batchDrafts";
import { getPlatformProfile, type PlatformId } from "@/lib/platforms/platformProfiles";
import { generateControlAssets, type ControlAssetAreaId } from "@/lib/projects/controlAssetGeneration";
import {
  buildAiPipelineControlActionPlan,
  buildAiPipelineRecheckDispatchPlan,
  buildChapterCardActionSeeds,
  buildChapterCardDraftHandoff,
  buildCharacterActionSeeds,
  buildOutlineActionSeeds,
  buildStoryLineActionSeeds,
  buildWorldActionSeeds,
  recheckAiPipelineControlPlan,
  updateAiPipelineControlPlanItem,
} from "@/lib/projects/controlActionSeeds";
import { buildTaskQueueBatchHealthReview } from "@/lib/projects/taskQueueBatchHealth";

interface Params {
  params: Promise<{ projectId: string }>;
}

interface ControlActionBody {
  areaId?: string;
  mode?: "seed" | "ai";
  receiptId?: string;
  itemId?: string;
  completed?: boolean;
  recheck?: boolean;
  memoryAction?: "confirm" | "rollback" | "clear";
  memorySource?: {
    kind?: string;
    chapterId?: string;
    chapterTitle?: string;
    label?: string;
    detail?: string;
    sourceLabel?: string | null;
    evidence?: string[];
  };
}

function result(areaId: string, targetAnchor: string, created: string[], skipped?: string) {
  return {
    areaId,
    targetAnchor,
    created,
    skipped,
    message: created.length
      ? `已创建 ${created.length} 项：${created.join("、")}。`
      : skipped ?? "没有需要自动创建的基础项。",
  };
}

function memorySourceDetail(source: ControlActionBody["memorySource"]) {
  if (source?.kind !== "chapter_workflow_diagnostic") return null;
  const chapterTitle = typeof source.chapterTitle === "string" && source.chapterTitle.trim()
    ? source.chapterTitle.trim()
    : "当前章节";
  const detail = typeof source.detail === "string" && source.detail.trim() ? source.detail.trim() : null;
  const evidence = Array.isArray(source.evidence)
    ? source.evidence.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim())
    : [];
  return [
    `章节诊断触发：${chapterTitle}`,
    detail,
    evidence.length ? `证据：${evidence.slice(0, 3).join(" / ")}` : null,
  ].filter(Boolean).join("；");
}

export async function POST(request: Request, { params }: Params) {
  const { projectId } = await params;
  const body = (await request.json().catch(() => ({}))) as ControlActionBody;
  const areaId = body.areaId?.trim();
  const mode = body.mode ?? "seed";

  if (!areaId) {
    return NextResponse.json({ error: "缺少动作类型。" }, { status: 400 });
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      chapters: { orderBy: { order: "asc" } },
      outlineNodes: { orderBy: [{ depth: "asc" }, { order: "asc" }, { createdAt: "asc" }] },
      characters: { orderBy: { createdAt: "asc" } },
      worldEntries: { orderBy: [{ type: "asc" }, { createdAt: "asc" }] },
      foreshadows: { orderBy: { createdAt: "asc" } },
      plotThreads: { orderBy: { createdAt: "asc" } },
      gateActionAudits: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (mode === "ai") {
    if (areaId === "characters" || areaId === "world" || areaId === "story-lines") {
      const generated = await generateControlAssets(projectId, areaId as ControlAssetAreaId);
      if ("error" in generated) {
        return NextResponse.json(generated, { status: generated.qualityGate?.status === "fail" ? 422 : 500 });
      }
      return NextResponse.json({
        ...generated,
        targetAnchor: areaId === "characters" ? "character-arc" : areaId === "world" ? "world-bible" : "story-lines",
      });
    }
    return NextResponse.json({ error: "该模块暂不支持 AI 生成，请先使用结构草稿。" }, { status: 400 });
  }

  const platform = getPlatformProfile(project.targetPlatform as PlatformId);

  const memoryAction = body.memoryAction === "confirm" || body.memoryAction === "rollback" || body.memoryAction === "clear"
    ? body.memoryAction
    : null;
  if (areaId === "ai-pipeline" && memoryAction) {
    const action = memoryAction;
    const sourceDetail = memorySourceDetail(body.memorySource);
    const receiptId = `ai-pipeline-memory:${action}:${projectId}:${Date.now()}`;
    const label = action === "clear"
      ? "AI 恢复记忆已清除"
      : action === "rollback"
        ? "AI 恢复记忆回滚小样本"
        : "AI 恢复记忆已确认";
    const baseDetail = action === "clear"
      ? "旧恢复证据已过期，停止带入提示词。"
      : action === "rollback"
        ? "读感或数据不稳，先回滚到 1 章复验。"
        : "人工确认继续使用恢复记忆，并保持小批观察。";
    const detail = sourceDetail ? `${baseDetail} ${sourceDetail}` : baseDetail;
    const message = action === "clear"
      ? "旧恢复记忆已清除，后续提示词不再携带这条证据。"
      : action === "rollback"
        ? "已把恢复记忆回滚到 1 章复验。"
        : "已确认继续使用恢复记忆，后续仍按小批观察。";

    await prisma.gateActionAudit.create({
      data: {
        receiptId,
        actionId: `ai-pipeline-memory:${projectId}`,
        projectId,
        platformId: platform.id,
        platformName: platform.name,
        label,
        detail,
        href: `/projects/${projectId}#ai-pipeline`,
        status: "succeeded",
        message,
        executionType: "control_action",
        succeededCount: 1,
        failedCount: 0,
        taskId: null,
        recheckStatus: action === "rollback" ? "needs_action" : action === "clear" ? "cleared" : "ready",
        recheckLabel: action === "rollback" ? "回滚小样本" : action === "clear" ? "已清除" : "继续生效",
        recheckDetail: detail,
        recheckAction: action === "rollback" ? "跑 1 章复验" : action === "clear" ? "等待新复检" : "继续小批观察",
        payload: JSON.stringify({
          aiPipelinePromptMemoryControl: {
            action,
            label: sourceDetail && action === "rollback" ? "章节诊断回滚" : action === "rollback" ? "人工回滚" : action === "clear" ? "清除旧记忆" : "人工确认",
            detail,
            source: body.memorySource?.kind === "chapter_workflow_diagnostic" ? {
              kind: "chapter_workflow_diagnostic",
              chapterId: body.memorySource.chapterId,
              chapterTitle: body.memorySource.chapterTitle,
              label: body.memorySource.label,
              detail: body.memorySource.detail,
              sourceLabel: body.memorySource.sourceLabel ?? null,
              evidence: Array.isArray(body.memorySource.evidence) ? body.memorySource.evidence : [],
            } : undefined,
          },
        }),
      },
    });

    return NextResponse.json({
      areaId,
      targetAnchor: "ai-pipeline",
      memoryAction: action,
      message,
    });
  }

  if (areaId === "ai-pipeline" && body.receiptId && body.recheck === true) {
    const audit = project.gateActionAudits.find((item) => (
      item.receiptId === body.receiptId
      && item.executionType === "control_action"
      && item.actionId.startsWith("ai-pipeline-control:")
    ));
    if (!audit) {
      return NextResponse.json({ error: "没有找到这张批量修复清单。" }, { status: 404 });
    }
    const health = buildTaskQueueBatchHealthReview(project.gateActionAudits, 5);
    const primary = health.items[0] ?? null;
    const healthStatus = primary?.status ?? "watch";
    const recheckStatus = healthStatus === "usable" ? "small_batch_ready" : "sample_required";
    const healthLabel = primary?.label ?? "缺样本";
    const healthDetail = primary?.nextAction ?? "还没有新的批量样本，先跑 1 章小样本复验。";
    const dispatchPlan = buildAiPipelineRecheckDispatchPlan({
      projectId,
      receiptId: audit.receiptId,
      recheckStatus,
      healthLabel,
      healthDetail,
    });
    const rechecked = recheckAiPipelineControlPlan(audit.payload, {
      status: healthStatus,
      label: healthLabel,
      detail: healthDetail,
    }, {
      dispatchKey: dispatchPlan.dispatchKey,
      dispatchTitle: dispatchPlan.title,
    });
    if (!rechecked) {
      return NextResponse.json({ error: "清单还没全部完成，先别急着复检。" }, { status: 400 });
    }
    await prisma.gateDispatchTask.upsert({
      where: { dispatchKey: dispatchPlan.dispatchKey },
      create: {
        dispatchKey: dispatchPlan.dispatchKey,
        projectId,
        platformId: dispatchPlan.platformId,
        platformName: dispatchPlan.platformName,
        stage: dispatchPlan.stage,
        state: dispatchPlan.state,
        priorityScore: dispatchPlan.priorityScore,
        ownerRole: dispatchPlan.ownerRole,
        title: dispatchPlan.title,
        detail: dispatchPlan.detail,
        dueLabel: dispatchPlan.dueLabel,
        actionLabel: dispatchPlan.actionLabel,
        href: dispatchPlan.href,
        acceptanceCriteria: JSON.stringify(dispatchPlan.acceptanceCriteria),
        evidence: JSON.stringify(dispatchPlan.evidence),
        sourceReceiptId: dispatchPlan.sourceReceiptId,
        completionEvidence: dispatchPlan.completionEvidence,
        reviewLatestAt: new Date(dispatchPlan.reviewLatestAt),
      },
      update: {
        projectId,
        platformId: dispatchPlan.platformId,
        platformName: dispatchPlan.platformName,
        stage: dispatchPlan.stage,
        state: dispatchPlan.state,
        priorityScore: dispatchPlan.priorityScore,
        ownerRole: dispatchPlan.ownerRole,
        title: dispatchPlan.title,
        detail: dispatchPlan.detail,
        dueLabel: dispatchPlan.dueLabel,
        actionLabel: dispatchPlan.actionLabel,
        href: dispatchPlan.href,
        acceptanceCriteria: JSON.stringify(dispatchPlan.acceptanceCriteria),
        evidence: JSON.stringify(dispatchPlan.evidence),
        sourceReceiptId: dispatchPlan.sourceReceiptId,
        completionEvidence: dispatchPlan.completionEvidence,
        reviewLatestAt: new Date(dispatchPlan.reviewLatestAt),
      },
    });
    await prisma.gateActionAudit.update({
      where: { receiptId: audit.receiptId },
      data: {
        payload: rechecked.payload,
        message: rechecked.message,
        recheckStatus: rechecked.status === "small_batch_ready" ? "ready" : "needs_action",
        recheckLabel: rechecked.status === "small_batch_ready" ? "可恢复小批" : "先跑小样本",
        recheckDetail: rechecked.message,
        recheckAction: rechecked.status === "small_batch_ready" ? "回到批量生产" : "跑小样本复验",
      },
    });

    return NextResponse.json({
      areaId,
      targetAnchor: "ai-pipeline",
      message: rechecked.message,
      recheckStatus: rechecked.status,
      dispatchKey: dispatchPlan.dispatchKey,
      dispatchTitle: dispatchPlan.title,
    });
  }

  if (areaId === "ai-pipeline" && body.receiptId && body.itemId && typeof body.completed === "boolean") {
    const audit = project.gateActionAudits.find((item) => (
      item.receiptId === body.receiptId
      && item.executionType === "control_action"
      && item.actionId.startsWith("ai-pipeline-control:")
    ));
    if (!audit) {
      return NextResponse.json({ error: "没有找到这张批量修复清单。" }, { status: 404 });
    }
    const updated = updateAiPipelineControlPlanItem(audit.payload, body.itemId, body.completed);
    if (!updated) {
      return NextResponse.json({ error: "清单项不存在或清单数据已损坏。" }, { status: 400 });
    }
    await prisma.gateActionAudit.update({
      where: { receiptId: audit.receiptId },
      data: {
        payload: updated.payload,
        recheckStatus: updated.completedCount === updated.totalCount ? "ready" : "needs_action",
        recheckLabel: updated.completedCount === updated.totalCount ? "可以复检" : "继续处理清单",
        recheckDetail: updated.completedCount === updated.totalCount
          ? "批量修复清单已全部完成，下一步复检批量健康。"
          : `批量修复清单完成 ${updated.completedCount}/${updated.totalCount}，还有动作没处理。`,
        recheckAction: updated.completedCount === updated.totalCount ? "复检批量健康" : "继续修清单",
      },
    });

    return NextResponse.json({
      areaId,
      targetAnchor: "ai-pipeline",
      message: `${body.completed ? "已完成" : "已改回待处理"}：${updated.itemLabel}。`,
      completedCount: updated.completedCount,
      totalCount: updated.totalCount,
    });
  }

  if (areaId === "outline") {
    const seeds = buildOutlineActionSeeds(project, platform, project.outlineNodes);
    if (seeds.length === 0) {
      return NextResponse.json(result(areaId, "outline-tree", [], "大纲骨架已经有基础结构，下一步适合人工细化具体章节。"));
    }

    await prisma.$transaction(seeds.map((seed) => (
      prisma.outlineNode.create({
        data: {
          ...seed,
          projectId,
        },
      })
    )));

    return NextResponse.json(result(areaId, "outline-tree", seeds.map((seed) => seed.title)));
  }

  if (areaId === "characters") {
    const seeds = buildCharacterActionSeeds(project, project.characters);
    if (seeds.length === 0) {
      return NextResponse.json(result(areaId, "character-arc", [], "人物卡已经具备基础数量，下一步适合补具体弧光细节。"));
    }

    await prisma.$transaction(seeds.map((seed) => (
      prisma.character.create({
        data: {
          projectId,
          ...seed,
        },
      })
    )));

    return NextResponse.json(result(areaId, "character-arc", seeds.map((seed) => seed.name)));
  }

  if (areaId === "world") {
    const seeds = buildWorldActionSeeds(project, platform, project.worldEntries);
    if (seeds.length === 0) {
      return NextResponse.json(result(areaId, "world-bible", [], "世界观三类基础设定已经存在，下一步适合补限制和剧情用途。"));
    }

    await prisma.$transaction(seeds.map((seed) => (
      prisma.worldEntry.create({
        data: {
          projectId,
          ...seed,
        },
      })
    )));

    return NextResponse.json(result(areaId, "world-bible", seeds.map((seed) => seed.title)));
  }

  if (areaId === "story-lines") {
    const seeds = buildStoryLineActionSeeds(
      project,
      project.chapters,
      project.characters,
      project.foreshadows,
      project.plotThreads,
    );
    const created: string[] = [];

    await prisma.$transaction(async (tx) => {
      for (const seed of seeds.plotThreads) {
        await tx.plotThread.create({
          data: {
            projectId,
            ...seed,
          },
        });
        created.push(seed.title);
      }
      for (const seed of seeds.foreshadows) {
        await tx.foreshadow.create({
          data: {
            projectId,
            title: seed.title,
            setupChapterId: seed.setupChapterId,
            payoffChapterId: seed.payoffChapterId,
            relatedCharacterIds: JSON.stringify(seed.relatedCharacterIds),
            status: seed.status,
            notes: seed.notes,
          },
        });
        created.push(seed.title);
      }
    });

    if (created.length === 0) {
      return NextResponse.json(result(areaId, "story-lines", [], "主线和伏笔已经有基础项，下一步适合绑定章节回收点。"));
    }

    return NextResponse.json(result(areaId, "story-lines", created));
  }

  if (areaId === "production") {
    const seeds = buildChapterCardActionSeeds({
      project,
      platform,
      outlineNodes: project.outlineNodes,
      existingChapterCount: project.chapters.length,
      limit: 5,
    });

    if (seeds.length === 0) {
      return NextResponse.json(result(areaId, "chapter-production", [], "暂无可直接生成章节卡的大纲节点；先补大纲字段或新增分支/叶片。"));
    }

    const created: string[] = [];
    await prisma.$transaction(async (tx) => {
      for (const seed of seeds) {
        const chapter = await tx.chapter.create({
          data: {
            projectId,
            order: project.chapters.length + created.length + 1,
            title: seed.title,
            goal: seed.goal,
            hook: seed.hook,
            conflict: seed.conflict,
            valueShift: seed.valueShift,
            cliffhanger: seed.cliffhanger,
            status: seed.status,
          },
        });
        await tx.outlineNode.update({
          where: { id: seed.outlineNodeId },
          data: {
            chapterId: chapter.id,
            status: "chapter_card",
          },
        });
        created.push(seed.title);
      }
    });

    const [chapters, draftTasks] = await Promise.all([
      prisma.chapter.findMany({
        where: { projectId },
        orderBy: { order: "asc" },
      }),
      prisma.aiTask.findMany({
        where: {
          projectId,
          taskType: "chapter_draft",
        },
        select: {
          chapterId: true,
          status: true,
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    const draftHandoff = buildChapterCardDraftHandoff(buildBatchDraftQueue(chapters, draftTasks, platform));
    const baseResult = result(areaId, "chapter-production", created);

    return NextResponse.json({
      ...baseResult,
      draftHandoff,
    });
  }

  if (areaId === "ai-pipeline") {
    const plan = buildAiPipelineControlActionPlan(project.gateActionAudits);
    const receiptId = `ai-pipeline-control:${projectId}:${Date.now()}`;

    await prisma.gateActionAudit.create({
      data: {
        receiptId,
        actionId: `ai-pipeline-control:${projectId}`,
        projectId,
        platformId: platform.id,
        platformName: platform.name,
        label: plan.label,
        detail: plan.detail,
        href: `/projects/${projectId}#ai-pipeline`,
        status: "succeeded",
        message: plan.message,
        executionType: "control_action",
        succeededCount: plan.created.length,
        failedCount: 0,
        taskId: null,
        recheckStatus: plan.status === "repair" ? "needs_repair" : "ready",
        recheckLabel: plan.status === "repair" ? "修完再复验" : "复验后再放量",
        recheckDetail: plan.status === "repair"
          ? "批量打法已被总控标记为修复优先，先处理失败原因和质量缺口。"
          : "复验清单已生成，下一批仍按小样本执行并回填质量证据。",
        recheckAction: plan.status === "repair" ? "回到失败复盘" : "回到 AI 写审改",
        payload: JSON.stringify({ aiPipelineControlPlan: plan.payload }),
      },
    });

    return NextResponse.json({
      areaId,
      targetAnchor: plan.targetAnchor,
      created: plan.created,
      message: plan.message,
    });
  }

  return NextResponse.json({
    error: "这个动作需要进入模块选择具体章节或发布项，暂不适合自动执行。",
  }, { status: 400 });
}
