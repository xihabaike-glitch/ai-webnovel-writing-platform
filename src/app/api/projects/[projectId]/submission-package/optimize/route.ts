import { NextResponse } from "next/server";
import { buildSubmissionOptimizationPrompt, submissionOptimizationResultSchema } from "@/lib/ai/buildSubmissionOptimizationPrompt";
import { prisma } from "@/lib/db/prisma";
import { getActiveModelProvider } from "@/lib/model-gateway/activeProvider";
import { getPlatformProfile, type PlatformId } from "@/lib/platforms/platformProfiles";
import { buildSubmissionPackage } from "@/lib/projects/submissionPackage";

interface Params {
  params: Promise<{ projectId: string }>;
}

export async function POST(_request: Request, { params }: Params) {
  const { projectId } = await params;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      chapters: { orderBy: { order: "asc" } },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const platform = getPlatformProfile(project.targetPlatform as PlatformId);
  const submissionPackage = buildSubmissionPackage({
    title: project.title,
    genre: project.genre,
    sellingPoint: project.sellingPoint,
    currentWordCount: project.currentWordCount,
    targetWordCount: project.targetWordCount,
    platform,
    chapters: project.chapters,
  });
  const prompt = buildSubmissionOptimizationPrompt({ platform, submissionPackage });
  const { provider, adapter } = await getActiveModelProvider("submission_package_optimize");
  const task = await prisma.aiTask.create({
    data: {
      projectId,
      taskType: "submission_package_optimize",
      providerConfigId: provider.id,
      model: provider.defaultModel,
      status: "running",
      inputSnapshot: JSON.stringify(prompt),
    },
  });

  try {
    const result = await adapter.generate({
      providerId: provider.providerId as "claude" | "deepseek" | "kimi" | "gpt" | "openai_compatible" | "ollama" | "mock",
      model: provider.defaultModel,
      systemPrompt: prompt.systemPrompt,
      userPrompt: prompt.userPrompt,
      temperature: 0.7,
      maxTokens: 1600,
    });
    const optimized = submissionOptimizationResultSchema.parse(JSON.parse(result.text));
    const updatedTask = await prisma.aiTask.update({
      where: { id: task.id },
      data: {
        status: "succeeded",
        outputText: result.text,
        inputTokens: result.usage?.inputTokens,
        outputTokens: result.usage?.outputTokens,
        costUsd: result.usage?.costUsd,
      },
    });

    return NextResponse.json({ task: updatedTask, optimized });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Unknown submission optimization error";
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
