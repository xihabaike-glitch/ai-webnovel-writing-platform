import type { ExportPackageSnapshotView } from "./snapshots.ts";

export type ExportSnapshotFilterId =
  | "all"
  | "full"
  | "outline"
  | "characters"
  | "chapters_zip"
  | "foreshadows_csv"
  | "markdown"
  | "docx";

export interface ExportSnapshotFilterOption {
  id: ExportSnapshotFilterId;
  label: string;
  count: number;
}

const filterLabels: Record<ExportSnapshotFilterId, string> = {
  all: "全部",
  full: "完整包",
  outline: "大纲",
  characters: "人物伏笔",
  chapters_zip: "章节 ZIP",
  foreshadows_csv: "伏笔 CSV",
  markdown: "Markdown",
  docx: "Word",
};

export function matchesExportSnapshotFilter(snapshot: Pick<ExportPackageSnapshotView, "packageKind" | "format">, filterId: ExportSnapshotFilterId) {
  if (filterId === "all") return true;
  if (filterId === "markdown" || filterId === "docx") return snapshot.format === filterId;
  return snapshot.packageKind === filterId;
}

export function filterExportSnapshots<TSnapshot extends Pick<ExportPackageSnapshotView, "packageKind" | "format">>(
  snapshots: TSnapshot[],
  filterId: ExportSnapshotFilterId,
) {
  return snapshots.filter((snapshot) => matchesExportSnapshotFilter(snapshot, filterId));
}

export function buildExportSnapshotFilterOptions(snapshots: Array<Pick<ExportPackageSnapshotView, "packageKind" | "format">>): ExportSnapshotFilterOption[] {
  return (Object.keys(filterLabels) as ExportSnapshotFilterId[]).map((id) => ({
    id,
    label: filterLabels[id],
    count: filterExportSnapshots(snapshots, id).length,
  }));
}
