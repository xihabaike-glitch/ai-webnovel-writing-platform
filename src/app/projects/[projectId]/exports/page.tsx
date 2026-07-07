import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell/AppShell";
import { ExportVersionCenterPanel } from "@/components/projects/ExportVersionCenterPanel";
import { prisma } from "@/lib/db/prisma";
import { buildExportSnapshotHistory } from "@/lib/export/snapshots";
import { buildExportVersionCenter } from "@/lib/export/versionCenter";
import { getPlatformProfile, type PlatformId } from "@/lib/platforms/platformProfiles";

function gateReturnFromParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;

  if (!raw?.startsWith("/gate?focus=action-recheck")) {
    return null;
  }

  return raw;
}

export default async function ProjectExportVersionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams?: Promise<{ gateReturn?: string | string[] }>;
}) {
  const { projectId } = await params;
  const query = await searchParams;
  const gateReturn = gateReturnFromParam(query?.gateReturn);
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
        {gateReturn ? (
          <section className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="font-medium">来自总闸门复检</div>
                <p className="mt-1 leading-5">先处理导出快照、基准锁定、替换确认或回退风险，处理后回总闸门确认剩余卡点是否减少。</p>
              </div>
              <Link className="w-fit rounded-md bg-white px-3 py-2 text-sm font-medium text-amber-950 hover:bg-amber-100" href={gateReturn}>
                回总闸门复检
              </Link>
            </div>
          </section>
        ) : null}
        <ExportVersionCenterPanel projectHref={projectHref} snapshots={snapshots} summary={summary} />
      </div>
    </AppShell>
  );
}
