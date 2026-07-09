"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { platformDeliveryScope, platformProfiles, type LengthType, type PlatformId } from "@/lib/platforms/platformProfiles";
import { getPlatformWritingStyle } from "@/lib/platforms/writingStyleTemplates";
import {
  launchPlatformId,
  preferLaunchExperience,
  type FinalDeliveryArchiveLaunch,
} from "@/lib/projects/finalDeliveryArchiveLaunch";
import {
  buildGateBatchTacticEffectReview,
  buildGatePlatformDecisionTimeline,
  buildGatePlatformTacticExperienceLibrary,
  fetchGateKnowledgeFeedbackReceipts,
  fetchPersistedGateActionReceipts,
  fetchPersistedGateDispatchTasks,
  type GateBatchTacticEffectItem,
  type GatePlatformTacticExperienceItem,
} from "@/lib/projects/gateActionReceipts";
import {
  buildProjectStartExperienceHandoff,
  buildProjectStartExperienceDigest,
  buildProjectStartKnowledgeFeedbackExperiences,
  buildProjectStartRiskGate,
  buildProjectStartRecoveryHandoffPanel,
  buildProjectStartPlatformExperienceGuide,
  buildProjectStartModelRouteExperienceFromReceipts,
  buildProjectStartTacticAdvice,
  selectProjectStartTacticEvidence,
  selectProjectStartTemplateFromExperienceGuide,
  type ProjectStartModelRouteExperience,
  type ProjectStartPlatformExperienceStatus,
  type ProjectStartRiskGateLevel,
  type ProjectStartTacticAdviceStatus,
} from "@/lib/projects/projectStartTactics";
import { projectTemplates, type ProjectTemplate } from "@/lib/projects/projectTemplates";

const lengthOptions: Array<{ id: LengthType; label: string; targetWordCount: number; pmRule: string }> = [
  { id: "short_10k", label: "1 万字短篇", targetWordCount: 10000, pmRule: "短篇只留一个强钩子、一个核心反转和一个闭环结尾。" },
  { id: "mid_50k", label: "5-6 万字中篇", targetWordCount: 60000, pmRule: "中篇必须有清晰人物弧光、三段主干和可控支线。" },
  { id: "long_300k_plus", label: "30 万字以上长篇", targetWordCount: 300000, pmRule: "长篇先定开头结尾，再立主干、分支和阶段爽点。" },
  { id: "mega_1m_plus", label: "100 万字以上超长篇", targetWordCount: 1000000, pmRule: "超长篇必须用大树结构管理主线、势力、地图和长期悬念。" },
];

function lengthOptionFor(id: LengthType) {
  return lengthOptions.find((option) => option.id === id) ?? lengthOptions[0];
}

function tacticAdviceClass(status: ProjectStartTacticAdviceStatus) {
  if (status === "history_blocked") return "border-rose-200 bg-rose-50 text-rose-900";
  if (status === "history_watch") return "border-amber-200 bg-amber-50 text-amber-900";
  if (status === "history_usable") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  return "border-slate-200 bg-slate-50 text-slate-800";
}

function platformExperienceClass(status: ProjectStartPlatformExperienceStatus) {
  if (status === "recommended") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (status === "watch") return "border-amber-200 bg-amber-50 text-amber-900";
  if (status === "avoid") return "border-rose-200 bg-rose-50 text-rose-900";
  return "border-slate-200 bg-slate-50 text-slate-800";
}

function riskGateClass(level: ProjectStartRiskGateLevel) {
  if (level === "blocked") return "border-rose-200 bg-rose-50 text-rose-900";
  if (level === "watch") return "border-amber-200 bg-amber-50 text-amber-900";
  return "border-emerald-200 bg-emerald-50 text-emerald-900";
}

function firstDayExecutionOutcome(label: string) {
  if (label === "执行扩展") {
    return {
      badge: "可以扩展",
      title: "首日执行结论：可以扩展",
      nextMove: "下一本书可沿用生成-审稿-二改顺序，先扩到下一章或下一小段小样本。",
      boundary: "仍要回填曝光、点击、收藏、追读，未过下一轮数据前不直接批量复制。",
    };
  }
  if (label === "执行观察") {
    return {
      badge: "继续观察",
      title: "首日执行结论：继续观察",
      nextMove: "下一本书只复用执行顺序，先补追读、收藏和点击证据。",
      boundary: "追读证据不足前，不扩展章节，也不把观察样本写成成功打法。",
    };
  }
  if (label === "执行避坑") {
    return {
      badge: "先避坑",
      title: "首日执行结论：先避坑",
      nextMove: "下一本书先重做入口卖点、前三章兑现或平台匹配，再跑一轮小样本。",
      boundary: "不要复用首日未过线的开头、平台包装或扩展节奏。",
    };
  }
  return null;
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

export function ProjectForm({
  experienceLaunch,
  gateReturnHref,
}: {
  experienceLaunch?: FinalDeliveryArchiveLaunch;
  gateReturnHref?: string | null;
}) {
  const router = useRouter();
  const launchPlatform = launchPlatformId(experienceLaunch);
  const defaultTemplate = projectTemplates.find((template) => template.platformId === launchPlatform) ?? projectTemplates[0];
  const userTouchedStartDefaultsRef = useRef(false);
  const historyDefaultAppliedRef = useRef(Boolean(launchPlatform));
  const launchAppliedRef = useRef(false);
  const [templateId, setTemplateId] = useState(defaultTemplate.id);
  const [title, setTitle] = useState(defaultTemplate.titleSeed);
  const [genre, setGenre] = useState(defaultTemplate.genre);
  const [updateCadence, setUpdateCadence] = useState(defaultTemplate.updateCadence);
  const [platformId, setPlatformId] = useState<PlatformId>(defaultTemplate.platformId);
  const [lengthType, setLengthType] = useState<LengthType>(defaultTemplate.lengthType);
  const [targetWordCount, setTargetWordCount] = useState(lengthOptionFor(defaultTemplate.lengthType).targetWordCount);
  const [sellingPoint, setSellingPoint] = useState(defaultTemplate.sellingPoint);
  const [historyExperiences, setHistoryExperiences] = useState<GatePlatformTacticExperienceItem[]>([]);
  const [batchTacticEffects, setBatchTacticEffects] = useState<GateBatchTacticEffectItem[]>([]);
  const [modelRouteExperience, setModelRouteExperience] = useState<ProjectStartModelRouteExperience[]>([]);
  const [riskAcknowledged, setRiskAcknowledged] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedProfile = platformProfiles.find((profile) => profile.id === platformId) ?? platformProfiles[0];
  const selectedTemplate = projectTemplates.find((template) => template.id === templateId) ?? defaultTemplate;
  const selectedLengthOption = lengthOptionFor(lengthType);
  const selectedStyle = getPlatformWritingStyle(selectedProfile.id);
  const platformExperienceGuide = buildProjectStartPlatformExperienceGuide({
    platforms: platformProfiles,
    experiences: historyExperiences,
    batchEffects: batchTacticEffects,
    limit: platformProfiles.length,
  });
  const recommendedStartTemplate = selectProjectStartTemplateFromExperienceGuide({
    templates: projectTemplates,
    guide: platformExperienceGuide,
    fallbackTemplate: defaultTemplate,
  });
  const selectedEvidence = selectProjectStartTacticEvidence({
    platform: selectedProfile,
    experiences: historyExperiences,
    batchEffects: batchTacticEffects,
  });
  const selectedPlatformGuide = selectedEvidence.guideItem;
  const selectedBatchEffect = selectedEvidence.batchEffect;
  const selectedRiskGate = buildProjectStartRiskGate(selectedPlatformGuide);
  const canSubmit = !selectedRiskGate.requiresConfirmation || riskAcknowledged;
  const tacticAdvice = buildProjectStartTacticAdvice({
    platform: selectedProfile,
    template: selectedTemplate,
    style: selectedStyle,
    experience: selectedEvidence.experience,
    batchEffect: selectedEvidence.batchEffect,
    modelRoutes: modelRouteExperience,
  });
  const startExperienceHandoff = buildProjectStartExperienceHandoff({
    platform: selectedProfile,
    template: selectedTemplate,
    guide: platformExperienceGuide,
    advice: tacticAdvice,
    riskGate: selectedRiskGate,
    recommendedTemplate: recommendedStartTemplate,
  });
  const startExperienceDigest = buildProjectStartExperienceDigest({
    platformName: selectedProfile.name,
    handoff: startExperienceHandoff,
    advice: tacticAdvice,
  });
  const firstDayOutcome = firstDayExecutionOutcome(tacticAdvice.label);
  const recoveryHandoffPanel = buildProjectStartRecoveryHandoffPanel(startExperienceHandoff);
  const finalDeliveryArchiveBridge = {
    archiveSignal: platformExperienceGuide.summary.total > 0
      ? `已读取 ${platformExperienceGuide.summary.total} 条平台归档经验，其中 ${platformExperienceGuide.summary.recommended} 条可优先复用。`
      : "暂无最终交付归档经验，本次开书会先按模板小样本验证，并把结果回写经验库。",
    recommendedPlatformLabel: selectedPlatformGuide
      ? `${selectedPlatformGuide.platformName} · ${selectedPlatformGuide.label}`
      : `${selectedProfile.name} · 模板默认`,
    recommendedTemplateLabel: recommendedStartTemplate.label,
    selectedArchiveEvidence: selectedPlatformGuide?.evidence[0]
      ?? startExperienceDigest.evidence[0]
      ?? "当前没有可直接复用的交付证据，先保留首轮数据回收。",
    selectedArchiveNextUse: selectedPlatformGuide
      ? `本次开书先执行「${tacticAdvice.openingMove}」，再用「${tacticAdvice.verificationMove}」验收。`
      : "本次开书先按平台模板跑首章样本，交付后再沉淀为下一本书的土壤。",
  };
  const launchRequested = Boolean(launchPlatform && experienceLaunch?.tactic);
  const launchMatched = launchRequested
    && selectedEvidence.experience?.platformId === launchPlatform
    && selectedEvidence.experience?.tactic === experienceLaunch?.tactic;
  const finalDeliveryArchiveLaunch = experienceLaunch?.source === "final-delivery-archive";

  useEffect(() => {
    let ignore = false;

    async function loadHistoricalExperience() {
      try {
        const [receipts, tasks, modelRouteReceipts, knowledgeFeedbackReceipts] = await Promise.all([
          fetchPersistedGateActionReceipts(),
          fetchPersistedGateDispatchTasks(),
          fetchPersistedGateActionReceipts({ executionType: "model_route", limit: 20 }),
          fetchGateKnowledgeFeedbackReceipts({ limit: 30 }),
        ]);
        if (ignore) return;
        const timeline = buildGatePlatformDecisionTimeline({
          receipts,
          tasks,
          limit: platformProfiles.length,
        });
        const batchEffectReview = buildGateBatchTacticEffectReview(receipts, platformProfiles.length);
        const library = buildGatePlatformTacticExperienceLibrary(timeline, platformProfiles.length, batchEffectReview.items);
        const knowledgeExperiences = buildProjectStartKnowledgeFeedbackExperiences(knowledgeFeedbackReceipts, platformProfiles.length);
        const mergedExperiences = preferLaunchExperience([...knowledgeExperiences, ...library.items], experienceLaunch);
        setHistoryExperiences(mergedExperiences);
        setBatchTacticEffects(batchEffectReview.items);
        setModelRouteExperience(buildProjectStartModelRouteExperienceFromReceipts(modelRouteReceipts));
        const historicalGuide = buildProjectStartPlatformExperienceGuide({
          platforms: platformProfiles,
          experiences: mergedExperiences,
          batchEffects: batchEffectReview.items,
        });
        const recommendedTemplate = selectProjectStartTemplateFromExperienceGuide({
          templates: projectTemplates,
          guide: historicalGuide,
          fallbackTemplate: defaultTemplate,
        });
        const launchTemplate = launchPlatform
          ? projectTemplates.find((template) => template.platformId === launchPlatform) ?? null
          : null;
        if (!userTouchedStartDefaultsRef.current && !launchAppliedRef.current && launchTemplate) {
          launchAppliedRef.current = true;
          applyTemplateFields(launchTemplate);
        } else if (!userTouchedStartDefaultsRef.current && !historyDefaultAppliedRef.current && recommendedTemplate.id !== defaultTemplate.id) {
          historyDefaultAppliedRef.current = true;
          applyTemplateFields(recommendedTemplate);
        }
      } catch {
        if (!ignore) {
          setHistoryExperiences([]);
          setBatchTacticEffects([]);
          setModelRouteExperience([]);
        }
      }
    }

    void loadHistoricalExperience();

    return () => {
      ignore = true;
    };
  }, [experienceLaunch, launchPlatform]);

  function markUserTouchedStartDefaults() {
    userTouchedStartDefaultsRef.current = true;
  }

  function applyTemplateFields(template: ProjectTemplate) {
    setTemplateId(template.id);
    setTitle(template.titleSeed);
    setGenre(template.genre);
    setUpdateCadence(template.updateCadence);
    setPlatformId(template.platformId);
    setLengthType(template.lengthType);
    setTargetWordCount(lengthOptionFor(template.lengthType).targetWordCount);
    setSellingPoint(template.sellingPoint);
    setRiskAcknowledged(false);
  }

  function applyTemplate(nextTemplateId: string) {
    markUserTouchedStartDefaults();
    const template = projectTemplates.find((item) => item.id === nextTemplateId) ?? defaultTemplate;
    applyTemplateFields(template);
  }

  function applyPlatform(nextPlatformId: PlatformId) {
    markUserTouchedStartDefaults();
    const template = projectTemplates.find((item) => item.platformId === nextPlatformId) ?? defaultTemplate;
    applyTemplateFields(template);
  }

  async function createProject(formData: FormData) {
    setError(null);
    if (selectedRiskGate.requiresConfirmation && !riskAcknowledged) {
      setError("这个平台命中避坑信号。请先确认恢复条件，再创建作品。");
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: String(formData.get("title") ?? ""),
          targetPlatform: String(formData.get("platform") ?? "fanqie"),
          targetLengthType: String(formData.get("length") ?? selectedProfile.defaultLengthType),
          targetWordCount,
          genre: String(formData.get("genre") ?? ""),
          sellingPoint: String(formData.get("sellingPoint") ?? ""),
          updateCadence: String(formData.get("updateCadence") ?? ""),
          templateId: String(formData.get("templateId") ?? ""),
          startTacticAdvice: tacticAdvice,
          startExperienceHandoff,
        }),
      });

      if (!response.ok) {
        throw new Error("创建作品失败，请检查必填字段。");
      }

      const payload = (await response.json()) as {
        project: { id: string };
        launchReceipt?: { href: string; nextStepId: string; actionLabel: string } | null;
      };
      const params = payload.launchReceipt
        ? `?firstDayLaunch=1&nextStep=${encodeURIComponent(payload.launchReceipt.nextStepId)}`
        : "";
      router.push(hrefWithGateReturn(`/projects/${payload.project.id}${params}#first-day-workflow`, gateReturnHref));
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "创建作品失败。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form action={createProject} className="grid gap-4 rounded-md border border-slate-200 bg-white p-4">
      {launchRequested ? (
        <div className={`rounded-md border p-3 text-sm ${launchMatched ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
          <div className="font-medium">{finalDeliveryArchiveLaunch ? "最终交付归档打法" : "经验开书入口"}</div>
          <p className="mt-1 leading-6">
            {launchMatched
              ? finalDeliveryArchiveLaunch
                ? `已匹配最终交付归档打法「${selectedEvidence.experience?.platformName} · ${selectedEvidence.experience?.tactic}」，这条归档会影响推荐平台、模板、首章动作和停手线。`
                : `已匹配「${selectedEvidence.experience?.platformName} · ${selectedEvidence.experience?.tactic}」，本次开书会优先使用这条历史打法。`
              : `正在按「${experienceLaunch?.tactic}」寻找历史经验；若当前数据暂未加载到精确样本，会先切到对应平台模板。`}
          </p>
        </div>
      ) : null}
      <div>
        <label className="text-sm font-medium" htmlFor="templateId">
          开书模板
        </label>
        <select
          className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
          id="templateId"
          name="templateId"
          onChange={(event) => applyTemplate(event.target.value)}
          value={templateId}
        >
          {projectTemplates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.label}
            </option>
          ))}
        </select>
        <div className="mt-2 rounded-md bg-slate-50 p-3 text-sm text-slate-600">
          <div className="font-medium text-slate-900">{selectedTemplate.label}</div>
          <div className="mt-1">{selectedTemplate.positioning}</div>
          <div className="mt-1">前三章：{selectedTemplate.firstThree.map((chapter) => chapter.title).join(" / ")}</div>
        </div>
      </div>
      {platformExperienceGuide.summary.total ? (
        <div className="grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-medium text-slate-950">平台经验指南</div>
              <p className="mt-1 text-xs text-slate-500">按历史最终判定和批量打法复盘，先看平台该优先、观察还是避坑。</p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-md border border-emerald-200 bg-white px-2 py-1 text-emerald-700">推荐 {platformExperienceGuide.summary.recommended}</span>
              <span className="rounded-md border border-amber-200 bg-white px-2 py-1 text-amber-700">观察 {platformExperienceGuide.summary.watch}</span>
              <span className="rounded-md border border-rose-200 bg-white px-2 py-1 text-rose-700">避坑 {platformExperienceGuide.summary.avoid}</span>
              <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-600">模板 {platformExperienceGuide.summary.template}</span>
            </div>
          </div>
          {platformExperienceGuide.nextActions.length ? (
            <div className="grid gap-2 md:grid-cols-2">
              {platformExperienceGuide.nextActions.slice(0, 2).map((action) => (
                <div className="rounded-md bg-white p-2 text-xs leading-5 text-slate-600" key={action}>{action}</div>
              ))}
            </div>
          ) : null}
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {platformExperienceGuide.items.map((item) => (
              <button
                className={`rounded-md border p-3 text-left transition hover:-translate-y-0.5 ${platformExperienceClass(item.status)} ${item.platformId === platformId ? "ring-2 ring-slate-950 ring-offset-2" : ""}`}
                key={item.platformId}
                onClick={() => applyPlatform(item.platformId)}
                type="button"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{item.platformName}</span>
                  <span className="rounded-md bg-white/70 px-2 py-1 text-xs font-medium">{item.label}</span>
                  {item.label === "开局闭环" ? (
                    <span className="rounded-md bg-white/80 px-2 py-1 text-xs font-medium">已闭环</span>
                  ) : null}
                  {item.platformId === platformId ? (
                    <span className="rounded-md bg-slate-950 px-2 py-1 text-xs font-medium text-white">已选</span>
                  ) : null}
                </div>
                <p className="mt-2 text-xs leading-5 opacity-85">{item.detail}</p>
                {item.evidence[0] ? (
                  <p className="mt-2 rounded-md bg-white/70 p-2 text-xs leading-5 opacity-80">{item.evidence[0]}</p>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <div className="grid gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-xs font-medium text-emerald-700">最终交付归档回灌</div>
            <div className="mt-1 font-medium">交付归档正在反向喂给这次开书</div>
            <p className="mt-1 text-xs leading-5 text-emerald-900">{finalDeliveryArchiveBridge.archiveSignal}</p>
          </div>
          <Link
            className="w-fit rounded-md bg-emerald-950 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-900"
            href={hrefWithGateReturn("/gate?focus=action-recheck&source=platform-tactic-experience#platform-tactic-experience", gateReturnHref)}
          >
            查看归档经验库
          </Link>
        </div>
        <div className="grid gap-2 md:grid-cols-3">
          <div className="rounded-md bg-white/80 p-2 text-xs leading-5">
            <div className="font-medium text-emerald-900">推荐平台</div>
            <p className="mt-1">{finalDeliveryArchiveBridge.recommendedPlatformLabel}</p>
          </div>
          <div className="rounded-md bg-white/80 p-2 text-xs leading-5">
            <div className="font-medium text-emerald-900">推荐模板</div>
            <p className="mt-1">{finalDeliveryArchiveBridge.recommendedTemplateLabel}</p>
          </div>
          <div className="rounded-md bg-white/80 p-2 text-xs leading-5">
            <div className="font-medium text-emerald-900">归档证据</div>
            <p className="mt-1">{finalDeliveryArchiveBridge.selectedArchiveEvidence}</p>
          </div>
        </div>
        <div className="grid gap-2 md:grid-cols-3">
          <div className="rounded-md bg-white/80 p-2 text-xs leading-5">
            <div className="font-medium text-emerald-900">复用方式</div>
            <p className="mt-1">{finalDeliveryArchiveBridge.selectedArchiveNextUse}</p>
          </div>
          <div className="rounded-md bg-white/80 p-2 text-xs leading-5">
            <div className="font-medium text-emerald-900">首日动作</div>
            <div className="mt-1 grid gap-1">
              {startExperienceHandoff.firstDayActions.slice(0, 2).map((action) => (
                <p key={action}>{action}</p>
              ))}
            </div>
          </div>
          <div className="rounded-md bg-white/80 p-2 text-xs leading-5">
            <div className="font-medium text-emerald-900">避坑边界</div>
            <div className="mt-1 grid gap-1">
              {startExperienceHandoff.avoidRules.slice(0, 2).map((rule) => (
                <p key={rule}>{rule}</p>
              ))}
            </div>
          </div>
        </div>
      </div>
      {selectedBatchEffect ? (
        <div className={`rounded-md border p-3 text-sm ${tacticAdviceClass(tacticAdvice.status)}`}>
          <div className="flex flex-wrap items-center gap-2">
            <div className="font-medium">批量打法复盘命中</div>
            <span className="rounded-md bg-white/70 px-2 py-1 text-xs font-medium">{selectedBatchEffect.label}</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-md bg-white/70 p-2">批次 {selectedBatchEffect.sampleBatches}</div>
            <div className="rounded-md bg-white/70 p-2">成功率 {selectedBatchEffect.successRatePercent}%</div>
            <div className="rounded-md bg-white/70 p-2">质量 {selectedBatchEffect.averageQualityScore ?? "缺"}</div>
            <div className="rounded-md bg-white/70 p-2">失败 {selectedBatchEffect.failedTasks}</div>
            {selectedBatchEffect.recoveryBatches > 0 ? (
              <div className="rounded-md bg-white/70 p-2 md:col-span-2">恢复放量 {selectedBatchEffect.recoveryBatches} 批，新项目仍先小样本</div>
            ) : null}
          </div>
          <p className="mt-3 leading-6 opacity-85">{selectedBatchEffect.nextAction}</p>
        </div>
      ) : null}
      <div className={`grid gap-3 rounded-md border p-3 text-sm ${riskGateClass(selectedRiskGate.level)}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="font-medium">{startExperienceHandoff.title}</div>
              <span className="rounded-md bg-white/70 px-2 py-1 text-xs font-medium">{startExperienceHandoff.label}</span>
            </div>
            <p className="mt-2 leading-6 opacity-85">{startExperienceHandoff.detail}</p>
          </div>
          {startExperienceHandoff.shouldSwitchTemplate && startExperienceHandoff.recommendedTemplateId ? (
            <button
              className="rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white"
              onClick={() => applyTemplate(startExperienceHandoff.recommendedTemplateId ?? defaultTemplate.id)}
              type="button"
            >
              切到推荐模板
            </button>
          ) : null}
        </div>
        {firstDayOutcome ? (
          <div className="rounded-md border border-white/80 bg-white/75 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="font-medium">{firstDayOutcome.title}</div>
              <span className="rounded-md bg-slate-950 px-2 py-1 text-xs font-medium text-white">{firstDayOutcome.badge}</span>
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <div className="rounded-md bg-white/80 p-2 text-xs leading-5">
                <div className="font-medium opacity-70">下一步</div>
                <p className="mt-1">{firstDayOutcome.nextMove}</p>
              </div>
              <div className="rounded-md bg-white/80 p-2 text-xs leading-5">
                <div className="font-medium opacity-70">边界</div>
                <p className="mt-1">{firstDayOutcome.boundary}</p>
              </div>
            </div>
          </div>
        ) : null}
        {recoveryHandoffPanel ? (
          <div className="rounded-md border border-cyan-200 bg-cyan-50 p-3 text-cyan-950">
            <div className="flex flex-wrap items-center gap-2">
              <div className="font-medium">{recoveryHandoffPanel.title}</div>
              <span className="rounded-md bg-white/80 px-2 py-1 text-xs font-medium">{recoveryHandoffPanel.badge}</span>
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-3">
              <div className="rounded-md bg-white/75 p-2 text-xs leading-5">
                <div className="font-medium text-cyan-900">先跑</div>
                <p className="mt-1">{recoveryHandoffPanel.primaryAction}</p>
              </div>
              <div className="rounded-md bg-white/75 p-2 text-xs leading-5">
                <div className="font-medium text-cyan-900">再看</div>
                <p className="mt-1">{recoveryHandoffPanel.verificationTarget}</p>
              </div>
              <div className="rounded-md bg-white/75 p-2 text-xs leading-5">
                <div className="font-medium text-cyan-900">别做</div>
                <p className="mt-1">{recoveryHandoffPanel.blockedRule}</p>
              </div>
            </div>
            {recoveryHandoffPanel.evidence.length ? (
              <div className="mt-2 grid gap-1">
                {recoveryHandoffPanel.evidence.map((evidence) => (
                  <p className="rounded-md bg-white/70 p-2 text-xs leading-5" key={evidence}>{evidence}</p>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
        <div className="rounded-md border border-white/70 bg-white/70 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="font-medium">{startExperienceDigest.title}</div>
            <span className="rounded-md bg-slate-950 px-2 py-1 text-xs font-medium text-white">{startExperienceDigest.badge}</span>
          </div>
          <p className="mt-2 text-xs leading-5 opacity-80">{startExperienceDigest.reason}</p>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            <div className="rounded-md bg-white/80 p-2 text-xs leading-5">
              <div className="font-medium opacity-70">为什么推荐</div>
              <div className="mt-2 grid gap-1">
                {startExperienceDigest.evidence.slice(0, 2).map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            </div>
            <div className="rounded-md bg-white/80 p-2 text-xs leading-5">
              <div className="font-medium opacity-70">复制动作</div>
              <div className="mt-2 grid gap-1">
                {startExperienceDigest.copyActions.slice(0, 2).map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            </div>
            <div className="rounded-md bg-white/80 p-2 text-xs leading-5">
              <div className="font-medium opacity-70">不能踩</div>
              <div className="mt-2 grid gap-1">
                {startExperienceDigest.avoidRules.slice(0, 2).map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          <div className="rounded-md bg-white/70 p-3">
            <div className="text-xs font-medium opacity-70">首日动作</div>
            <div className="mt-2 grid gap-2">
              {startExperienceHandoff.firstDayActions.map((action) => (
                <p className="rounded-md bg-white/70 p-2 text-xs leading-5" key={action}>{action}</p>
              ))}
            </div>
          </div>
          <div className="rounded-md bg-white/70 p-3">
            <div className="text-xs font-medium opacity-70">避坑边界</div>
            <div className="mt-2 grid gap-2">
              {startExperienceHandoff.avoidRules.map((rule) => (
                <p className="rounded-md bg-white/70 p-2 text-xs leading-5" key={rule}>{rule}</p>
              ))}
            </div>
          </div>
        </div>
        {startExperienceHandoff.evidence.length ? (
          <div className="grid gap-1">
            {startExperienceHandoff.evidence.slice(0, 2).map((evidence) => (
              <p className="rounded-md border border-white/70 bg-white/60 p-2 text-xs leading-5 opacity-80" key={evidence}>{evidence}</p>
            ))}
          </div>
        ) : null}
      </div>
      <div>
        <label className="text-sm font-medium" htmlFor="title">
          作品名
        </label>
        <input
          className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
          id="title"
          name="title"
          onChange={(event) => {
            markUserTouchedStartDefaults();
            setTitle(event.target.value);
          }}
          value={title}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm font-medium" htmlFor="genre">
            题材
          </label>
          <input
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
            id="genre"
            name="genre"
            onChange={(event) => {
              markUserTouchedStartDefaults();
              setGenre(event.target.value);
            }}
            value={genre}
          />
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor="updateCadence">
            更新节奏
          </label>
          <input
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
            id="updateCadence"
            name="updateCadence"
            onChange={(event) => {
              markUserTouchedStartDefaults();
              setUpdateCadence(event.target.value);
            }}
            value={updateCadence}
          />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <div className="flex items-center justify-between gap-3">
            <label className="text-sm font-medium" htmlFor="platform">
              目标平台
            </label>
            <span className="text-xs text-slate-500">{platformDeliveryScope.statusLabel}</span>
          </div>
          <select
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
            id="platform"
            name="platform"
            onChange={(event) => applyPlatform(event.target.value as PlatformId)}
            value={platformId}
          >
            {platformProfiles.map((platform) => (
              <option key={platform.id} value={platform.id}>
                {platform.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs leading-5 text-slate-500">{platformDeliveryScope.expansionLabel}。</p>
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor="length">
            篇幅
          </label>
          <select
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
            id="length"
            name="length"
            onChange={(event) => {
              markUserTouchedStartDefaults();
              const nextLength = event.target.value as LengthType;
              const nextLengthOption = lengthOptionFor(nextLength);
              setLengthType(nextLength);
              setTargetWordCount(nextLengthOption.targetWordCount);
            }}
            value={lengthType}
          >
            {lengthOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <input name="targetWordCount" type="hidden" value={targetWordCount} />
          <p className="mt-1 text-xs leading-5 text-slate-500">
            主控闸门 篇幅口径：{selectedLengthOption.pmRule} 目标约 {selectedLengthOption.targetWordCount.toLocaleString("zh-CN")} 字。
          </p>
        </div>
      </div>
      <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-600">
        <div className="font-medium text-slate-900">{selectedProfile.name} 写作提醒</div>
        <div className="mt-1">开头：{selectedProfile.openingRules.join("；")}</div>
        <div className="mt-1">审稿：{selectedProfile.reviewFocus.join("、")}</div>
        {selectedPlatformGuide ? (
          <div className={`mt-3 rounded-md border p-3 ${platformExperienceClass(selectedPlatformGuide.status)}`}>
            <div className="flex flex-wrap items-center gap-2">
              <div className="font-medium">{selectedPlatformGuide.headline}</div>
              {selectedPlatformGuide.label === "开局闭环" ? (
                <span className="rounded-md bg-white/80 px-2 py-1 text-xs font-medium">已用于新书开局并闭环</span>
              ) : null}
            </div>
            <p className="mt-1 leading-6">{selectedPlatformGuide.detail}</p>
          </div>
        ) : null}
      </div>
      <div className="grid gap-3 rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-600 md:grid-cols-2">
        <div>
          <div className="font-medium text-slate-900">平台风格模板</div>
          <div className="mt-1">读者承诺：{selectedStyle.audiencePromise}</div>
          <div className="mt-1">首屏钩子：{selectedStyle.openingHook}</div>
          <div className="mt-1">章节节奏：{selectedStyle.chapterRhythm}</div>
        </div>
        <div>
          <div className="font-medium text-slate-900">生成时会强制检查</div>
          <div className="mt-1">章末：{selectedStyle.endingBeat}</div>
          <div className="mt-1">语言：{selectedStyle.languageStyle}</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {selectedStyle.mustHave.map((item) => (
              <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700" key={item}>
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className={`rounded-md border p-3 text-sm ${tacticAdviceClass(tacticAdvice.status)}`}>
        <div className="flex flex-wrap items-center gap-2">
          <div className="font-medium">{tacticAdvice.title}</div>
          <span className="rounded-md bg-white/70 px-2 py-1 text-xs font-medium">{tacticAdvice.label}</span>
        </div>
        <p className="mt-2 leading-6 opacity-85">{tacticAdvice.primaryTactic}</p>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <div className="rounded-md bg-white/70 p-3">
            <div className="text-xs font-medium opacity-70">开头动作</div>
            <p className="mt-1 leading-6">{tacticAdvice.openingMove}</p>
          </div>
          <div className="rounded-md bg-white/70 p-3">
            <div className="text-xs font-medium opacity-70">验证动作</div>
            <p className="mt-1 leading-6">{tacticAdvice.verificationMove}</p>
          </div>
        </div>
        <div className="mt-3 rounded-md bg-white/70 p-3">
          <div className="text-xs font-medium opacity-70">风险提醒</div>
          <p className="mt-1 leading-6">{tacticAdvice.risk}</p>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {tacticAdvice.checklist.map((item) => (
            <span className="rounded-md bg-white/70 px-2 py-1 text-xs" key={item}>{item}</span>
          ))}
        </div>
        {tacticAdvice.evidence.length ? (
          <div className="mt-3 grid gap-1">
            {tacticAdvice.evidence.slice(0, 2).map((evidence) => (
              <p className="rounded-md border border-white/70 bg-white/60 p-2 text-xs leading-5 opacity-80" key={evidence}>{evidence}</p>
            ))}
          </div>
        ) : null}
      </div>
      <div className={`rounded-md border p-3 text-sm ${riskGateClass(selectedRiskGate.level)}`}>
        <div className="flex flex-wrap items-center gap-2">
          <div className="font-medium">{selectedRiskGate.title}</div>
          <span className="rounded-md bg-white/70 px-2 py-1 text-xs font-medium">{selectedRiskGate.label}</span>
        </div>
        <p className="mt-2 leading-6 opacity-85">{selectedRiskGate.detail}</p>
        {selectedRiskGate.evidence.length ? (
          <div className="mt-3 grid gap-1">
            {selectedRiskGate.evidence.slice(0, 2).map((evidence) => (
              <p className="rounded-md border border-white/70 bg-white/60 p-2 text-xs leading-5 opacity-80" key={evidence}>{evidence}</p>
            ))}
          </div>
        ) : null}
        {selectedRiskGate.requiresConfirmation ? (
          <label className="mt-3 flex items-start gap-2 rounded-md bg-white/70 p-3 text-xs leading-5">
            <input
              checked={riskAcknowledged}
              className="mt-1"
              onChange={(event) => setRiskAcknowledged(event.target.checked)}
              type="checkbox"
            />
            <span>我已确认恢复条件：入口卖点、前三章兑现或平台匹配度至少改掉一项，本次只做小样本验证。</span>
          </label>
        ) : null}
      </div>
      <div>
        <label className="text-sm font-medium" htmlFor="sellingPoint">
          核心卖点
        </label>
        <textarea
          className="mt-1 min-h-20 w-full rounded-md border border-slate-200 px-3 py-2"
          id="sellingPoint"
          name="sellingPoint"
          onChange={(event) => {
            markUserTouchedStartDefaults();
            setSellingPoint(event.target.value);
          }}
          value={sellingPoint}
        />
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        className="w-fit rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        disabled={isSubmitting || !canSubmit}
        type="submit"
      >
        {isSubmitting ? "创建中" : selectedRiskGate.actionLabel}
      </button>
    </form>
  );
}
