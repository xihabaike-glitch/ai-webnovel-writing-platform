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
        <div className="rounded-md border border-slate-200 bg-white px-4 py-3">
          <div className="text-xs text-slate-500">当前案例</div>
          <div className="mt-1 text-2xl font-semibold">{view.visibleCases.length} / {view.totalCases}</div>
        </div>
      </div>

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
