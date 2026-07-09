-- Repair historical duplicate orders deterministically before enforcing uniqueness.
WITH ranked_chapters AS (
  SELECT "id", ROW_NUMBER() OVER (
    PARTITION BY "projectId"
    ORDER BY "order" ASC, "createdAt" ASC, "id" ASC
  ) AS "nextOrder"
  FROM "Chapter"
)
UPDATE "Chapter"
SET "order" = (
  SELECT "nextOrder"
  FROM ranked_chapters
  WHERE ranked_chapters."id" = "Chapter"."id"
);

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
