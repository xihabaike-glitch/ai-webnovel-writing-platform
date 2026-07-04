export interface SubmissionAssetSource {
  title: string;
  logline: string;
  synopsis: string;
  overseasSynopsis: string;
  tags: string[];
}

export interface SubmissionAssetSavePayloadInput {
  platformId: string;
  source: SubmissionAssetSource;
  note?: string;
  sourceTaskId?: string;
  strategy?: string;
  adopt?: boolean;
}

export interface SubmissionAssetSavePayload {
  action: "save-asset";
  platformId: string;
  title: string;
  logline: string;
  synopsis: string;
  overseasSynopsis: string;
  tags: string;
  note: string;
  saveAction?: "adopt";
  sourceTaskId?: string;
  strategy?: string;
}

export function buildSubmissionAssetSavePayload(input: SubmissionAssetSavePayloadInput): SubmissionAssetSavePayload {
  const sourceTaskId = input.sourceTaskId?.trim();
  const strategy = input.strategy?.trim();
  return {
    action: "save-asset",
    platformId: input.platformId,
    title: input.source.title,
    logline: input.source.logline,
    synopsis: input.source.synopsis,
    overseasSynopsis: input.source.overseasSynopsis,
    tags: input.source.tags.join("、"),
    note: input.note?.trim() ?? "",
    ...(input.adopt && sourceTaskId ? { saveAction: "adopt" as const, sourceTaskId } : {}),
    ...(strategy ? { strategy } : {}),
  };
}
