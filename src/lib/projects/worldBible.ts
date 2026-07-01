export type WorldEntryType = "system_rule" | "location" | "organization" | "item" | "taboo" | "platform_soil" | "other";

export interface WorldBibleEntry {
  id: string;
  type: string;
  title: string;
  content: string;
}

export interface WorldBibleTypeSummary {
  type: WorldEntryType;
  label: string;
  count: number;
  status: "pass" | "warn" | "fail";
  note: string;
}

export interface WorldBibleEntrySummary {
  id: string;
  type: WorldEntryType;
  label: string;
  title: string;
  completeness: number;
  status: "complete" | "partial" | "empty";
  preview: string;
}

export interface WorldBibleDashboard {
  totalEntries: number;
  completeEntries: number;
  typeSummaries: WorldBibleTypeSummary[];
  entrySummaries: WorldBibleEntrySummary[];
  warnings: string[];
  nextActions: string[];
}

export const worldEntryTypes: Array<{ id: WorldEntryType; label: string }> = [
  { id: "system_rule", label: "系统规则" },
  { id: "location", label: "地点" },
  { id: "organization", label: "组织" },
  { id: "item", label: "道具" },
  { id: "taboo", label: "禁忌" },
  { id: "platform_soil", label: "平台土壤" },
  { id: "other", label: "其他设定" },
];

const requiredTypes: WorldEntryType[] = ["system_rule", "taboo", "platform_soil"];

function normalizeType(type: string): WorldEntryType {
  return worldEntryTypes.some((entry) => entry.id === type) ? (type as WorldEntryType) : "other";
}

function labelFor(type: WorldEntryType) {
  return worldEntryTypes.find((entry) => entry.id === type)?.label ?? "其他设定";
}

function compact(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function preview(text: string) {
  const value = compact(text);
  if (!value) return "未填写内容";
  return value.length > 100 ? `${value.slice(0, 100)}...` : value;
}

function entryCompleteness(entry: WorldBibleEntry) {
  const titleScore = compact(entry.title).length > 0 ? 35 : 0;
  const contentScore = compact(entry.content).length >= 40 ? 55 : compact(entry.content).length > 0 ? 30 : 0;
  const typeScore = compact(entry.type).length > 0 ? 10 : 0;
  return titleScore + contentScore + typeScore;
}

function summarizeEntry(entry: WorldBibleEntry): WorldBibleEntrySummary {
  const completeness = entryCompleteness(entry);
  const type = normalizeType(entry.type);

  return {
    id: entry.id,
    type,
    label: labelFor(type),
    title: entry.title || "未命名设定",
    completeness,
    status: completeness >= 80 ? "complete" : completeness > 0 ? "partial" : "empty",
    preview: preview(entry.content),
  };
}

function buildTypeSummaries(entries: WorldBibleEntry[]): WorldBibleTypeSummary[] {
  return worldEntryTypes.map(({ id, label }) => {
    const count = entries.filter((entry) => normalizeType(entry.type) === id).length;
    const required = requiredTypes.includes(id);
    const status = count > 0 ? "pass" : required ? "fail" : "warn";

    return {
      type: id,
      label,
      count,
      status,
      note: count > 0
        ? `${label}已有 ${count} 条。`
        : required
          ? `缺少${label}，长篇容易设定漂移。`
          : `${label}暂未建立，可按剧情需要补。`,
    };
  });
}

function buildWarnings(entries: WorldBibleEntry[], typeSummaries: WorldBibleTypeSummary[]) {
  const warnings: string[] = [];
  if (entries.length === 0) warnings.push("还没有设定资料，长篇继续写会靠记忆硬扛。");
  for (const type of requiredTypes) {
    if (!typeSummaries.some((summary) => summary.type === type && summary.count > 0)) {
      warnings.push(`缺少${labelFor(type)}，建议先补。`);
    }
  }
  if (entries.some((entry) => compact(entry.content).length < 40)) {
    warnings.push("存在内容过薄的设定卡，后续引用时容易前后不一致。");
  }
  return warnings;
}

export function buildWorldBibleDashboard(entries: WorldBibleEntry[]): WorldBibleDashboard {
  const entrySummaries = entries.map(summarizeEntry);
  const typeSummaries = buildTypeSummaries(entries);
  const warnings = buildWarnings(entries, typeSummaries);
  const weakest = [...entrySummaries].sort((left, right) => left.completeness - right.completeness)[0];

  return {
    totalEntries: entries.length,
    completeEntries: entrySummaries.filter((summary) => summary.status === "complete").length,
    typeSummaries,
    entrySummaries,
    warnings,
    nextActions: [
      weakest ? `先补「${weakest.title}」内容，让规则、限制和剧情用途说清楚。` : "先创建系统规则、禁忌和平台土壤三类设定。",
      "每条设定都要写清：规则是什么、限制是什么、会制造什么冲突。",
      "新增章节前先检查是否引用了已有设定，避免长篇后期互相打架。",
    ],
  };
}
