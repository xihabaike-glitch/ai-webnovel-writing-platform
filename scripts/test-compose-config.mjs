import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

const INITIAL_MIGRATION = "20260710090000_initial";
const result = spawnSync(
  "docker",
  ["compose", "config", "--format", "json"],
  {
    encoding: "utf8",
    env: {
      ...process.env,
      BASELINE_MIGRATION: INITIAL_MIGRATION,
      DATABASE_BASELINE: "1",
      MODEL_CREDENTIAL_SECRET: "compose-config-test-only",
    },
    shell: false,
  },
);

assert.equal(
  result.status,
  0,
  `docker compose config failed:\n${result.stdout}\n${result.stderr}`,
);

const config = JSON.parse(result.stdout);
const environment = config.services.web.environment;
assert.equal(environment.DATABASE_BASELINE, "1");
assert.equal(environment.BASELINE_MIGRATION, INITIAL_MIGRATION);

console.log("Docker Compose forwards the explicit legacy baseline configuration.");
