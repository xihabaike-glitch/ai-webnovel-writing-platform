import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { buildDefaultOutlineNodes } from "@/lib/outlines/defaultOutline";
import { buildProjectDefaults } from "@/lib/projects/projectDefaults";
import { buildProjectStartTacticAdvice, buildProjectStartTacticWorldEntry } from "@/lib/projects/projectStartTactics";
import {
  buildTemplateChapterSeeds,
  buildTemplateCharacterSeed,
  buildTemplateWorldEntrySeeds,
  getProjectTemplate,
} from "@/lib/projects/projectTemplates";
import { getPlatformProfile } from "@/lib/platforms/platformProfiles";
import type { LengthType, PlatformId } from "@/lib/platforms/platformProfiles";
import { getPlatformWritingStyle } from "@/lib/platforms/writingStyleTemplates";
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
  const template = input.templateId ? getProjectTemplate(input.templateId) : null;
  const platformId = input.targetPlatform as PlatformId;
  const lengthType = input.targetLengthType as LengthType | undefined;
  const defaults = buildProjectDefaults({
    platformId,
    lengthType,
  });
  const projectInput = {
    title: input.title,
    targetPlatform: input.targetPlatform,
    targetLengthType: input.targetLengthType ?? defaults.targetLengthType,
    targetWordCount: input.targetWordCount ?? defaults.targetWordCount,
    genre: input.genre,
    sellingPoint: input.sellingPoint,
    updateCadence: input.updateCadence,
  };

  const project = await prisma.$transaction(async (tx) => {
    const created = await tx.project.create({ data: projectInput });

    if (template) {
      const platform = getPlatformProfile(platformId);
      const style = getPlatformWritingStyle(platformId);
      const startTacticAdvice = input.startTacticAdvice ?? buildProjectStartTacticAdvice({
        platform,
        template,
        style,
      });
      const startTacticEntry = buildProjectStartTacticWorldEntry(startTacticAdvice, platform.name);
      const outlineNodes = buildDefaultOutlineNodes({
        projectId: created.id,
        title: created.title,
        genre: created.genre,
        sellingPoint: created.sellingPoint,
        platform,
      });
      const chapters = await tx.chapter.createManyAndReturn({
        data: buildTemplateChapterSeeds(template).map((chapter) => ({
          ...chapter,
          projectId: created.id,
        })),
      });
      const openingNodeId = `${created.id}-outline-opening`;
      const firstChapter = chapters.find((chapter) => chapter.order === 1);
      const character = buildTemplateCharacterSeed(template);

      await tx.outlineNode.createMany({
        data: outlineNodes.map((node) => ({
          ...node,
          projectId: created.id,
          chapterId: node.id === openingNodeId && firstChapter ? firstChapter.id : null,
        })),
      });
      await tx.character.create({
        data: {
          projectId: created.id,
          ...character,
        },
      });
      await tx.worldEntry.createMany({
        data: [
          ...buildTemplateWorldEntrySeeds(template),
          startTacticEntry,
        ].map((entry) => ({
          projectId: created.id,
          ...entry,
        })),
      });
    }

    return created;
  });

  return NextResponse.json({ project }, { status: 201 });
}
