"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { platformProfiles, type LengthType, type PlatformId } from "@/lib/platforms/platformProfiles";
import { getPlatformWritingStyle } from "@/lib/platforms/writingStyleTemplates";
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
  buildProjectStartKnowledgeFeedbackExperiences,
  buildProjectStartRiskGate,
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

const lengthOptions = [
  { id: "short_10k", label: "1 万字短篇" },
  { id: "mid_50k", label: "5-6 万字中篇" },
  { id: "long_300k_plus", label: "30 万字以上长篇" },
  { id: "mega_1m_plus", label: "100 万字以上超长篇" },
];

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

interface ProjectFormExperienceLaunch {
  platformId?: string;
  tactic?: string;
  source?: string;
}

function launchPlatformId(input: ProjectFormExperienceLaunch | undefined): PlatformId | null {
  const platform = platformProfiles.find((profile) => profile.id === input?.platformId);
  return platform?.id ?? null;
}

function preferLaunchExperience(items: GatePlatformTacticExperienceItem[], launch: ProjectFormExperienceLaunch | undefined) {
  const platformId = launchPlatformId(launch);
  const tactic = launch?.tactic?.trim();
  if (!platformId || !tactic) return items;
  const matched = items.find((item) => item.platformId === platformId && item.tactic === tactic);
  if (!matched) return items;
  return [matched, ...items.filter((item) => item !== matched)];
}

export function ProjectForm({ experienceLaunch }: { experienceLaunch?: ProjectFormExperienceLaunch }) {
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
  const [sellingPoint, setSellingPoint] = useState(defaultTemplate.sellingPoint);
  const [historyExperiences, setHistoryExperiences] = useState<GatePlatformTacticExperienceItem[]>([]);
  const [batchTacticEffects, setBatchTacticEffects] = useState<GateBatchTacticEffectItem[]>([]);
  const [modelRouteExperience, setModelRouteExperience] = useState<ProjectStartModelRouteExperience[]>([]);
  const [riskAcknowledged, setRiskAcknowledged] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedProfile = platformProfiles.find((profile) => profile.id === platformId) ?? platformProfiles[0];
  const selectedTemplate = projectTemplates.find((template) => template.id === templateId) ?? defaultTemplate;
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
  const launchRequested = Boolean(launchPlatform && experienceLaunch?.tactic);
  const launchMatched = launchRequested
    && selectedEvidence.experience?.platformId === launchPlatform
    && selectedEvidence.experience?.tactic === experienceLaunch?.tactic;

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
        const library = buildGatePlatformTacticExperienceLibrary(timeline, platformProfiles.length);
        const knowledgeExperiences = buildProjectStartKnowledgeFeedbackExperiences(knowledgeFeedbackReceipts, platformProfiles.length);
        const batchEffectReview = buildGateBatchTacticEffectReview(receipts, platformProfiles.length);
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
      router.push(`/projects/${payload.project.id}${params}#first-day-workflow`);
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
          <div className="font-medium">经验开书入口</div>
          <p className="mt-1 leading-6">
            {launchMatched
              ? `已匹配「${selectedEvidence.experience?.platformName} · ${selectedEvidence.experience?.tactic}」，本次开书会优先使用这条历史打法。`
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
          <label className="text-sm font-medium" htmlFor="platform">
            目标平台
          </label>
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
              setLengthType(event.target.value as LengthType);
            }}
            value={lengthType}
          >
            {lengthOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
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
