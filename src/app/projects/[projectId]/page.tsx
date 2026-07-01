import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell/AppShell";
import { CreateChapterForm } from "@/components/chapters/CreateChapterForm";
import { ExportMarkdownButton } from "@/components/projects/ExportMarkdownButton";
import { prisma } from "@/lib/db/prisma";
import { getPlatformProfile, type PlatformId } from "@/lib/platforms/platformProfiles";

export default async function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { chapters: { orderBy: { order: "asc" } } },
  });

  if (!project) {
    notFound();
  }

  const platform = getPlatformProfile(project.targetPlatform as PlatformId);

  return (
    <AppShell>
      <div className="grid gap-6">
        <div>
          <h1 className="text-2xl font-semibold">{project.title}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {platform.name} · {project.currentWordCount}/{project.targetWordCount} 字 · {project.genre}
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-md border bg-white p-4">
            <div className="font-medium">大纲树</div>
            <p className="mt-2 text-sm text-slate-600">根、主干、支线、叶片的作品结构。</p>
          </div>
          <div className="rounded-md border bg-white p-4">
            <div className="font-medium">平台策略</div>
            <p className="mt-2 text-sm text-slate-600">开头：{platform.openingRules.join("；")}</p>
            <p className="mt-2 text-sm text-slate-600">审稿：{platform.reviewFocus.join("、")}</p>
            <p className="mt-2 text-sm text-slate-600">风险：{platform.risks.join("、")}</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
          <CreateChapterForm projectId={project.id} />
          <div className="rounded-md border border-slate-200 bg-white p-4">
            <div className="mb-3 font-medium">导出</div>
            <ExportMarkdownButton projectId={project.id} title={project.title} />
          </div>
        </div>
        <section className="rounded-md border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium">章节列表</h2>
            <span className="text-sm text-slate-500">{project.chapters.length} 章</span>
          </div>
          <div className="grid gap-2">
            {project.chapters.map((chapter) => (
              <Link
                className="rounded-md border border-slate-200 px-3 py-2 hover:bg-slate-50"
                href={`/projects/${project.id}/chapters/${chapter.id}`}
                key={chapter.id}
              >
                <div className="font-medium">{chapter.title}</div>
                <div className="mt-1 text-sm text-slate-500">
                  第 {chapter.order} 章 · {chapter.wordCount} 字 · {chapter.status}
                </div>
              </Link>
            ))}
            {project.chapters.length === 0 ? (
              <p className="text-sm text-slate-600">还没有章节。先创建第一章。</p>
            ) : null}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
