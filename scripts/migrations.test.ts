import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";
import {
  resolveSqliteDatabasePath,
} from "./baseline-database.mjs";

const INITIAL_MIGRATION = "20260710090000_initial";
const REPAIR_MIGRATION = "20260710100000_repair_chapter_and_task_consistency";
const INITIAL_SQL_PATH = resolve(
  "prisma",
  "migrations",
  INITIAL_MIGRATION,
  "migration.sql",
);
const PRISMA_CLI = resolve("node_modules", "prisma", "build", "index.js");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

const EXPECTED_TABLES = [
  "AiTask",
  "Chapter",
  "ChapterRevision",
  "Character",
  "ExportPackageSnapshot",
  "Foreshadow",
  "GateActionAudit",
  "GateDispatchTask",
  "ModelProvider",
  "ModelRouteAvoidanceOverride",
  "ModelTaskRoute",
  "OutlineNode",
  "PlatformKnowledgeFeedbackReceipt",
  "PlatformPublishMetric",
  "PlatformSubmissionAsset",
  "PlatformSubmissionAssetVersion",
  "PlotThread",
  "Project",
  "PublishPackageSnapshot",
  "WorldEntry",
];

const EXPECTED_INDEXES = [
  "AiTask_chapterId_taskType_active_key",
  "AiTask_chapterId_taskType_status_updatedAt_idx",
  "Chapter_projectId_order_key",
  "ExportPackageSnapshot_projectId_createdAt_idx",
  "ExportPackageSnapshot_projectId_isBaseline_idx",
  "ExportPackageSnapshot_projectId_packageKind_format_createdAt_idx",
  "GateActionAudit_executionType_createdAt_idx",
  "GateActionAudit_platformId_createdAt_idx",
  "GateActionAudit_projectId_createdAt_idx",
  "GateActionAudit_receiptId_key",
  "GateDispatchTask_dispatchKey_key",
  "GateDispatchTask_platformId_updatedAt_idx",
  "GateDispatchTask_projectId_updatedAt_idx",
  "GateDispatchTask_state_priorityScore_idx",
  "ModelRouteAvoidanceOverride_ruleKey_key",
  "ModelTaskRoute_taskType_key",
  "PlatformKnowledgeFeedbackReceipt_projectId_createdAt_idx",
  "PlatformKnowledgeFeedbackReceipt_projectId_platformId_createdAt_idx",
  "PlatformKnowledgeFeedbackReceipt_receiptId_key",
  "PlatformPublishMetric_projectId_platformId_snapshotDate_idx",
  "PlatformSubmissionAsset_projectId_platformId_key",
  "PlatformSubmissionAssetVersion_projectId_platformId_createdAt_idx",
];

function absoluteDatabaseUrl(databasePath: string) {
  return `file:${resolve(databasePath).replaceAll("\\", "/")}`;
}

function commandFailure(
  label: string,
  result: ReturnType<typeof spawnSync>,
) {
  return `${label} failed with status ${result.status}:\n${String(result.stdout)}\n${String(result.stderr)}`;
}

function deployMigrations(databasePath: string) {
  const result = spawnSync(process.execPath, [PRISMA_CLI, "migrate", "deploy"], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: {
      ...process.env,
      DATABASE_URL: absoluteDatabaseUrl(databasePath),
    },
    shell: false,
  });

  assert.equal(result.status, 0, commandFailure("migrate deploy", result));
}

function runBaseline(databasePath: string) {
  return spawnSync(npmCommand, ["run", "db:baseline"], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: {
      ...process.env,
      BASELINE_MIGRATION: INITIAL_MIGRATION,
      DATABASE_BASELINE: "1",
      DATABASE_URL: absoluteDatabaseUrl(databasePath),
    },
    shell: false,
  });
}

function markInitialMigrationApplied(databasePath: string) {
  const result = spawnSync(
    process.execPath,
    [PRISMA_CLI, "migrate", "resolve", "--applied", INITIAL_MIGRATION],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        DATABASE_URL: absoluteDatabaseUrl(databasePath),
      },
      shell: false,
    },
  );

  assert.equal(result.status, 0, commandFailure("record initial migration", result));
}

function queryNames(database: DatabaseSync, type: "table" | "index") {
  return (
    database
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = ? AND name NOT LIKE 'sqlite_%' ORDER BY name",
      )
      .all(type) as Array<{ name: string }>
  ).map(({ name }) => name);
}

function queryMigrationNames(database: DatabaseSync) {
  if (!queryNames(database, "table").includes("_prisma_migrations")) return [];

  return (
    database
      .prepare(
        'SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL ORDER BY migration_name',
      )
      .all() as Array<{ migration_name: string }>
  ).map(({ migration_name }) => migration_name);
}

function assertNoMigrationHistory(database: DatabaseSync, label: string) {
  assert.ok(
    !queryNames(database, "table").includes("_prisma_migrations"),
    `${label} must not create Prisma migration history`,
  );
}

test("baseline resolves Prisma-schema-relative SQLite URLs", () => {
  assert.equal(
    resolveSqliteDatabasePath("file:./dev.db"),
    resolve("prisma", "dev.db"),
  );
});

test("baseline preserves absolute SQLite database URLs", () => {
  assert.equal(resolveSqliteDatabasePath("file:/app/data"), "/app/data");
});

function assertCurrentSchema(database: DatabaseSync) {
  assert.deepEqual(
    queryNames(database, "table").filter(
      (tableName) => tableName !== "_prisma_migrations",
    ),
    EXPECTED_TABLES,
  );

  const indexes = queryNames(database, "index");
  for (const indexName of EXPECTED_INDEXES) {
    assert.ok(indexes.includes(indexName), `Missing index ${indexName}`);
  }

  assert.deepEqual(queryMigrationNames(database), [
    INITIAL_MIGRATION,
    REPAIR_MIGRATION,
  ]);
}

test("migrate deploy creates the full schema on an empty SQLite database", (t) => {
  const directory = mkdtempSync(join(tmpdir(), "webnovel-fresh-migrate-"));
  const databasePath = join(directory, "fresh.db");
  t.after(() => rmSync(directory, { force: true, recursive: true }));

  new DatabaseSync(databasePath).close();
  deployMigrations(databasePath);

  const database = new DatabaseSync(databasePath);
  t.after(() => database.close());
  assertCurrentSchema(database);
});

test("baseline rejects empty and drifted SQLite databases before recording migration history", (t) => {
  const directory = mkdtempSync(join(tmpdir(), "webnovel-invalid-baseline-"));
  t.after(() => rmSync(directory, { force: true, recursive: true }));

  for (const [label, initialize] of [
    ["empty", (database: DatabaseSync) => undefined],
    ["drifted", (database: DatabaseSync) => database.exec('CREATE TABLE "Unexpected" ("id" TEXT NOT NULL PRIMARY KEY);')],
  ] as const) {
    const databasePath = join(directory, `${label}.db`);
    const database = new DatabaseSync(databasePath);
    initialize(database);
    database.close();

    const result = runBaseline(databasePath);
    assert.notEqual(result.status, 0, `${label} database must be rejected`);

    const checkedDatabase = new DatabaseSync(databasePath);
    assertNoMigrationHistory(checkedDatabase, label);
    checkedDatabase.close();
  }
});

test("baseline rejects incompatible migration history before resolving", (t) => {
  const directory = mkdtempSync(join(tmpdir(), "webnovel-incompatible-history-"));
  const databasePath = join(directory, "incompatible.db");
  t.after(() => rmSync(directory, { force: true, recursive: true }));

  const database = new DatabaseSync(databasePath);
  database.exec(readFileSync(INITIAL_SQL_PATH, "utf8"));
  database.exec(`
    CREATE TABLE "_prisma_migrations" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "checksum" TEXT NOT NULL,
      "finished_at" DATETIME,
      "migration_name" TEXT NOT NULL,
      "logs" TEXT,
      "rolled_back_at" DATETIME,
      "started_at" DATETIME NOT NULL,
      "applied_steps_count" INTEGER NOT NULL DEFAULT 0
    );
    INSERT INTO "_prisma_migrations" (
      "id", "checksum", "finished_at", "migration_name", "started_at"
    ) VALUES (
      'unknown-migration', 'checksum', '2026-07-10T00:00:00.000Z',
      '20200101000000_unknown', '2026-07-10T00:00:00.000Z'
    );
  `);
  database.close();

  const result = runBaseline(databasePath);
  assert.notEqual(result.status, 0, "incompatible history must be rejected");

  const checkedDatabase = new DatabaseSync(databasePath);
  assert.deepEqual(queryMigrationNames(checkedDatabase), ["20200101000000_unknown"]);
  checkedDatabase.close();
});

test("baseline continues deploy after the initial migration was already recorded", (t) => {
  const directory = mkdtempSync(join(tmpdir(), "webnovel-resume-baseline-"));
  const databasePath = join(directory, "resume.db");
  t.after(() => rmSync(directory, { force: true, recursive: true }));

  const database = new DatabaseSync(databasePath);
  database.exec(readFileSync(INITIAL_SQL_PATH, "utf8"));
  database.close();
  markInitialMigrationApplied(databasePath);

  const result = runBaseline(databasePath);
  assert.equal(result.status, 0, commandFailure("resume legacy baseline", result));
  assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, /P3008/);

  const migratedDatabase = new DatabaseSync(databasePath);
  t.after(() => migratedDatabase.close());
  assertCurrentSchema(migratedDatabase);
});

test("legacy db-push schema baselines only initial, deploys the repair, and reruns safely", (t) => {
  assert.ok(
    existsSync(INITIAL_SQL_PATH),
    `Missing initial migration at ${INITIAL_SQL_PATH}`,
  );

  const directory = mkdtempSync(join(tmpdir(), "webnovel-legacy-migrate-"));
  const databasePath = join(directory, "legacy.db");
  t.after(() => rmSync(directory, { force: true, recursive: true }));

  const database = new DatabaseSync(databasePath);
  database.exec(readFileSync(INITIAL_SQL_PATH, "utf8"));
  database.exec(`
    INSERT INTO "Project" (
      "id", "title", "targetPlatform", "targetLengthType",
      "targetWordCount", "genre", "createdAt", "updatedAt"
    ) VALUES
      (
        'project-1', 'Migration rehearsal', 'qidian', 'long',
        100000, 'fantasy', '2026-07-10T00:00:00.000Z', '2026-07-10T00:00:00.000Z'
      ),
      (
        'project-gaps', 'Preserve chapter gaps', 'qidian', 'long',
        100000, 'fantasy', '2026-07-10T00:00:00.000Z', '2026-07-10T00:00:00.000Z'
      );
    INSERT INTO "ModelProvider" (
      "id", "providerId", "displayName", "defaultModel", "createdAt", "updatedAt"
    ) VALUES (
      'provider-1', 'test', 'Test Provider', 'test-model',
      '2026-07-10T00:00:00.000Z', '2026-07-10T00:00:00.000Z'
    );
    INSERT INTO "Chapter" (
      "id", "projectId", "order", "title", "createdAt", "updatedAt"
    ) VALUES
      ('chapter-old', 'project-1', 1, 'Old', '2026-07-10T00:00:00.000Z', '2026-07-10T00:00:00.000Z'),
      ('chapter-new', 'project-1', 1, 'New', '2026-07-10T01:00:00.000Z', '2026-07-10T01:00:00.000Z'),
      ('chapter-gap-1', 'project-gaps', 1, 'Gap one', '2026-07-10T00:00:00.000Z', '2026-07-10T00:00:00.000Z'),
      ('chapter-gap-3', 'project-gaps', 3, 'Gap three', '2026-07-10T01:00:00.000Z', '2026-07-10T01:00:00.000Z'),
      ('chapter-gap-5', 'project-gaps', 5, 'Gap five', '2026-07-10T02:00:00.000Z', '2026-07-10T02:00:00.000Z');
    INSERT INTO "AiTask" (
      "id", "projectId", "chapterId", "taskType", "providerConfigId",
      "model", "status", "inputSnapshot", "createdAt", "updatedAt"
    ) VALUES
      (
        'task-old', 'project-1', 'chapter-old', 'draft', 'provider-1',
        'test-model', 'queued', '{}', '2026-07-10T00:00:00.000Z', '2026-07-10T00:00:00.000Z'
      ),
      (
        'task-new', 'project-1', 'chapter-old', 'draft', 'provider-1',
        'test-model', 'running', '{}', '2026-07-10T01:00:00.000Z', '2026-07-10T01:00:00.000Z'
      );
  `);

  assert.ok(!queryNames(database, "index").includes("Chapter_projectId_order_key"));
  database.close();

  const result = runBaseline(databasePath);

  assert.equal(result.status, 0, commandFailure("legacy baseline", result));
  assert.match(
    `${result.stdout}\n${result.stderr}`,
    /back up|backup/i,
    "The baseline path must print a backup warning",
  );

  const migratedDatabase = new DatabaseSync(databasePath);
  assertCurrentSchema(migratedDatabase);

  const chapterOrders = migratedDatabase
    .prepare('SELECT "order" FROM "Chapter" ORDER BY "order"')
    .all() as Array<{ order: number }>;
  assert.deepEqual(
    chapterOrders.map(({ order }) => order),
    [1, 1, 2, 3, 5],
  );

  const preservedGapChapters = migratedDatabase
    .prepare('SELECT "id", "order", "title" FROM "Chapter" WHERE "projectId" = ? ORDER BY "order"')
    .all("project-gaps") as Array<{ id: string; order: number; title: string }>;
  assert.deepEqual(preservedGapChapters.map(({ id, order, title }) => ({ id, order, title })), [
    { id: "chapter-gap-1", order: 1, title: "Gap one" },
    { id: "chapter-gap-3", order: 3, title: "Gap three" },
    { id: "chapter-gap-5", order: 5, title: "Gap five" },
  ]);

  const taskStatuses = migratedDatabase
    .prepare('SELECT "id", "status" FROM "AiTask" ORDER BY "id"')
    .all() as Array<{ id: string; status: string }>;
  assert.deepEqual(
    taskStatuses.map(({ id, status }) => [id, status]),
    [
      ["task-new", "running"],
      ["task-old", "failed"],
    ],
  );

  migratedDatabase.close();
  const rerun = runBaseline(databasePath);
  assert.equal(rerun.status, 0, commandFailure("legacy baseline rerun", rerun));

  const rerunDatabase = new DatabaseSync(databasePath);
  t.after(() => rerunDatabase.close());
  assertCurrentSchema(rerunDatabase);
});
