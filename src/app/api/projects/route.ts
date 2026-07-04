import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { buildDefaultOutlineNodes } from "@/lib/outlines/defaultOutline";
import { modelRouteConfirmationReceiptFromAudit } from "@/lib/model-gateway/routeConfirmation";
import { buildFirstDayLaunchReceipt, buildFirstDayWorkflow } from "@/lib/projects/firstDayWorkflow";
import { buildProjectDefaults } from "@/lib/projects/projectDefaults";
import {
  buildProjectStartModelRouteExperienceFromConfirmations,
  buildProjectStartTacticAdvice,
  buildProjectStartTacticWorldEntry,
} from "@/lib/projects/projectStartTactics";
import { buildSubmissionChecklist } from "@/lib/projects/submissionChecklist";
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
  const routeConfirmationAudits = input.startTacticAdvice
    ? []
    : await prisma.gateActionAudit.findMany({
      where: { executionType: "model_route" },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  const modelRouteExperience = buildProjectStartModelRouteExperienceFromConfirmations(
    routeConfirmationAudits
      .map(modelRouteConfirmationReceiptFromAudit)
      .filter((receipt): receipt is NonNullable<ReturnType<typeof modelRouteConfirmationReceiptFromAudit>> => Boolean(receipt)),
  );

  const project = await prisma.$transaction(async (tx) => {
    const created = await tx.project.create({ data: projectInput });

    if (template) {
      const platform = getPlatformProfile(platformId);
      const style = getPlatformWritingStyle(platformId);
      const startTacticAdvice = input.startTacticAdvice ?? buildProjectStartTacticAdvice({
        platform,
        template,
        style,
        modelRoutes: modelRouteExperience,
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

  const launchProject = await prisma.project.findUnique({
    where: { id: project.id },
    include: {
      chapters: { orderBy: { order: "asc" } },
      outlineNodes: { orderBy: [{ depth: "asc" }, { order: "asc" }] },
      characters: { orderBy: { createdAt: "asc" } },
      worldEntries: { orderBy: [{ type: "asc" }, { createdAt: "asc" }] },
      aiTasks: { orderBy: { createdAt: "desc" } },
    },
  });
  const launchReceipt = launchProject ? (() => {
    const platform = getPlatformProfile(launchProject.targetPlatform as PlatformId);
    const submissionChecklist = buildSubmissionChecklist({
      title: launchProject.title,
      genre: launchProject.genre,
      sellingPoint: launchProject.sellingPoint,
      currentWordCount: launchProject.currentWordCount,
      targetWordCount: launchProject.targetWordCount,
      platform,
      chapters: launchProject.chapters,
      aiTasks: launchProject.aiTasks.map((task) => ({
        taskType: task.taskType,
        status: task.status,
        chapter: task.chapterId ? { id: task.chapterId } : null,
      })),
    });

    return buildFirstDayLaunchReceipt(buildFirstDayWorkflow({
      project: {
        id: launchProject.id,
        title: launchProject.title,
        currentWordCount: launchProject.currentWordCount,
      },
      platform,
      chapters: launchProject.chapters,
      outlineNodes: launchProject.outlineNodes,
      characters: launchProject.characters,
      worldEntries: launchProject.worldEntries,
      aiTasks: launchProject.aiTasks,
      submissionChecklist,
    }));
  })() : null;

  return NextResponse.json({ project, launchReceipt }, { status: 201 });
}
