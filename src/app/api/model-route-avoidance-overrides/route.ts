import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { saveRouteAvoidanceOverrideSchema } from "@/lib/validators/modelProvider";

function maskOverride(override: {
  id: string;
  ruleKey: string;
  action: string;
  taskType: string | null;
  note: string;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: override.id,
    ruleKey: override.ruleKey,
    action: override.action,
    taskType: override.taskType,
    note: override.note,
    expiresAt: override.expiresAt?.toISOString() ?? null,
    createdAt: override.createdAt.toISOString(),
    updatedAt: override.updatedAt.toISOString(),
  };
}

export async function GET() {
  const overrides = await prisma.modelRouteAvoidanceOverride.findMany({
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ overrides: overrides.map(maskOverride) });
}

export async function POST(request: Request) {
  const input = saveRouteAvoidanceOverrideSchema.parse(await request.json());
  const override = await prisma.modelRouteAvoidanceOverride.upsert({
    where: { ruleKey: input.ruleKey },
    create: {
      ruleKey: input.ruleKey,
      action: input.action,
      taskType: input.action === "scope_task" ? input.taskType : null,
      note: input.note?.trim() ?? "",
      expiresAt: input.action === "extend_watch" && input.expiresAt ? new Date(input.expiresAt) : null,
    },
    update: {
      action: input.action,
      taskType: input.action === "scope_task" ? input.taskType : null,
      note: input.note?.trim() ?? "",
      expiresAt: input.action === "extend_watch" && input.expiresAt ? new Date(input.expiresAt) : null,
    },
  });

  return NextResponse.json({ override: maskOverride(override) });
}
