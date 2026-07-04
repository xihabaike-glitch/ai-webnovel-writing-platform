"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SecondPassMode } from "@/lib/ai/buildChapterSecondPassPrompt";
import type { StoryTreeChapterExperienceRecommendation, StoryTreeExperienceEffectFeedback, StoryTreeExperienceSecondPassAdvice, StoryTreeExperienceStatus } from "@/lib/ai/storyTreeExperience";

interface SecondPassResult {
  task: {
    id: string;
    status: string;
    model: string;
  };
  chapter: {
    id: string;
    title: string;
    wordCount: number;
    status: string;
  };
  content: string;
  activeProvider: {
    displayName: string;
    model: string;
  };
  secondPassAudit: {
    score: number;
    shouldSecondPass: boolean;
    treeAudit?: { score: number; label: string };
    issues: Array<{ type: string; suggestion: string }>;
  };
  storyTreeExperienceEffects?: StoryTreeExperienceEffectFeedback[];
  storyTreeDispatches?: Array<{ dispatchKey: string }>;
  attempts?: Array<{
    status: "succeeded" | "failed";
    role: "primary" | "fallback" | "auto" | "forced";
    displayName: string;
    model: string;
  }>;
}

interface BudgetRepairAction {
  id: string;
  label: string;
  detail: string;
  impact: string;
}

interface BudgetGuardView {
  summary: string;
  repairActions: BudgetRepairAction[];
}

const modeOptions: Array<{ value: SecondPassMode; label: string }> = [
  { value: "platform_fit", label: "更像目标平台" },
  { value: "more_hook", label: "钩子更强" },
  { value: "more_payoff", label: "爽点更多" },
  { value: "less_exposition", label: "减少解释" },
  { value: "more_emotion", label: "情绪更重" },
];

function roleLabel(role: "primary" | "fallback" | "auto" | "forced") {
  if (role === "primary") return "首选";
  if (role === "fallback") return "备用";
  if (role === "forced") return "指定";
  return "自动";
}

function experienceStatusLabel(status: StoryTreeExperienceStatus) {
  if (status === "usable") return "可复用";
  if (status === "avoid") return "避坑";
  return "观察";
}

function experienceStatusClass(status: StoryTreeExperienceStatus) {
  if (status === "usable") return "bg-emerald-50 text-emerald-700";
  if (status === "avoid") return "bg-rose-50 text-rose-700";
  return "bg-amber-50 text-amber-700";
}

export function ChapterSecondPassPanel({
  chapterId,
  currentWordCount,
  recommendedStoryTreeExperience = [],
  storyTreeExperienceAdvice = [],
}: {
  chapterId: string;
  currentWordCount: number;
  recommendedStoryTreeExperience?: StoryTreeChapterExperienceRecommendation[];
  storyTreeExperienceAdvice?: StoryTreeExperienceSecondPassAdvice[];
}) {
  const router = useRouter();
  const [instruction, setInstruction] = useState(
    storyTreeExperienceAdvice[0]?.instruction ?? "更像番茄，开头更快，减少解释，章末更想点下一章。",
  );
  const [mode, setMode] = useState<SecondPassMode>("platform_fit");
  const [targetWords, setTargetWords] = useState(Math.max(1200, currentWordCount));
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<SecondPassResult | null>(null);
  const [budgetGuard, setBudgetGuard] = useState<BudgetGuardView | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function runSecondPass() {
    setIsRunning(true);
    setMessage(null);
    setBudgetGuard(null);
    try {
      const response = await fetch(`/api/chapters/${chapterId}/second-pass`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction, mode, targetWords }),
      });
      const payload = (await response.json()) as SecondPassResult & { error?: string; budgetGuard?: BudgetGuardView };
      if (!response.ok) {
        if (payload.budgetGuard) setBudgetGuard(payload.budgetGuard);
        throw new Error(payload.error || "二改失败。");
      }
      setResult(payload);
      const fallbackUsed = payload.attempts?.some((attempt) => attempt.status === "failed");
      const dispatchText = payload.storyTreeDispatches?.length ? `，已派发 ${payload.storyTreeDispatches.length} 个结构返工任务` : "";
      const effectText = payload.storyTreeExperienceEffects?.length
        ? `，经验反馈：${payload.storyTreeExperienceEffects.map((effect) => effect.line.replace("经验应用效果：", "")).join("；")}`
        : "";
      setMessage(`已完成章节二改${fallbackUsed ? "，已自动切换备用模型" : ""}，复检 ${payload.secondPassAudit.score} 分，大树结构 ${payload.secondPassAudit.treeAudit?.score ?? "缺"} 分${dispatchText}${effectText}${payload.secondPassAudit.shouldSecondPass ? "，仍建议继续二改。" : "，可进入发布检查。"}`);
      router.refresh();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "二改失败。");
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-medium">二改指令工作台</h2>
          <p className="mt-1 text-sm text-slate-600">基于当前稿继续改，不从头生成；覆盖前会自动保存快照。</p>
        </div>
        <button
          className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          disabled={isRunning || instruction.trim().length === 0}
          onClick={runSecondPass}
          type="button"
        >
          {isRunning ? "二改中" : "执行二改"}
        </button>
      </div>

      <div className="mt-4 grid gap-3 text-sm text-slate-600 lg:grid-cols-[180px_160px_1fr]">
        <label className="grid gap-1">
          方向
          <select
            className="rounded-md border border-slate-200 px-3 py-2"
            onChange={(event) => setMode(event.target.value as SecondPassMode)}
            value={mode}
          >
            {modeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          目标字数
          <input
            className="rounded-md border border-slate-200 px-3 py-2"
            min={400}
            onChange={(event) => setTargetWords(Number(event.target.value) || 1200)}
            type="number"
            value={targetWords}
          />
        </label>
        <label className="grid gap-1">
          具体指令
          <input
            className="rounded-md border border-slate-200 px-3 py-2"
            onChange={(event) => setInstruction(event.target.value)}
            value={instruction}
          />
        </label>
      </div>

      {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}
      {recommendedStoryTreeExperience.length ? (
        <div className="mt-4 rounded-md border border-slate-200 bg-white p-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div className="font-medium text-slate-950">本章推荐结构经验</div>
            <div className="text-xs text-slate-500">{recommendedStoryTreeExperience.length} 条按薄弱轴匹配</div>
          </div>
          <div className="mt-3 grid gap-2 lg:grid-cols-2">
            {recommendedStoryTreeExperience.map((recommendation) => (
              <div className="rounded-md bg-slate-50 p-3 text-sm" key={recommendation.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-md px-2 py-1 text-xs font-medium ${experienceStatusClass(recommendation.status)}`}>
                    {experienceStatusLabel(recommendation.status)}
                  </span>
                  <span className="text-xs text-slate-500">{recommendation.axisLabel} · 优先级 {recommendation.priorityScore}</span>
                </div>
                <p className="mt-2 leading-6 text-slate-600">{recommendation.reason}</p>
                <p className="mt-2 leading-6 text-slate-600">{recommendation.instruction}</p>
                <button
                  className="mt-3 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  onClick={() => setInstruction(recommendation.instruction)}
                  type="button"
                >
                  填入推荐指令
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {storyTreeExperienceAdvice.length ? (
        <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div className="font-medium text-slate-950">已回写的结构经验</div>
            <div className="text-xs text-slate-500">{storyTreeExperienceAdvice.length} 条可用于二改</div>
          </div>
          <div className="mt-3 grid gap-2 lg:grid-cols-2">
            {storyTreeExperienceAdvice.map((advice) => (
              <div className="rounded-md bg-white p-3 text-sm" key={advice.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-md px-2 py-1 text-xs font-medium ${experienceStatusClass(advice.status)}`}>
                    {experienceStatusLabel(advice.status)}
                  </span>
                  <span className="text-xs text-slate-500">{advice.axisLabel}</span>
                </div>
                <div className="mt-2 font-medium text-slate-950">{advice.title}</div>
                <p className="mt-2 leading-6 text-slate-600">{advice.instruction}</p>
                <button
                  className="mt-3 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  onClick={() => setInstruction(advice.instruction)}
                  type="button"
                >
                  填入二改指令
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {budgetGuard ? (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <div className="font-medium">预算修复建议</div>
          <p className="mt-1">{budgetGuard.summary}</p>
          <div className="mt-3 grid gap-2 lg:grid-cols-2">
            {budgetGuard.repairActions.map((action) => (
              <div className="rounded-md bg-white/70 p-3" key={action.id}>
                <div className="font-medium">{action.label}</div>
                <p className="mt-1">{action.detail}</p>
                <p className="mt-1 text-xs">{action.impact}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {result ? (
        <div className="mt-4 rounded-md bg-slate-50 p-3 text-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div className="font-medium text-slate-950">{result.chapter.title}</div>
            <div className="text-xs text-slate-500">{result.activeProvider.displayName} · {result.activeProvider.model}</div>
          </div>
          <div className="mt-1 text-slate-500">
            {result.chapter.wordCount} 字 · 复检 {result.secondPassAudit.score} 分 · {result.secondPassAudit.shouldSecondPass ? "继续二改" : "可发布检查"}
          </div>
          {result.attempts?.length ? (
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
              {result.attempts.map((attempt, index) => (
                <span className="rounded-md bg-white px-2 py-1" key={`${attempt.role}-${attempt.model}-${index}`}>
                  {roleLabel(attempt.role)} · {attempt.displayName} · {attempt.status === "succeeded" ? "成功" : "失败"}
                </span>
              ))}
            </div>
          ) : null}
          {result.secondPassAudit.issues.length ? (
            <div className="mt-2 grid gap-1 text-slate-500">
              {result.secondPassAudit.issues.slice(0, 3).map((issue) => (
                <div key={`${issue.type}-${issue.suggestion}`}>复检建议：{issue.suggestion}</div>
              ))}
            </div>
          ) : null}
          {result.storyTreeExperienceEffects?.length ? (
            <div className="mt-2 grid gap-1 text-slate-500">
              {result.storyTreeExperienceEffects.map((effect) => (
                <div key={`${effect.adviceId}-${effect.axisId}`}>{effect.line}</div>
              ))}
            </div>
          ) : null}
          <p className="mt-2 line-clamp-4 text-slate-600">{result.content}</p>
        </div>
      ) : null}
    </section>
  );
}
