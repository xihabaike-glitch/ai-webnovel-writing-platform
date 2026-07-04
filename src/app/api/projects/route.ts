import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { buildDefaultOutlineNodes } from "@/lib/outlines/defaultOutline";
import { buildFirstDayLaunchPackage, buildFirstDayWorkflow, type FirstDayLaunchPackage } from "@/lib/projects/firstDayWorkflow";
import { buildProjectDefaults } from "@/lib/projects/projectDefaults";
import { gateActionReceiptFromAuditRecord } from "@/lib/projects/gateActionReceipts";
import { gatePlatformDispatchTaskFromRecord } from "@/lib/projects/gateDispatchTaskRecords";
import {
  buildProjectStartGateExperience,
  buildProjectStartTacticWorldEntry,
  findProjectStartTacticSummary,
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

async function persistFirstDayLaunchDispatch(projectId: string, launchPackage: FirstDayLaunchPackage) {
  const dispatch = launchPackage.dispatch;
  const now = new Date();
  return prisma.gateDispatchTask.upsert({
    where: { dispatchKey: dispatch.id },
    create: {
      dispatchKey: dispatch.id,
      projectId,
      platformId: dispatch.platformId,
      platformName: dispatch.platformName,
      stage: dispatch.stage,
      state: "assigned",
      priorityScore: dispatch.priorityScore,
      ownerRole: dispatch.ownerRole,
      title: dispatch.title,
      detail: dispatch.detail,
      dueLabel: dispatch.dueLabel,
      actionLabel: dispatch.actionLabel,
      href: dispatch.href,
      acceptanceCriteria: JSON.stringify(dispatch.acceptanceCriteria),
      evidence: JSON.stringify(dispatch.evidence),
      sourceReceiptId: null,
      completionEvidence: "",
      reviewLatestAt: new Date(dispatch.reviewLatestAt),
      assignedAt: now,
      completedAt: null,
    },
    update: {
      projectId,
      platformId: dispatch.platformId,
      platformName: dispatch.platformName,
      stage: dispatch.stage,
      state: "assigned",
      priorityScore: dispatch.priorityScore,
      ownerRole: dispatch.ownerRole,
      title: dispatch.title,
      detail: dispatch.detail,
      dueLabel: dispatch.dueLabel,
      actionLabel: dispatch.actionLabel,
      href: dispatch.href,
      acceptanceCriteria: JSON.stringify(dispatch.acceptanceCriteria),
      evidence: JSON.stringify(dispatch.evidence),
      reviewLatestAt: new Date(dispatch.reviewLatestAt),
      assignedAt: now,
    },
  });
}

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
  const gateAudits = input.startTacticAdvice
    ? []
    : await prisma.gateActionAudit.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  const gateTasks = input.startTacticAdvice || !template
    ? []
    : await prisma.gateDispatchTask.findMany({
      orderBy: { updatedAt: "desc" },
      take: 100,
    });
  const gateReceipts = gateAudits.map(gateActionReceiptFromAuditRecord);
  const persistedGateTasks = gateTasks.map(gatePlatformDispatchTaskFromRecord);

  const project = await prisma.$transaction(async (tx) => {
    const created = await tx.project.create({ data: projectInput });

    if (template) {
      const platform = getPlatformProfile(platformId);
      const style = getPlatformWritingStyle(platformId);
      const startExperience = buildProjectStartGateExperience({
        platform,
        template,
        style,
        receipts: gateReceipts,
        tasks: persistedGateTasks,
      });
      const startTacticAdvice = input.startTacticAdvice ?? startExperience.advice;
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
  const launchPackage = launchProject ? (() => {
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

    const workflowProject = {
      id: launchProject.id,
      title: launchProject.title,
      currentWordCount: launchProject.currentWordCount,
    };
    const workflow = buildFirstDayWorkflow({
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
      startTactic: findProjectStartTacticSummary(launchProject.worldEntries),
      submissionChecklist,
    });

    return buildFirstDayLaunchPackage({
      workflow,
      project: workflowProject,
      platform,
    });
  })() : null;

  if (launchPackage) {
    await persistFirstDayLaunchDispatch(project.id, launchPackage);
  }

  return NextResponse.json({
    project,
    launchReceipt: launchPackage?.receipt ?? null,
    launchDispatch: launchPackage?.dispatch ?? null,
  }, { status: 201 });
}
