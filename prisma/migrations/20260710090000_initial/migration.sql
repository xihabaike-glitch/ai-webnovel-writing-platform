-- CreateTable
CREATE TABLE "Project" (
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
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Chapter" (
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
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Chapter_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChapterRevision" (
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

-- CreateTable
CREATE TABLE "OutlineNode" (
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
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OutlineNode_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OutlineNode_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "OutlineNode_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "OutlineNode" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Character" (
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
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Character_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorldEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorldEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Foreshadow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "setupChapterId" TEXT,
    "payoffChapterId" TEXT,
    "relatedCharacterIds" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'planned',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Foreshadow_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlotThread" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startChapterId" TEXT,
    "endChapterId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PlotThread_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ModelProvider" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "providerId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "baseUrl" TEXT,
    "encryptedApiKey" TEXT,
    "defaultModel" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "maxContextTokens" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ModelTaskRoute" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskType" TEXT NOT NULL,
    "primaryProviderConfigId" TEXT,
    "fallbackProviderConfigId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ModelTaskRoute_primaryProviderConfigId_fkey" FOREIGN KEY ("primaryProviderConfigId") REFERENCES "ModelProvider" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ModelTaskRoute_fallbackProviderConfigId_fkey" FOREIGN KEY ("fallbackProviderConfigId") REFERENCES "ModelProvider" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ModelRouteAvoidanceOverride" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ruleKey" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "taskType" TEXT,
    "note" TEXT NOT NULL DEFAULT '',
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AiTask" (
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
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AiTask_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AiTask_providerConfigId_fkey" FOREIGN KEY ("providerConfigId") REFERENCES "ModelProvider" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PublishPackageSnapshot" (
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

-- CreateTable
CREATE TABLE "ExportPackageSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "packageKind" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL DEFAULT 0,
    "contentHash" TEXT NOT NULL,
    "readinessStatus" TEXT NOT NULL,
    "readinessPercent" INTEGER NOT NULL DEFAULT 0,
    "chapterCount" INTEGER NOT NULL DEFAULT 0,
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT NOT NULL DEFAULT '',
    "isBaseline" BOOLEAN NOT NULL DEFAULT false,
    "baselineLockedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExportPackageSnapshot_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlatformSubmissionAsset" (
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
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PlatformSubmissionAsset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlatformSubmissionAssetVersion" (
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

-- CreateTable
CREATE TABLE "PlatformPublishMetric" (
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
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PlatformPublishMetric_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlatformKnowledgeFeedbackReceipt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "receiptId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "platformName" TEXT NOT NULL,
    "actionLabel" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "completedStepLabel" TEXT NOT NULL,
    "stopReason" TEXT NOT NULL,
    "nextAction" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlatformKnowledgeFeedbackReceipt_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GateActionAudit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "receiptId" TEXT NOT NULL,
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

-- CreateTable
CREATE TABLE "GateDispatchTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dispatchKey" TEXT NOT NULL,
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
    "completionEvidence" TEXT NOT NULL DEFAULT '',
    "reviewLatestAt" DATETIME NOT NULL,
    "assignedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GateDispatchTask_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ModelTaskRoute_taskType_key" ON "ModelTaskRoute"("taskType");

-- CreateIndex
CREATE UNIQUE INDEX "ModelRouteAvoidanceOverride_ruleKey_key" ON "ModelRouteAvoidanceOverride"("ruleKey");

-- CreateIndex
CREATE INDEX "ExportPackageSnapshot_projectId_createdAt_idx" ON "ExportPackageSnapshot"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "ExportPackageSnapshot_projectId_isBaseline_idx" ON "ExportPackageSnapshot"("projectId", "isBaseline");

-- CreateIndex
CREATE INDEX "ExportPackageSnapshot_projectId_packageKind_format_createdAt_idx" ON "ExportPackageSnapshot"("projectId", "packageKind", "format", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformSubmissionAsset_projectId_platformId_key" ON "PlatformSubmissionAsset"("projectId", "platformId");

-- CreateIndex
CREATE INDEX "PlatformSubmissionAssetVersion_projectId_platformId_createdAt_idx" ON "PlatformSubmissionAssetVersion"("projectId", "platformId", "createdAt");

-- CreateIndex
CREATE INDEX "PlatformPublishMetric_projectId_platformId_snapshotDate_idx" ON "PlatformPublishMetric"("projectId", "platformId", "snapshotDate");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformKnowledgeFeedbackReceipt_receiptId_key" ON "PlatformKnowledgeFeedbackReceipt"("receiptId");

-- CreateIndex
CREATE INDEX "PlatformKnowledgeFeedbackReceipt_projectId_createdAt_idx" ON "PlatformKnowledgeFeedbackReceipt"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "PlatformKnowledgeFeedbackReceipt_projectId_platformId_createdAt_idx" ON "PlatformKnowledgeFeedbackReceipt"("projectId", "platformId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GateActionAudit_receiptId_key" ON "GateActionAudit"("receiptId");

-- CreateIndex
CREATE INDEX "GateActionAudit_projectId_createdAt_idx" ON "GateActionAudit"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "GateActionAudit_platformId_createdAt_idx" ON "GateActionAudit"("platformId", "createdAt");

-- CreateIndex
CREATE INDEX "GateActionAudit_executionType_createdAt_idx" ON "GateActionAudit"("executionType", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GateDispatchTask_dispatchKey_key" ON "GateDispatchTask"("dispatchKey");

-- CreateIndex
CREATE INDEX "GateDispatchTask_state_priorityScore_idx" ON "GateDispatchTask"("state", "priorityScore");

-- CreateIndex
CREATE INDEX "GateDispatchTask_platformId_updatedAt_idx" ON "GateDispatchTask"("platformId", "updatedAt");

-- CreateIndex
CREATE INDEX "GateDispatchTask_projectId_updatedAt_idx" ON "GateDispatchTask"("projectId", "updatedAt");
