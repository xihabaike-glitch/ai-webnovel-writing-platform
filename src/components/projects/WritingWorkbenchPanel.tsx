import Link from "next/link";
import type { WritingWorkbench, WorkbenchStatus } from "@/lib/projects/writingWorkbench";
import { WorkbenchModelActionPanel } from "./WorkbenchModelActionPanel";
import { WorkbenchModelTimelinePanel } from "./WorkbenchModelTimelinePanel";
import { WorkbenchQuickFixPanel } from "./WorkbenchQuickFixPanel";
import { WritingPathQuickFixButton } from "./WritingPathQuickFixButton";

function statusLabel(status: WorkbenchStatus) {
  if (status === "pass") return "已具备";
  if (status === "warn") return "待补强";
  return "缺口";
}

function statusClass(status: WorkbenchStatus) {
  if (status === "pass") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "warn") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-rose-200 bg-rose-50 text-rose-800";
}

type RecallPlanStatus = WritingWorkbench["contextFocus"]["recallPlan"]["status"];

function recallPlanStatusClass(status: RecallPlanStatus) {
  if (status === "ready") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "partial") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-rose-200 bg-rose-50 text-rose-800";
}

function recallPlanStatusLabel(status: RecallPlanStatus) {
  if (status === "ready") return "可执行";
  if (status === "partial") return "需补强";
  return "阻塞";
}

function recallPriorityLabel(priority: WritingWorkbench["contextFocus"]["recallPlan"]["items"][number]["priority"]) {
  if (priority === "must_use") return "必用";
  if (priority === "should_use") return "建议";
  return "可选";
}

function hrefWithGateReturn(href: string, gateReturnHref?: string | null) {
  if (!gateReturnHref || !href.startsWith("/") || href.startsWith("/gate")) return href;

  const hashIndex = href.indexOf("#");
  const base = hashIndex >= 0 ? href.slice(0, hashIndex) : href;
  const hash = hashIndex >= 0 ? href.slice(hashIndex) : "";
  if (base.includes("gateReturn=")) return href;
  const separator = base.includes("?") ? "&" : "?";

  return `${base}${separator}gateReturn=${encodeURIComponent(gateReturnHref)}${hash}`;
}

export function WritingWorkbenchPanel({
  gateReturnHref,
  workbench,
}: {
  gateReturnHref?: string | null;
  workbench: WritingWorkbench;
}) {
  const generalPendingCandidates = workbench.pendingCandidates.filter((candidate) => candidate.source !== "first_three_rewrite_candidate");

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <div className="text-sm text-slate-500">写作工作台</div>
          <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">{workbench.projectTitle}</h2>
              <p className="mt-1 text-sm text-slate-600">{workbench.summary.oneLineBrief}</p>
            </div>
            <Link
              className="inline-flex w-fit items-center rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              href={hrefWithGateReturn(workbench.heroAction.href, gateReturnHref)}
            >
              {workbench.heroAction.label}
            </Link>
          </div>
          <p className="mt-3 text-sm text-slate-600">{workbench.heroAction.reason}</p>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-md bg-slate-50 p-3">
              <div className="text-xs text-slate-500">平台</div>
              <div className="mt-1 font-medium text-slate-950">{workbench.summary.targetPlatformName}</div>
            </div>
            <div className="rounded-md bg-slate-50 p-3">
              <div className="text-xs text-slate-500">成熟度</div>
              <div className="mt-1 text-2xl font-semibold text-slate-950">{workbench.summary.maturityScore}</div>
            </div>
            <div className="rounded-md bg-slate-50 p-3">
              <div className="text-xs text-slate-500">字数进度</div>
              <div className="mt-1 text-2xl font-semibold text-slate-950">{workbench.summary.progressPercent}%</div>
            </div>
          </div>
        </div>

        <div className="rounded-md bg-slate-50 p-3">
          <div className="font-medium text-slate-950">快捷入口</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {workbench.quickLinks.map((link) => (
              <Link
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                href={hrefWithGateReturn(link.href, gateReturnHref)}
                key={link.href}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-md border border-slate-900 bg-slate-950 p-4 text-white">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-xs font-medium text-slate-300">毒舌 PM 当前只写这一块</div>
            <h3 className="mt-1 text-lg font-semibold">{workbench.pmFocus.headline}</h3>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-200">{workbench.pmFocus.detail}</p>
            <div className="mt-2 text-xs text-slate-400">{workbench.pmFocus.scopeLabel}</div>
          </div>
          <Link
            className="inline-flex w-fit shrink-0 rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-950 hover:bg-slate-100"
            href={hrefWithGateReturn(workbench.pmFocus.actionHref, gateReturnHref)}
          >
            {workbench.pmFocus.actionLabel}
          </Link>
        </div>
      </div>

      <div className="mt-4 rounded-md border border-slate-200 bg-white p-3" id="today-writing-path">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-sm font-medium text-slate-950">今日写作路径</div>
            <p className="mt-1 text-xs text-slate-500">按大树顺序推进：先开头和结尾，再主干、分支、叶片和土壤；每一步过停手线再往后走。</p>
          </div>
          <span className="w-fit rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
            {workbench.writingPath.length} 步
          </span>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {workbench.writingPath.map((pathItem) => (
            <div className="rounded-md bg-slate-50 p-3" key={pathItem.id}>
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-medium text-slate-500">第 {pathItem.order} 步 · {pathItem.label}</div>
                <span className={`rounded-md border px-2 py-1 text-xs ${statusClass(pathItem.status)}`}>
                  {statusLabel(pathItem.status)}
                </span>
              </div>
              <div className="mt-2 line-clamp-1 text-sm font-medium text-slate-950">{pathItem.title}</div>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">{pathItem.detail}</p>
              <p className="mt-2 text-xs leading-5 text-slate-500">停手线：{pathItem.stopRule}</p>
              <Link
                className="mt-3 inline-flex w-fit rounded-md bg-white px-3 py-2 text-xs font-medium text-slate-950 ring-1 ring-slate-200 hover:bg-slate-100"
                href={hrefWithGateReturn(pathItem.href, gateReturnHref)}
              >
                {pathItem.actionLabel}
              </Link>
              {pathItem.quickFix ? <WritingPathQuickFixButton fix={pathItem.quickFix} /> : null}
            </div>
          ))}
        </div>
      </div>

      {workbench.firstThreeAdoption.status === "pending" ? (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-sm font-medium text-amber-950">{workbench.firstThreeAdoption.title}</div>
              <p className="mt-1 text-xs leading-5 text-amber-800">{workbench.firstThreeAdoption.detail}</p>
            </div>
            <Link
              className="inline-flex w-fit rounded-md bg-amber-950 px-3 py-2 text-sm font-medium text-white hover:bg-amber-900"
              href={hrefWithGateReturn(workbench.firstThreeAdoption.href, gateReturnHref)}
            >
              {workbench.firstThreeAdoption.actionLabel}
            </Link>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            {workbench.firstThreeAdoption.candidates.map((candidate) => (
              <Link className="rounded-md bg-white p-3 text-sm hover:bg-amber-100" href={hrefWithGateReturn(candidate.href, gateReturnHref)} key={candidate.id}>
                <div className="font-medium text-slate-950">第 {candidate.chapterOrder} 章 · {candidate.chapterTitle}</div>
                <div className="mt-1 text-xs text-slate-500">{candidate.sourceLabel} · {candidate.wordCount} 字</div>
                <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-600">{candidate.preview}</p>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {workbench.firstThreeAdoption.followupChain.length ? (
        <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-sm font-medium text-emerald-950">前三章采纳后续链路</div>
              <p className="mt-1 text-xs leading-5 text-emerald-800">采纳后的新正文必须重新审稿，再回发布质检，别拿旧判断给新稿放行。</p>
            </div>
            <span className="w-fit rounded-md bg-white/80 px-2 py-1 text-xs font-medium text-emerald-800">
              {workbench.firstThreeAdoption.followupChain.length} 个后续任务
            </span>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {workbench.firstThreeAdoption.followupChain.map((step) => (
              <Link className="rounded-md bg-white/80 p-3 text-sm hover:bg-white" href={hrefWithGateReturn(step.href, gateReturnHref)} key={step.id}>
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium text-slate-950">{step.label}</div>
                  <span className={`rounded-md border px-2 py-1 text-xs ${statusClass(step.status)}`}>
                    {statusLabel(step.status)}
                  </span>
                </div>
                <div className="mt-1 text-xs text-slate-500">{step.title}</div>
                <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-600">{step.detail}</p>
                <div className="mt-2 text-xs font-medium text-emerald-900">{step.actionLabel}</div>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {generalPendingCandidates.length ? (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-sm font-medium text-amber-950">待采纳候选稿</div>
              <p className="mt-1 text-xs text-amber-800">AI 已经生成了候选正文，但还没有写入当前稿；先确认再继续放大生产。</p>
            </div>
            <span className="w-fit rounded-md bg-white px-2 py-1 text-xs font-medium text-amber-800">
              {generalPendingCandidates.length} 个待处理
            </span>
          </div>
          <div className="mt-3 grid gap-2 lg:grid-cols-3">
            {generalPendingCandidates.map((candidate) => (
              <div className="rounded-md bg-white p-3 text-sm" key={candidate.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-slate-950">第 {candidate.chapterOrder} 章 · {candidate.chapterTitle}</div>
                    <div className="mt-1 text-xs text-slate-500">{candidate.sourceLabel} · {candidate.wordCount} 字</div>
                  </div>
                  <Link className="shrink-0 text-xs font-medium text-slate-950 underline" href={hrefWithGateReturn(candidate.href, gateReturnHref)}>
                    处理
                  </Link>
                </div>
                <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-600">{candidate.preview}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-4 rounded-md border border-slate-200 bg-white p-3" id="start-soil">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-sm font-medium text-slate-950">开局土壤资产</div>
            <p className="mt-1 text-xs text-slate-500">{workbench.startSoil.summary}</p>
          </div>
          <span className={`w-fit rounded-md border px-2 py-1 text-xs ${statusClass(workbench.startSoil.status)}`}>
            {statusLabel(workbench.startSoil.status)}
          </span>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {workbench.startSoil.assets.map((asset) => (
            <Link
              className="rounded-md bg-slate-50 p-3 hover:bg-slate-100"
              href={hrefWithGateReturn(asset.href, gateReturnHref)}
              key={asset.id}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium text-slate-950">{asset.label}</div>
                <span className={`rounded-md border px-2 py-1 text-xs ${statusClass(asset.status)}`}>
                  {statusLabel(asset.status)}
                </span>
              </div>
              <div className="mt-2 line-clamp-1 text-sm font-medium text-slate-950">{asset.title}</div>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">{asset.detail}</p>
            </Link>
          ))}
        </div>
      </div>

      <WorkbenchQuickFixPanel quickFixes={workbench.quickFixes} />
      <WorkbenchModelActionPanel actions={workbench.modelActions} />
      <WorkbenchModelTimelinePanel timeline={workbench.modelTimeline} />

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        {workbench.treeBlocks.map((block) => (
          <div className="rounded-md border border-slate-200 p-3" key={block.type}>
            <div className="flex items-center justify-between gap-2">
              <div className="font-medium text-slate-950">{block.label}</div>
              <span className={`rounded-md border px-2 py-1 text-xs ${statusClass(block.status)}`}>
                {statusLabel(block.status)}
              </span>
            </div>
            <div className="mt-1 text-xs text-slate-500">{block.count} 个素材</div>
            <Link className="mt-3 block text-sm font-medium text-slate-950 hover:text-slate-700" href={hrefWithGateReturn(block.href, gateReturnHref)}>
              {block.focusTitle}
            </Link>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{block.focusDetail}</p>
            <p className="mt-2 text-sm text-slate-600">{block.nextAction || block.note}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-4">
        <div className="rounded-md bg-slate-50 p-3">
          <div className="text-sm font-medium text-slate-950">章节焦点</div>
          <div className="mt-2 text-sm text-slate-600">
            {workbench.chapterFocus.nextChapter ? (
              <>
                <div className="font-medium text-slate-950">{workbench.chapterFocus.nextChapter.title}</div>
                <div className="mt-1">
                  第 {workbench.chapterFocus.nextChapter.order} 章 · {workbench.chapterFocus.nextChapter.wordCount} 字 · {workbench.chapterFocus.nextChapter.status}
                </div>
              </>
            ) : (
              <div>还没有章节。</div>
            )}
            <div className="mt-2">{workbench.chapterFocus.nextAction}</div>
          </div>
        </div>

        <div className="rounded-md bg-slate-50 p-3">
          <div className="text-sm font-medium text-slate-950">人物弧光</div>
          <div className="mt-2 text-sm text-slate-600">
            完整 {workbench.characterFocus.completeCharacters}/{workbench.characterFocus.totalCharacters} 个
          </div>
          <p className="mt-2 text-sm text-slate-600">{workbench.characterFocus.nextAction}</p>
        </div>

        <div className="rounded-md bg-slate-50 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-medium text-slate-950">上下文召回</div>
            <span className={`rounded-md border px-2 py-1 text-xs ${statusClass(workbench.contextFocus.status)}`}>
              {statusLabel(workbench.contextFocus.status)}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">{workbench.contextFocus.summary}</p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-500">
            <div>人物 {workbench.contextFocus.sourceCounts.characters}</div>
            <div>设定 {workbench.contextFocus.sourceCounts.worldEntries}</div>
            <div>线索 {workbench.contextFocus.sourceCounts.storyLines}</div>
            <div>历史 {workbench.contextFocus.sourceCounts.historyChapters}</div>
          </div>
          {workbench.contextFocus.warnings[0] ? (
            <p className="mt-2 text-xs leading-5 text-amber-700">{workbench.contextFocus.warnings[0]}</p>
          ) : null}
        </div>

        <div className="rounded-md bg-slate-50 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-medium text-slate-950">模型建议</div>
            <span className="text-xs text-slate-500">失败 {workbench.modelFocus.failedTaskCount}</span>
          </div>
          <div className="mt-2 grid gap-2 text-sm text-slate-600">
            {workbench.modelFocus.nextRoutes.slice(0, 3).map((route) => (
              <div key={route.task}>
                <div className="font-medium text-slate-950">{route.task}</div>
                <div>{route.reason}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-md border border-slate-200 bg-white p-3" id="context-recall">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-sm font-medium text-slate-950">项目土壤召回</div>
            <p className="mt-1 text-xs text-slate-500">人物、世界观、伏笔和历史章节会进入模型上下文；缺口会直接影响生成和审稿。</p>
          </div>
          <span className={`w-fit rounded-md border px-2 py-1 text-xs ${statusClass(workbench.contextFocus.status)}`}>
            {statusLabel(workbench.contextFocus.status)}
          </span>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {workbench.contextFocus.recallCards.map((card) => (
            <div className="rounded-md bg-slate-50 p-3" key={card.id}>
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium text-slate-950">{card.label}</div>
                <span className={`rounded-md border px-2 py-1 text-xs ${statusClass(card.status)}`}>
                  {statusLabel(card.status)}
                </span>
              </div>
              <div className="mt-1 text-xs text-slate-500">{card.sourceCount} 条可召回素材</div>
              <div className="mt-2 text-sm font-medium text-slate-950">{card.headline}</div>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">{card.detail}</p>
              <p className="mt-2 text-xs leading-5 text-slate-600">{card.nextAction}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 border-t border-slate-200 pt-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-sm font-medium text-slate-950">{workbench.contextFocus.recallPlan.headline}</div>
              <p className="mt-1 text-xs leading-5 text-slate-500">{workbench.contextFocus.recallPlan.nextAction}</p>
            </div>
            <span className={`w-fit rounded-md border px-2 py-1 text-xs ${recallPlanStatusClass(workbench.contextFocus.recallPlan.status)}`}>
              {recallPlanStatusLabel(workbench.contextFocus.recallPlan.status)}
            </span>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {workbench.contextFocus.recallPlan.items.slice(0, 4).map((item) => (
              <div className="rounded-md bg-slate-50 p-3 text-sm" key={item.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-medium text-slate-950">{item.sourceLabel}</div>
                  <span className="rounded-md bg-white px-2 py-1 text-xs text-slate-600">{recallPriorityLabel(item.priority)}</span>
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-600">{item.usage}</p>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{item.promptLine}</p>
              </div>
            ))}
            {workbench.contextFocus.recallPlan.items.length === 0 ? (
              <p className="text-sm text-slate-600">还没有可执行召回项。</p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
