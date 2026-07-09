import { NextResponse } from "next/server";
import { z } from "zod";
import { ChapterGenerationFailureError, mapBatchChapterGenerationError } from "@/lib/ai/chapterGenerationHttp";
import { generateChapterDraft } from "@/lib/ai/chapterDraftGeneration";
import { reviewChapterDraft } from "@/lib/ai/chapterReviewGeneration";
import { prisma } from "@/lib/db/prisma";
import {
  applyRouteAvoidanceOverrides,
  buildRouteAvoidanceGovernance,
  buildRouteAvoidanceRetestDispatch,
  buildRouteAvoidanceRulesFromDispatchTasks,
  routeAvoidanceOverrideFromRecord,
  type RouteAvoidanceOverride,
} from "@/lib/model-gateway/routeRecommendations";
import {
  buildRouteAvoidanceRetestEvidence,
  buildRouteAvoidanceRetestSamplePlan,
} from "@/lib/model-gateway/routeRetestSamples";

const runRetestSamplesSchema = z.object({
  ruleKey: z.string().min(3),
  execute: z.boolean().default(false),
});

async function loadGovernanceAndProjects() {
  const [providers, completedRouteRepairs, routeAvoidanceOverrides, projects] = await Promise.all([
    prisma.modelProvider.findMany({
      orderBy: [{ enabled: "desc" }, { updatedAt: "desc" }],
      select: {
        id: true,
        providerId: true,
        displayName: true,
        defaultModel: true,
        enabled: true,
        encryptedApiKey: true,
      },
    }),
    prisma.gateDispatchTask.findMany({
      where: {
        stage: "failure_route_repair",
        state: "completed",
      },
      orderBy: { completedAt: "desc" },
      take: 100,
      select: {
        stage: true,
        state: true,
        completionEvidence: true,
        evidence: true,
      },
    }),
    prisma.modelRouteAvoidanceOverride.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        ruleKey: true,
        action: true,
        taskType: true,
        note: true,
        expiresAt: true,
      },
    }),
    prisma.project.findMany({
      orderBy: { updatedAt: "desc" },
      take: 20,
      include: {
        chapters: { orderBy: { order: "asc" } },
        aiTasks: { orderBy: { createdAt: "desc" }, take: 200 },
      },
    }),
  ]);
  const avoidanceRules = applyRouteAvoidanceOverrides(
    buildRouteAvoidanceRulesFromDispatchTasks(completedRouteRepairs, providers),
    routeAvoidanceOverrides.map(routeAvoidanceOverrideFromRecord).filter((override): override is RouteAvoidanceOverride => Boolean(override)),
  );

  return {
    governance: buildRouteAvoidanceGovernance(avoidanceRules, providers),
    projects,
  };
}

export async function POST(request: Request) {
  const input = runRetestSamplesSchema.parse(await request.json());
  const { governance, projects } = await loadGovernanceAndProjects();
  const item = governance.retestQueue.items.find((candidate) => candidate.ruleKey === input.ruleKey);

  if (!item) {
    return NextResponse.json({ error: "没有找到可运行复测样本的避坑规则。" }, { status: 404 });
  }

  const plan = buildRouteAvoidanceRetestSamplePlan(item, projects);
  if (!plan.canRun || !plan.taskType) {
    return NextResponse.json({ error: plan.reason, plan }, { status: 400 });
  }
  if (!input.execute) {
    return NextResponse.json({ plan, results: [] });
  }

  const forcedProvider = {
    providerConfigId: plan.providerConfigId,
    providerId: plan.providerId,
    model: plan.model,
  };
  const results = [];
  for (const chapterId of plan.chapterIds) {
    try {
      if (plan.taskType === "chapter_draft") {
        const result = await generateChapterDraft({ chapterId, forcedProvider });
        if ("error" in result) throw new ChapterGenerationFailureError(result);
        results.push({
          chapterId,
          taskId: result.task.id,
          status: "succeeded",
          providerName: result.provider.displayName,
          model: result.provider.model,
          routeRole: result.attempts.find((attempt) => attempt.taskId === result.task.id)?.role ?? null,
          score: result.draftQuality.score,
          error: null,
        });
        continue;
      }

      if (plan.taskType === "chapter_review") {
        const result = await reviewChapterDraft(chapterId, { forcedProvider });
        if ("error" in result) throw new ChapterGenerationFailureError(result);
        results.push({
          chapterId,
          taskId: result.task.id,
          status: "succeeded",
          providerName: result.provider.displayName,
          model: result.provider.model,
          routeRole: result.attempts.find((attempt) => attempt.taskId === result.task.id)?.role ?? null,
          score: result.result.score,
          error: null,
        });
      }
    } catch (error) {
      const mapped = mapBatchChapterGenerationError(error, {
        chapterId,
        requestedCount: plan.chapterIds.length,
        completedResults: results,
      });
      return NextResponse.json({ ...mapped.body, plan }, { status: mapped.status });
    }
  }

  const retestEvidence = buildRouteAvoidanceRetestEvidence({
    plan: {
      providerName: item.providerName,
      model: plan.model,
      taskScope: item.taskScope,
      sampleCount: plan.sampleCount,
    },
    results,
  });
  const dispatch = buildRouteAvoidanceRetestDispatch(item);
  const now = new Date();
  const retestTask = await prisma.gateDispatchTask.upsert({
    where: { dispatchKey: dispatch.dispatchKey },
    create: {
      dispatchKey: dispatch.dispatchKey,
      projectId: null,
      platformId: dispatch.platformId,
      platformName: dispatch.platformName,
      stage: dispatch.stage,
      state: "completed",
      priorityScore: dispatch.priorityScore,
      ownerRole: dispatch.ownerRole,
      title: dispatch.title,
      detail: dispatch.detail,
      dueLabel: dispatch.dueLabel,
      actionLabel: dispatch.actionLabel,
      href: dispatch.href,
      acceptanceCriteria: JSON.stringify(dispatch.acceptanceCriteria),
      evidence: JSON.stringify(Array.from(new Set([...dispatch.evidence, ...retestEvidence.evidence]))),
      sourceReceiptId: null,
      completionEvidence: retestEvidence.completionEvidence,
      reviewLatestAt: new Date(dispatch.reviewLatestAt),
      assignedAt: now,
      completedAt: now,
    },
    update: {
      platformId: dispatch.platformId,
      platformName: dispatch.platformName,
      stage: dispatch.stage,
      state: "completed",
      priorityScore: dispatch.priorityScore,
      ownerRole: dispatch.ownerRole,
      title: dispatch.title,
      detail: dispatch.detail,
      dueLabel: dispatch.dueLabel,
      actionLabel: dispatch.actionLabel,
      href: dispatch.href,
      acceptanceCriteria: JSON.stringify(dispatch.acceptanceCriteria),
      evidence: JSON.stringify(Array.from(new Set([...dispatch.evidence, ...retestEvidence.evidence]))),
      completionEvidence: retestEvidence.completionEvidence,
      reviewLatestAt: new Date(dispatch.reviewLatestAt),
      assignedAt: now,
      completedAt: now,
    },
  });

  return NextResponse.json({
    plan,
    results,
    retestEvidence,
    retestTask: {
      dispatchKey: retestTask.dispatchKey,
      state: retestTask.state,
      completionEvidence: retestTask.completionEvidence,
      completedAt: retestTask.completedAt?.toISOString() ?? null,
    },
    warning: `已强制使用「${plan.providerId ?? plan.providerConfigId ?? "指定模型"} · ${plan.model ?? "默认模型"}」执行复测样本。`,
  });
}
