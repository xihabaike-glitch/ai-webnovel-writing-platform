import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join, resolve } from "node:path";
import test from "node:test";

const startPath = resolve("scripts", "start.mjs");
const ensureSecretPath = resolve("scripts", "ensure-model-credential-secret.mjs");

test("local start hardens an existing environment before migrations and app start", (t) => {
  const directory = mkdtempSync(join(tmpdir(), "webnovel-local-start-"));
  const binDirectory = join(directory, "bin");
  const commandLogPath = join(directory, "commands.log");
  const envPath = join(directory, ".env");
  t.after(() => rmSync(directory, { force: true, recursive: true }));

  mkdirSync(join(directory, "node_modules"));
  mkdirSync(join(directory, ".next"));
  mkdirSync(binDirectory);
  writeFileSync(envPath, "DATABASE_URL=file:./dev.db\nMODEL_CREDENTIAL_SECRET=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef\n");
  chmodSync(envPath, 0o644);
  writeFileSync(
    join(binDirectory, "npm"),
    `#!/bin/sh\nprintf '%s\\n' \"$*\" >> \"$COMMAND_LOG\"\nif [ \"$1\" = \"run\" ] && [ \"$2\" = \"env:ensure-secret\" ]; then\n  exec \"$NODE_BINARY\" \"$ENSURE_SECRET_PATH\"\nfi\n`,
    { mode: 0o755 },
  );

  const result = spawnSync(process.execPath, [startPath], {
    cwd: directory,
    encoding: "utf8",
    env: {
      ...process.env,
      COMMAND_LOG: commandLogPath,
      ENSURE_SECRET_PATH: ensureSecretPath,
      NODE_BINARY: process.execPath,
      PATH: `${binDirectory}${delimiter}${process.env.PATH ?? ""}`,
    },
    shell: false,
  });

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.deepEqual(readFileSync(commandLogPath, "utf8").trim().split("\n"), [
    "run env:ensure-secret",
    "run db:deploy",
    "run start",
  ]);
  if (process.platform !== "win32") {
    assert.equal(statSync(envPath).mode & 0o777, 0o600);
  }
});
