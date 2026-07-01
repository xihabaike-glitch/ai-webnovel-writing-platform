import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getPlatformProfile, type PlatformId } from "@/lib/platforms/platformProfiles";
import {
  buildCharacterActionSeeds,
  buildOutlineActionSeeds,
  buildStoryLineActionSeeds,
  buildWorldActionSeeds,
} from "@/lib/projects/controlActionSeeds";

interface Params {
  params: Promise<{ projectId: string }>;
}

interface ControlActionBody {
  areaId?: string;
}

function result(areaId: string, targetAnchor: string, created: string[], skipped?: string) {
  return {
    areaId,
    targetAnchor,
    created,
    skipped,
    message: created.length
      ? `已创建 ${created.length} 项：${created.join("、")}。`
      : skipped ?? "没有需要自动创建的基础项。",
  };
}

export async function POST(request: Request, { params }: Params) {
  const { projectId } = await params;
  const body = (await request.json().catch(() => ({}))) as ControlActionBody;
  const areaId = body.areaId?.trim();

  if (!areaId) {
    return NextResponse.json({ error: "缺少动作类型。" }, { status: 400 });
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      chapters: { orderBy: { order: "asc" } },
      outlineNodes: { orderBy: [{ depth: "asc" }, { order: "asc" }, { createdAt: "asc" }] },
      characters: { orderBy: { createdAt: "asc" } },
      worldEntries: { orderBy: [{ type: "asc" }, { createdAt: "asc" }] },
      foreshadows: { orderBy: { createdAt: "asc" } },
      plotThreads: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const platform = getPlatformProfile(project.targetPlatform as PlatformId);

  if (areaId === "outline") {
    const seeds = buildOutlineActionSeeds(project, platform, project.outlineNodes);
    if (seeds.length === 0) {
      return NextResponse.json(result(areaId, "outline-tree", [], "大纲骨架已经有基础结构，下一步适合人工细化具体章节。"));
    }

    await prisma.$transaction(seeds.map((seed) => (
      prisma.outlineNode.create({
        data: {
          ...seed,
          projectId,
        },
      })
    )));

    return NextResponse.json(result(areaId, "outline-tree", seeds.map((seed) => seed.title)));
  }

  if (areaId === "characters") {
    const seeds = buildCharacterActionSeeds(project, project.characters);
    if (seeds.length === 0) {
      return NextResponse.json(result(areaId, "character-arc", [], "人物卡已经具备基础数量，下一步适合补具体弧光细节。"));
    }

    await prisma.$transaction(seeds.map((seed) => (
      prisma.character.create({
        data: {
          projectId,
          ...seed,
        },
      })
    )));

    return NextResponse.json(result(areaId, "character-arc", seeds.map((seed) => seed.name)));
  }

  if (areaId === "world") {
    const seeds = buildWorldActionSeeds(project, platform, project.worldEntries);
    if (seeds.length === 0) {
      return NextResponse.json(result(areaId, "world-bible", [], "世界观三类基础设定已经存在，下一步适合补限制和剧情用途。"));
    }

    await prisma.$transaction(seeds.map((seed) => (
      prisma.worldEntry.create({
        data: {
          projectId,
          ...seed,
        },
      })
    )));

    return NextResponse.json(result(areaId, "world-bible", seeds.map((seed) => seed.title)));
  }

  if (areaId === "story-lines") {
    const seeds = buildStoryLineActionSeeds(
      project,
      project.chapters,
      project.characters,
      project.foreshadows,
      project.plotThreads,
    );
    const created: string[] = [];

    await prisma.$transaction(async (tx) => {
      for (const seed of seeds.plotThreads) {
        await tx.plotThread.create({
          data: {
            projectId,
            ...seed,
          },
        });
        created.push(seed.title);
      }
      for (const seed of seeds.foreshadows) {
        await tx.foreshadow.create({
          data: {
            projectId,
            title: seed.title,
            setupChapterId: seed.setupChapterId,
            payoffChapterId: seed.payoffChapterId,
            relatedCharacterIds: JSON.stringify(seed.relatedCharacterIds),
            status: seed.status,
            notes: seed.notes,
          },
        });
        created.push(seed.title);
      }
    });

    if (created.length === 0) {
      return NextResponse.json(result(areaId, "story-lines", [], "主线和伏笔已经有基础项，下一步适合绑定章节回收点。"));
    }

    return NextResponse.json(result(areaId, "story-lines", created));
  }

  return NextResponse.json({
    error: "这个动作需要进入模块选择具体章节或发布项，暂不适合自动执行。",
  }, { status: 400 });
}
