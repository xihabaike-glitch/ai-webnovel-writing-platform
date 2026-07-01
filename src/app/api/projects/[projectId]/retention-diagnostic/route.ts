import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getPlatformProfile, type PlatformId } from "@/lib/platforms/platformProfiles";
import { buildRetentionDiagnostic } from "@/lib/projects/retentionDiagnostic";

interface Params {
  params: Promise<{ projectId: string }>;
}

export async function GET(request: Request, { params }: Params) {
  const { projectId } = await params;
  const { searchParams } = new URL(request.url);
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
  const diagnostic = buildRetentionDiagnostic({
    projectTitle: project.title,
    platform,
    chapters: project.chapters,
  });

  if (searchParams.get("format") === "markdown") {
    return new NextResponse(diagnostic.markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(`${project.title}-前三章追读诊断.md`)}"`,
      },
    });
  }

  return NextResponse.json({ diagnostic });
}
