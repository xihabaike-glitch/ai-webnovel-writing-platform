import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const INITIAL_MIGRATION = "20260710090000_initial";
const schemaDirectory = fileURLToPath(new URL("../prisma/", import.meta.url));
const migrationsDirectory = fileURLToPath(new URL("../prisma/migrations/", import.meta.url));
const initialMigrationPath = fileURLToPath(
  new URL(`../prisma/migrations/${INITIAL_MIGRATION}/migration.sql`, import.meta.url),
);
const prismaCli = fileURLToPath(
  new URL("../node_modules/prisma/build/index.js", import.meta.url),
);
const knownMigrations = new Set(
  readdirSync(migrationsDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(resolve(migrationsDirectory, entry.name, "migration.sql")))
    .map((entry) => entry.name),
);

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function runPrisma(args) {
  const result = spawnSync(process.execPath, [prismaCli, ...args], {
    env: process.env,
    stdio: "inherit",
    shell: false,
  });

  if (result.status !== 0) {
    process.exitCode = result.status ?? 1;
    return false;
  }

  return true;
}

function quoteIdentifier(value) {
  return `"${value.replaceAll('"', '""')}"`;
}

function queryTableNames(database) {
  return database
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .all()
    .map(({ name }) => name);
}

function tableSnapshot(database, tableName) {
  const table = quoteIdentifier(tableName);
  const columns = database.prepare(`PRAGMA table_info(${table})`).all().map((column) => ({
    cid: column.cid,
    name: column.name,
    type: column.type,
    notnull: column.notnull,
    dflt_value: column.dflt_value,
    pk: column.pk,
  }));
  const foreignKeys = database.prepare(`PRAGMA foreign_key_list(${table})`).all().map((foreignKey) => ({
    id: foreignKey.id,
    seq: foreignKey.seq,
    table: foreignKey.table,
    from: foreignKey.from,
    to: foreignKey.to,
    on_update: foreignKey.on_update,
    on_delete: foreignKey.on_delete,
    match: foreignKey.match,
  }));
  const indexes = database.prepare(`PRAGMA index_list(${table})`).all()
    .filter((index) => !index.name.startsWith("sqlite_autoindex"))
    .map((index) => ({
      name: index.name,
      unique: index.unique,
      origin: index.origin,
      partial: index.partial,
      columns: database.prepare(`PRAGMA index_info(${quoteIdentifier(index.name)})`).all().map((column) => ({
        seqno: column.seqno,
        cid: column.cid,
        name: column.name,
      })),
    }));

  return { name: tableName, columns, foreignKeys, indexes };
}

function schemaSnapshot(database) {
  return queryTableNames(database)
    .filter((tableName) => tableName !== "_prisma_migrations")
    .map((tableName) => tableSnapshot(database, tableName));
}

function expectedLegacySchema() {
  const reference = new DatabaseSync(":memory:");
  try {
    reference.exec(readFileSync(initialMigrationPath, "utf8"));
    return schemaSnapshot(reference);
  } finally {
    reference.close();
  }
}

const expectedSchema = expectedLegacySchema();

export function databaseUrl(environment = process.env, envPath = resolve(".env")) {
  const configured = environment.DATABASE_URL?.trim();
  if (configured) return configured;
  if (!existsSync(envPath)) return "";

  const contents = readFileSync(envPath, "utf8");
  const match = /^DATABASE_URL\s*=\s*(.*)$/m.exec(contents);
  if (!match) return "";
  const value = match[1].trim();
  return (value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))
    ? value.slice(1, -1)
    : value;
}

export function resolveSqliteDatabasePath(configured) {
  if (!configured) throw new Error("DATABASE_URL must point to the legacy SQLite database before baselining.");

  let url;
  try {
    url = new URL(configured, pathToFileURL(`${schemaDirectory}${sep}`));
  } catch {
    throw new Error("DATABASE_URL must be a valid SQLite file: URL before baselining.");
  }
  if (url.protocol !== "file:") {
    throw new Error("Baseline supports only SQLite file: DATABASE_URL values.");
  }

  return fileURLToPath(url);
}

export function sqliteDatabasePath(configured = databaseUrl()) {
  const databasePath = resolveSqliteDatabasePath(configured);
  if (!existsSync(databasePath)) {
    throw new Error("Refusing to baseline a missing SQLite database file.");
  }
  return databasePath;
}

function migrationHistory(database) {
  if (!queryTableNames(database).includes("_prisma_migrations")) return "legacy";

  const historyColumns = database.prepare('PRAGMA table_info("_prisma_migrations")').all()
    .map((column) => column.name);
  for (const column of ["migration_name", "finished_at", "rolled_back_at"]) {
    if (!historyColumns.includes(column)) {
      throw new Error("Refusing to baseline: _prisma_migrations has an incompatible layout.");
    }
  }

  const records = database
    .prepare('SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations" ORDER BY migration_name')
    .all();
  if (records.length === 0) {
    throw new Error("Refusing to baseline: an empty _prisma_migrations table is incompatible history.");
  }

  const names = records.map((record) => record.migration_name);
  if (new Set(names).size !== names.length
    || records.some((record) => typeof record.migration_name !== "string"
      || !knownMigrations.has(record.migration_name)
      || !record.finished_at
      || record.rolled_back_at)) {
    throw new Error("Refusing to baseline: migration history is incomplete or incompatible.");
  }
  if (names.filter((name) => name === INITIAL_MIGRATION).length !== 1) {
    throw new Error(`Refusing to baseline: ${INITIAL_MIGRATION} is not recorded as applied.`);
  }

  return "recorded";
}

function inspectDatabase(databasePath) {
  const database = new DatabaseSync(databasePath, { readOnly: true });
  try {
    const history = migrationHistory(database);
    if (history === "recorded") return history;

    const actualSchema = schemaSnapshot(database);
    if (actualSchema.length === 0) {
      throw new Error("Refusing to baseline an empty SQLite database.");
    }
    if (JSON.stringify(actualSchema) !== JSON.stringify(expectedSchema)) {
      throw new Error("Refusing to baseline: schema is not the expected legacy db-push schema.");
    }
    return history;
  } finally {
    database.close();
  }
}

function hasRequiredOptIn() {
  if (process.env.DATABASE_BASELINE !== "1") {
    fail("Refusing to baseline without the explicit DATABASE_BASELINE=1 opt-in.");
    return false;
  }

  if (process.env.BASELINE_MIGRATION !== INITIAL_MIGRATION) {
    fail(
      `BASELINE_MIGRATION must be exactly ${INITIAL_MIGRATION}; only the initial migration may be marked as applied.`,
    );
    return false;
  }

  return true;
}

function main() {
  if (!hasRequiredOptIn()) return;

  console.error(
    "WARNING: Back up the SQLite database and verify the backup before baselining.",
  );

  try {
    const history = inspectDatabase(sqliteDatabasePath());
    if (history === "legacy") {
      if (!runPrisma(["migrate", "resolve", "--applied", INITIAL_MIGRATION])) return;
    } else {
      console.error(`${INITIAL_MIGRATION} is already recorded; continuing with migrate deploy.`);
    }
    runPrisma(["migrate", "deploy"]);
  } catch (error) {
    fail(error instanceof Error ? error.message : "Refusing to baseline an unreadable SQLite database.");
  }
}

if (process.argv[1] && resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1])) {
  main();
}
