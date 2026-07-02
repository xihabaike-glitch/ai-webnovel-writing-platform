CREATE TABLE IF NOT EXISTS "Project" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "targetPlatform" TEXT NOT NULL,
  "targetLengthType" TEXT NOT NULL,
  "targetWordCount" INTEGER NOT NULL,
  "currentWordCount" INTEGER NOT NULL DEFAULT 0,
  "genre" TEXT NOT NULL,
  "sellingPoint" TEXT NOT NULL DEFAULT '',
  "updateCadence" TEXT NOT NULL DEFAULT '',
  "aiMonthlyBudgetUsd" REAL NOT NULL DEFAULT 5,
  "aiMaxTaskCostUsd" REAL NOT NULL DEFAULT 0.25,
  "aiMaxBatchCostUsd" REAL NOT NULL DEFAULT 1,
  "aiMaxFailureRatePercent" INTEGER NOT NULL DEFAULT 20,
  "aiBudgetEnforcement" TEXT NOT NULL DEFAULT 'block',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Chapter" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "volumeId" TEXT,
  "order" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL DEFAULT '',
  "wordCount" INTEGER NOT NULL DEFAULT 0,
  "goal" TEXT NOT NULL DEFAULT '',
  "hook" TEXT NOT NULL DEFAULT '',
  "conflict" TEXT NOT NULL DEFAULT '',
  "valueShift" TEXT NOT NULL DEFAULT '',
  "cliffhanger" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL DEFAULT 'draft',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Chapter_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "ChapterRevision" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "chapterId" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "sourceTaskId" TEXT,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL DEFAULT '',
  "wordCount" INTEGER NOT NULL DEFAULT 0,
  "goal" TEXT NOT NULL DEFAULT '',
  "hook" TEXT NOT NULL DEFAULT '',
  "conflict" TEXT NOT NULL DEFAULT '',
  "valueShift" TEXT NOT NULL DEFAULT '',
  "cliffhanger" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL,
  "notes" TEXT NOT NULL DEFAULT '',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChapterRevision_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "OutlineNode" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "parentId" TEXT,
  "chapterId" TEXT,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT NOT NULL DEFAULT '',
  "goal" TEXT NOT NULL DEFAULT '',
  "hook" TEXT NOT NULL DEFAULT '',
  "conflict" TEXT NOT NULL DEFAULT '',
  "valueShift" TEXT NOT NULL DEFAULT '',
  "platformNote" TEXT NOT NULL DEFAULT '',
  "order" INTEGER NOT NULL DEFAULT 0,
  "depth" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'planned',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OutlineNode_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OutlineNode_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "OutlineNode_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "OutlineNode" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Character" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "desire" TEXT NOT NULL DEFAULT '',
  "need" TEXT NOT NULL DEFAULT '',
  "flaw" TEXT NOT NULL DEFAULT '',
  "arcStart" TEXT NOT NULL DEFAULT '',
  "arcEnd" TEXT NOT NULL DEFAULT '',
  "voice" TEXT NOT NULL DEFAULT '',
  "relationshipNotes" TEXT NOT NULL DEFAULT '',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Character_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "WorldEntry" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL DEFAULT '',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorldEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Foreshadow" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "setupChapterId" TEXT,
  "payoffChapterId" TEXT,
  "relatedCharacterIds" TEXT NOT NULL DEFAULT '[]',
  "status" TEXT NOT NULL DEFAULT 'planned',
  "notes" TEXT NOT NULL DEFAULT '',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Foreshadow_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "PlotThread" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "startChapterId" TEXT,
  "endChapterId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'planned',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlotThread_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "ModelProvider" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "providerId" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "baseUrl" TEXT,
  "encryptedApiKey" TEXT,
  "defaultModel" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "maxContextTokens" INTEGER,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ModelTaskRoute" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "taskType" TEXT NOT NULL UNIQUE,
  "primaryProviderConfigId" TEXT,
  "fallbackProviderConfigId" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ModelTaskRoute_primaryProviderConfigId_fkey" FOREIGN KEY ("primaryProviderConfigId") REFERENCES "ModelProvider" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ModelTaskRoute_fallbackProviderConfigId_fkey" FOREIGN KEY ("fallbackProviderConfigId") REFERENCES "ModelProvider" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "AiTask" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "chapterId" TEXT,
  "taskType" TEXT NOT NULL,
  "providerConfigId" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "inputSnapshot" TEXT NOT NULL,
  "outputText" TEXT,
  "inputTokens" INTEGER,
  "outputTokens" INTEGER,
  "costUsd" REAL,
  "errorMessage" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiTask_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AiTask_providerConfigId_fkey" FOREIGN KEY ("providerConfigId") REFERENCES "ModelProvider" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "PublishPackageSnapshot" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "platformId" TEXT NOT NULL,
  "platformName" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "logline" TEXT NOT NULL,
  "synopsis" TEXT NOT NULL,
  "tags" TEXT NOT NULL DEFAULT '[]',
  "markdown" TEXT NOT NULL,
  "chapterCount" INTEGER NOT NULL DEFAULT 0,
  "wordCount" INTEGER NOT NULL DEFAULT 0,
  "preflightScore" INTEGER NOT NULL DEFAULT 0,
  "canExport" BOOLEAN NOT NULL DEFAULT false,
  "action" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PublishPackageSnapshot_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "PlatformSubmissionAsset" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "platformId" TEXT NOT NULL,
  "platformName" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "logline" TEXT NOT NULL,
  "synopsis" TEXT NOT NULL,
  "overseasSynopsis" TEXT NOT NULL DEFAULT '',
  "tags" TEXT NOT NULL DEFAULT '[]',
  "note" TEXT NOT NULL DEFAULT '',
  "source" TEXT NOT NULL DEFAULT 'manual',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformSubmissionAsset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "PlatformSubmissionAsset_projectId_platformId_key" ON "PlatformSubmissionAsset"("projectId", "platformId");

CREATE TABLE IF NOT EXISTS "PlatformSubmissionAssetVersion" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "assetId" TEXT,
  "platformId" TEXT NOT NULL,
  "platformName" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "logline" TEXT NOT NULL,
  "synopsis" TEXT NOT NULL,
  "overseasSynopsis" TEXT NOT NULL DEFAULT '',
  "tags" TEXT NOT NULL DEFAULT '[]',
  "note" TEXT NOT NULL DEFAULT '',
  "source" TEXT NOT NULL DEFAULT 'manual',
  "sourceTaskId" TEXT,
  "strategy" TEXT NOT NULL DEFAULT '',
  "auditScore" INTEGER NOT NULL DEFAULT 0,
  "auditStatus" TEXT NOT NULL DEFAULT 'needs_work',
  "action" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformSubmissionAssetVersion_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PlatformSubmissionAssetVersion_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "PlatformSubmissionAsset" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "PlatformSubmissionAssetVersion_projectId_platformId_createdAt_idx" ON "PlatformSubmissionAssetVersion"("projectId", "platformId", "createdAt");

CREATE TABLE IF NOT EXISTS "PlatformPublishMetric" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "platformId" TEXT NOT NULL,
  "platformName" TEXT NOT NULL,
  "views" INTEGER NOT NULL DEFAULT 0,
  "clicks" INTEGER NOT NULL DEFAULT 0,
  "favorites" INTEGER NOT NULL DEFAULT 0,
  "follows" INTEGER NOT NULL DEFAULT 0,
  "comments" INTEGER NOT NULL DEFAULT 0,
  "paidReads" INTEGER NOT NULL DEFAULT 0,
  "editorFeedback" TEXT NOT NULL DEFAULT '',
  "contractStatus" TEXT NOT NULL DEFAULT 'unknown',
  "publishUrl" TEXT NOT NULL DEFAULT '',
  "notes" TEXT NOT NULL DEFAULT '',
  "snapshotDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformPublishMetric_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "PlatformPublishMetric_projectId_platformId_snapshotDate_idx" ON "PlatformPublishMetric"("projectId", "platformId", "snapshotDate");

CREATE TABLE IF NOT EXISTS "GateActionAudit" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "receiptId" TEXT NOT NULL UNIQUE,
  "actionId" TEXT NOT NULL,
  "projectId" TEXT,
  "platformId" TEXT NOT NULL DEFAULT '',
  "platformName" TEXT NOT NULL DEFAULT '',
  "label" TEXT NOT NULL,
  "detail" TEXT NOT NULL,
  "href" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "executionType" TEXT NOT NULL,
  "succeededCount" INTEGER NOT NULL DEFAULT 0,
  "failedCount" INTEGER NOT NULL DEFAULT 0,
  "taskId" TEXT,
  "recheckStatus" TEXT NOT NULL,
  "recheckLabel" TEXT NOT NULL,
  "recheckDetail" TEXT NOT NULL,
  "recheckAction" TEXT NOT NULL,
  "payload" TEXT NOT NULL DEFAULT '{}',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GateActionAudit_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "GateActionAudit_projectId_createdAt_idx" ON "GateActionAudit"("projectId", "createdAt");
CREATE INDEX IF NOT EXISTS "GateActionAudit_platformId_createdAt_idx" ON "GateActionAudit"("platformId", "createdAt");
CREATE INDEX IF NOT EXISTS "GateActionAudit_executionType_createdAt_idx" ON "GateActionAudit"("executionType", "createdAt");

CREATE TABLE IF NOT EXISTS "GateDispatchTask" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "dispatchKey" TEXT NOT NULL UNIQUE,
  "projectId" TEXT,
  "platformId" TEXT NOT NULL,
  "platformName" TEXT NOT NULL,
  "stage" TEXT NOT NULL,
  "state" TEXT NOT NULL DEFAULT 'queued',
  "priorityScore" INTEGER NOT NULL DEFAULT 0,
  "ownerRole" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "detail" TEXT NOT NULL,
  "dueLabel" TEXT NOT NULL,
  "actionLabel" TEXT NOT NULL,
  "href" TEXT NOT NULL,
  "acceptanceCriteria" TEXT NOT NULL DEFAULT '[]',
  "evidence" TEXT NOT NULL DEFAULT '[]',
  "sourceReceiptId" TEXT,
  "reviewLatestAt" DATETIME NOT NULL,
  "assignedAt" DATETIME,
  "completedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GateDispatchTask_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "GateDispatchTask_state_priorityScore_idx" ON "GateDispatchTask"("state", "priorityScore");
CREATE INDEX IF NOT EXISTS "GateDispatchTask_platformId_updatedAt_idx" ON "GateDispatchTask"("platformId", "updatedAt");
CREATE INDEX IF NOT EXISTS "GateDispatchTask_projectId_updatedAt_idx" ON "GateDispatchTask"("projectId", "updatedAt");
