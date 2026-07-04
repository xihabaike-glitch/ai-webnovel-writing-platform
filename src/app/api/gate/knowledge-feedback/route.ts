import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

function takeLimit(value: string | null) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 50;
  return Math.min(100, Math.max(1, Math.round(parsed)));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const receipts = await prisma.platformKnowledgeFeedbackReceipt.findMany({
    orderBy: { createdAt: "desc" },
    take: takeLimit(searchParams.get("limit")),
    include: {
      project: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  return NextResponse.json({
    receipts: receipts.map((receipt) => ({
      id: receipt.receiptId,
      projectId: receipt.project.id,
      projectTitle: receipt.project.title,
      platformId: receipt.platformId,
      platformName: receipt.platformName,
      actionLabel: receipt.actionLabel,
      title: receipt.title,
      message: receipt.message,
      completedStepLabel: receipt.completedStepLabel,
      stopReason: receipt.stopReason,
      nextAction: receipt.nextAction,
      href: receipt.href,
      severity: receipt.severity === "success" ? "success" : "needs_action",
      createdAt: receipt.createdAt.toISOString(),
    })),
  });
}
