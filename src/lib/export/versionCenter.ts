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
  isBaselineCandidate: boolean;
}

export interface ExportBaselineCandidate {
  snapshotId: string;
  targetId: string;
  label: string;
  fileName: string;
  createdAt: string | Date;
  readinessPercent: number;
  reason: string;
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
  baselineCandidate: ExportBaselineCandidate | null;
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

function pickBaselineCandidate(orderedSnapshots: ExportPackageSnapshotView[]): ExportBaselineCandidate | null {
  const readySnapshots = orderedSnapshots.filter((snapshot) => snapshot.readinessStatus === "ready");
  const candidate =
    readySnapshots.find((snapshot) => snapshot.packageKind === "full" && snapshot.format === "docx")
    ?? readySnapshots.find((snapshot) => snapshot.packageKind === "full" && snapshot.format === "markdown")
    ?? readySnapshots[0]
    ?? null;

  if (!candidate) return null;

  const isPreferred = candidate.packageKind === "full" && (candidate.format === "docx" || candidate.format === "markdown");
  return {
    snapshotId: candidate.id,
    targetId: buildTargetId(candidate.packageKind, candidate.format),
    label: `${candidate.packageKindLabel} · ${candidate.formatLabel}`,
    fileName: candidate.fileName,
    createdAt: candidate.createdAt,
    readinessPercent: candidate.readinessPercent,
    reason: isPreferred
      ? "优先选择完整资料包作为正式交付基准，后续版本对比和发布归档都应围绕它展开。"
      : "暂时没有可交付的完整资料包，先把最新可交付快照作为临时基准候选。",
  };
}

export function buildExportVersionCenter(snapshots: ExportPackageSnapshotView[]): ExportVersionCenterSummary {
  const orderedSnapshots = [...snapshots].sort((a, b) => snapshotTime(b) - snapshotTime(a));
  const latestSnapshot = orderedSnapshots[0] ?? null;
  const baselineCandidate = pickBaselineCandidate(orderedSnapshots);
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
      isBaselineCandidate: Boolean(latest && baselineCandidate && latest.id === baselineCandidate.snapshotId),
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
    baselineCandidate,
    targets,
    nextAction: missingTarget ? {
      label: `补齐 ${missingTarget.label}`,
      detail: "版本中心还缺这个交付包，先生成它，避免交付时临时返工。",
      targetId: missingTarget.id,
    } : weakTarget ? {
      label: `重导 ${weakTarget.label}`,
      detail: "覆盖齐了不等于能交付。先处理准备度偏低的包，再对外发。",
      targetId: weakTarget.id,
    } : baselineCandidate ? {
      label: "锁定推荐基准",
      detail: `${baselineCandidate.label} 已满足交付口径，可以作为后续版本对比和发布归档的基准。`,
      targetId: baselineCandidate.targetId,
    } : {
      label: "先生成可交付版本",
      detail: "版本库已有记录，但还没有可交付快照，先处理准备度再谈基准。",
      targetId: null,
    },
  };
}
