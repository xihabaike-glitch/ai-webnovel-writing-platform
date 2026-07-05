import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getPlatformProfile, type PlatformId } from "@/lib/platforms/platformProfiles";
import { persistServerGateDispatchTask } from "@/lib/projects/gateDispatchTaskPersistence";
import { parseProjectStartExperienceHandoffDispatchRequest } from "@/lib/projects/projectStartHandoffDispatchRequest";
import {
  buildProjectStartExperienceHandoffDispatchPackage,
  findProjectStartTacticSummary,
  type ProjectStartExperienceHandoff,
  type ProjectStartExperienceHandoffStatus,
  type ProjectStartTacticSummary,
} from "@/lib/projects/projectStartTactics";

interface Params {
  params: Promise<{ projectId: string }>;
}

const handoffStatuses = new Set<ProjectStartExperienceHandoffStatus>([
  "reuse",
  "small_sample",
  "blocked",
  "template",
]);

function validHandoffStatus(value: string | undefined): ProjectStartExperienceHandoffStatus {
  return handoffStatuses.has(value as ProjectStartExperienceHandoffStatus)
    ? value as ProjectStartExperienceHandoffStatus
    : "template";
}

function handoffFromStartTactic(summary: ProjectStartTacticSummary | null, platformId: PlatformId): ProjectStartExperienceHandoff | null {
  if (!summary?.firstDayActions?.length || !summary.avoidRules?.length) return null;
  const platform = getPlatformProfile(platformId);

  return {
    status: validHandoffStatus(summary.handoffStatus),
    label: summary.handoffLabel ?? summary.label,
    title: `${platform.name} ${summary.handoffLabel ?? summary.label}交接`,
    detail: summary.handoffDetail ?? summary.primaryTactic,
    selectedPlatformId: platform.id,
    selectedPlatformName: platform.name,
    recommendedPlatformId: summary.recommendedPlatformName === platform.name ? platform.id : null,
    recommendedPlatformName: summary.recommendedPlatformName ?? null,
    recommendedTemplateId: summary.recommendedTemplateId ?? null,
    shouldSwitchTemplate: false,
    firstDayActions: summary.firstDayActions,
    avoidRules: summary.avoidRules,
    evidence: summary.handoffEvidence ?? [],
  };
}

async function parseRequestBody(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function POST(request: Request, { params }: Params) {
  const { projectId } = await params;
  const [body, project] = await Promise.all([
    parseRequestBody(request),
    prisma.project.findUnique({
      where: { id: projectId },
      include: {
        worldEntries: { orderBy: [{ type: "asc" }, { createdAt: "asc" }] },
      },
    }),
  ]);

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const platformId = project.targetPlatform as PlatformId;
  const platform = getPlatformProfile(platformId);
  const requestHandoff = parseProjectStartExperienceHandoffDispatchRequest(body);
  const startTacticHandoff = handoffFromStartTactic(findProjectStartTacticSummary(project.worldEntries), platformId);
  const handoff = requestHandoff ?? startTacticHandoff;

  if (!handoff) {
    return NextResponse.json({
      error: "当前作品还没有完整的开书经验交接。请先在项目创建或首轮平台打法里补齐首日动作和避坑边界。",
    }, { status: 400 });
  }

  const handoffPackage = buildProjectStartExperienceHandoffDispatchPackage({
    project: { id: project.id, title: project.title },
    platform,
    handoff,
  });
  const tasks = await Promise.all(handoffPackage.dispatches.map((dispatch) => persistServerGateDispatchTask(dispatch)));

  return NextResponse.json({
    package: {
      label: handoffPackage.label,
      title: handoffPackage.title,
      nextAction: handoffPackage.nextAction,
    },
    dispatches: handoffPackage.dispatches,
    tasks,
  }, { status: 201 });
}
