import Link from "next/link";
import { AppShell } from "@/components/app-shell/AppShell";
import { ProjectForm } from "@/components/projects/ProjectForm";
import { prisma } from "@/lib/db/prisma";
import { buildProjectListDashboard } from "@/lib/projects/projectListDashboard";
import type { FirstDayRiskLevel } from "@/lib/projects/firstDayWorkflow";

function numberText(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

function moneyText(value: number) {
  return `$${value.toFixed(4)}`;
}

function riskClass(level: FirstDayRiskLevel) {
  if (level === "blocked") return "border-rose-200 bg-rose-50 text-rose-800";
  if (level === "watch") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-emerald-200 bg-emerald-50 text-emerald-800";
}

interface ProjectsPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function riskLevelLabel(level: FirstDayRiskLevel) {
  if (level === "blocked") return "止损";
  if (level === "watch") return "观察";
  return "标准";
}

function pipelineStepClass(status: "done" | "current" | "blocked") {
  if (status === "done") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (status === "current") return "border-slate-900 bg-slate-950 text-white";
  return "border-slate-200 bg-slate-50 text-slate-500";
}

function pipelineStepLabel(status: "done" | "current" | "blocked") {
  if (status === "done") return "已过";
  if (status === "current") return "当前";
  return "待验";
}

function realSampleValidationClass(status: "blocked" | "needs_acceptance" | "ready_for_gate" | "ready_for_publish_review") {
  if (status === "blocked") return "border-rose-200 bg-rose-50 text-rose-900";
  if (status === "needs_acceptance") return "border-amber-200 bg-amber-50 text-amber-900";
  if (status === "ready_for_gate") return "border-sky-200 bg-sky-50 text-sky-900";
  return "border-emerald-200 bg-emerald-50 text-emerald-900";
}

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const params = await searchParams;
  const experienceLaunch = {
    platformId: firstValue(params?.startPlatform) ?? "",
    tactic: firstValue(params?.startTactic) ?? "",
    source: firstValue(params?.startSource) ?? "",
  };
  const [projects, providers] = await Promise.all([
    prisma.project.findMany({
      include: {
        chapters: { orderBy: { order: "asc" } },
        outlineNodes: { orderBy: [{ depth: "asc" }, { order: "asc" }] },
        characters: { orderBy: { createdAt: "asc" } },
        worldEntries: { orderBy: [{ type: "asc" }, { createdAt: "asc" }] },
        gateDispatchTasks: {
          where: { dispatchKey: { startsWith: "first-day:" } },
          select: {
            dispatchKey: true,
            state: true,
            completionEvidence: true,
          },
        },
        aiTasks: {
          include: {
            modelProvider: {
              select: {
                providerId: true,
                displayName: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.modelProvider.findMany({
      orderBy: [{ enabled: "desc" }, { updatedAt: "desc" }],
    }),
  ]);
  const dashboard = buildProjectListDashboard(projects, providers);
  const pipelineStepParam = firstValue(params?.pipelineStep);
  const activePipelineStep = dashboard.pipelineProofSummary.stepCounts.find((step) => step.id === pipelineStepParam) ?? null;
  const invalidPipelineStep = !activePipelineStep
    ? pipelineStepParam ? `流水线步骤「${pipelineStepParam}」不存在，已显示全部作品。` : null
    : null;
  const activePipelineValidationReceipt = activePipelineStep?.validationReceipt ?? dashboard.pipelineProofSummary.validationReceipt;
  const activePipelineAction = {
    recommendedActionHref: activePipelineStep?.recommendedActionHref ?? dashboard.pipelineProofSummary.recommendedActionHref,
    recommendedActionLabel: activePipelineStep?.recommendedActionLabel ?? dashboard.pipelineProofSummary.recommendedActionLabel,
    recommendedProjectTitle: activePipelineStep?.recommendedProjectTitle ?? dashboard.pipelineProofSummary.recommendedProjectTitle,
  };
  const activePipelineSummary = {
    headline: activePipelineStep ? `当前筛选：${activePipelineStep.count}/${dashboard.pipelineProofSummary.totalProjects} 本卡在「${activePipelineStep.label}」。` : dashboard.pipelineProofSummary.headline,
    countLabel: activePipelineStep
      ? `${activePipelineStep.count}/${dashboard.pipelineProofSummary.totalProjects} 本卡在 ${activePipelineStep.label}`
      : `${dashboard.pipelineProofSummary.bottleneckCount}/${dashboard.pipelineProofSummary.totalProjects} 本卡在 ${dashboard.pipelineProofSummary.bottleneckLabel}`,
  };
  const visibleItems = activePipelineStep
    ? dashboard.items.filter((item) => item.pipelineProof.currentStepId === activePipelineStep.id)
    : dashboard.items;

  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">作品</h1>
          <p className="mt-1 text-sm text-slate-600">先看哪本书该救、哪本书该推，再进入具体工作台。</p>
        </div>
      </div>
      <div className="mb-6" id="create-project">
        <ProjectForm experienceLaunch={experienceLaunch} />
      </div>
      <section className="mb-6 grid gap-3 md:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <div className="text-xs text-slate-500">项目</div>
          <div className="mt-1 text-2xl font-semibold">{dashboard.overview.totalProjects}</div>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <div className="text-xs text-slate-500">活跃</div>
          <div className="mt-1 text-2xl font-semibold">{dashboard.overview.activeProjects}</div>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <div className="text-xs text-slate-500">均分</div>
          <div className="mt-1 text-2xl font-semibold">{dashboard.overview.averageHealthScore}</div>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <div className="text-xs text-slate-500">总字数</div>
          <div className="mt-1 text-2xl font-semibold">{numberText(dashboard.overview.totalWords)}</div>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <div className="text-xs text-slate-500">AI 成本</div>
          <div className="mt-1 text-2xl font-semibold">{moneyText(dashboard.overview.totalAiCostUsd)}</div>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <div className="text-xs text-slate-500">待处理</div>
          <div className="mt-1 text-2xl font-semibold">{dashboard.overview.projectsNeedingAction}</div>
        </div>
      </section>
      <section className="mb-6 grid gap-3 md:grid-cols-3">
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-emerald-900">
          <div className="text-xs opacity-75">标准推进</div>
          <div className="mt-1 text-2xl font-semibold">{dashboard.overview.standardProjects}</div>
          <div className="mt-1 text-xs opacity-75">可以按首日流程进入生成、审稿和发布预检。</div>
        </div>
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900">
          <div className="text-xs opacity-75">观察小样本</div>
          <div className="mt-1 text-2xl font-semibold">{dashboard.overview.watchProjects}</div>
          <div className="mt-1 text-xs opacity-75">只验证首轮通过线，别急着批量放大。</div>
        </div>
        <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-rose-900">
          <div className="text-xs opacity-75">止损恢复</div>
          <div className="mt-1 text-2xl font-semibold">{dashboard.overview.blockedProjects}</div>
          <div className="mt-1 text-xs opacity-75">先证明问题改掉，再允许正文生产。</div>
        </div>
      </section>
      <section className="mb-6 rounded-md border border-slate-900 bg-slate-950 p-4 text-white">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-xs font-medium text-slate-300">毒舌 PM 当前只看这一件事</div>
            <h2 className="mt-1 text-lg font-semibold">{dashboard.pmFocus.headline}</h2>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-200">{dashboard.pmFocus.detail}</p>
            <div className="mt-2 text-xs text-slate-400">{dashboard.pmFocus.scopeLabel}</div>
          </div>
          <Link className="w-fit rounded-md bg-white px-3 py-2 text-sm font-medium text-slate-950 hover:bg-slate-100" href={dashboard.pmFocus.actionHref}>
            {dashboard.pmFocus.actionLabel}
          </Link>
        </div>
      </section>
      <section className="mb-6 rounded-md border border-slate-200 bg-white p-4">
        <div className="mb-4 rounded-md border border-slate-200 bg-slate-50 p-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">真实流水线验收判定</div>
              <h2 className="mt-1 font-medium text-slate-950">{dashboard.pipelineAcceptanceSummary.headline}</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">{dashboard.pipelineAcceptanceSummary.verdict}</p>
            </div>
            <Link className="w-fit rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800" href={dashboard.pipelineAcceptanceSummary.primaryActionHref}>
              {dashboard.pipelineAcceptanceSummary.primaryActionLabel}
            </Link>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-4">
            <div className="rounded-md bg-white p-3 text-sm">
              <div className="text-xs text-slate-500">作品样本</div>
              <div className="mt-1 font-semibold text-slate-950">{dashboard.pipelineAcceptanceSummary.totalProjects}</div>
            </div>
            <div className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-900">
              <div className="text-xs opacity-75">通过</div>
              <div className="mt-1 font-semibold">{dashboard.pipelineAcceptanceSummary.passCount}</div>
            </div>
            <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
              <div className="text-xs opacity-75">暂停批量</div>
              <div className="mt-1 font-semibold">{dashboard.pipelineAcceptanceSummary.holdBatchCount}</div>
            </div>
            <div className="rounded-md bg-rose-50 p-3 text-sm text-rose-900">
              <div className="text-xs opacity-75">需修复</div>
              <div className="mt-1 font-semibold">{dashboard.pipelineAcceptanceSummary.repairCount}</div>
            </div>
          </div>
          <div className="mt-3 rounded-md bg-white p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-xs font-medium text-slate-500">真实样本验收队列</div>
                <p className="mt-1 text-xs leading-5 text-slate-600">先修复证据，再进总闸门，最后看发布复盘；不要用批量生成绕过这张队列。</p>
              </div>
              <span className="text-xs text-slate-500">最多显示前 5 本</span>
            </div>
            <div className="mt-3 grid gap-2">
              {dashboard.realSampleAcceptanceQueue.map((sample) => (
                <div className="flex flex-col gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm md:flex-row md:items-center md:justify-between" key={sample.projectId}>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-slate-950">{sample.projectTitle}</span>
                      <span className="rounded-md bg-white px-2 py-1 text-xs text-slate-600">{sample.platformName}</span>
                      <span className="rounded-md bg-slate-950 px-2 py-1 text-xs font-medium text-white">{sample.outcomeLabel}</span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-600">{sample.reason}</p>
                  </div>
                  <Link className="w-fit rounded-md bg-white px-3 py-2 text-xs font-medium text-slate-950 hover:bg-slate-100" href={sample.actionHref}>
                    {sample.actionLabel}
                  </Link>
                </div>
              ))}
              {dashboard.realSampleAcceptanceQueue.length === 0 ? (
                <div className="rounded-md border border-dashed border-slate-300 p-3 text-xs text-slate-500">
                  暂无作品进入验收队列。先创建作品并补开书骨架。
                </div>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500">组合流水线瓶颈</div>
            <h2 className="mt-1 font-medium text-slate-950">{activePipelineSummary.headline}</h2>
            <p className="mt-1 text-sm text-slate-500">
              当前只统计 8 个核心平台作品，不把新增平台当作进度。
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700">
              {activePipelineSummary.countLabel}
            </div>
            <Link className="rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800" href={activePipelineAction.recommendedActionHref}>
              {activePipelineAction.recommendedProjectTitle ? `${activePipelineAction.recommendedActionLabel} · ${activePipelineAction.recommendedProjectTitle}` : activePipelineAction.recommendedActionLabel}
            </Link>
          </div>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          {dashboard.pipelineProofSummary.stepCounts.map((step, index) => (
            <Link
              className={`rounded-md border p-3 text-sm ${activePipelineStep?.id === step.id ? "border-slate-900 bg-slate-950 text-white" : "border-slate-200 bg-slate-50 hover:bg-slate-100"}`}
              href={step.filterHref}
              key={step.id}
            >
              <div className={`text-xs ${activePipelineStep?.id === step.id ? "text-slate-300" : "text-slate-500"}`}>第 {index + 1} 步</div>
              <div className={`mt-1 font-medium ${activePipelineStep?.id === step.id ? "text-white" : "text-slate-950"}`}>{step.label}</div>
              <div className={`mt-1 text-xs ${activePipelineStep?.id === step.id ? "text-slate-300" : "text-slate-500"}`}>{step.count} 本当前卡点</div>
            </Link>
          ))}
        </div>
        {invalidPipelineStep ? (
          <div className="mt-3 flex flex-col gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
            <span>{invalidPipelineStep}</span>
            <Link className="w-fit rounded-md bg-white px-3 py-2 text-xs font-medium text-amber-900 hover:bg-amber-100" href="/projects#pipeline-projects">
              查看全部作品
            </Link>
          </div>
        ) : null}
        <div className="mt-3 grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700">
            <div className="text-xs font-medium text-slate-500">组合级验收回执</div>
            <div className="mt-1 font-medium text-slate-950">{activePipelineValidationReceipt.headline}</div>
            <p className="mt-1 text-xs leading-5 text-slate-600">{activePipelineValidationReceipt.proofPrompt}</p>
            <div className="mt-2 grid gap-1 text-xs">
              {activePipelineValidationReceipt.requiredEvidence.map((evidence) => (
                <span key={evidence}>必须看到：{evidence}</span>
              ))}
            </div>
          </div>
          <div className="rounded-md border border-rose-100 bg-rose-50 p-3 text-xs leading-5 text-rose-800">
            <div className="font-medium">缺失就停手</div>
            <div className="mt-2 grid gap-1">
              {activePipelineValidationReceipt.stopIfMissing.map((rule) => (
                <span key={rule}>{rule}</span>
              ))}
            </div>
          </div>
        </div>
        {activePipelineStep ? (
          <div className="mt-3 flex flex-col gap-2 rounded-md bg-slate-50 p-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
            <span>当前只看卡在「{activePipelineStep.label}」的作品。</span>
            <Link className="w-fit rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100" href="/projects#pipeline-projects">
              查看全部作品
            </Link>
          </div>
        ) : null}
      </section>
      <section className="mb-6 rounded-md border border-slate-200 bg-white p-4">
        <div className="mb-3">
          <h2 className="font-medium text-slate-950">角色入口落点</h2>
          <p className="mt-1 text-sm text-slate-500">从参考库过来的角色按钮先落到这里，再选择作品进入对应工作区。</p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {dashboard.roleEntrypoints.map((entry) => (
            <article className="rounded-md border border-slate-200 bg-slate-50 p-3" id={entry.id} key={entry.id}>
              <div className="text-sm font-medium text-slate-950">{entry.title}</div>
              <p className="mt-1 text-sm leading-6 text-slate-600">{entry.detail}</p>
              <div className="mt-3 grid gap-2">
                {entry.workflowSteps.map((step) => (
                  <div className="rounded-md bg-white p-2 text-xs leading-5 text-slate-700" key={`${entry.id}-${step.stage}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-slate-950">{step.stage}</span>
                      <span className="text-slate-500">{step.ownerRole}</span>
                    </div>
                    <p className="mt-1">{step.action}</p>
                    <div className="mt-1 font-medium text-slate-900">产物：{step.output}</div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {entry.roleIds.map((roleId) => (
                  <span className="rounded-md bg-white px-2 py-1 text-[11px] text-slate-500" key={`${entry.id}-${roleId}`}>
                    {roleId}
                  </span>
                ))}
              </div>
              <div className="mt-3 grid gap-2">
                {dashboard.items.slice(0, 3).map((item) => (
                  <Link
                    className="rounded-md bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
                    href={`/projects/${item.id}${entry.projectAnchor}`}
                    key={`${entry.id}-${item.id}`}
                  >
                    {entry.actionLabel} · {item.title}
                  </Link>
                ))}
                {dashboard.items.length === 0 ? (
                  <Link
                    className="rounded-md bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
                    href="#create-project"
                  >
                    先创建作品
                  </Link>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="grid gap-3" id="pipeline-projects">
        {visibleItems.map((item) => (
          <div
            key={item.id}
            className="rounded-md border border-slate-200 bg-white p-4"
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link className="text-lg font-semibold text-slate-950 hover:underline" href={`/projects/${item.id}`}>
                    {item.title}
                  </Link>
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">{item.healthLabel}</span>
                  <span className={`rounded-md border px-2 py-1 text-xs font-medium ${riskClass(item.riskLevel)}`}>
                    {riskLevelLabel(item.riskLevel)} · {item.riskLabel}
                  </span>
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  {item.platformName} · {item.genre} · {item.chapterCount} 章 · 更新 {new Date(item.updatedAt).toLocaleDateString()}
                </div>
                {item.riskLevel !== "standard" ? (
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                    {item.riskHeadline}{item.riskDetail}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                <Link className="rounded-md bg-slate-950 px-3 py-2 font-medium text-white" href={item.nextActionHref}>
                  {item.nextAction}
                </Link>
                <Link className="rounded-md border border-slate-200 px-3 py-2 font-medium hover:bg-slate-50" href={`/projects/${item.id}`}>
                  进入工作台
                </Link>
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-5">
              <div className="rounded-md bg-slate-50 p-3">
                <div className="text-xs text-slate-500">健康分</div>
                <div className="mt-1 text-2xl font-semibold">{item.healthScore}</div>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <div className="text-xs text-slate-500">首日进度</div>
                <div className="mt-1 text-2xl font-semibold">{item.firstDayProgressPercent}%</div>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <div className="text-xs text-slate-500">字数进度</div>
                <div className="mt-1 text-2xl font-semibold">{item.wordProgressPercent}%</div>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <div className="text-xs text-slate-500">审稿覆盖</div>
                <div className="mt-1 text-2xl font-semibold">{item.reviewCoveragePercent}%</div>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <div className="text-xs text-slate-500">AI 成本/失败</div>
                <div className="mt-1 text-2xl font-semibold">{moneyText(item.aiCostUsd)}</div>
                <div className="mt-1 text-xs text-slate-500">失败率 {item.aiFailureRatePercent}%</div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
              {item.riskFlags.map((flag) => (
                <span className="rounded-md bg-slate-100 px-2 py-1" key={flag}>{flag}</span>
              ))}
            </div>
            <div className={`mt-4 rounded-md border p-3 ${realSampleValidationClass(item.realSampleValidation.status)}`}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="text-xs opacity-75">真实作品样本验收</div>
                  <div className="mt-1 font-medium">{item.realSampleValidation.headline}</div>
                  <p className="mt-1 text-xs leading-5 opacity-80">{item.realSampleValidation.detail}</p>
                </div>
                <Link className="w-fit rounded-md bg-white px-3 py-2 text-xs font-medium text-slate-950 hover:bg-slate-100" href={item.realSampleValidation.nextActionHref}>
                  {item.realSampleValidation.nextActionLabel}
                </Link>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                <div className="rounded-md bg-white/70 p-3 text-xs leading-5">
                  <div className="font-medium text-slate-950">已有证据</div>
                  <div className="mt-2 grid gap-1 text-slate-700">
                    {item.realSampleValidation.completedEvidence.length > 0 ? item.realSampleValidation.completedEvidence.map((evidence) => (
                      <span key={evidence}>{evidence}</span>
                    )) : <span>暂无可用证据。</span>}
                  </div>
                </div>
                <div className="rounded-md bg-white/70 p-3 text-xs leading-5">
                  <div className="font-medium text-slate-950">缺口</div>
                  <div className="mt-2 grid gap-1 text-slate-700">
                    {item.realSampleValidation.missingEvidence.length > 0 ? item.realSampleValidation.missingEvidence.map((evidence) => (
                      <span key={evidence}>{evidence}</span>
                    )) : <span>当前样本验收没有明显缺口，下一步看总闸门和发布复盘。</span>}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="text-xs text-slate-500">写作到投稿流水线</div>
                  <div className="mt-1 font-medium text-slate-950">{item.pipelineProof.headline}</div>
                  <p className="mt-1 text-xs leading-5 text-slate-600">
                    {item.pipelineProof.steps.find((step) => step.id === item.pipelineProof.currentStepId)?.evidence}
                  </p>
                  <div className="mt-3 grid gap-2 text-xs leading-5 md:grid-cols-2">
                    <div className="rounded-md bg-white p-3 text-slate-700">
                      <div className="font-medium text-emerald-800">{item.pipelineProof.validationReceipt.headline}</div>
                      <p className="mt-1 text-slate-600">{item.pipelineProof.validationReceipt.proofPrompt}</p>
                      <div className="mt-2 grid gap-1">
                        {item.pipelineProof.validationReceipt.requiredEvidence.map((evidence) => (
                          <span key={evidence}>必须：{evidence}</span>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-md bg-white p-3 text-rose-800">
                      <div className="font-medium">缺失就停手</div>
                      <div className="mt-2 grid gap-1">
                        {item.pipelineProof.validationReceipt.stopIfMissing.map((rule) => (
                          <span key={rule}>{rule}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <Link className="w-fit rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800" href={item.pipelineProof.nextActionHref}>
                  {item.pipelineProof.nextActionLabel}
                </Link>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-3 xl:grid-cols-6">
                {item.pipelineProof.steps.map((step, index) => (
                  <Link className={`rounded-md border p-2 text-xs leading-5 ${pipelineStepClass(step.status)}`} href={step.href} key={`${item.id}-${step.id}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span>{index + 1}. {step.label}</span>
                      <span className="shrink-0 opacity-75">{pipelineStepLabel(step.status)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded bg-slate-100">
              <div className="h-full bg-slate-950" style={{ width: `${item.healthScore}%` }} />
            </div>
          </div>
        ))}
        {visibleItems.length === 0 ? (
          <p className="rounded-md border border-dashed border-slate-300 p-4 text-sm text-slate-600">
            {dashboard.items.length === 0 ? "还没有作品。先用上面的模板向导创建一个。" : "这个流水线步骤下暂时没有作品卡点。"}
          </p>
        ) : null}
      </section>
    </AppShell>
  );
}
