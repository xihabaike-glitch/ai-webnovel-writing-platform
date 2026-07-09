import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};
const compose = readFileSync("docker-compose.yml", "utf8");
const dockerfile = readFileSync("Dockerfile", "utf8");
const entrypoint = readFileSync("scripts/docker-entrypoint.sh", "utf8");
const ci = readFileSync(".github/workflows/ci.yml", "utf8");
const readme = readFileSync("README.md", "utf8");
const deploymentGuide = readFileSync("docs/DEPLOYMENT.md", "utf8");
const usageGuide = readFileSync("docs/USAGE.md", "utf8");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

test("quality scripts discover TypeScript tests and run the production checks", () => {
  assert.equal(packageJson.scripts.test, "node scripts/run-tests.mjs");
  assert.doesNotMatch(packageJson.scripts.test, /find|\$\(/);
  assert.equal(packageJson.scripts.lint, "eslint .");
  assert.equal(
    packageJson.scripts["prisma:validate"],
    "node scripts/prisma-validate.mjs",
  );
  assert.equal(
    packageJson.scripts["test:migrations"],
    "node --import tsx --test scripts/migrations.test.ts",
  );
  assert.equal(
    packageJson.scripts["env:ensure-secret"],
    "node scripts/ensure-model-credential-secret.mjs",
  );
  assert.equal(
    packageJson.scripts.check,
    "npm run prisma:generate && npm run prisma:validate && npm run lint && npm run test && npm run build",
  );
});

test("Prisma validation has a local fallback when DATABASE_URL is unavailable", () => {
  const result = spawnSync(npmCommand, ["run", "prisma:validate"], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: { ...process.env, DATABASE_URL: "" },
    shell: false,
  });

  assert.equal(
    result.status,
    0,
    `Prisma validation failed without DATABASE_URL:\n${result.stdout}\n${result.stderr}`,
  );
});

test("local and Docker defaults keep the application private", () => {
  assert.match(packageJson.scripts.dev, /--hostname 127\.0\.0\.1/);
  assert.match(packageJson.scripts.start, /--hostname 127\.0\.0\.1/);
  assert.match(compose, /"127\.0\.0\.1:\$\{APP_PORT:-3000\}:3000"/);
  assert.match(entrypoint, /npm run start -- --hostname 0\.0\.0\.0/);
});

test("Docker receives the credential secret and deploys committed migrations", () => {
  assert.match(compose, /MODEL_CREDENTIAL_SECRET:/);
  assert.match(compose, /DATABASE_BASELINE: "\$\{DATABASE_BASELINE:-0\}"/);
  assert.match(compose, /BASELINE_MIGRATION: "\$\{BASELINE_MIGRATION:-\}"/);
  assert.match(dockerfile, /node:22-bookworm-slim@sha256:/);
  assert.equal(packageJson.scripts["db:deploy"], "prisma migrate deploy");
  assert.equal(
    packageJson.scripts["db:baseline"],
    "node scripts/baseline-database.mjs",
  );
  assert.doesNotMatch(packageJson.scripts["db:baseline"], /prisma db push/);
  assert.doesNotMatch(entrypoint, /npm run db:init/);
  assert.match(entrypoint, /npm run db:deploy/);
  assert.match(ci, /npm run test:migrations/);
  assert.match(ci, /npm run test:compose-config/);
});

test("setup guides use the cross-platform credential secret command", () => {
  for (const guide of [readme, deploymentGuide, usageGuide]) {
    assert.match(guide, /npm run env:ensure-secret/);
    assert.doesNotMatch(guide, /grep -q '\^MODEL_CREDENTIAL_SECRET='/);
  }
});
