import assert from "node:assert/strict";
import { chmod, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

test("setup preserves only existing secrets that decode to exactly 32 bytes", async () => {
  const setupPath = join(process.cwd(), "scripts/setup.mjs");
  const setupSource = await readFile(setupPath, "utf8");
  assert.match(setupSource, /export function ensureCredentialSecret/);

  // The setup script remains plain ESM so it can run before dependencies are installed.
  // @ts-expect-error setup.mjs intentionally has no TypeScript declaration file.
  const { ensureCredentialSecret, ensureEnv } = await import("../../../scripts/setup.mjs");
  const directory = await mkdtemp(join(tmpdir(), "model-secret-"));
  const envPath = join(directory, ".env");
  const examplePath = join(directory, ".env.example");
  const valid = Buffer.alloc(32, 11).toString("base64");

  try {
    await writeFile(examplePath, `DATABASE_URL=file:test.db\nMODEL_CREDENTIAL_SECRET=${valid}\n`, { mode: 0o644 });
    await chmod(examplePath, 0o644);
    ensureEnv(envPath, examplePath);
    await assertOwnerOnlyMode(envPath);

    await writeFile(envPath, `DATABASE_URL=file:test.db\nMODEL_CREDENTIAL_SECRET=${valid}\n`);
    await chmod(envPath, 0o644);
    ensureCredentialSecret(envPath);
    assert.equal(secretFrom(await readFile(envPath, "utf8")), valid);
    await assertOwnerOnlyMode(envPath);

    for (const invalid of ["", "placeholder", Buffer.alloc(31, 4).toString("base64")]) {
      await writeFile(envPath, `DATABASE_URL=file:test.db\nMODEL_CREDENTIAL_SECRET=${invalid}\n`);
      await chmod(envPath, 0o644);
      ensureCredentialSecret(envPath);
      await assertOwnerOnlyMode(envPath);
      const replacement = secretFrom(await readFile(envPath, "utf8"));
      assert.notEqual(replacement, invalid);
      assert.equal(Buffer.from(replacement, "base64").length, 32);
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

function secretFrom(contents: string) {
  const match = /^MODEL_CREDENTIAL_SECRET=(.*)$/m.exec(contents);
  assert(match);
  return match[1];
}

async function assertOwnerOnlyMode(path: string) {
  if (process.platform === "win32") return;
  assert.equal((await stat(path)).mode & 0o777, 0o600);
}
