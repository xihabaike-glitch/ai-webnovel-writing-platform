import Link from "next/link";
import { AppShell } from "@/components/app-shell/AppShell";
import { buildDevelopmentOverview } from "@/lib/development/developmentOverview";

export default function HomePage() {
  const overview = buildDevelopmentOverview();

  return (
    <AppShell>
      <section className="grid gap-6">
        <div className="rounded-md border border-slate-900 bg-slate-950 p-5 text-white">
          <div className="text-xs font-medium text-slate-300">毒舌 PM 当前只看这一条交付线</div>
          <h1 className="mt-2 max-w-4xl text-3xl font-semibold">写作品，不是陪聊天框闲聊</h1>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-200">
            {overview.currentPipelineValidation.pmVerdict}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              className="rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-950 hover:bg-slate-100"
              href={overview.currentPipelineValidation.actionHref}
            >
              {overview.currentPipelineValidation.actionLabel}
            </Link>
            <Link
              className="rounded-md border border-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
              href="/projects"
            >
              进入作品工作台
            </Link>
          </div>
        </div>

        <section className="grid gap-3 md:grid-cols-3">
          <div className="rounded-md border border-slate-200 bg-white p-4">
            <div className="text-xs text-slate-500">平台范围</div>
            <div className="mt-1 font-semibold text-slate-950">{overview.platformScope.statusLabel}</div>
            <p className="mt-2 text-sm leading-6 text-slate-600">{overview.platformScope.expansionLabel}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-white p-4">
            <div className="text-xs text-slate-500">模型接口</div>
            <div className="mt-1 font-semibold text-slate-950">{overview.modelInterfaces.readyLabel}</div>
            <p className="mt-2 text-sm leading-6 text-slate-600">Claude、DeepSeek、Kimi、GPT 分别进入写作岗位。</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-white p-4">
            <div className="text-xs text-slate-500">参考案例</div>
            <div className="mt-1 font-semibold text-slate-950">{overview.referenceCount} 个开源参考</div>
            <p className="mt-2 text-sm leading-6 text-slate-600">只抽取能服务网文生产的产品动作。</p>
          </div>
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-medium text-slate-950">下一步入口</h2>
              <p className="mt-1 text-sm text-slate-500">不加平台，先把写作到投稿的证据链打穿。</p>
            </div>
            <Link className="w-fit rounded-md border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50" href="/docs">
              查看开发文档
            </Link>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {overview.nextActions.map((action) => (
              <Link
                className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm hover:border-slate-400 hover:bg-white"
                href={action.href}
                key={action.href}
              >
                <div className="font-medium text-slate-950">{action.label}</div>
                <p className="mt-1 leading-6 text-slate-600">{action.detail}</p>
              </Link>
            ))}
          </div>
        </section>
      </section>
    </AppShell>
  );
}
