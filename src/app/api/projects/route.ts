import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { buildProjectDefaults } from "@/lib/projects/projectDefaults";
import type { LengthType, PlatformId } from "@/lib/platforms/platformProfiles";
import { createProjectSchema } from "@/lib/validators/project";

export async function GET() {
  const projects = await prisma.project.findMany({
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ projects });
}

export async function POST(request: Request) {
  const body = await request.json();
  const input = createProjectSchema.parse(body);
  const defaults = buildProjectDefaults({
    platformId: input.targetPlatform as PlatformId,
    lengthType: input.targetLengthType as LengthType | undefined,
  });
  const project = await prisma.project.create({
    data: {
      ...input,
      targetLengthType: input.targetLengthType ?? defaults.targetLengthType,
      targetWordCount: input.targetWordCount ?? defaults.targetWordCount,
    },
  });
  return NextResponse.json({ project }, { status: 201 });
}
