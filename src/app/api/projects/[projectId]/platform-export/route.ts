import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getPlatformProfile, platformProfiles, type PlatformId } from "@/lib/platforms/platformProfiles";
import { buildPlatformPublishExportCenter } from "@/lib/projects/platformPublishExport";

interface Params {
  params: Promise<{ projectId: string }>;
}

function selectedPlatform(platformId: string | null) {
  if (!platformId) return null;
  return platformProfiles.find((platform) => platform.id === platformId) ?? null;
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

  const targetPlatform = getPlatformProfile(project.targetPlatform as PlatformId);
  const center = buildPlatformPublishExportCenter({
    project: {
      title: project.title,
      genre: project.genre,
      sellingPoint: project.sellingPoint,
      currentWordCount: project.currentWordCount,
      targetWordCount: project.targetWordCount,
    },
    targetPlatform,
    chapters: project.chapters,
  });
  const platform = selectedPlatform(searchParams.get("platformId"));

  if (searchParams.get("format") === "markdown") {
    const pack = center.packages.find((item) => item.platformId === (platform?.id ?? targetPlatform.id))
      ?? center.packages[0];

    return new NextResponse(pack.markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(`${project.title}-${pack.platformName}-发布包.md`)}"`,
      },
    });
  }

  return NextResponse.json({
    center,
    selectedPackage: platform ? center.packages.find((pack) => pack.platformId === platform.id) ?? null : null,
  });
}
