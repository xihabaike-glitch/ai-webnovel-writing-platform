import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { parseExportBaselineAction, updateExportSnapshotBaseline } from "@/lib/export/baseline";

interface Params {
  params: Promise<{ snapshotId: string }>;
}

export async function PATCH(request: Request, { params }: Params) {
  const { snapshotId } = await params;
  const body = await request.json().catch(() => ({}));
  const action = parseExportBaselineAction((body as { action?: unknown }).action);

  if (!action) {
    return NextResponse.json({ error: "Invalid baseline action" }, { status: 400 });
  }

  const result = await updateExportSnapshotBaseline(prisma, snapshotId, action);
  if (!result) {
    return NextResponse.json({ error: "Snapshot not found" }, { status: 404 });
  }

  return NextResponse.json(result);
}

