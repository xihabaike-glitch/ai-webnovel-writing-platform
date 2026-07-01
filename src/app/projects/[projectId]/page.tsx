import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell/AppShell";
import { CreateChapterForm } from "@/components/chapters/CreateChapterForm";
import { OutlineTreePanel } from "@/components/outlines/OutlineTreePanel";
import { BatchDraftCenterPanel } from "@/components/projects/BatchDraftCenterPanel";
import { BatchReviewPipelinePanel } from "@/components/projects/BatchReviewPipelinePanel";
import { ChapterProductionPanel } from "@/components/projects/ChapterProductionPanel";
import { CharacterArcPanel } from "@/components/projects/CharacterArcPanel";
import { ExportMarkdownButton } from "@/components/projects/ExportMarkdownButton";
import { FirstDayWorkflowPanel } from "@/components/projects/FirstDayWorkflowPanel";
import { FirstThreeRewritePanel } from "@/components/projects/FirstThreeRewritePanel";
import { ModelTaskAuditPanel } from "@/components/projects/ModelTaskAuditPanel";
import { PlatformExportCenterPanel } from "@/components/projects/PlatformExportCenterPanel";
import { ProjectControlDashboardPanel } from "@/components/projects/ProjectControlDashboardPanel";
import { RetentionDiagnosticPanel } from "@/components/projects/RetentionDiagnosticPanel";
import { SerializationOpsPanel } from "@/components/projects/SerializationOpsPanel";
import { StoryLinePanel } from "@/components/projects/StoryLinePanel";
import { StoryStructureDiagnosticPanel } from "@/components/projects/StoryStructureDiagnosticPanel";
import { SubmissionPackagePanel } from "@/components/projects/SubmissionPackagePanel";
import { WorldBiblePanel } from "@/components/projects/WorldBiblePanel";
import { prisma } from "@/lib/db/prisma";
import { getPlatformProfile, type PlatformId } from "@/lib/platforms/platformProfiles";
import { buildProjectDashboard } from "@/lib/projects/projectDashboard";
import { buildSubmissionChecklist } from "@/lib/projects/submissionChecklist";
import { buildSubmissionPackage } from "@/lib/projects/submissionPackage";

function aiTaskLabel(taskType: string) {
  const labels: Record<string, string> = {
    chapter_draft: "正文初稿",
    chapter_review: "章节审稿",
    chapter_second_pass: "章节二改",
    first_three_rewrite: "前三章改写",
    submission_package_optimize: "投稿资料优化",
  };
  return labels[taskType] ?? taskType;
}

export default async function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      chapters: { orderBy: { order: "asc" } },
      outlineNodes: { orderBy: [{ depth: "asc" }, { order: "asc" }, { createdAt: "asc" }] },
      aiTasks: {
        include: {
          modelProvider: { select: { providerId: true, displayName: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 12,
      },
    },
  });

  if (!project) {
    notFound();
  }

  const platform = getPlatformProfile(project.targetPlatform as PlatformId);
  const chaptersById = new Map(project.chapters.map((chapter) => [chapter.id, chapter]));
  const dashboard = buildProjectDashboard({
    currentWordCount: project.currentWordCount,
    targetWordCount: project.targetWordCount,
    platform,
    chapters: project.chapters,
    aiTasks: project.aiTasks.map((task) => ({
      ...task,
      chapter: task.chapterId ? chaptersById.get(task.chapterId) ?? null : null,
    })),
  });
  const submissionChecklist = buildSubmissionChecklist({
    title: project.title,
    genre: project.genre,
    sellingPoint: project.sellingPoint,
    currentWordCount: project.currentWordCount,
    targetWordCount: project.targetWordCount,
    platform,
    chapters: project.chapters,
    aiTasks: project.aiTasks.map((task) => ({
      taskType: task.taskType,
      status: task.status,
      chapter: task.chapterId ? { id: task.chapterId } : null,
    })),
  });
  const submissionPackage = buildSubmissionPackage({
    title: project.title,
    genre: project.genre,
    sellingPoint: project.sellingPoint,
    currentWordCount: project.currentWordCount,
    targetWordCount: project.targetWordCount,
    platform,
    chapters: project.chapters,
  });
  const outlineNodes = project.outlineNodes.map((node) => ({
    id: node.id,
    parentId: node.parentId,
    chapterId: node.chapterId,
    type: node.type,
    title: node.title,
    summary: node.summary,
    goal: node.goal,
    hook: node.hook,
    conflict: node.conflict,
    valueShift: node.valueShift,
    platformNote: node.platformNote,
    order: node.order,
    depth: node.depth,
    status: node.status,
  }));

  return (
    <AppShell>
      <div className="grid gap-6">
        <div>
          <h1 className="text-2xl font-semibold">{project.title}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {platform.name} · {project.currentWordCount}/{project.targetWordCount} 字 · {project.genre}
          </p>
        </div>
        <div id="project-control">
          <ProjectControlDashboardPanel projectId={project.id} />
        </div>
        <FirstDayWorkflowPanel projectId={project.id} />
        <section className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
          <div className="rounded-md border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm text-slate-500">创作进度</div>
                <div className="mt-1 text-3xl font-semibold">{dashboard.progressPercent}%</div>
              </div>
              {dashboard.nextChapter ? (
                <Link
                  className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white"
                  href={`/projects/${project.id}/chapters/${dashboard.nextChapter.id}`}
                >
                  继续写作
                </Link>
              ) : null}
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded bg-slate-100">
              <div className="h-full bg-slate-950" style={{ width: `${dashboard.progressPercent}%` }} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div className="rounded-md bg-slate-50 p-3">
                <div className="text-slate-500">章节</div>
                <div className="mt-1 font-medium">{dashboard.totalChapters}</div>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <div className="text-slate-500">大纲</div>
                <div className="mt-1 font-medium">{dashboard.statusCounts.outline ?? 0}</div>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <div className="text-slate-500">草稿</div>
                <div className="mt-1 font-medium">{dashboard.statusCounts.draft ?? 0}</div>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <div className="text-slate-500">定稿</div>
                <div className="mt-1 font-medium">{dashboard.statusCounts.final ?? 0}</div>
              </div>
            </div>
          </div>
          <div className="rounded-md border border-slate-200 bg-white p-4">
            <div className="font-medium">下一步</div>
            {dashboard.nextChapter ? (
              <div className="mt-3 rounded-md bg-slate-50 p-3 text-sm">
                <div className="font-medium text-slate-950">{dashboard.nextChapter.title}</div>
                <div className="mt-1 text-slate-500">
                  第 {dashboard.nextChapter.order} 章 · {dashboard.nextChapter.wordCount} 字 · {dashboard.nextChapter.status}
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-600">先创建第一章。</p>
            )}
            <div className="mt-4 font-medium">风险提醒</div>
            <div className="mt-2 grid gap-2 text-sm text-slate-600">
              {dashboard.platformWarnings.slice(0, 4).map((warning) => (
                <div className="rounded-md bg-slate-50 p-2" key={warning}>
                  {warning}
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="rounded-md border border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="font-medium">投稿前检查</h2>
              <p className="mt-1 text-sm text-slate-600">
                {platform.name} · 准备度 {submissionChecklist.readinessPercent}% · 通过 {submissionChecklist.passCount} 项 · 待处理 {submissionChecklist.todoCount} 项 · 风险 {submissionChecklist.riskCount} 项
              </p>
            </div>
            <div className="h-2 min-w-44 overflow-hidden rounded bg-slate-100">
              <div className="h-full bg-slate-950" style={{ width: `${submissionChecklist.readinessPercent}%` }} />
            </div>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            <div className="rounded-md bg-slate-50 p-3">
              <div className="text-sm font-medium">通过项</div>
              <div className="mt-2 grid gap-2 text-sm text-slate-600">
                {submissionChecklist.items.filter((entry) => entry.status === "pass").slice(0, 5).map((entry) => (
                  <div key={entry.id}>{entry.label}</div>
                ))}
              </div>
            </div>
            <div className="rounded-md bg-slate-50 p-3">
              <div className="text-sm font-medium">待处理</div>
              <div className="mt-2 grid gap-2 text-sm text-slate-600">
                {submissionChecklist.items.filter((entry) => entry.status === "todo").map((entry) => (
                  <div key={entry.id}>
                    <div className="font-medium text-slate-900">{entry.label}</div>
                    <div>{entry.detail}</div>
                  </div>
                ))}
                {submissionChecklist.todoCount === 0 ? <div>没有硬性缺口。</div> : null}
              </div>
            </div>
            <div className="rounded-md bg-slate-50 p-3">
              <div className="text-sm font-medium">风险项</div>
              <div className="mt-2 grid gap-2 text-sm text-slate-600">
                {submissionChecklist.items.filter((entry) => entry.status === "risk").map((entry) => (
                  <div key={entry.id}>
                    <div className="font-medium text-slate-900">{entry.label}</div>
                    <div>{entry.detail}</div>
                  </div>
                ))}
                {submissionChecklist.riskCount === 0 ? <div>暂无明显风险。</div> : null}
              </div>
            </div>
          </div>
        </section>
        <RetentionDiagnosticPanel projectId={project.id} />
        <FirstThreeRewritePanel projectId={project.id} />
        <div id="character-arc">
          <CharacterArcPanel projectId={project.id} />
        </div>
        <StoryLinePanel projectId={project.id} />
        <WorldBiblePanel projectId={project.id} />
        <ChapterProductionPanel projectId={project.id} />
        <BatchDraftCenterPanel projectId={project.id} />
        <BatchReviewPipelinePanel projectId={project.id} />
        <SerializationOpsPanel projectId={project.id} />
        <div id="platform-export">
          <PlatformExportCenterPanel projectId={project.id} />
        </div>
        <StoryStructureDiagnosticPanel projectId={project.id} />
        <div id="submission-package">
          <SubmissionPackagePanel projectId={project.id} submissionPackage={submissionPackage} />
        </div>
        <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
          <OutlineTreePanel projectId={project.id} nodes={outlineNodes} />
          <div className="rounded-md border bg-white p-4">
            <div className="font-medium">平台策略</div>
            <p className="mt-2 text-sm text-slate-600">开头：{platform.openingRules.join("；")}</p>
            <p className="mt-2 text-sm text-slate-600">审稿：{platform.reviewFocus.join("、")}</p>
            <p className="mt-2 text-sm text-slate-600">风险：{platform.risks.join("、")}</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
          <div id="create-chapter">
            <CreateChapterForm projectId={project.id} />
          </div>
          <div className="rounded-md border border-slate-200 bg-white p-4">
            <div className="mb-3 font-medium">导出</div>
            <ExportMarkdownButton projectId={project.id} title={project.title} />
          </div>
        </div>
        <ModelTaskAuditPanel projectId={project.id} />
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-md border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-medium">最近 AI 任务</h2>
              <span className="text-sm text-slate-500">{dashboard.recentTasks.length} 条</span>
            </div>
            <div className="grid gap-2">
              {dashboard.recentTasks.map((task) => (
                <div className="rounded-md bg-slate-50 p-3 text-sm" key={task.id}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{aiTaskLabel(task.taskType)}</span>
                    <span className="text-slate-500">{task.status}</span>
                  </div>
                  <div className="mt-1 text-slate-500">
                    {task.chapter?.title ?? "项目任务"} · {task.modelProvider?.displayName ?? "未知模型"} · {task.model}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">{new Date(task.createdAt).toLocaleString()}</div>
                </div>
              ))}
              {dashboard.recentTasks.length === 0 ? <p className="text-sm text-slate-600">还没有 AI 任务。</p> : null}
            </div>
          </div>
          <div className="rounded-md border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-medium">未审稿章节</h2>
              <span className="text-sm text-slate-500">{dashboard.unreviewedChapters.length} 章</span>
            </div>
            <div className="grid gap-2">
              {dashboard.unreviewedChapters.slice(0, 6).map((chapter) => (
                <Link
                  className="rounded-md bg-slate-50 p-3 text-sm hover:bg-slate-100"
                  href={`/projects/${project.id}/chapters/${chapter.id}`}
                  key={chapter.id}
                >
                  <div className="font-medium">{chapter.title}</div>
                  <div className="mt-1 text-slate-500">
                    第 {chapter.order} 章 · {chapter.wordCount} 字 · 需要审稿
                  </div>
                </Link>
              ))}
              {dashboard.unreviewedChapters.length === 0 ? (
                <p className="text-sm text-slate-600">所有有正文的章节都已审稿。</p>
              ) : null}
            </div>
          </div>
        </section>
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
