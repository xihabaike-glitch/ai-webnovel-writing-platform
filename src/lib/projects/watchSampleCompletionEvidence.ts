export interface WatchSampleCompletionEvidenceAuditRecord {
  projectId: string | null;
  executionType?: string | null;
  label: string;
  payload: string;
  createdAt: Date | string;
}

export interface WatchSampleCompletionEvidenceSuggestion {
  dispatchKey: string;
  projectId: string;
  completionEvidence: string;
  label: string;
  createdAt: string;
}

export interface WatchSampleAutoCompletionDraftInput {
  currentDrafts: Record<string, string>;
  suggestions: WatchSampleCompletionEvidenceSuggestion[];
  tasks: Array<{
    dispatchKey: string;
    state: string;
    completionEvidence?: string | null;
  }>;
}

function parsePayload(payload: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(payload) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function batchReceiptFromPayload(payload: Record<string, unknown>) {
  const receipt = payload.batchReceipt;
  return receipt && typeof receipt === "object" && !Array.isArray(receipt)
    ? receipt as Record<string, unknown>
    : null;
}

function suggestionFromRecord(record: WatchSampleCompletionEvidenceAuditRecord): WatchSampleCompletionEvidenceSuggestion | null {
  if (record.executionType && record.executionType !== "recommended_batch") return null;
  if (!record.projectId) return null;
  const payload = parsePayload(record.payload);
  if (!payload) return null;
  const batchReceipt = batchReceiptFromPayload(payload);
  const completionEvidence = batchReceipt?.completionEvidenceTemplate;
  if (typeof completionEvidence !== "string" || !completionEvidence.includes("小样本验证已完成")) return null;
  const trimmedEvidence = completionEvidence.trim();
  if (trimmedEvidence.length < 8) return null;

  return {
    dispatchKey: `first-day:${record.projectId}:first-draft`,
    projectId: record.projectId,
    completionEvidence: trimmedEvidence,
    label: record.label,
    createdAt: new Date(record.createdAt).toISOString(),
  };
}

export function buildWatchSampleCompletionEvidenceSuggestions(
  records: WatchSampleCompletionEvidenceAuditRecord[],
): WatchSampleCompletionEvidenceSuggestion[] {
  const suggestionsByKey = new Map<string, WatchSampleCompletionEvidenceSuggestion>();

  for (const record of records) {
    const suggestion = suggestionFromRecord(record);
    if (!suggestion) continue;
    const current = suggestionsByKey.get(suggestion.dispatchKey);
    if (!current || new Date(suggestion.createdAt).getTime() > new Date(current.createdAt).getTime()) {
      suggestionsByKey.set(suggestion.dispatchKey, suggestion);
    }
  }

  return Array.from(suggestionsByKey.values()).sort((left, right) => (
    new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  ));
}

export function buildWatchSampleAutoCompletionDrafts(input: WatchSampleAutoCompletionDraftInput) {
  let nextDrafts = input.currentDrafts;
  const taskByKey = new Map(input.tasks.map((task) => [task.dispatchKey, task]));

  for (const suggestion of input.suggestions) {
    const task = taskByKey.get(suggestion.dispatchKey);
    if (!task || task.state !== "assigned") continue;
    if ((task.completionEvidence ?? "").trim()) continue;
    if ((nextDrafts[suggestion.dispatchKey] ?? "").trim()) continue;
    if (nextDrafts === input.currentDrafts) nextDrafts = { ...input.currentDrafts };
    nextDrafts[suggestion.dispatchKey] = suggestion.completionEvidence;
  }

  return nextDrafts;
}
