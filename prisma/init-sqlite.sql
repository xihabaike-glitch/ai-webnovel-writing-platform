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
