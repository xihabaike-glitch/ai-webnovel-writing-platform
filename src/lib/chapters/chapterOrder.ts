import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

const MAX_CHAPTER_ORDER_ATTEMPTS = 3;
const CHAPTER_ORDER_CONFLICT_MESSAGE = "Chapter order changed while chapters were being created. Reload and retry.";

export class ChapterOrderConflictError extends Error {
  constructor() {
    super(CHAPTER_ORDER_CONFLICT_MESSAGE);
    this.name = "ChapterOrderConflictError";
  }
}

export interface ChapterOrderConflictContract {
  status: 409;
  code: "CHAPTER_ORDER_CONFLICT";
  error: string;
  reload: true;
}

export function nextChapterOrder(currentMaximum: number | null) {
  return (currentMaximum ?? 0) + 1;
}

function isChapterOrderConflict(error: unknown) {
  return Boolean(
    error
    && typeof error === "object"
    && "code" in error
    && (error as { code?: unknown }).code === "P2002",
  );
}

export function getChapterOrderConflictContract(error: unknown): ChapterOrderConflictContract | null {
  if (!(error instanceof ChapterOrderConflictError) && !isChapterOrderConflict(error)) return null;
  return {
    status: 409,
    code: "CHAPTER_ORDER_CONFLICT",
    error: CHAPTER_ORDER_CONFLICT_MESSAGE,
    reload: true,
  };
}

export async function createWithNextChapterOrder<T>(
  projectId: string,
  create: (tx: Prisma.TransactionClient, order: number) => Promise<T>,
) {
  for (let attempt = 0; attempt < MAX_CHAPTER_ORDER_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        const result = await tx.chapter.aggregate({
          where: { projectId },
          _max: { order: true },
        });
        return create(tx, nextChapterOrder(result._max.order));
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (!isChapterOrderConflict(error)) throw error;
    }
  }

  throw new ChapterOrderConflictError();
}
