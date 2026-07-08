import { NextResponse } from "next/server";
import {
  buildPlatformSubmissionAssetOptimizationPrompt,
  platformSubmissionAssetOptimizationResultSchema,
} from "@/lib/ai/buildPlatformSubmissionAssetOptimizationPrompt";
import { prisma } from "@/lib/db/prisma";
import { getActiveModelProvider } from "@/lib/model-gateway/activeProvider";
import { getPlatformProfile, platformProfiles, type PlatformId } from "@/lib/platforms/platformProfiles";
import { buildPlatformPublishExportCenter, buildSubmissionAssetAudit, buildSubmissionAssetEditorReview, buildSubmissionAssetIssueResolutions, parsePublishSnapshotTags } from "@/lib/projects/platformPublishExport";
import { buildSubmissionChecklist } from "@/lib/projects/submissionChecklist";

interface Params {
  params: Promise<{ projectId: string }>;
}

function selectedPlatform(platformId: string | null) {
  if (!platformId) return null;
  return platformProfiles.find((platform) => platform.id === platformId) ?? null;
}

function normalizeTagsInput(tags: unknown) {
  if (Array.isArray(tags)) return tags.map((tag) => String(tag).trim()).filter(Boolean).slice(0, 12);
  if (typeof tags !== "string") return [];
  return tags.split(/[、,，\n]/).map((tag) => tag.trim()).filter(Boolean).slice(0, 12);
}

function trimText(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

export async function POST(request: Request, { params }: Params) {
  const { projectId } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    platformId?: string;
    title?: unknown;
    logline?: unknown;
    synopsis?: unknown;
    overseasSynopsis?: unknown;
    tags?: unknown;
    note?: unknown;
  };
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      chapters: { orderBy: { order: "asc" } },
      aiTasks: { orderBy: { createdAt: "desc" } },
      publishSnapshots: { orderBy: { createdAt: "desc" }, take: 80 },
      submissionAssets: { orderBy: { updatedAt: "desc" } },
      submissionAssetVersions: { orderBy: { createdAt: "desc" }, take: 80 },
      platformPublishMetrics: { orderBy: { snapshotDate: "desc" }, take: 80 },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const platform = selectedPlatform(body.platformId ?? null) ?? getPlatformProfile(project.targetPlatform as PlatformId);
  const targetPlatform = getPlatformProfile(project.targetPlatform as PlatformId);
  const submissionChecklist = buildSubmissionChecklist({
    title: project.title,
    genre: project.genre,
    sellingPoint: project.sellingPoint,
    currentWordCount: project.currentWordCount,
    targetWordCount: project.targetWordCount,
    platform: targetPlatform,
    chapters: project.chapters,
    aiTasks: project.aiTasks.map((task) => ({
      taskType: task.taskType,
      status: task.status,
      chapter: task.chapterId ? { id: task.chapterId } : null,
    })),
  });
  const center = buildPlatformPublishExportCenter({
    projectId: project.id,
    project: {
      title: project.title,
      genre: project.genre,
      sellingPoint: project.sellingPoint,
      currentWordCount: project.currentWordCount,
      targetWordCount: project.targetWordCount,
    },
    targetPlatform,
    chapters: project.chapters,
    aiTasks: project.aiTasks,
    publishSnapshots: project.publishSnapshots,
    submissionAssets: project.submissionAssets.map((asset) => ({
      id: asset.id,
      platformId: asset.platformId,
      platformName: asset.platformName,
      title: asset.title,
      logline: asset.logline,
      synopsis: asset.synopsis,
      overseasSynopsis: asset.overseasSynopsis,
      tags: parsePublishSnapshotTags(asset.tags),
      note: asset.note,
      source: asset.source,
      updatedAt: asset.updatedAt,
    })),
    submissionAssetVersions: project.submissionAssetVersions.map((version) => ({
      id: version.id,
      platformId: version.platformId,
      platformName: version.platformName,
      title: version.title,
      logline: version.logline,
      synopsis: version.synopsis,
      overseasSynopsis: version.overseasSynopsis,
      tags: parsePublishSnapshotTags(version.tags),
      note: version.note,
      source: version.source,
      auditScore: version.auditScore,
      auditStatus: version.auditStatus === "ready" || version.auditStatus === "blocked" ? version.auditStatus : "needs_work",
      action: version.action,
      sourceTaskId: version.sourceTaskId,
      strategy: version.strategy,
      createdAt: version.createdAt,
    })),
    platformPublishMetrics: project.platformPublishMetrics.map((metric) => ({
      id: metric.id,
      platformId: metric.platformId,
      platformName: metric.platformName,
      views: metric.views,
      clicks: metric.clicks,
      favorites: metric.favorites,
      follows: metric.follows,
      comments: metric.comments,
      paidReads: metric.paidReads,
      editorFeedback: metric.editorFeedback,
      contractStatus: metric.contractStatus,
      publishUrl: metric.publishUrl,
      notes: metric.notes,
      snapshotDate: metric.snapshotDate,
      createdAt: metric.createdAt,
      updatedAt: metric.updatedAt,
    })),
    submissionChecklist,
  });
  const pack = center.packages.find((item) => item.platformId === platform.id) ?? center.packages[0];
  const platformKnowledge = center.platformKnowledge.find((item) => item.platformId === platform.id) ?? null;
  const asset = {
    title: trimText(body.title, pack.title),
    logline: trimText(body.logline, pack.logline),
    synopsis: trimText(body.synopsis, pack.category === "overseas" ? pack.submissionAsset?.synopsis ?? "" : pack.synopsis),
    overseasSynopsis: trimText(body.overseasSynopsis, pack.category === "overseas" ? pack.synopsis : pack.submissionAsset?.overseasSynopsis ?? ""),
    tags: normalizeTagsInput(body.tags).length ? normalizeTagsInput(body.tags) : pack.tags,
    note: trimText(body.note, pack.submissionAsset?.note ?? ""),
  };
  const audit = buildSubmissionAssetAudit(platform, asset);
  const editorReview = buildSubmissionAssetEditorReview(platform.name, audit);
  const prompt = buildPlatformSubmissionAssetOptimizationPrompt({
    platform,
    asset,
    audit,
    editorReview,
    chapters: project.chapters.map((chapter) => ({
      order: chapter.order,
      title: chapter.title,
      goal: chapter.goal,
      hook: chapter.hook,
      conflict: chapter.conflict,
      cliffhanger: chapter.cliffhanger,
    })),
    platformKnowledge,
  });
  const { provider, adapter } = await getActiveModelProvider("submission_package_optimize");
  const task = await prisma.aiTask.create({
    data: {
      projectId,
      taskType: "platform_submission_asset_optimize",
      providerConfigId: provider.id,
      model: provider.defaultModel,
      status: "running",
      inputSnapshot: JSON.stringify({ platformId: platform.id, prompt, audit }),
    },
  });

  try {
    const result = await adapter.generate({
      providerId: provider.providerId as "claude" | "deepseek" | "kimi" | "gpt" | "openai_compatible" | "ollama" | "mock",
      model: provider.defaultModel,
      systemPrompt: prompt.systemPrompt,
      userPrompt: prompt.userPrompt,
      temperature: 0.75,
      maxTokens: 2400,
    });
    const parsed = platformSubmissionAssetOptimizationResultSchema.parse(JSON.parse(result.text));
    const variants = parsed.variants.map((variant) => {
      const variantAudit = buildSubmissionAssetAudit(platform, {
        title: variant.title,
        logline: variant.logline,
        synopsis: variant.synopsis,
        overseasSynopsis: variant.overseasSynopsis,
        tags: variant.tags,
      });
      return {
        ...variant,
        audit: variantAudit,
        addressedIssues: buildSubmissionAssetIssueResolutions(audit, variantAudit),
      };
    });
    const updatedTask = await prisma.aiTask.update({
      where: { id: task.id },
      data: {
        status: "succeeded",
        outputText: JSON.stringify({ variants }),
        inputTokens: result.usage?.inputTokens,
        outputTokens: result.usage?.outputTokens,
        costUsd: result.usage?.costUsd,
      },
    });

    return NextResponse.json({
      task: updatedTask,
      sourceAudit: audit,
      variants,
    });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Unknown platform submission asset optimization error";
    const failedTask = await prisma.aiTask.update({
      where: { id: task.id },
      data: {
        status: "failed",
        errorMessage: message,
      },
    });

    return NextResponse.json({ task: failedTask, error: message }, { status: 500 });
  }
}
