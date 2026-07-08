import Link from "next/link";
import { AppShell } from "@/components/app-shell/AppShell";
import { buildDevelopmentOverview } from "@/lib/development/developmentOverview";

function sectionAccent(index: number) {
  const accents = [
    "border-slate-900 bg-slate-950 text-white",
    "border-emerald-200 bg-emerald-50 text-emerald-950",
    "border-sky-200 bg-sky-50 text-sky-950",
    "border-amber-200 bg-amber-50 text-amber-950",
    "border-rose-200 bg-rose-50 text-rose-950",
  ];

  return accents[index] ?? "border-slate-200 bg-white text-slate-950";
}

function auditStatusClass(status: "ready" | "watch" | "blocked") {
  if (status === "ready") return "bg-emerald-100 text-emerald-950";
  if (status === "watch") return "bg-amber-100 text-amber-950";
  return "bg-rose-100 text-rose-950";
}

function auditStatusLabel(status: "ready" | "watch" | "blocked") {
  if (status === "ready") return "已覆盖";
  if (status === "watch") return "观察中";
  return "阻塞";
}

const visibleAcceptanceCriteriaMap = [
  {
    route: "/projects",
    criteria: "开书与发布复盘",
    proof: "开头钩子、结尾承诺、主干分支、发布包、版本基线、真实反馈和复盘指标。",
  },
  {
    route: "/tasks",
    criteria: "任务回执",
    proof: "执行角色、输入、输出、人工验收和下一步必须可见。",
  },
  {
    route: "/dispatch",
    criteria: "派单回执",
    proof: "完成依据必须能回到总闸门复检，不能只写已完成。",
  },
  {
    route: "/gate",
    criteria: "总闸门放量",
    proof: "样本、复查、质量、成本、失败率和恢复证据缺一项就不放大。",
  },
  {
    route: "/failures",
    criteria: "失败修复",
    proof: "失败原因、修复泳道、重试样本、恢复观察和暂停批量结论必须齐备。",
  },
];

export default function DevelopmentDocsPage() {
  const overview = buildDevelopmentOverview();

  return (
    <AppShell>
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">开发文档总览</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
            把毒舌 PM 路线、8 平台范围、AI 模型接口和大树写作流程收束到一页。重点不是展示资料多，而是证明产品能写作、能投稿、能复盘。
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-slate-200 bg-white px-4 py-3">
            <div className="text-xs text-slate-500">核心平台</div>
            <div className="mt-1 text-xl font-semibold">{overview.platformScope.statusLabel}</div>
          </div>
          <div className="rounded-md border border-slate-200 bg-white px-4 py-3">
            <div className="text-xs text-slate-500">参考案例</div>
            <div className="mt-1 text-xl font-semibold">{overview.referenceCount} 个</div>
          </div>
          <div className="rounded-md border border-slate-200 bg-white px-4 py-3">
            <div className="text-xs text-slate-500">模型接口</div>
            <div className="mt-1 text-xl font-semibold">{overview.modelInterfaces.total} 个</div>
          </div>
        </div>
      </div>

      <section className="mb-6 rounded-md border border-slate-900 bg-slate-950 p-4 text-white">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-xs font-medium text-slate-300">毒舌 PM 开发文档焦点</div>
            <h2 className="mt-1 text-lg font-semibold">{overview.pmFocus.headline}</h2>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-200">{overview.pmFocus.detail}</p>
            <p className="mt-2 text-xs leading-5 text-slate-400">验收证据：{overview.pmFocus.proof}</p>
          </div>
          <Link
            className="inline-flex w-fit shrink-0 rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-950 hover:bg-slate-100"
            href={overview.pmFocus.actionHref}
          >
            {overview.pmFocus.actionLabel}
          </Link>
        </div>
      </section>

      <section className="mb-6 rounded-md border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="font-medium text-slate-950">{overview.deliveryAudit.headline}</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">{overview.deliveryAudit.pmVerdict}</p>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div className="rounded-md bg-slate-100 px-3 py-2">
              <div className="font-semibold text-slate-950">{overview.deliveryAudit.summary.total}</div>
              <div className="mt-1 text-slate-500">总项</div>
            </div>
            <div className="rounded-md bg-emerald-50 px-3 py-2">
              <div className="font-semibold text-emerald-900">{overview.deliveryAudit.summary.ready}</div>
              <div className="mt-1 text-emerald-700">已覆盖</div>
            </div>
            <div className="rounded-md bg-amber-50 px-3 py-2">
              <div className="font-semibold text-amber-900">{overview.deliveryAudit.summary.watch}</div>
              <div className="mt-1 text-amber-700">观察</div>
            </div>
            <div className="rounded-md bg-rose-50 px-3 py-2">
              <div className="font-semibold text-rose-900">{overview.deliveryAudit.summary.blocked}</div>
              <div className="mt-1 text-rose-700">阻塞</div>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {overview.deliveryAudit.items.map((item) => (
            <article className="rounded-md border border-slate-200 bg-slate-50 p-4" key={item.id}>
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-medium text-slate-950">{item.title}</h3>
                <span className={`shrink-0 rounded-md px-2 py-1 text-xs font-medium ${auditStatusClass(item.status)}`}>
                  {auditStatusLabel(item.status)}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{item.requirement}</p>
              <div className="mt-3 rounded-md bg-white p-3 text-xs leading-5 text-slate-700">
                证据：{item.evidence}
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-500">下一步：{item.nextStep}</p>
              <Link
                className="mt-3 inline-flex w-fit rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800"
                href={item.href}
              >
                查看入口
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="mb-6 rounded-md border border-slate-200 bg-white p-4">
        <div className="mb-3">
          <h2 className="font-medium text-slate-950">端到端可见验收口径地图</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
            页面上看不到的证据，不算证据；没有下一步的回执，不算闭环。
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {visibleAcceptanceCriteriaMap.map((entry) => (
            <article className="rounded-md border border-slate-200 bg-slate-50 p-3" key={entry.route}>
              <div className="text-xs font-medium text-slate-500">{entry.route}</div>
              <h3 className="mt-1 font-medium text-slate-950">{entry.criteria}</h3>
              <p className="mt-2 text-xs leading-5 text-slate-600">{entry.proof}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mb-6 rounded-md border border-slate-200 bg-white p-4">
        <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="font-medium text-slate-950">{overview.requirementTraceability.headline}</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">{overview.requirementTraceability.pmRule}</p>
          </div>
          <Link className="w-fit rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800" href={overview.currentPipelineValidation.actionHref}>
            {overview.currentPipelineValidation.actionLabel}
          </Link>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {overview.requirementTraceability.items.map((item) => (
            <article className="rounded-md border border-slate-200 bg-slate-50 p-4" key={item.id}>
              <div className="text-xs font-medium text-slate-500">原始要求</div>
              <p className="mt-1 text-sm leading-6 text-slate-700">{item.originalRequest}</p>
              <div className="mt-3 rounded-md bg-white p-3 text-xs leading-5 text-slate-700">
                当前证据：{item.currentEvidence}
              </div>
              <div className="mt-2 rounded-md bg-white p-3 text-xs leading-5 text-emerald-800">
                验收信号：{item.acceptanceSignal}
              </div>
              <Link
                className="mt-3 inline-flex w-fit rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
                href={item.href}
              >
                查看证据入口
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="mb-6 rounded-md border border-slate-200 bg-white p-4">
        <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-medium text-slate-950">{overview.pipelineProofRoute.headline}</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">{overview.pipelineProofRoute.pmRule}</p>
          </div>
          <Link className="w-fit rounded-md border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50" href={overview.currentPipelineValidation.actionHref}>
            {overview.currentPipelineValidation.actionLabel}
          </Link>
        </div>
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {overview.pipelineProofRoute.steps.map((step) => (
            <article className="rounded-md border border-slate-200 bg-slate-50 p-4" key={step.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs text-slate-500">第 {step.order} 步 · {step.owner}</div>
                  <h3 className="mt-1 font-medium text-slate-950">{step.title}</h3>
                </div>
                <Link
                  className="shrink-0 rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800"
                  href={step.href}
                >
                  进入
                </Link>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{step.evidence}</p>
              <div className="mt-3 grid gap-2 text-xs leading-5">
                <div className="rounded-md bg-white p-3 text-emerald-800">通过：{step.passCondition}</div>
                <div className="rounded-md bg-white p-3 text-rose-800">停手：{step.stopRule}</div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mb-6 rounded-md border border-slate-900 bg-slate-950 p-4 text-white">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-xs font-medium text-slate-300">观察项：写作到投稿流水线</div>
            <h2 className="mt-1 text-lg font-semibold">{overview.currentPipelineValidation.headline}</h2>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-200">{overview.currentPipelineValidation.pmVerdict}</p>
            <div className="mt-2 text-xs text-slate-400">
              下一步：{overview.currentPipelineValidation.nextStepTitle}
            </div>
          </div>
          <Link
            className="inline-flex w-fit shrink-0 rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-950 hover:bg-slate-100"
            href={overview.currentPipelineValidation.actionHref}
          >
            {overview.currentPipelineValidation.actionLabel}
          </Link>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <div className="rounded-md bg-white/10 p-3">
            <div className="text-xs font-medium text-emerald-200">必须补齐的证据</div>
            <ul className="mt-2 grid gap-2 text-sm leading-6 text-slate-100">
              {overview.currentPipelineValidation.requiredEvidence.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-md bg-white/10 p-3">
            <div className="text-xs font-medium text-rose-200">缺失就停手</div>
            <ul className="mt-2 grid gap-2 text-sm leading-6 text-slate-100">
              {overview.currentPipelineValidation.stopIfMissing.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mb-6 rounded-md border border-slate-200 bg-white p-4">
        <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-medium text-slate-950">{overview.pipelineProofRoute.acceptanceReceipt.title}</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">{overview.pipelineProofRoute.acceptanceReceipt.pmInstruction}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {overview.pipelineProofRoute.acceptanceReceipt.outcomeOptions.map((option) => (
              <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700" key={option}>
                {option === "pass" ? "通过" : option === "repair" ? "退回修复" : "暂停批量"}
              </span>
            ))}
          </div>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {overview.pipelineProofRoute.acceptanceReceipt.fields.map((field) => {
            const step = overview.pipelineProofRoute.steps.find((item) => item.id === field.stepId);
            return (
              <article className="rounded-md border border-slate-200 bg-slate-50 p-4" key={field.stepId}>
                <div className="text-xs text-slate-500">对应步骤：{step?.title}</div>
                <h3 className="mt-1 font-medium text-slate-950">{field.evidencePrompt}</h3>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="rounded-md bg-white p-3">
                    <div className="text-xs font-medium text-emerald-900">必须看到</div>
                    <ul className="mt-2 grid gap-1 text-xs leading-5 text-slate-600">
                      {field.requiredSignals.map((signal) => (
                        <li key={signal}>{signal}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-md bg-white p-3">
                    <div className="text-xs font-medium text-rose-900">直接退回</div>
                    <ul className="mt-2 grid gap-1 text-xs leading-5 text-slate-600">
                      {field.rejectIf.map((signal) => (
                        <li key={signal}>{signal}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <p className="mt-3 rounded-md bg-white p-3 text-xs leading-5 text-slate-700">负责人确认：{field.ownerConfirmation}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mb-6 grid gap-3 lg:grid-cols-5">
        {overview.docSections.map((section, index) => (
          <article className={`rounded-md border p-4 ${sectionAccent(index)}`} key={section.id}>
            <div className="text-xs font-medium opacity-70">文档模块</div>
            <h2 className="mt-1 font-semibold">{section.title}</h2>
            <p className="mt-2 text-sm leading-6 opacity-85">{section.summary}</p>
            <div className="mt-3 grid gap-2 text-xs leading-5 opacity-85">
              {section.evidenceItems.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
            <div className="mt-3 rounded-md bg-white/70 p-3 text-xs leading-5 text-slate-700">
              验收：{section.acceptance}
            </div>
            <Link
              className="mt-3 inline-flex w-fit rounded-md bg-white px-3 py-2 text-xs font-medium text-slate-950 hover:bg-slate-100"
              href={section.href}
            >
              查看证据
            </Link>
          </article>
        ))}
      </section>

      <section className="mb-6 rounded-md border border-slate-200 bg-white p-4">
        <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-medium text-slate-950">大树写作流程</h2>
            <p className="mt-1 text-sm text-slate-500">先开头和结尾，再主干、分支、叶片和土壤。AI 只能沿着这棵树补内容，不能把树砍了重写。</p>
          </div>
          <Link className="w-fit rounded-md border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50" href="/projects">
            进入写作流程
          </Link>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {overview.treeWorkflow.map((step, index) => (
            <article className="rounded-md border border-slate-200 bg-slate-50 p-4" key={step.id}>
              <div className="text-xs text-slate-500">第 {index + 1} 步</div>
              <h3 className="mt-1 font-medium text-slate-950">{step.name}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{step.productMeaning}</p>
              <div className="mt-3 rounded-md bg-white p-3 text-xs leading-5 text-slate-700">
                毒舌 PM：{step.pmRule}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mb-6 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="font-medium text-slate-950">模型接口预留</h2>
              <p className="mt-1 text-sm text-slate-500">{overview.modelInterfaces.readyLabel}</p>
            </div>
            <Link className="w-fit rounded-md border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50" href="/settings/models#model-role-matrix">
              配置模型岗位
            </Link>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {overview.modelInterfaces.items.map((item) => (
              <article className="rounded-md border border-slate-200 bg-slate-50 p-4" key={item.providerId}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-medium text-slate-950">{item.providerName}</h3>
                    <p className="mt-1 text-xs text-slate-500">{item.ownerRole}</p>
                  </div>
                  <span className="rounded-md bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-900">已预留</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-700">{item.reservedFor}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-slate-200 bg-white p-4">
          <div className="mb-3 font-medium text-slate-950">下一步开发动作</div>
          <div className="grid gap-2">
            {overview.nextActions.map((action) => (
              <Link className="rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-700 hover:bg-slate-100" href={action.href} key={action.label}>
                <span className="font-medium text-slate-950">{action.label}</span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">{action.detail}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
