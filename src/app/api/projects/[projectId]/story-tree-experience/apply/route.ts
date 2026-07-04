import { NextResponse } from "next/server";
import { buildStoryTreeExperienceApplyDispatch, buildStoryTreeExperienceGuide } from "@/lib/ai/storyTreeExperience";
import { prisma } from "@/lib/db/prisma";
import { getPlatformProfile, type PlatformId } from "@/lib/platforms/platformProfiles";
import { persistServerGateDispatchTask } from "@/lib/projects/gateDispatchTaskPersistence";
import { gatePlatformDispatchTaskFromRecord } from "@/lib/projects/gateDispatchTaskRecords";

interface Params {
  params: Promise<{ projectId: string }>;
}

interface ApplyBody {
  dispatchKey?: string;
}

export async function POST(request: Request, { params }: Params) {
  const { projectId } = await params;
  const body = (await request.json().catch(() => ({}))) as ApplyBody;

  if (!body.dispatchKey) {
    return NextResponse.json({ error: "dispatchKey is required" }, { status: 400 });
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      gateDispatchTasks: {
        where: {
          state: "completed",
          dispatchKey: { startsWith: "story-tree:" },
        },
        orderBy: { completedAt: "desc" },
        take: 60,
      },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const guide = buildStoryTreeExperienceGuide(
    project.gateDispatchTasks.map(gatePlatformDispatchTaskFromRecord),
  );
  const item = guide.items.find((entry) => entry.dispatchKey === body.dispatchKey);

  if (!item) {
    return NextResponse.json({ error: "Story tree experience not found" }, { status: 404 });
  }

  const platform = getPlatformProfile(project.targetPlatform as PlatformId);
  const dispatch = buildStoryTreeExperienceApplyDispatch({
    projectId: project.id,
    projectTitle: project.title,
    platform,
    item,
  });
  const task = await persistServerGateDispatchTask(dispatch);

  return NextResponse.json({ dispatch, task });
}
