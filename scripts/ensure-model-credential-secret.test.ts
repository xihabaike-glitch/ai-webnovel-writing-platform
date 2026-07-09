import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const commandPath = resolve("scripts", "ensure-model-credential-secret.mjs");

function runCommand(envPath: string) {
  return spawnSync(process.execPath, [commandPath, "--file", envPath], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: process.env,
    shell: false,
  });
}

function secretFrom(envPath: string) {
  const contents = readFileSync(envPath, "utf8");
  const match = /^MODEL_CREDENTIAL_SECRET=(.*)$/m.exec(contents);
  assert(match, "MODEL_CREDENTIAL_SECRET must be present");
  return match[1];
}

function assertValidSecret(value: string) {
  const decoded = Buffer.from(value, "base64");
  assert.equal(decoded.length, 32);
  assert.equal(decoded.toString("base64"), value);
}

test("credential secret command creates .env and replaces empty or invalid values without printing them", (t) => {
  const directory = mkdtempSync(join(tmpdir(), "webnovel-credential-secret-"));
  const envPath = join(directory, ".env");
  t.after(() => rmSync(directory, { force: true, recursive: true }));

  writeFileSync(join(directory, ".env.example"), "DATABASE_URL=file:./dev.db\nMODEL_CREDENTIAL_SECRET=\n");
  chmodSync(join(directory, ".env.example"), 0o644);

  const created = runCommand(envPath);
  assert.equal(created.status, 0, `${created.stdout}\n${created.stderr}`);
  assertOwnerOnlyMode(envPath);
  const generated = secretFrom(envPath);
  assertValidSecret(generated);
  assert.equal(`${created.stdout}\n${created.stderr}`.includes(generated), false);

  writeFileSync(envPath, "DATABASE_URL=file:./dev.db\nMODEL_CREDENTIAL_SECRET=not-a-valid-secret\n");
  chmodSync(envPath, 0o644);
  const repaired = runCommand(envPath);
  assert.equal(repaired.status, 0, `${repaired.stdout}\n${repaired.stderr}`);
  assertOwnerOnlyMode(envPath);
  const replacement = secretFrom(envPath);
  assert.notEqual(replacement, "not-a-valid-secret");
  assertValidSecret(replacement);
  assert.equal(`${repaired.stdout}\n${repaired.stderr}`.includes(replacement), false);
});

function assertOwnerOnlyMode(path: string) {
  if (process.platform === "win32") return;
  assert.equal(statSync(path).mode & 0o777, 0o600);
}
