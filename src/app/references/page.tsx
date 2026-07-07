import Link from "next/link";
import { AppShell } from "@/components/app-shell/AppShell";
import { buildReferenceCaseLibraryView, type ReferenceCaseCategory } from "@/lib/references/openSourceCases";

type ReferencesPageProps = {
  searchParams?: Promise<{
    category?: string | string[];
  }>;
};

const categoryAccent: Record<ReferenceCaseCategory | "all", string> = {
  all: "border-slate-900 bg-slate-950 text-white",
  writing_tool: "border-emerald-300 bg-emerald-50 text-emerald-800",
  ai_workflow: "border-sky-300 bg-sky-50 text-sky-800",
  knowledge_workspace: "border-amber-300 bg-amber-50 text-amber-800",
  publishing_pipeline: "border-rose-300 bg-rose-50 text-rose-800",
};

function selectedCategoryParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function pathStatusClass(status: string) {
  if (status === "已落地") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  return "border-amber-200 bg-amber-50 text-amber-800";
}

export default async function ReferencesPage({ searchParams }: ReferencesPageProps) {
  const params = await searchParams;
  const view = buildReferenceCaseLibraryView({
    selectedCategory: selectedCategoryParam(params?.category),
  });

  return (
    <AppShell>
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">开源参考库</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
            30 个以上 GitHub 案例，按传统写作、AI 工作流、知识库和发布流水线拆开看，只取能帮助网文生产平台落地的部分。
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-slate-200 bg-white px-4 py-3">
            <div className="text-xs text-slate-500">平台范围</div>
            <div className="mt-1 text-2xl font-semibold">{view.platformScope.statusLabel}</div>
          </div>
          <div className="rounded-md border border-slate-200 bg-white px-4 py-3">
            <div className="text-xs text-slate-500">当前案例</div>
            <div className="mt-1 text-2xl font-semibold">{view.visibleCases.length} / {view.totalCases}</div>
          </div>
        </div>
      </div>

      <section className="mb-6 rounded-md border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-sm font-medium text-emerald-900">{view.platformScope.scopeDecision}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {view.platformScope.platformNames.map((name) => (
                <span className="rounded-md bg-white px-2 py-1 text-xs text-emerald-800" key={name}>
                  {name}
                </span>
              ))}
            </div>
          </div>
          <div className="w-fit rounded-md bg-white px-3 py-2 text-sm font-medium text-emerald-900">
            {view.platformScope.expansionLabel}
          </div>
        </div>
      </section>

      <section className="mb-6 rounded-md border border-slate-900 bg-slate-950 p-4 text-white">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-xs font-medium text-slate-300">毒舌 PM 平台范围回答</div>
            <h2 className="mt-1 text-lg font-semibold">{view.platformScope.pmFocus.headline}</h2>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-200">{view.platformScope.pmFocus.detail}</p>
          </div>
          <Link
            className="inline-flex w-fit shrink-0 rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-950 hover:bg-slate-100"
            href={view.platformScope.pmFocus.actionHref}
          >
            {view.platformScope.pmFocus.actionLabel}
          </Link>
        </div>
      </section>

      <section className="mb-6">
        <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-medium text-slate-950">8 平台执行状态卡</h2>
            <p className="mt-1 text-sm text-slate-500">每个平台都要落到写作、投稿、复盘三段动作，别只停在资料收集。</p>
          </div>
          <div className="w-fit rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white">
            8 平台已锁定
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {view.platformScope.platformCards.map((card) => (
            <article className="rounded-md border border-slate-200 bg-white p-4" key={card.platformId}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-medium text-slate-950">{card.platformName}</h3>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {card.pipelineStages.map((stage) => (
                      <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600" key={stage}>
                        {stage}
                      </span>
                    ))}
                  </div>
                </div>
                <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">已覆盖</span>
              </div>

              <div className="mt-4 grid gap-3 text-sm">
                <div>
                  <div className="text-xs font-medium text-slate-500">写作抓手</div>
                  <p className="mt-1 leading-6 text-slate-700">{card.writingFocus.join("、")}</p>
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-500">投稿抓手</div>
                  <p className="mt-1 leading-6 text-slate-700">{card.submissionFocus.join("、")}</p>
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-500">复盘指标</div>
                  <p className="mt-1 leading-6 text-slate-700">{card.feedbackMetric.join("、")}</p>
                </div>
              </div>

              <div className="mt-4 rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-700">
                {card.nextAction}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mb-6 grid gap-3 md:grid-cols-2 lg:grid-cols-5">
        {view.categoryTabs.map((tab) => {
          const active = tab.id === view.selectedCategory;
          return (
            <Link
              className={`rounded-md border p-3 text-sm transition hover:border-slate-400 ${
                active ? categoryAccent[tab.id] : "border-slate-200 bg-white text-slate-700"
              }`}
              href={tab.href}
              key={tab.id}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium">{tab.label}</span>
                <span className={`rounded-md px-2 py-1 text-xs ${active ? (tab.id === "all" ? "bg-white/20" : "bg-white/70") : "bg-slate-100"}`}>
                  {tab.count}
                </span>
              </div>
              <p className={`mt-2 line-clamp-2 leading-5 ${active ? (tab.id === "all" ? "text-white/80" : "text-slate-600") : "text-slate-500"}`}>
                {tab.productQuestion}
              </p>
            </Link>
          );
        })}
      </section>

      <section className="mb-6 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <div className="mb-3 font-medium text-slate-950">毒舌 PM 结论</div>
          <div className="grid gap-2">
            {view.productManagerNotes.map((note, index) => (
              <div className="rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-700" key={note}>
                <span className="mr-2 font-semibold text-slate-950">{index + 1}.</span>
                {note}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-slate-200 bg-white p-4">
          <div className="mb-3 font-medium text-slate-950">下一步开发动作</div>
          <div className="grid gap-2">
            {view.nextBuildMoves.map((move) => (
              <div className="rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-700" key={move}>
                {move}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mb-6 rounded-md border border-slate-200 bg-white p-4">
        <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-medium text-slate-950">毒舌 PM 开发路径</h2>
            <p className="mt-1 text-sm text-slate-500">把参考案例、8 平台和 AI 编辑部收束成当前可交付路线，逐条看证据和验收口径。</p>
          </div>
          <Link className="w-fit rounded-md border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50" href="/projects">
            进入作品工作台
          </Link>
        </div>
        <div className="mb-3 rounded-md border border-slate-900 bg-slate-950 p-4 text-white">
          <div className="text-xs text-slate-300">当前优先哨卡</div>
          <div className="mt-1 font-medium">{view.pmNextFocus.headline}</div>
          <p className="mt-2 text-sm leading-6 text-slate-200">{view.pmNextFocus.reason}</p>
          <p className="mt-1 text-xs leading-5 text-slate-300">验收证据：{view.pmNextFocus.proof}</p>
          <Link
            className="mt-3 inline-flex w-fit rounded-md bg-white px-3 py-2 text-xs font-medium text-slate-950 hover:bg-slate-100"
            href={view.pmNextFocus.href}
          >
            {view.pmNextFocus.actionLabel}
          </Link>
        </div>
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
          {view.developmentPath.map((item) => (
            <article className="rounded-md border border-slate-200 bg-slate-50 p-4" key={item.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs text-slate-500">{item.ownerRole}</div>
                  <h3 className="mt-1 font-medium text-slate-950">{item.title}</h3>
                </div>
                <span className={`w-fit rounded-md border px-2 py-1 text-xs font-medium ${pathStatusClass(item.status)}`}>
                  {item.status}
                </span>
              </div>
              <div className="mt-3 grid gap-2 text-sm leading-6 text-slate-700">
                <p>{item.currentEvidence}</p>
                <p className="font-medium text-slate-900">{item.nextAction}</p>
                <p className="text-xs leading-5 text-slate-500">验收：{item.acceptance}</p>
              </div>
              <div className="mt-3 rounded-md border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-600">
                <div className="font-medium text-slate-900">毒舌 PM 哨卡</div>
                <div className="mt-2">风险：{item.pmCheckpoint.risk}</div>
                <div>必须交付：{item.pmCheckpoint.mustShip}</div>
                <div>验收证据：{item.pmCheckpoint.proof}</div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {item.roleSummaries.map((role) => (
                  <span className="rounded-md bg-white px-2 py-1 text-[11px] text-slate-500" key={`${item.id}-${role.id}`}>
                    {role.roleName} · {role.modelOwner}
                  </span>
                ))}
              </div>
              <Link
                className="mt-3 inline-flex w-fit rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800"
                href={item.href}
              >
                {item.pmCheckpoint.actionLabel}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="mb-6 rounded-md border border-slate-200 bg-white p-4">
        <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-medium text-slate-950">AI 编辑部角色分工</h2>
            <p className="mt-1 text-sm text-slate-500">把开源案例沉淀成可执行岗位，分别接到模型、Skill、输入和产物。</p>
          </div>
          <Link className="w-fit rounded-md border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50" href="/settings/models#model-role-matrix">
            配置模型岗位
          </Link>
        </div>
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {view.rolePlaybook.map((role) => (
            <article className="rounded-md border border-slate-200 bg-slate-50 p-4" key={role.id}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-xs text-slate-500">{role.modelOwner} · {role.skillOwner}</div>
                  <h3 className="mt-1 font-medium text-slate-950">{role.roleName}</h3>
                </div>
                <span className="w-fit rounded-md bg-white px-2 py-1 text-xs font-medium text-slate-700">
                  {role.referenceCaseIds.length} 案例
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{role.whenToUse}</p>
              <div className="mt-3 grid gap-3 text-sm">
                <div>
                  <div className="text-xs font-medium text-slate-500">输入</div>
                  <p className="mt-1 leading-6 text-slate-700">{role.inputs.join("、")}</p>
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-500">产物</div>
                  <p className="mt-1 leading-6 text-slate-700">{role.outputs.join("、")}</p>
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-500">参考案例</div>
                  <p className="mt-1 leading-6 text-slate-700">{role.referenceCaseIds.join("、")}</p>
                </div>
              </div>
              <div className="mt-3 rounded-md bg-white p-3">
                <div className="text-sm font-medium leading-6 text-slate-800">{role.nextAction}</div>
                <Link
                  className="mt-3 inline-flex w-fit rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800"
                  href={role.workflowHref}
                >
                  {role.workflowActionLabel}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mb-6 rounded-md border border-slate-200 bg-white p-4">
        <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-medium text-slate-950">高频参考标签</h2>
            <p className="mt-1 text-sm text-slate-500">标签越集中，越说明这个方向值得被产品化。</p>
          </div>
          <Link className="w-fit rounded-md border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50" href="/projects">
            回到作品开发
          </Link>
        </div>
        <div className="flex flex-wrap gap-2">
          {view.topTags.map((item) => (
            <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700" key={item.tag}>
              {item.tag} · {item.count}
            </span>
          ))}
        </div>
      </section>

      <section className="grid gap-3">
        {view.visibleCases.map((item) => (
          <article className="rounded-md border border-slate-200 bg-white p-4" key={item.id}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-md border px-2 py-1 text-xs font-medium ${categoryAccent[item.category]}`}>
                    {view.categoryTabs.find((tab) => tab.id === item.category)?.label}
                  </span>
                  <h2 className="text-lg font-semibold text-slate-950">{item.name}</h2>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.referenceValue}</p>
              </div>
              <a
                className="w-fit rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white"
                href={item.sourceUrl}
                rel="noreferrer"
                target="_blank"
              >
                GitHub
              </a>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              <div className="rounded-md bg-emerald-50 p-3">
                <div className="text-xs font-medium text-emerald-700">可借鉴点</div>
                <p className="mt-1 text-sm leading-6 text-emerald-900">{item.aiWritingLesson}</p>
              </div>
              <div className="rounded-md bg-amber-50 p-3">
                <div className="text-xs font-medium text-amber-700">风险提醒</div>
                <p className="mt-1 text-sm leading-6 text-amber-900">{item.productRisk}</p>
              </div>
              <div className="rounded-md bg-sky-50 p-3">
                <div className="text-xs font-medium text-sky-700">产品标签</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {item.tags.map((tag) => (
                    <span className="rounded-md bg-white px-2 py-1 text-xs text-sky-800" key={tag}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </article>
        ))}
      </section>
    </AppShell>
  );
}
