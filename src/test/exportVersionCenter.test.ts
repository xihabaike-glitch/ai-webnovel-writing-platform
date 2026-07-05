import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildExportVersionCenter } from "../lib/export/versionCenter.ts";
import { exportSnapshotView } from "../lib/export/snapshots.ts";

function snapshot(input: {
  id: string;
  packageKind: string;
  format: string;
  readinessStatus?: string;
  readinessPercent?: number;
  fileSize?: number;
  contentHash?: string;
  chapterCount?: number;
  wordCount?: number;
  isBaseline?: boolean;
  baselineLockedAt?: string;
  createdAt: string;
}) {
  return exportSnapshotView({
    id: input.id,
    packageKind: input.packageKind,
    format: input.format,
    title: "夜雨系统",
    fileName: `${input.id}.md`,
    contentType: "text/markdown",
    fileSize: input.fileSize ?? 1000,
    contentHash: input.contentHash ?? input.id.padEnd(64, "a").slice(0, 64),
    readinessStatus: input.readinessStatus ?? "ready",
    readinessPercent: input.readinessPercent ?? 90,
    chapterCount: input.chapterCount ?? 3,
    wordCount: input.wordCount ?? 9000,
    notes: "",
    isBaseline: input.isBaseline,
    baselineLockedAt: input.baselineLockedAt ?? null,
    createdAt: input.createdAt,
  });
}

describe("export version center", () => {
  it("summarizes coverage, latest snapshot, and missing target action", () => {
    const center = buildExportVersionCenter([
      snapshot({ id: "full-md", packageKind: "full", format: "markdown", createdAt: "2026-07-05T02:00:00.000Z" }),
      snapshot({ id: "full-docx", packageKind: "full", format: "docx", readinessStatus: "warning", readinessPercent: 70, createdAt: "2026-07-05T01:00:00.000Z" }),
      snapshot({ id: "outline-md", packageKind: "outline", format: "markdown", createdAt: "2026-07-05T00:00:00.000Z" }),
    ]);

    assert.equal(center.totalSnapshots, 3);
    assert.equal(center.latestSnapshot?.id, "full-md");
    assert.equal(center.coveredTargets, 3);
    assert.equal(center.totalTargets, 8);
    assert.equal(center.targetCoveragePercent, 38);
    assert.equal(center.readySnapshots, 2);
    assert.equal(center.averageReadinessPercent, 83);
    assert.equal(center.baselineCandidate?.snapshotId, "full-md");
    assert.equal(center.targets.find((target) => target.id === "full:markdown")?.isBaselineCandidate, true);
    assert.equal(center.nextAction.targetId, "outline:docx");
    assert.match(center.nextAction.label, /补齐/);
  });

  it("recommends re-exporting weak covered targets before calling the library complete", () => {
    const center = buildExportVersionCenter([
      snapshot({ id: "full-md", packageKind: "full", format: "markdown", createdAt: "2026-07-05T07:00:00.000Z" }),
      snapshot({ id: "full-docx", packageKind: "full", format: "docx", createdAt: "2026-07-05T06:00:00.000Z" }),
      snapshot({ id: "outline-md", packageKind: "outline", format: "markdown", createdAt: "2026-07-05T05:00:00.000Z" }),
      snapshot({ id: "outline-docx", packageKind: "outline", format: "docx", createdAt: "2026-07-05T04:00:00.000Z" }),
      snapshot({ id: "characters-md", packageKind: "characters", format: "markdown", createdAt: "2026-07-05T03:00:00.000Z" }),
      snapshot({ id: "characters-docx", packageKind: "characters", format: "docx", createdAt: "2026-07-05T02:00:00.000Z" }),
      snapshot({ id: "chapters-zip", packageKind: "chapters_zip", format: "zip", readinessStatus: "blocked", readinessPercent: 40, createdAt: "2026-07-05T01:00:00.000Z" }),
      snapshot({ id: "foreshadows-csv", packageKind: "foreshadows_csv", format: "csv", createdAt: "2026-07-05T00:00:00.000Z" }),
    ]);

    assert.equal(center.targetCoveragePercent, 100);
    assert.equal(center.nextAction.targetId, "chapters_zip:zip");
    assert.match(center.nextAction.label, /重导/);
    assert.equal(center.targets.find((target) => target.id === "chapters_zip:zip")?.statusLabel, "不建议交付");
  });

  it("prefers a ready full word package as the baseline candidate", () => {
    const center = buildExportVersionCenter([
      snapshot({ id: "outline-md", packageKind: "outline", format: "markdown", readinessPercent: 100, createdAt: "2026-07-05T03:00:00.000Z" }),
      snapshot({ id: "full-md", packageKind: "full", format: "markdown", readinessPercent: 90, createdAt: "2026-07-05T02:00:00.000Z" }),
      snapshot({ id: "full-docx", packageKind: "full", format: "docx", readinessPercent: 88, createdAt: "2026-07-05T01:00:00.000Z" }),
    ]);

    assert.equal(center.baselineCandidate?.snapshotId, "full-docx");
    assert.equal(center.baselineCandidate?.targetId, "full:docx");
    assert.match(center.baselineCandidate?.reason ?? "", /正式交付基准/);
  });

  it("keeps baseline empty when no snapshot is ready", () => {
    const center = buildExportVersionCenter([
      snapshot({ id: "full-md", packageKind: "full", format: "markdown", readinessStatus: "warning", readinessPercent: 70, createdAt: "2026-07-05T02:00:00.000Z" }),
      snapshot({ id: "outline-md", packageKind: "outline", format: "markdown", readinessStatus: "blocked", readinessPercent: 40, createdAt: "2026-07-05T01:00:00.000Z" }),
    ]);

    assert.equal(center.baselineCandidate, null);
    assert.equal(center.targets.some((target) => target.isBaselineCandidate), false);
  });

  it("uses a locked baseline before automatic recommendations", () => {
    const center = buildExportVersionCenter([
      snapshot({ id: "full-docx", packageKind: "full", format: "docx", createdAt: "2026-07-05T03:00:00.000Z" }),
      snapshot({
        id: "full-md-locked",
        packageKind: "full",
        format: "markdown",
        isBaseline: true,
        baselineLockedAt: "2026-07-05T04:00:00.000Z",
        createdAt: "2026-07-05T02:00:00.000Z",
      }),
    ]);

    assert.equal(center.baselineCandidate?.snapshotId, "full-md-locked");
    assert.equal(center.baselineCandidate?.source, "locked");
    assert.equal(center.baselineCandidate?.lockedAt, "2026-07-05T04:00:00.000Z");
    assert.match(center.nextAction.label, /补齐/);
  });

  it("builds a current and historical baseline timeline", () => {
    const center = buildExportVersionCenter([
      snapshot({
        id: "full-md-current",
        packageKind: "full",
        format: "markdown",
        isBaseline: true,
        baselineLockedAt: "2026-07-05T06:00:00.000Z",
        createdAt: "2026-07-05T05:00:00.000Z",
      }),
      snapshot({
        id: "full-md-old",
        packageKind: "full",
        format: "markdown",
        isBaseline: false,
        baselineLockedAt: "2026-07-05T04:00:00.000Z",
        createdAt: "2026-07-05T03:00:00.000Z",
      }),
      snapshot({ id: "outline-md", packageKind: "outline", format: "markdown", createdAt: "2026-07-05T02:00:00.000Z" }),
    ]);

    assert.equal(center.baselineTimeline.length, 2);
    assert.equal(center.baselineTimeline[0].snapshotId, "full-md-current");
    assert.equal(center.baselineTimeline[0].isCurrent, true);
    assert.equal(center.baselineTimeline[0].statusLabel, "当前正式基准");
    assert.equal(center.baselineTimeline[1].snapshotId, "full-md-old");
    assert.equal(center.baselineTimeline[1].isCurrent, false);
    assert.equal(center.baselineTimeline[1].statusLabel, "历史基准");
  });

  it("asks for a locked baseline before comparing versions", () => {
    const center = buildExportVersionCenter([
      snapshot({ id: "full-md", packageKind: "full", format: "markdown", createdAt: "2026-07-05T02:00:00.000Z" }),
    ]);

    assert.equal(center.baselineComparison.status, "no_locked_baseline");
    assert.equal(center.baselineComparison.baselineSnapshotId, null);
    assert.equal(center.baselineComparison.comparedSnapshotId, "full-md");
    assert.equal(center.baselineComparison.canReplaceBaseline, false);
    assert.equal(center.baselineComparison.replacementSnapshotId, null);
  });

  it("reports when the locked baseline is still current", () => {
    const center = buildExportVersionCenter([
      snapshot({
        id: "full-md-locked",
        packageKind: "full",
        format: "markdown",
        isBaseline: true,
        baselineLockedAt: "2026-07-05T04:00:00.000Z",
        createdAt: "2026-07-05T04:00:00.000Z",
      }),
    ]);

    assert.equal(center.baselineComparison.status, "baseline_current");
    assert.equal(center.baselineComparison.baselineSnapshotId, "full-md-locked");
    assert.equal(center.baselineComparison.contentChanged, false);
    assert.equal(center.baselineComparison.canReplaceBaseline, false);
  });

  it("compares the latest export against a locked baseline", () => {
    const center = buildExportVersionCenter([
      snapshot({
        id: "full-md-new",
        packageKind: "full",
        format: "markdown",
        readinessPercent: 96,
        fileSize: 1800,
        contentHash: "b".repeat(64),
        chapterCount: 4,
        wordCount: 12000,
        createdAt: "2026-07-05T05:00:00.000Z",
      }),
      snapshot({
        id: "full-md-locked",
        packageKind: "full",
        format: "markdown",
        readinessPercent: 90,
        fileSize: 1000,
        contentHash: "a".repeat(64),
        chapterCount: 3,
        wordCount: 9000,
        isBaseline: true,
        baselineLockedAt: "2026-07-05T04:00:00.000Z",
        createdAt: "2026-07-05T04:00:00.000Z",
      }),
    ]);

    assert.equal(center.baselineComparison.status, "newer_version");
    assert.equal(center.baselineComparison.baselineSnapshotId, "full-md-locked");
    assert.equal(center.baselineComparison.comparedSnapshotId, "full-md-new");
    assert.equal(center.baselineComparison.replacementSnapshotId, "full-md-new");
    assert.equal(center.baselineComparison.canReplaceBaseline, true);
    assert.equal(center.baselineComparison.readinessDelta, 6);
    assert.equal(center.baselineComparison.chapterDelta, 1);
    assert.equal(center.baselineComparison.wordDelta, 3000);
    assert.equal(center.baselineComparison.fileSizeDeltaLabel, "+800 B");
    assert.equal(center.baselineComparison.contentChanged, true);
    assert.match(center.baselineComparison.detail, /内容摘要已变化/);
  });
});
