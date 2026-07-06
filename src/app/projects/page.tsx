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
      <section className="grid gap-3">
        {dashboard.items.map((item) => (
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
            <div className="mt-3 h-2 overflow-hidden rounded bg-slate-100">
              <div className="h-full bg-slate-950" style={{ width: `${item.healthScore}%` }} />
            </div>
          </div>
        ))}
        {dashboard.items.length === 0 ? (
          <p className="rounded-md border border-dashed border-slate-300 p-4 text-sm text-slate-600">
            还没有作品。先用上面的模板向导创建一个。
          </p>
        ) : null}
      </section>
    </AppShell>
  );
}
