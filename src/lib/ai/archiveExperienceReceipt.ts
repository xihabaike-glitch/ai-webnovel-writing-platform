export interface TaskArchiveExperienceReceipt {
  status: "not_applicable" | "attached" | "missing";
  label: string;
  detail: string;
  evidence: string[];
  nextAction: string;
}

const archiveExperienceTaskTypes = new Set(["chapter_draft", "chapter_review", "chapter_second_pass"]);
const archiveExperienceEvidencePatterns = [
  "最终交付归档强制执行",
  "不允许忽略开书经验",
  "复制动作",
  "踩到不能踩边界",
  "必须执行",
];

function parseJsonObject(value: string) {
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function textFromUnknown(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    const parts = value.map(textFromUnknown).filter((part): part is string => Boolean(part));
    return parts.length > 0 ? parts.join("\n") : null;
  }
  if (value && typeof value === "object") {
    const parts = Object.values(value).map(textFromUnknown).filter((part): part is string => Boolean(part));
    return parts.length > 0 ? parts.join("\n") : null;
  }
  return null;
}

function promptTextFromSnapshot(snapshot: string) {
  const parsed = parseJsonObject(snapshot);
  if (!parsed) return snapshot;

  const prompt = parsed.prompt && typeof parsed.prompt === "object" && !Array.isArray(parsed.prompt)
    ? parsed.prompt as Record<string, unknown>
    : null;
  const candidates = [
    prompt?.userPrompt,
    prompt?.systemPrompt,
    parsed.userPrompt,
    parsed.prompt,
    parsed.messages,
  ];

  return candidates
    .map(textFromUnknown)
    .filter((part): part is string => Boolean(part))
    .join("\n") || snapshot;
}

function archiveExperienceEvidence(promptText: string) {
  const evidence: string[] = [];
  for (const line of promptText.split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (archiveExperienceEvidencePatterns.some((pattern) => trimmed.includes(pattern)) && !evidence.includes(trimmed)) {
      evidence.push(trimmed);
    }
    if (evidence.length >= 5) break;
  }
  return evidence;
}

export function buildTaskArchiveExperienceReceipt(task: { taskType: string; inputSnapshot: string }): TaskArchiveExperienceReceipt {
  if (!archiveExperienceTaskTypes.has(task.taskType)) {
    return {
      status: "not_applicable",
      label: "无需归档经验",
      detail: "非写稿、审稿、二改任务，按原任务回执验收。",
      evidence: [],
      nextAction: "继续检查任务输出和失败修复记录。",
    };
  }

  const promptText = promptTextFromSnapshot(task.inputSnapshot);
  const evidence = archiveExperienceEvidence(promptText);
  const hasArchiveExperience = promptText.includes("最终交付归档强制执行") && evidence.length > 0;
  if (hasArchiveExperience) {
    return {
      status: "attached",
      label: "归档经验已执行",
      detail: "任务输入已带最终交付归档强制执行，模型不能跳过上一轮开书经验。",
      evidence,
      nextAction: "完成后核对正文、审稿或二改是否落实复制动作和避坑边界。",
    };
  }

  return {
    status: "missing",
    label: "缺归档经验回执",
    detail: "任务输入没有检测到最终交付归档强制执行，下一轮需要先补开书经验再重跑。",
    evidence: ["inputSnapshot 未包含：最终交付归档强制执行"],
    nextAction: "回开书经验或章节页补齐 startTactic 后，再发起单章验证。",
  };
}
