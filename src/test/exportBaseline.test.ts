import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { PrismaClient } from "@prisma/client";
import { parseExportBaselineAction, updateExportSnapshotBaseline } from "../lib/export/baseline.ts";

describe("export baseline updates", () => {
  it("parses only supported baseline actions", () => {
    assert.equal(parseExportBaselineAction("lock"), "lock");
    assert.equal(parseExportBaselineAction("unlock"), "unlock");
    assert.equal(parseExportBaselineAction("delete"), null);
  });

  it("locks one snapshot and preserves the previous baseline history", async () => {
    const rows = [
      { id: "old", projectId: "project-1", packageKind: "full", format: "markdown", isBaseline: true, baselineLockedAt: new Date("2026-07-05T00:00:00.000Z") },
      { id: "next", projectId: "project-1", packageKind: "full", format: "docx", isBaseline: false, baselineLockedAt: null },
      { id: "other", projectId: "project-2", packageKind: "full", format: "docx", isBaseline: true, baselineLockedAt: new Date("2026-07-05T00:00:00.000Z") },
    ];
    const client = {
      exportPackageSnapshot: {
        async findUnique({ where }: { where: { id: string } }) {
          return rows.find((row) => row.id === where.id) ?? null;
        },
        async updateMany({ where, data }: { where: { projectId: string; isBaseline: boolean }; data: { isBaseline: boolean; baselineLockedAt?: Date | null } }) {
          for (const row of rows) {
            if (row.projectId === where.projectId && row.isBaseline === where.isBaseline) {
              row.isBaseline = data.isBaseline;
              if ("baselineLockedAt" in data) row.baselineLockedAt = data.baselineLockedAt ?? null;
            }
          }
          return { count: rows.length };
        },
        async update({ where, data }: { where: { id: string }; data: { isBaseline: boolean; baselineLockedAt: Date | null } }) {
          const row = rows.find((item) => item.id === where.id);
          if (!row) throw new Error("missing row");
          row.isBaseline = data.isBaseline;
          row.baselineLockedAt = data.baselineLockedAt;
          return row;
        },
      },
      async $transaction(callback: (transaction: typeof client) => Promise<unknown>) {
        return callback(client);
      },
    };

    const result = await updateExportSnapshotBaseline(client as unknown as PrismaClient, "next", "lock");

    assert.equal(result?.snapshotId, "next");
    assert.equal(rows.find((row) => row.id === "old")?.isBaseline, false);
    assert.deepEqual(rows.find((row) => row.id === "old")?.baselineLockedAt, new Date("2026-07-05T00:00:00.000Z"));
    assert.equal(rows.find((row) => row.id === "next")?.isBaseline, true);
    assert.equal(rows.find((row) => row.id === "other")?.isBaseline, true);
  });

  it("unlocks only the selected snapshot", async () => {
    const rows = [
      { id: "locked", projectId: "project-1", packageKind: "full", format: "docx", isBaseline: true, baselineLockedAt: new Date("2026-07-05T00:00:00.000Z") },
    ];
    const client = {
      exportPackageSnapshot: {
        async findUnique({ where }: { where: { id: string } }) {
          return rows.find((row) => row.id === where.id) ?? null;
        },
        async update({ where, data }: { where: { id: string }; data: { isBaseline: boolean; baselineLockedAt: Date | null } }) {
          const row = rows.find((item) => item.id === where.id);
          if (!row) throw new Error("missing row");
          row.isBaseline = data.isBaseline;
          row.baselineLockedAt = data.baselineLockedAt;
          return row;
        },
      },
    };

    const result = await updateExportSnapshotBaseline(client as unknown as PrismaClient, "locked", "unlock");

    assert.equal(result?.isBaseline, false);
    assert.equal(rows[0].baselineLockedAt, null);
  });
});
