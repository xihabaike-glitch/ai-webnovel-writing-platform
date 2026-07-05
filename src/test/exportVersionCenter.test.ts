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
  createdAt: string;
}) {
  return exportSnapshotView({
    id: input.id,
    packageKind: input.packageKind,
    format: input.format,
    title: "夜雨系统",
    fileName: `${input.id}.md`,
    contentType: "text/markdown",
    fileSize: 1000,
    contentHash: input.id.padEnd(64, "a").slice(0, 64),
    readinessStatus: input.readinessStatus ?? "ready",
    readinessPercent: input.readinessPercent ?? 90,
    chapterCount: 3,
    wordCount: 9000,
    notes: "",
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
});

