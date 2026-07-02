import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { normalizeModelBudgetSettings } from "@/lib/ai/modelBudget";

interface Params {
  params: Promise<{ projectId: string }>;
}

const budgetSchema = z.object({
  aiMonthlyBudgetUsd: z.number().positive().max(10000),
  aiMaxTaskCostUsd: z.number().positive().max(1000),
  aiMaxBatchCostUsd: z.number().positive().max(10000),
  aiMaxFailureRatePercent: z.number().int().min(1).max(100),
  aiBudgetEnforcement: z.enum(["off", "warn", "block"]),
});

function budgetView(project: {
  aiMonthlyBudgetUsd: number;
  aiMaxTaskCostUsd: number;
  aiMaxBatchCostUsd: number;
  aiMaxFailureRatePercent: number;
  aiBudgetEnforcement: string;
}) {
  return normalizeModelBudgetSettings(project);
}

export async function GET(_request: Request, { params }: Params) {
  const { projectId } = await params;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      aiMonthlyBudgetUsd: true,
      aiMaxTaskCostUsd: true,
      aiMaxBatchCostUsd: true,
      aiMaxFailureRatePercent: true,
      aiBudgetEnforcement: true,
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({ budget: budgetView(project) });
}

export async function POST(request: Request, { params }: Params) {
  const { projectId } = await params;
  const parsed = budgetSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid model budget settings" }, { status: 400 });
  }

  const project = await prisma.project.update({
    where: { id: projectId },
    data: parsed.data,
    select: {
      aiMonthlyBudgetUsd: true,
      aiMaxTaskCostUsd: true,
      aiMaxBatchCostUsd: true,
      aiMaxFailureRatePercent: true,
      aiBudgetEnforcement: true,
    },
  }).catch(() => null);

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({ budget: budgetView(project) });
}
