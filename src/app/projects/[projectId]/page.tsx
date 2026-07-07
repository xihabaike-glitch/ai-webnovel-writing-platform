import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell/AppShell";
import { CreateChapterForm } from "@/components/chapters/CreateChapterForm";
import { OutlineTreePanel } from "@/components/outlines/OutlineTreePanel";
import { BatchDraftCenterPanel } from "@/components/projects/BatchDraftCenterPanel";
import { BatchReviewPipelinePanel } from "@/components/projects/BatchReviewPipelinePanel";
import { ChapterProductionFlowPanel } from "@/components/projects/ChapterProductionFlowPanel";
import { ChapterProductionPanel } from "@/components/projects/ChapterProductionPanel";
import { CharacterArcPanel } from "@/components/projects/CharacterArcPanel";
import { ContinuityAuditPanel } from "@/components/projects/ContinuityAuditPanel";
import { ExportMarkdownButton } from "@/components/projects/ExportMarkdownButton";
import { FirstDayWorkflowPanel } from "@/components/projects/FirstDayWorkflowPanel";
import { FirstThreeRewritePanel } from "@/components/projects/FirstThreeRewritePanel";
import { ModelTaskAuditPanel } from "@/components/projects/ModelTaskAuditPanel";
import { PlatformDecisionTimelinePanel } from "@/components/projects/PlatformDecisionTimelinePanel";
import { PlatformExportCenterPanel } from "@/components/projects/PlatformExportCenterPanel";
import { PlatformKnowledgeBriefPanel } from "@/components/projects/PlatformKnowledgeBriefPanel";
import { PlatformTacticExperiencePanel } from "@/components/projects/PlatformTacticExperiencePanel";
import { ProjectControlDashboardPanel } from "@/components/projects/ProjectControlDashboardPanel";
import { RetentionDiagnosticPanel } from "@/components/projects/RetentionDiagnosticPanel";
import { SerializationOpsPanel } from "@/components/projects/SerializationOpsPanel";
import { StoryLinePanel } from "@/components/projects/StoryLinePanel";
import { StoryTreeExperiencePanel } from "@/components/projects/StoryTreeExperiencePanel";
import { StoryStructureDiagnosticPanel } from "@/components/projects/StoryStructureDiagnosticPanel";
import { SubmissionPackagePanel } from "@/components/projects/SubmissionPackagePanel";
import { WorldBiblePanel } from "@/components/projects/WorldBiblePanel";
import { WritingWorkbenchPanel } from "@/components/projects/WritingWorkbenchPanel";
import { buildStoryTreeExperienceApplyDispatchKey, buildStoryTreeExperienceEffectDashboard, buildStoryTreeExperienceFlow, buildStoryTreeExperienceGuide, buildStoryTreeExperienceReviewBacklog } from "@/lib/ai/storyTreeExperience";
import { prisma } from "@/lib/db/prisma";
import { buildExportPackageReadiness } from "@/lib/export/markdown";
import { buildExportSnapshotHistory } from "@/lib/export/snapshots";
import { getPlatformProfile, type PlatformId } from "@/lib/platforms/platformProfiles";
import { buildContinuityAudit } from "@/lib/projects/continuityAudit";
import { buildGateBatchTacticEffectReview, buildGatePlatformDecisionTimeline, buildGatePlatformTacticExperienceLibrary, gateActionReceiptFromAuditRecord } from "@/lib/projects/gateActionReceipts";
import { gatePlatformDispatchTaskFromRecord } from "@/lib/projects/gateDispatchTaskRecords";
import { buildPlatformKnowledgeBrief } from "@/lib/projects/platformKnowledgeBrief";
import { buildProjectDashboard } from "@/lib/projects/projectDashboard";
import { buildProjectRoleWorkflowEntrypoints } from "@/lib/projects/projectListDashboard";
import { buildSubmissionChecklist } from "@/lib/projects/submissionChecklist";
import { buildSubmissionPackage } from "@/lib/projects/submissionPackage";
import { buildWritingWorkbench } from "@/lib/projects/writingWorkbench";
import { buildChapterProductionFlow } from "@/lib/projects/chapterProductionFlow";

function aiTaskLabel(taskType: string) {
  const labels: Record<string, string> = {
    chapter_draft: "正文初稿",
    chapter_review: "章节审稿",
    chapter_second_pass: "章节二改",
    chapter_adopt_candidate: "采纳候选稿",
    first_three_rewrite: "前三章改写",
    submission_package_optimize: "投稿资料优化",
    control_asset_generate: "总控资料生成",
  };
  return labels[taskType] ?? taskType;
}

function gateReturnFromParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw?.startsWith("/gate?focus=action-recheck")) return null;
  return raw;
}

export default async function ProjectPage({
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
    include: {
      chapters: {
        orderBy: { order: "asc" },
        include: {
          revisions: {
            orderBy: { createdAt: "desc" },
            take: 5,
          },
        },
      },
      outlineNodes: { orderBy: [{ depth: "asc" }, { order: "asc" }, { createdAt: "asc" }] },
      characters: { orderBy: { createdAt: "asc" } },
      worldEntries: { orderBy: [{ type: "asc" }, { createdAt: "asc" }] },
      foreshadows: { orderBy: { createdAt: "asc" } },
      plotThreads: { orderBy: { createdAt: "asc" } },
      aiTasks: {
        include: {
          modelProvider: { select: { providerId: true, displayName: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 12,
      },
      gateDispatchTasks: {
        where: {
          OR: [
            { dispatchKey: { startsWith: "story-tree:" } },
            { dispatchKey: { startsWith: "story-tree-experience:" } },
            { dispatchKey: { startsWith: "first-three-adoption:" } },
            { dispatchKey: { startsWith: "first-day:" } },
          ],
        },
        orderBy: { updatedAt: "desc" },
        take: 30,
      },
      exportPackageSnapshots: {
        orderBy: { createdAt: "desc" },
        take: 24,
      },
    },
  });

  if (!project) {
    notFound();
  }

  const platform = getPlatformProfile(project.targetPlatform as PlatformId);
  const chaptersById = new Map(project.chapters.map((chapter) => [chapter.id, chapter]));
  const persistedDispatchTasks = project.gateDispatchTasks.map(gatePlatformDispatchTaskFromRecord);
  const persistedStoryTreeTasks = persistedDispatchTasks.filter((task) => (
    task.dispatchKey.startsWith("story-tree:") || task.dispatchKey.startsWith("story-tree-experience:")
  ));
  const storyTreeExperience = buildStoryTreeExperienceGuide(persistedStoryTreeTasks);
  const storyTreeExperienceEffectDashboard = buildStoryTreeExperienceEffectDashboard(storyTreeExperience);
  const storyTreeExperienceReviewBacklog = buildStoryTreeExperienceReviewBacklog(persistedStoryTreeTasks);
  const appliedStoryTreeExperienceTasks = await prisma.gateDispatchTask.findMany({
    where: {
      projectId: project.id,
      dispatchKey: { startsWith: "story-tree-experience:" },
    },
    select: {
      dispatchKey: true,
      state: true,
      evidence: true,
    },
  });
  const storyTreeExperienceFlow = buildStoryTreeExperienceFlow({
    projectId: project.id,
    guide: storyTreeExperience,
    appliedTasks: appliedStoryTreeExperienceTasks,
    reviewBacklog: storyTreeExperienceReviewBacklog,
  });
  const appliedStoryTreeExperienceMap = new Map(appliedStoryTreeExperienceTasks.map((task) => [task.dispatchKey, task]));
  const appliedStoryTreeExperienceItems = storyTreeExperience.items.flatMap((item) => {
    const task = appliedStoryTreeExperienceMap.get(buildStoryTreeExperienceApplyDispatchKey(project.id, item));
    if (!task) return [];
    return {
      dispatchKey: item.dispatchKey,
      state: task.state,
      hasReturnedEffect: task.evidence.includes("经验应用效果"),
    };
  });
  const productionAiTasks = await prisma.aiTask.findMany({
    where: {
      projectId: project.id,
      status: "succeeded",
      taskType: { in: ["chapter_review", "chapter_second_pass"] },
    },
    select: {
      taskType: true,
      status: true,
      outputText: true,
      createdAt: true,
      chapterId: true,
    },
  });
  const productionGateTasks = await prisma.gateDispatchTask.findMany({
    where: {
      projectId: project.id,
      OR: [
        { dispatchKey: { startsWith: "story-tree:" } },
        { dispatchKey: { startsWith: "story-tree-experience:" } },
        { dispatchKey: { startsWith: "story-tree-followup:" } },
        { dispatchKey: { startsWith: "submission-precheck:" } },
        { dispatchKey: { startsWith: "submission-recheck-followup:" } },
      ],
    },
    select: {
      dispatchKey: true,
      state: true,
      href: true,
      completionEvidence: true,
      evidence: true,
      completedAt: true,
      title: true,
      actionLabel: true,
      ownerRole: true,
      priorityScore: true,
    },
    take: 100,
  });
  const dashboard = buildProjectDashboard({
    projectId: project.id,
    currentWordCount: project.currentWordCount,
    targetWordCount: project.targetWordCount,
    platform,
    chapters: project.chapters,
    aiTasks: project.aiTasks.map((task) => ({
      ...task,
      chapter: task.chapterId ? chaptersById.get(task.chapterId) ?? null : null,
    })),
    gateDispatchTasks: project.gateDispatchTasks.map((task) => ({
      dispatchKey: task.dispatchKey,
      state: task.state,
      completionEvidence: task.completionEvidence,
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
      chapterId: task.chapterId,
      taskType: task.taskType,
      status: task.status,
      chapter: task.chapterId ? { id: task.chapterId } : null,
      createdAt: task.createdAt,
    })),
  });
  const chapterProductionFlow = buildChapterProductionFlow({
    projectId: project.id,
    chapters: project.chapters,
    aiTasks: productionAiTasks.map((task) => ({
      taskType: task.taskType,
      status: task.status,
      outputText: task.outputText,
      createdAt: task.createdAt,
      chapter: task.chapterId ? { id: task.chapterId } : null,
    })),
    gateTasks: productionGateTasks.map((task) => ({
      dispatchKey: task.dispatchKey,
      state: task.state,
      href: task.href,
      completionEvidence: task.completionEvidence,
      evidence: task.evidence,
      completedAt: task.completedAt,
      title: task.title,
      actionLabel: task.actionLabel,
      ownerRole: task.ownerRole,
      priorityScore: task.priorityScore,
    })),
    submissionChecklist,
  });
  const [projectDecisionAudits, projectDecisionTaskRecords, platformKnowledgeFeedbackReceipts] = await Promise.all([
    prisma.gateActionAudit.findMany({
      where: { projectId: project.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.gateDispatchTask.findMany({
      where: { projectId: project.id },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
    prisma.platformKnowledgeFeedbackReceipt.findMany({
      where: { projectId: project.id },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
  ]);
  const projectDecisionReceipts = projectDecisionAudits.map(gateActionReceiptFromAuditRecord);
  const platformDecisionTimeline = buildGatePlatformDecisionTimeline({
    receipts: projectDecisionReceipts,
    tasks: projectDecisionTaskRecords.map(gatePlatformDispatchTaskFromRecord),
    limit: 8,
  });
  const batchTacticEffectReview = buildGateBatchTacticEffectReview(projectDecisionReceipts, 8);
  const platformTacticExperienceLibrary = buildGatePlatformTacticExperienceLibrary(platformDecisionTimeline, 8, batchTacticEffectReview.items);
  const platformKnowledgeBrief = buildPlatformKnowledgeBrief({
    feedbackReceipts: platformKnowledgeFeedbackReceipts.map((receipt) => ({
      id: receipt.receiptId,
      platformId: receipt.platformId,
      platformName: receipt.platformName,
      actionLabel: receipt.actionLabel,
      title: receipt.title,
      message: receipt.message,
      completedStepLabel: receipt.completedStepLabel,
      stopReason: receipt.stopReason,
      nextAction: receipt.nextAction,
      href: receipt.href,
      severity: receipt.severity === "success" ? "success" : "needs_action",
      createdAt: receipt.createdAt,
    })),
    tacticLibrary: platformTacticExperienceLibrary,
    targetPlatformId: platform.id,
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
  const exportReadiness = buildExportPackageReadiness({
    title: project.title,
    genre: project.genre,
    targetPlatformName: platform.name,
    targetLengthType: project.targetLengthType,
    targetWordCount: project.targetWordCount,
    currentWordCount: project.currentWordCount,
    sellingPoint: project.sellingPoint,
    updateCadence: project.updateCadence,
    chapters: project.chapters.map((chapter) => ({
      id: chapter.id,
      order: chapter.order,
      title: chapter.title,
      content: chapter.content,
      wordCount: chapter.wordCount,
      goal: chapter.goal,
      hook: chapter.hook,
      conflict: chapter.conflict,
      valueShift: chapter.valueShift,
      cliffhanger: chapter.cliffhanger,
      status: chapter.status,
    })),
    outlineNodes: project.outlineNodes.map((node) => ({
      type: node.type,
      title: node.title,
      summary: node.summary,
      goal: node.goal,
      hook: node.hook,
      conflict: node.conflict,
      valueShift: node.valueShift,
      platformNote: node.platformNote,
      depth: node.depth,
      order: node.order,
      status: node.status,
    })),
    characters: project.characters.map((character) => ({
      name: character.name,
      role: character.role,
      desire: character.desire,
      need: character.need,
      flaw: character.flaw,
      arcStart: character.arcStart,
      arcEnd: character.arcEnd,
      voice: character.voice,
      relationshipNotes: character.relationshipNotes,
    })),
    worldEntries: project.worldEntries.map((entry) => ({
      type: entry.type,
      title: entry.title,
      content: entry.content,
    })),
    foreshadows: project.foreshadows.map((entry) => ({
      title: entry.title,
      status: entry.status,
      notes: entry.notes,
      setupChapterId: entry.setupChapterId,
      payoffChapterId: entry.payoffChapterId,
    })),
    plotThreads: project.plotThreads.map((entry) => ({
      type: entry.type,
      title: entry.title,
      status: entry.status,
    })),
  });
  const exportSnapshots = buildExportSnapshotHistory(project.exportPackageSnapshots.map((snapshot) => ({
    ...snapshot,
    createdAt: snapshot.createdAt.toISOString(),
  })), 24);
  const continuityAudit = buildContinuityAudit({
    chapters: project.chapters.map((chapter) => ({
      id: chapter.id,
      order: chapter.order,
      title: chapter.title,
      content: chapter.content,
      goal: chapter.goal,
      hook: chapter.hook,
      conflict: chapter.conflict,
      cliffhanger: chapter.cliffhanger,
      status: chapter.status,
    })),
    characters: project.characters.map((character) => ({
      id: character.id,
      name: character.name,
      role: character.role,
      desire: character.desire,
      need: character.need,
      flaw: character.flaw,
      arcStart: character.arcStart,
      arcEnd: character.arcEnd,
    })),
    worldEntries: project.worldEntries.map((entry) => ({
      id: entry.id,
      type: entry.type,
      title: entry.title,
      content: entry.content,
    })),
    foreshadows: project.foreshadows.map((entry) => ({
      id: entry.id,
      title: entry.title,
      setupChapterId: entry.setupChapterId,
      payoffChapterId: entry.payoffChapterId,
      status: entry.status,
      notes: entry.notes,
    })),
    plotThreads: project.plotThreads.map((entry) => ({
      id: entry.id,
      type: entry.type,
      title: entry.title,
      startChapterId: entry.startChapterId,
      endChapterId: entry.endChapterId,
      status: entry.status,
    })),
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
  const writingWorkbench = buildWritingWorkbench({
    project: {
      id: project.id,
      title: project.title,
      genre: project.genre,
      sellingPoint: project.sellingPoint,
      targetPlatformName: platform.name,
      targetWordCount: project.targetWordCount,
      currentWordCount: project.currentWordCount,
    },
    chapters: project.chapters.map((chapter) => ({
      id: chapter.id,
      title: chapter.title,
      order: chapter.order,
      status: chapter.status,
      wordCount: chapter.wordCount,
      content: chapter.content,
      hook: chapter.hook,
      conflict: chapter.conflict,
      cliffhanger: chapter.cliffhanger,
    })),
    outlineNodes: project.outlineNodes.map((node) => ({
      id: node.id,
      type: node.type,
      title: node.title,
      goal: node.goal,
      hook: node.hook,
      conflict: node.conflict,
      valueShift: node.valueShift,
      status: node.status,
    })),
    characters: project.characters.map((character) => ({
      id: character.id,
      name: character.name,
      role: character.role,
      desire: character.desire,
      need: character.need,
      flaw: character.flaw,
      arcStart: character.arcStart,
      arcEnd: character.arcEnd,
      relationshipNotes: character.relationshipNotes,
    })),
    worldEntries: project.worldEntries.map((entry) => ({
      id: entry.id,
      type: entry.type,
      title: entry.title,
      content: entry.content,
    })),
    foreshadows: project.foreshadows.map((foreshadow) => ({
      id: foreshadow.id,
      title: foreshadow.title,
      setupChapterId: foreshadow.setupChapterId,
      payoffChapterId: foreshadow.payoffChapterId,
      relatedCharacterIds: foreshadow.relatedCharacterIds,
      status: foreshadow.status,
      notes: foreshadow.notes,
    })),
    plotThreads: project.plotThreads.map((thread) => ({
      id: thread.id,
      type: thread.type,
      title: thread.title,
      startChapterId: thread.startChapterId,
      endChapterId: thread.endChapterId,
      status: thread.status,
    })),
    aiTasks: project.aiTasks.map((task) => ({
      id: task.id,
      chapterId: task.chapterId,
      taskType: task.taskType,
      status: task.status,
      model: task.model,
      inputSnapshot: task.inputSnapshot,
      createdAt: task.createdAt,
      outputText: task.outputText,
      costUsd: task.costUsd,
      errorMessage: task.errorMessage,
    })),
    chapterRevisions: project.chapters.flatMap((chapter) => (
      chapter.revisions.map((revision) => ({
        id: revision.id,
        chapterId: chapter.id,
        source: revision.source,
        sourceTaskId: revision.sourceTaskId,
        title: revision.title,
        content: revision.content,
        wordCount: revision.wordCount,
        notes: revision.notes,
        createdAt: revision.createdAt,
      }))
    )),
    gateDispatchTasks: persistedDispatchTasks.map((task) => ({
      dispatchKey: task.dispatchKey,
      stage: task.stage,
      state: task.state,
      title: task.title,
      detail: task.detail,
      actionLabel: task.actionLabel,
      href: task.href,
      evidence: task.evidence,
      acceptanceCriteria: task.acceptanceCriteria,
      completionEvidence: task.completionEvidence,
      reviewLatestAt: task.reviewLatestAt,
    })),
  });
  const roleEntrypoints = buildProjectRoleWorkflowEntrypoints();

  return (
    <AppShell>
      <div className="grid gap-6">
        <div>
          <h1 className="text-2xl font-semibold">{project.title}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {platform.name} · {project.currentWordCount}/{project.targetWordCount} 字 · {project.genre}
          </p>
        </div>
        {gateReturn ? (
          <section className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <div className="font-medium">来自总闸门复检</div>
            <p className="mt-1 leading-5">先处理当前卡点，处理后回总闸门确认剩余卡点是否减少。</p>
            <Link className="mt-3 inline-flex rounded-md bg-white px-3 py-2 text-xs font-medium text-amber-900 hover:bg-amber-100" href={gateReturn}>
              回总闸门复检
            </Link>
          </section>
        ) : null}
        <section className="rounded-md border border-slate-200 bg-white p-4">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-medium text-slate-950">当前作品角色导航</h2>
              <p className="mt-1 text-sm text-slate-500">从角色入口进来后，先按岗位找到对应工作区，再处理具体产物。</p>
            </div>
            <Link className="w-fit rounded-md border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50" href="/references">
              回到参考库
            </Link>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {roleEntrypoints.map((entry) => (
              <Link
                className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm hover:border-slate-400 hover:bg-white"
                href={`/projects/${project.id}${entry.projectAnchor}`}
                key={entry.id}
              >
                <div className="font-medium text-slate-950">{entry.title}</div>
                <p className="mt-1 line-clamp-2 leading-5 text-slate-600">{entry.detail}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {entry.workflowSteps.map((step) => (
                    <span className="rounded-md bg-white px-2 py-1 text-xs text-slate-600" key={`${entry.id}-${step.stage}`}>
                      {step.stage}：{step.output}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </section>
        <section className="rounded-md border border-slate-900 bg-slate-950 p-4 text-white">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-xs font-medium text-slate-300">单本作品验收单</div>
              <h2 className="mt-1 text-lg font-semibold">{dashboard.realSampleAcceptanceSheet.title}</h2>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-200">{dashboard.realSampleAcceptanceSheet.verdict}</p>
            </div>
            <Link
              className="w-fit rounded-md bg-white px-3 py-2 text-sm font-medium text-slate-950 hover:bg-slate-100"
              href={dashboard.realSampleAcceptanceSheet.actionHref}
            >
              {dashboard.realSampleAcceptanceSheet.actionLabel}
            </Link>
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-3 xl:grid-cols-6">
            {dashboard.realSampleAcceptanceSheet.steps.map((step, index) => (
              <Link
                className={`rounded-md border p-3 text-xs leading-5 ${step.status === "done" ? "border-emerald-300 bg-emerald-50 text-emerald-950" : step.status === "current" ? "border-white bg-white text-slate-950" : "border-white/15 bg-white/10 text-slate-300"}`}
                href={step.href}
                key={step.id}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium">{index + 1}. {step.label}</span>
                  <span className="shrink-0 opacity-75">{step.status === "done" ? "已过" : step.status === "current" ? "当前" : "待验"}</span>
                </div>
                <p className="mt-2">{step.evidence}</p>
                <div className="mt-2 rounded-md bg-white/60 p-2 text-rose-800">
                  {step.stopRule}
                </div>
              </Link>
            ))}
          </div>
        </section>
        <WritingWorkbenchPanel workbench={writingWorkbench} />
        <PlatformKnowledgeBriefPanel brief={platformKnowledgeBrief} projectId={project.id} />
        <div id="project-control">
          <ProjectControlDashboardPanel projectId={project.id} />
        </div>
        <div id="first-day-workflow">
          <FirstDayWorkflowPanel projectId={project.id} />
        </div>
        <ChapterProductionFlowPanel flow={chapterProductionFlow} />
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
        <StoryTreeExperiencePanel
          appliedDispatches={appliedStoryTreeExperienceItems}
          effectDashboard={storyTreeExperienceEffectDashboard}
          flow={storyTreeExperienceFlow}
          guide={storyTreeExperience}
          projectId={project.id}
          reviewBacklog={storyTreeExperienceReviewBacklog}
        />
        <section className="rounded-md border border-slate-200 bg-white p-4" id="submission-precheck">
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
        <div id="story-lines">
          <StoryLinePanel projectId={project.id} />
        </div>
        <div id="world-bible">
          <WorldBiblePanel projectId={project.id} />
        </div>
        <ContinuityAuditPanel audit={continuityAudit} />
        <div id="chapter-production">
          <ChapterProductionPanel projectId={project.id} />
        </div>
        <div id="ai-pipeline">
          <BatchDraftCenterPanel projectId={project.id} />
          <div className="mt-4">
            <BatchReviewPipelinePanel projectId={project.id} />
          </div>
        </div>
        <div id="serialization-ops">
          <SerializationOpsPanel projectId={project.id} />
        </div>
        <PlatformDecisionTimelinePanel timeline={platformDecisionTimeline} />
        <div id="platform-tactic-experience">
          <PlatformTacticExperiencePanel library={platformTacticExperienceLibrary} />
        </div>
        <div id="platform-export">
          <PlatformExportCenterPanel projectId={project.id} />
        </div>
        <div id="story-structure">
          <StoryStructureDiagnosticPanel projectId={project.id} />
        </div>
        <div id="submission-package">
          <SubmissionPackagePanel projectId={project.id} submissionPackage={submissionPackage} />
        </div>
        <div id="outline-tree" className="grid gap-4 md:grid-cols-[2fr_1fr]">
          <OutlineTreePanel projectId={project.id} nodes={outlineNodes} />
          <div className="rounded-md border bg-white p-4">
            <div className="font-medium">平台策略</div>
            <p className="mt-2 text-sm text-slate-600">开头：{platform.openingRules.join("；")}</p>
            <p className="mt-2 text-sm text-slate-600">审稿：{platform.reviewFocus.join("、")}</p>
            <p className="mt-2 text-sm text-slate-600">风险：{platform.risks.join("、")}</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-[1fr_360px]">
          <div id="create-chapter">
            <CreateChapterForm projectId={project.id} />
          </div>
          <div className="rounded-md border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <div className="font-medium">资料包导出</div>
                <p className="mt-1 text-xs leading-5 text-slate-500">正文、大纲、人物、设定和伏笔会一起进入 Markdown 备份包。</p>
              </div>
              <Link className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50" href={`/projects/${project.id}/exports`}>
                版本中心
              </Link>
            </div>
            <ExportMarkdownButton projectId={project.id} readiness={exportReadiness} snapshots={exportSnapshots} title={project.title} />
          </div>
        </div>
        <div id="model-task-audit">
          <ModelTaskAuditPanel projectId={project.id} />
        </div>
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
