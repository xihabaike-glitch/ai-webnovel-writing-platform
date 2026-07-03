import { NextResponse } from "next/server";
import { z } from "zod";
import { generateChapterDraft } from "@/lib/ai/chapterDraftGeneration";
import { reviewChapterDraft } from "@/lib/ai/chapterReviewGeneration";
import { prisma } from "@/lib/db/prisma";
import {
  applyRouteAvoidanceOverrides,
  buildRouteAvoidanceGovernance,
  buildRouteAvoidanceRulesFromDispatchTasks,
  routeAvoidanceOverrideFromRecord,
  type RouteAvoidanceOverride,
} from "@/lib/model-gateway/routeRecommendations";
import { buildRouteAvoidanceRetestSamplePlan } from "@/lib/model-gateway/routeRetestSamples";

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

  const results = [];
  for (const chapterId of plan.chapterIds) {
    if (plan.taskType === "chapter_draft") {
      const result = await generateChapterDraft({ chapterId });
      results.push({
        chapterId,
        taskId: result.task.id,
        status: "error" in result ? "failed" : "succeeded",
        providerName: result.provider.displayName,
        model: result.provider.model,
        score: "error" in result ? null : result.draftQuality.score,
        error: "error" in result ? result.error : null,
      });
      continue;
    }

    if (plan.taskType === "chapter_review") {
      const result = await reviewChapterDraft(chapterId);
      results.push({
        chapterId,
        taskId: result.task.id,
        status: "error" in result ? "failed" : "succeeded",
        providerName: result.provider.displayName,
        model: result.provider.model,
        score: "error" in result ? null : result.result.score,
        error: "error" in result ? result.error : null,
      });
    }
  }

  return NextResponse.json({
    plan,
    results,
    warning: "当前复测样本使用普通任务路由执行；下一步需要接入强制指定被观察模型，才算完整模型复测。",
  });
}
