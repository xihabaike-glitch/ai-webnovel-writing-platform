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
  lockedAt: string | Date | null;
  source: "locked" | "recommended";
  reason: string;
}

export interface ExportBaselineComparison {
  status: "no_locked_baseline" | "baseline_current" | "newer_version";
  baselineSnapshotId: string | null;
  comparedSnapshotId: string | null;
  replacementSnapshotId: string | null;
  canReplaceBaseline: boolean;
  label: string;
  detail: string;
  readinessDelta: number;
  chapterDelta: number;
  wordDelta: number;
  fileSizeDelta: number;
  fileSizeDeltaLabel: string;
  contentChanged: boolean;
  targetChanged: boolean;
}

export interface ExportBaselineTimelineItem {
  snapshotId: string;
  label: string;
  fileName: string;
  createdAt: string | Date;
  lockedAt: string | Date;
  readinessPercent: number;
  isCurrent: boolean;
  statusLabel: string;
  detail: string;
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
  baselineComparison: ExportBaselineComparison;
  baselineTimeline: ExportBaselineTimelineItem[];
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

function fileSizeLabel(size: number) {
  if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
  if (size >= 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${size} B`;
}

function signedFileSizeDelta(value: number) {
  if (value === 0) return "0 B";
  const prefix = value > 0 ? "+" : "-";
  return `${prefix}${fileSizeLabel(Math.abs(value))}`;
}

function signedDelta(value: number) {
  if (value > 0) return `+${value}`;
  return String(value);
}

function pickBaselineCandidate(orderedSnapshots: ExportPackageSnapshotView[]): ExportBaselineCandidate | null {
  const locked = orderedSnapshots.find((snapshot) => snapshot.isBaseline) ?? null;
  if (locked) {
    return {
      snapshotId: locked.id,
      targetId: buildTargetId(locked.packageKind, locked.format),
      label: `${locked.packageKindLabel} · ${locked.formatLabel}`,
      fileName: locked.fileName,
      createdAt: locked.createdAt,
      readinessPercent: locked.readinessPercent,
      lockedAt: locked.baselineLockedAt,
      source: "locked",
      reason: "这条快照已手动锁定为正式交付基准；后续版本对比、发布归档和回滚策略都应围绕它展开。",
    };
  }

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
    lockedAt: null,
    source: "recommended",
    reason: isPreferred
      ? "优先选择完整资料包作为正式交付基准，后续版本对比和发布归档都应围绕它展开。"
      : "暂时没有可交付的完整资料包，先把最新可交付快照作为临时基准候选。",
  };
}

function buildBaselineComparison(orderedSnapshots: ExportPackageSnapshotView[], latestSnapshot: ExportPackageSnapshotView | null): ExportBaselineComparison {
  const locked = orderedSnapshots.find((snapshot) => snapshot.isBaseline) ?? null;
  if (!locked) {
    return {
      status: "no_locked_baseline",
      baselineSnapshotId: null,
      comparedSnapshotId: latestSnapshot?.id ?? null,
      replacementSnapshotId: null,
      canReplaceBaseline: false,
      label: "尚未锁定正式基准",
      detail: "先锁定一个可交付快照，版本中心才能判断新版本是否值得替换基准。",
      readinessDelta: 0,
      chapterDelta: 0,
      wordDelta: 0,
      fileSizeDelta: 0,
      fileSizeDeltaLabel: "0 B",
      contentChanged: false,
      targetChanged: false,
    };
  }

  if (!latestSnapshot || latestSnapshot.id === locked.id) {
    return {
      status: "baseline_current",
      baselineSnapshotId: locked.id,
      comparedSnapshotId: locked.id,
      replacementSnapshotId: null,
      canReplaceBaseline: false,
      label: "当前基准就是最新版本",
      detail: "还没有比正式基准更新的导出记录；继续写作或重导后再做替换判断。",
      readinessDelta: 0,
      chapterDelta: 0,
      wordDelta: 0,
      fileSizeDelta: 0,
      fileSizeDeltaLabel: "0 B",
      contentChanged: false,
      targetChanged: false,
    };
  }

  const readinessDelta = latestSnapshot.readinessPercent - locked.readinessPercent;
  const chapterDelta = latestSnapshot.chapterCount - locked.chapterCount;
  const wordDelta = latestSnapshot.wordCount - locked.wordCount;
  const fileSizeDelta = latestSnapshot.fileSize - locked.fileSize;
  const contentChanged = latestSnapshot.contentHash !== locked.contentHash;
  const targetChanged = latestSnapshot.packageKind !== locked.packageKind || latestSnapshot.format !== locked.format;
  const parts = [
    readinessDelta ? `准备度 ${signedDelta(readinessDelta)}%` : null,
    chapterDelta ? `章节 ${signedDelta(chapterDelta)}` : null,
    wordDelta ? `字数 ${signedDelta(wordDelta)}` : null,
    fileSizeDelta ? `文件 ${signedFileSizeDelta(fileSizeDelta)}` : null,
    contentChanged ? "内容摘要已变化" : null,
    targetChanged ? "交付物类型不同" : null,
  ].filter(Boolean);

  return {
    status: "newer_version",
    baselineSnapshotId: locked.id,
    comparedSnapshotId: latestSnapshot.id,
    replacementSnapshotId: latestSnapshot.id,
    canReplaceBaseline: true,
    label: "发现比基准更新的导出",
    detail: parts.length
      ? `最新版本相对正式基准：${parts.join("，")}。`
      : "最新版本时间更新，但核心元信息与正式基准一致。",
    readinessDelta,
    chapterDelta,
    wordDelta,
    fileSizeDelta,
    fileSizeDeltaLabel: signedFileSizeDelta(fileSizeDelta),
    contentChanged,
    targetChanged,
  };
}

function buildBaselineTimeline(orderedSnapshots: ExportPackageSnapshotView[]): ExportBaselineTimelineItem[] {
  return orderedSnapshots
    .filter((snapshot) => snapshot.baselineLockedAt)
    .sort((a, b) => new Date(b.baselineLockedAt ?? 0).getTime() - new Date(a.baselineLockedAt ?? 0).getTime())
    .map((snapshot) => {
      const label = `${snapshot.packageKindLabel} · ${snapshot.formatLabel}`;
      return {
        snapshotId: snapshot.id,
        label,
        fileName: snapshot.fileName,
        createdAt: snapshot.createdAt,
        lockedAt: snapshot.baselineLockedAt!,
        readinessPercent: snapshot.readinessPercent,
        isCurrent: snapshot.isBaseline,
        statusLabel: snapshot.isBaseline ? "当前正式基准" : "历史基准",
        detail: snapshot.isBaseline
          ? "当前版本对比、发布归档和回滚判断都围绕它展开。"
          : "这条快照曾经作为正式基准，后续被更新版本替换。",
      };
    });
}

export function buildExportVersionCenter(snapshots: ExportPackageSnapshotView[]): ExportVersionCenterSummary {
  const orderedSnapshots = [...snapshots].sort((a, b) => snapshotTime(b) - snapshotTime(a));
  const latestSnapshot = orderedSnapshots[0] ?? null;
  const baselineCandidate = pickBaselineCandidate(orderedSnapshots);
  const baselineComparison = buildBaselineComparison(orderedSnapshots, latestSnapshot);
  const baselineTimeline = buildBaselineTimeline(orderedSnapshots);
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
    baselineComparison,
    baselineTimeline,
    targets,
    nextAction: missingTarget ? {
      label: `补齐 ${missingTarget.label}`,
      detail: "版本中心还缺这个交付包，先生成它，避免交付时临时返工。",
      targetId: missingTarget.id,
    } : weakTarget ? {
      label: `重导 ${weakTarget.label}`,
      detail: "覆盖齐了不等于能交付。先处理准备度偏低的包，再对外发。",
      targetId: weakTarget.id,
    } : baselineCandidate?.source === "recommended" ? {
      label: "锁定推荐基准",
      detail: `${baselineCandidate.label} 已满足交付口径，可以作为后续版本对比和发布归档的基准。`,
      targetId: baselineCandidate.targetId,
    } : baselineCandidate ? {
      label: "基准已锁定",
      detail: `${baselineCandidate.label} 是当前正式交付基准，可以继续生成新版本并做对比。`,
      targetId: baselineCandidate.targetId,
    } : {
      label: "先生成可交付版本",
      detail: "版本库已有记录，但还没有可交付快照，先处理准备度再谈基准。",
      targetId: null,
    },
  };
}
