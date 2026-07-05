import type { PrismaClient } from "@prisma/client";

export type ExportBaselineAction = "lock" | "unlock";

export interface ExportBaselineActionResult {
  snapshotId: string;
  projectId: string;
  isBaseline: boolean;
  baselineLockedAt: Date | null;
  message: string;
}

export function parseExportBaselineAction(value: unknown): ExportBaselineAction | null {
  if (value === "lock" || value === "unlock") return value;
  return null;
}

export async function updateExportSnapshotBaseline(
  prisma: PrismaClient,
  snapshotId: string,
  action: ExportBaselineAction,
): Promise<ExportBaselineActionResult | null> {
  const snapshot = await prisma.exportPackageSnapshot.findUnique({
    where: { id: snapshotId },
    select: {
      id: true,
      projectId: true,
      packageKind: true,
      format: true,
    },
  });

  if (!snapshot) return null;

  if (action === "unlock") {
    const updated = await prisma.exportPackageSnapshot.update({
      where: { id: snapshot.id },
      data: {
        isBaseline: false,
        baselineLockedAt: null,
      },
      select: {
        id: true,
        projectId: true,
        isBaseline: true,
        baselineLockedAt: true,
      },
    });

    return {
      snapshotId: updated.id,
      projectId: updated.projectId,
      isBaseline: updated.isBaseline,
      baselineLockedAt: updated.baselineLockedAt,
      message: "已解除导出基准。",
    };
  }

  const lockedAt = new Date();
  const updated = await prisma.$transaction(async (transaction) => {
    await transaction.exportPackageSnapshot.updateMany({
      where: {
        projectId: snapshot.projectId,
        isBaseline: true,
      },
      data: {
        isBaseline: false,
        baselineLockedAt: null,
      },
    });

    return transaction.exportPackageSnapshot.update({
      where: { id: snapshot.id },
      data: {
        isBaseline: true,
        baselineLockedAt: lockedAt,
      },
      select: {
        id: true,
        projectId: true,
        isBaseline: true,
        baselineLockedAt: true,
      },
    });
  });

  return {
    snapshotId: updated.id,
    projectId: updated.projectId,
    isBaseline: updated.isBaseline,
    baselineLockedAt: updated.baselineLockedAt,
    message: "已锁定为导出基准。",
  };
}

