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

        <section className="rounded-md border border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">毒舌 PM 总闸门</div>
              <h2 className="mt-1 font-medium text-slate-950">{overview.finalAcceptanceGate.title}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{overview.finalAcceptanceGate.verdict}</p>
              <p className="mt-2 text-xs leading-5 text-rose-700">{overview.finalAcceptanceGate.stopRule}</p>
            </div>
            <Link
              className="inline-flex w-fit shrink-0 rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              href={overview.finalAcceptanceGate.actionHref}
            >
              {overview.finalAcceptanceGate.actionLabel}
            </Link>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-4">
            <div className="rounded-md bg-slate-100 p-3 text-sm">
              <div className="text-xs text-slate-500">验收项</div>
              <div className="mt-1 font-semibold text-slate-950">{overview.finalAcceptanceGate.metrics.total}</div>
            </div>
            <div className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-900">
              <div className="text-xs opacity-75">已覆盖</div>
              <div className="mt-1 font-semibold">{overview.finalAcceptanceGate.metrics.ready}</div>
            </div>
            <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
              <div className="text-xs opacity-75">观察中</div>
              <div className="mt-1 font-semibold">{overview.finalAcceptanceGate.metrics.watch}</div>
            </div>
            <div className="rounded-md bg-rose-50 p-3 text-sm text-rose-900">
              <div className="text-xs opacity-75">阻塞</div>
              <div className="mt-1 font-semibold">{overview.finalAcceptanceGate.metrics.blocked}</div>
            </div>
          </div>
        </section>

        <section className="grid gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">当前验收路线</div>
              <h2 className="mt-1 font-medium text-slate-950">{overview.pipelineProofRoute.headline}</h2>
              <p className="mt-1 max-w-4xl text-sm leading-6 text-slate-600">{overview.pipelineProofRoute.pmRule}</p>
            </div>
            <Link
              className="w-fit rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"
              href={overview.currentPipelineValidation.actionHref}
            >
              {overview.currentPipelineValidation.actionLabel}
            </Link>
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            {overview.pipelineProofRoute.steps.map((step) => (
              <Link
                className="rounded-md border border-slate-200 bg-white p-4 text-sm hover:border-slate-400 hover:bg-slate-50"
                href={step.href}
                key={step.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs text-slate-500">第 {step.order} 步 · {step.owner}</div>
                    <h3 className="mt-1 font-medium text-slate-950">{step.title}</h3>
                  </div>
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                    验收
                  </span>
                </div>
                <p className="mt-3 leading-6 text-slate-600">{step.passCondition}</p>
                <p className="mt-2 text-xs leading-5 text-rose-700">{step.stopRule}</p>
              </Link>
            ))}
          </div>
        </section>

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
