import type { ExportPackageSnapshotView, ExportSnapshotFormat, ExportSnapshotPackageKind } from "./snapshots.ts";

export interface ExportVersionTarget {
  id: string;
  packageKind: ExportSnapshotPackageKind;
  format: ExportSnapshotFormat;
  label: string;
  latestSnapshotId: string | null;
  latestCreatedAt: string | Date | null;
  readinessPercent: number;
  status: "ready" | "warning" | "blocked" | "missing";
  statusLabel: string;
  fileSizeLabel: string;
}

export interface ExportVersionCenterSummary {
  totalSnapshots: number;
  latestCreatedAt: string | Date | null;
  targetCoveragePercent: number;
  coveredTargets: number;
  totalTargets: number;
  readySnapshots: number;
  averageReadinessPercent: number;
  changedSincePreviousCount: number;
  latestSnapshot: ExportPackageSnapshotView | null;
  targets: ExportVersionTarget[];
  nextAction: {
    label: string;
    detail: string;
    targetId: string | null;
  };
}

const targetMatrix: Array<Pick<ExportVersionTarget, "packageKind" | "format" | "label">> = [
  { packageKind: "full", format: "markdown", label: "完整 Markdown" },
  { packageKind: "full", format: "docx", label: "完整 Word" },
  { packageKind: "outline", format: "markdown", label: "大纲 Markdown" },
  { packageKind: "outline", format: "docx", label: "大纲 Word" },
  { packageKind: "characters", format: "markdown", label: "人物伏笔 Markdown" },
  { packageKind: "characters", format: "docx", label: "人物伏笔 Word" },
  { packageKind: "chapters_zip", format: "zip", label: "章节 ZIP" },
  { packageKind: "foreshadows_csv", format: "csv", label: "伏笔 CSV" },
];

function snapshotTime(snapshot: Pick<ExportPackageSnapshotView, "createdAt">) {
  return new Date(snapshot.createdAt).getTime();
}

function readinessStatusLabel(status: ExportVersionTarget["status"]) {
  if (status === "ready") return "可交付";
  if (status === "warning") return "需补强";
  if (status === "blocked") return "不建议交付";
  return "未生成";
}

function buildTargetId(packageKind: string, format: string) {
  return `${packageKind}:${format}`;
}

export function buildExportVersionCenter(snapshots: ExportPackageSnapshotView[]): ExportVersionCenterSummary {
  const orderedSnapshots = [...snapshots].sort((a, b) => snapshotTime(b) - snapshotTime(a));
  const latestSnapshot = orderedSnapshots[0] ?? null;
  const targets = targetMatrix.map((target) => {
    const latest = orderedSnapshots.find((snapshot) => snapshot.packageKind === target.packageKind && snapshot.format === target.format) ?? null;
    const status = latest ? latest.readinessStatus as ExportVersionTarget["status"] : "missing";
    return {
      id: buildTargetId(target.packageKind, target.format),
      ...target,
      latestSnapshotId: latest?.id ?? null,
      latestCreatedAt: latest?.createdAt ?? null,
      readinessPercent: latest?.readinessPercent ?? 0,
      status,
      statusLabel: readinessStatusLabel(status),
      fileSizeLabel: latest?.fileSizeLabel ?? "0 B",
    };
  });
  const coveredTargets = targets.filter((target) => target.latestSnapshotId).length;
  const missingTarget = targets.find((target) => !target.latestSnapshotId) ?? null;
  const weakTarget = targets.find((target) => target.status === "blocked" || target.status === "warning") ?? null;
  const averageReadinessPercent = orderedSnapshots.length
    ? Math.round(orderedSnapshots.reduce((sum, snapshot) => sum + snapshot.readinessPercent, 0) / orderedSnapshots.length)
    : 0;

  return {
    totalSnapshots: orderedSnapshots.length,
    latestCreatedAt: latestSnapshot?.createdAt ?? null,
    targetCoveragePercent: Math.round((coveredTargets / targetMatrix.length) * 100),
    coveredTargets,
    totalTargets: targetMatrix.length,
    readySnapshots: orderedSnapshots.filter((snapshot) => snapshot.readinessStatus === "ready").length,
    averageReadinessPercent,
    changedSincePreviousCount: orderedSnapshots.filter((snapshot) => snapshot.comparison?.contentChanged).length,
    latestSnapshot,
    targets,
    nextAction: missingTarget ? {
      label: `补齐 ${missingTarget.label}`,
      detail: "版本中心还缺这个交付包，先生成它，避免交付时临时返工。",
      targetId: missingTarget.id,
    } : weakTarget ? {
      label: `重导 ${weakTarget.label}`,
      detail: "覆盖齐了不等于能交付。先处理准备度偏低的包，再对外发。",
      targetId: weakTarget.id,
    } : {
      label: "版本库覆盖完整",
      detail: "核心交付包都已有记录，下一步可以锁定基准或做平台发布包。",
      targetId: null,
    },
  };
}

