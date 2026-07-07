export type SubmissionDecisionContractStatus = "unknown" | "pending" | "invited" | "signed" | "rejected";

export interface SubmissionDecisionCompletionInput {
  projectId: string | null;
  platformId: string;
  platformName: string;
  dispatchKey: string;
  stage: string;
  completionEvidence: string;
  completedAt?: Date | string | null;
}

export interface SubmissionDecisionCompletionEffect {
  projectId: string;
  platformId: string;
  platformName: string;
  dispatchKey: string;
  views: number;
  clicks: number;
  favorites: number;
  follows: number;
  comments: number;
  paidReads: number;
  editorFeedback: string;
  contractStatus: SubmissionDecisionContractStatus;
  publishUrl: string;
  snapshotDate: Date;
  notes: string;
  review: {
    status: "promising" | "watch" | "weak";
    headline: string;
    nextAction: string;
    evidence: string[];
  };
}

const effectStages = new Set([
  "record_metrics",
  "scale_up",
  "start_platform_package",
  "start_publish_finalize",
  "start_metrics_recovery",
  "start_repair_packaging",
  "repair_tactic",
  "pivot_platform",
  "pause_platform",
]);

const repairEvidenceStages = new Set([
  "start_repair_packaging",
  "repair_tactic",
  "pivot_platform",
  "pause_platform",
]);

function parseMetricValue(value: string) {
  const compact = value.replace(/,/g, "").replace(/\s+/g, "");
  const match = compact.match(/(\d+(?:\.\d+)?)(万|k|K)?/u);
  if (!match) return 0;
  const base = Number(match[1]);
  if (!Number.isFinite(base)) return 0;
  const multiplier = match[2] === "万" ? 10000 : match[2]?.toLowerCase() === "k" ? 1000 : 1;
  return Math.max(0, Math.round(base * multiplier));
}

function metric(text: string, labels: string[]) {
  const pattern = new RegExp(`(?:${labels.join("|")})\\s*[：:=]?\\s*([0-9][0-9,]*(?:\\.[0-9]+)?\\s*(?:万|k|K)?)`, "iu");
  const match = text.match(pattern);
  return match ? parseMetricValue(match[1]) : 0;
}

function firstUrl(text: string) {
  return text.match(/https?:\/\/[^\s，。；;、)）]+/iu)?.[0] ?? "";
}

function snapshotDate(text: string, fallback?: Date | string | null) {
  const match = text.match(/(?:日期|快照|snapshot|记录日)?\s*[：:=]?\s*(20\d{2}[-/.]\d{1,2}[-/.]\d{1,2})/iu);
  const parsed = new Date((match?.[1] ?? fallback ?? new Date()).toString().replace(/\./g, "-").replace(/\//g, "-"));
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export function inferSubmissionDecisionContractStatus(text: string): SubmissionDecisionContractStatus {
  if (/签约成功|已签约|签了|签约|合同|上架合同/iu.test(text)) return "signed";
  if (/邀约|邀请签约|编辑联系|站短|内投通过|offer/iu.test(text)) return "invited";
  if (/拒稿|退稿|未过|没过|拒绝|打回|不过审/iu.test(text)) return "rejected";
  if (/待反馈|审核中|观察|pending|等待编辑/iu.test(text)) return "pending";
  return "unknown";
}

function valueAfterLabel(label: string, text: string) {
  return text.match(new RegExp(`${label}\\s*[：:=]\\s*([^\\n；;]+)`, "u"))?.[1]?.trim() ?? "";
}

function editorFeedback(text: string) {
  if (/样本轮次\s*[：:=]?\s*恢复一轮小样本|恢复依据\s*[：:=]|对照口径\s*[：:=]/u.test(text)) {
    const summary = [
      ["样本轮次", valueAfterLabel("样本轮次", text)],
      ["恢复依据", valueAfterLabel("恢复依据", text)],
      ["对照口径", valueAfterLabel("对照口径", text)],
      ["平台反馈", valueAfterLabel("平台反馈", text)],
      ["结论", valueAfterLabel("结论", text)],
    ]
      .filter(([, value]) => value)
      .map(([label, value]) => `${label}：${value}`)
      .join("；");
    if (summary) return summary.slice(0, 240);
  }
  if (/暂停原因\s*[：:=]|恢复条件\s*[：:=]|复盘结论\s*[：:=]/u.test(text)) {
    const summary = [
      ["暂停原因", valueAfterLabel("暂停原因", text)],
      ["参照平台", valueAfterLabel("参照平台", text)],
      ["恢复条件", valueAfterLabel("恢复条件", text)],
      ["复盘结论", valueAfterLabel("复盘结论", text)],
    ]
      .filter(([, value]) => value)
      .map(([label, value]) => `${label}：${value}`)
      .join("；");
    if (summary) return summary.slice(0, 240);
  }
  if (/样本轮次\s*[：:=]?\s*第二轮小样本|第二轮小样本|二轮小样本|验证变量\s*[：:=]?.*前三章/u.test(text)) {
    const summary = [
      ["样本轮次", valueAfterLabel("样本轮次", text)],
      ["验证变量", valueAfterLabel("验证变量", text)],
      ["平台反馈", valueAfterLabel("平台反馈", text)],
      ["结论", valueAfterLabel("结论", text)],
    ]
      .filter(([, value]) => value)
      .map(([label, value]) => `${label}：${value}`)
      .join("；");
    if (summary) return summary.slice(0, 240);
  }
  const explicit = text.match(/(?:编辑反馈|反馈|编辑意见|平台反馈)\s*[：:=]\s*([^\n。；;]+)/u)?.[1]?.trim();
  if (explicit) return explicit.slice(0, 240);
  return text.replace(/\s+/g, " ").trim().slice(0, 240);
}

function rate(numerator: number, denominator: number) {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function hasRepairCompletionSignal(stage: string, text: string) {
  if (!repairEvidenceStages.has(stage)) return false;
  return /(?:修复对象|修复前问题|处理动作|修复后证据|复检结果|下一轮口径)\s*[：:=]\s*\S+/u.test(text);
}

function hasPauseReviewSignal(stage: string, text: string) {
  return stage === "pause_platform" && /(?:暂停原因|参照平台|恢复条件|复盘结论)\s*[：:=]\s*\S+/u.test(text);
}

function review(input: {
  platformName: string;
  views: number;
  clicks: number;
  favorites: number;
  follows: number;
  contractStatus: SubmissionDecisionContractStatus;
  editorFeedback: string;
}) {
  const clickRate = rate(input.clicks, input.views);
  const favoriteRate = rate(input.favorites, input.views);
  const followRate = rate(input.follows, input.views);
  const evidence = [
    `曝光 ${input.views}，点击 ${input.clicks}，收藏 ${input.favorites}，追读 ${input.follows}`,
    `点击率 ${clickRate}%，收藏率 ${favoriteRate}%，追读率 ${followRate}%`,
    input.contractStatus !== "unknown" ? `签约状态：${input.contractStatus}` : "",
    input.editorFeedback ? `反馈：${input.editorFeedback}` : "",
  ].filter(Boolean);

  if (input.contractStatus === "signed" || input.contractStatus === "invited" || clickRate >= 8 || followRate >= 3) {
    return {
      status: "promising" as const,
      headline: `${input.platformName} 投稿效果有苗头`,
      nextAction: "保留当前卖点和钩子表达，小步加码并继续回填下一轮真实数据。",
      evidence,
    };
  }
  if (input.contractStatus === "rejected" || (input.views >= 200 && clickRate < 2 && followRate < 1)) {
    return {
      status: "weak" as const,
      headline: `${input.platformName} 投稿效果偏弱`,
      nextAction: "先修标题、简介和前三章兑现，不要扩大投放。",
      evidence,
    };
  }
  return {
    status: "watch" as const,
    headline: `${input.platformName} 投稿效果继续观察`,
    nextAction: "补足 24-48 小时数据，再决定放大、修包或换平台。",
    evidence,
  };
}

export function buildSubmissionDecisionCompletionEffect(
  input: SubmissionDecisionCompletionInput,
): SubmissionDecisionCompletionEffect | null {
  if (!input.projectId || input.platformId === "model-routing" || !effectStages.has(input.stage)) return null;
  const text = input.completionEvidence.trim();
  if (text.length < 8) return null;

  const effect = {
    views: metric(text, ["曝光", "展示", "浏览", "阅读", "views?"]),
    clicks: metric(text, ["点击", "点进", "clicks?"]),
    favorites: metric(text, ["收藏", "加书架", "书架", "favorites?"]),
    follows: metric(text, ["追读", "关注", "follows?"]),
    comments: metric(text, ["评论", "留言", "comments?"]),
    paidReads: metric(text, ["付费阅读", "付费", "订阅", "paid\\s*reads?"]),
  };
  const hasPauseSignal = hasPauseReviewSignal(input.stage, text);
  const contractStatus = hasPauseSignal ? "unknown" : inferSubmissionDecisionContractStatus(text);
  const publishUrl = firstUrl(text);
  const feedback = editorFeedback(text);
  const hasMetricSignal = Object.values(effect).some((value) => value > 0);
  const hasBusinessSignal = contractStatus !== "unknown" || publishUrl.length > 0;
  const hasRepairSignal = hasRepairCompletionSignal(input.stage, text);
  if (!hasMetricSignal && !hasBusinessSignal && !hasRepairSignal && !hasPauseSignal) return null;

  return {
    projectId: input.projectId,
    platformId: input.platformId,
    platformName: input.platformName,
    dispatchKey: input.dispatchKey,
    ...effect,
    editorFeedback: feedback,
    contractStatus,
    publishUrl,
    snapshotDate: snapshotDate(text, input.completedAt),
    notes: `由派单完成依据自动回写；派单编号：${input.dispatchKey}`,
    review: review({
      platformName: input.platformName,
      views: effect.views,
      clicks: effect.clicks,
      favorites: effect.favorites,
      follows: effect.follows,
      contractStatus,
      editorFeedback: feedback,
    }),
  };
}
