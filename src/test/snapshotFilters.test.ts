import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildExportSnapshotFilterOptions, filterExportSnapshots, matchesExportSnapshotFilter } from "../lib/export/snapshotFilters.ts";

describe("export snapshot filters", () => {
  const snapshots = [
    { packageKind: "full", format: "markdown" },
    { packageKind: "full", format: "docx" },
    { packageKind: "outline", format: "docx" },
    { packageKind: "characters", format: "markdown" },
    { packageKind: "chapters_zip", format: "zip" },
    { packageKind: "foreshadows_csv", format: "csv" },
  ];

  it("matches package and format filters explicitly", () => {
    assert.equal(matchesExportSnapshotFilter(snapshots[0], "all"), true);
    assert.equal(matchesExportSnapshotFilter(snapshots[0], "full"), true);
    assert.equal(matchesExportSnapshotFilter(snapshots[0], "markdown"), true);
    assert.equal(matchesExportSnapshotFilter(snapshots[0], "docx"), false);
    assert.equal(matchesExportSnapshotFilter(snapshots[4], "chapters_zip"), true);
    assert.equal(matchesExportSnapshotFilter(snapshots[5], "foreshadows_csv"), true);
  });

  it("filters history by author-facing categories", () => {
    assert.equal(filterExportSnapshots(snapshots, "all").length, 6);
    assert.equal(filterExportSnapshots(snapshots, "full").length, 2);
    assert.equal(filterExportSnapshots(snapshots, "outline").length, 1);
    assert.equal(filterExportSnapshots(snapshots, "characters").length, 1);
    assert.equal(filterExportSnapshots(snapshots, "markdown").length, 2);
    assert.equal(filterExportSnapshots(snapshots, "docx").length, 2);
  });

  it("builds filter options with counts", () => {
    const options = buildExportSnapshotFilterOptions(snapshots);
    const counts = new Map(options.map((option) => [option.id, option.count]));

    assert.equal(counts.get("all"), 6);
    assert.equal(counts.get("full"), 2);
    assert.equal(counts.get("chapters_zip"), 1);
    assert.equal(counts.get("foreshadows_csv"), 1);
    assert.equal(counts.get("markdown"), 2);
    assert.equal(counts.get("docx"), 2);
  });
});
