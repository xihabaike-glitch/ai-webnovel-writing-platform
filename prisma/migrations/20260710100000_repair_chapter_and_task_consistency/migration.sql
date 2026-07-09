-- Repair only historical duplicate orders before enforcing uniqueness. Existing
-- gaps are meaningful author data, so keep the first chapter at each order and
-- append later duplicates after the project's current maximum order.
WITH ranked_chapters AS (
  SELECT
    "id",
    "projectId",
    "order",
    "createdAt",
    ROW_NUMBER() OVER (
      PARTITION BY "projectId", "order"
      ORDER BY "createdAt" ASC, "id" ASC
    ) AS "duplicateRank",
    MAX("order") OVER (PARTITION BY "projectId") AS "maxOrder"
  FROM "Chapter"
),
duplicate_chapters AS (
  SELECT
    "id",
    (CASE WHEN "maxOrder" > 0 THEN "maxOrder" ELSE 0 END) + ROW_NUMBER() OVER (
      PARTITION BY "projectId"
      ORDER BY "order" ASC, "createdAt" ASC, "id" ASC
    ) AS "nextOrder"
  FROM ranked_chapters
  WHERE "duplicateRank" > 1
)
UPDATE "Chapter"
SET "order" = (
  SELECT "nextOrder"
  FROM duplicate_chapters
  WHERE duplicate_chapters."id" = "Chapter"."id"
)
WHERE "id" IN (SELECT "id" FROM duplicate_chapters);

-- Keep the newest active task and fail older duplicate work before adding the guard.
WITH ranked_active_tasks AS (
  SELECT "id", ROW_NUMBER() OVER (
    PARTITION BY "chapterId", "taskType"
    ORDER BY "updatedAt" DESC, "createdAt" DESC, "id" DESC
  ) AS "activeRank"
  FROM "AiTask"
  WHERE "chapterId" IS NOT NULL
    AND "status" IN ('queued', 'running')
)
UPDATE "AiTask"
SET "status" = 'failed',
    "errorMessage" = 'Superseded by the chapter task single-flight consistency migration.'
WHERE "id" IN (
  SELECT "id" FROM ranked_active_tasks WHERE "activeRank" > 1
);

-- Prevent concurrent chapter creation from allocating the same order.
CREATE UNIQUE INDEX "Chapter_projectId_order_key" ON "Chapter"("projectId", "order");

-- Support stale task recovery and active task checks.
CREATE INDEX "AiTask_chapterId_taskType_status_updatedAt_idx" ON "AiTask"("chapterId", "taskType", "status", "updatedAt");

-- A chapter may have only one queued or running task of a given type.
CREATE UNIQUE INDEX "AiTask_chapterId_taskType_active_key"
ON "AiTask"("chapterId", "taskType")
WHERE "chapterId" IS NOT NULL AND "status" IN ('queued', 'running');
