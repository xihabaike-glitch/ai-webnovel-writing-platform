import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell/AppShell";
import { ExportVersionCenterPanel } from "@/components/projects/ExportVersionCenterPanel";
import { prisma } from "@/lib/db/prisma";
import { buildExportSnapshotHistory } from "@/lib/export/snapshots";
import { buildExportVersionCenter } from "@/lib/export/versionCenter";
import { getPlatformProfile, type PlatformId } from "@/lib/platforms/platformProfiles";

export default async function ProjectExportVersionsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      title: true,
      genre: true,
      targetPlatform: true,
      currentWordCount: true,
      targetWordCount: true,
      exportPackageSnapshots: {
        orderBy: { createdAt: "desc" },
        take: 120,
      },
    },
  });

  if (!project) {
    notFound();
  }

  const platform = getPlatformProfile(project.targetPlatform as PlatformId);
  const snapshots = buildExportSnapshotHistory(project.exportPackageSnapshots.map((snapshot) => ({
    ...snapshot,
    createdAt: snapshot.createdAt.toISOString(),
  })), 120);
  const summary = buildExportVersionCenter(snapshots);
  const projectHref = `/projects/${project.id}`;

  return (
    <AppShell>
      <div className="grid gap-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-sm text-slate-500">导出版本中心</div>
            <h1 className="mt-1 text-2xl font-semibold">{project.title}</h1>
            <p className="mt-1 text-sm text-slate-600">
              {platform.name} · {project.genre} · {project.currentWordCount}/{project.targetWordCount} 字
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <Link className="rounded-md border border-slate-200 bg-white px-3 py-2 font-medium hover:bg-slate-50" href={projectHref}>
              返回工作台
            </Link>
            <Link className="rounded-md bg-slate-950 px-3 py-2 font-medium text-white" href={`${projectHref}#create-chapter`}>
              继续写作
            </Link>
          </div>
        </div>
        <ExportVersionCenterPanel projectHref={projectHref} snapshots={snapshots} summary={summary} />
      </div>
    </AppShell>
  );
}

