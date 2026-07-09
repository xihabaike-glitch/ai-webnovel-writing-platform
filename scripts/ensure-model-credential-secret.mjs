import { chmodSync, copyFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { ensureCredentialSecret } from "./setup.mjs";

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function environmentPath() {
  const args = process.argv.slice(2);
  if (args.length === 0) return resolve(".env");
  if (args.length === 2 && args[0] === "--file" && args[1]) {
    return resolve(args[1]);
  }

  fail("Usage: node scripts/ensure-model-credential-secret.mjs [--file path]");
  return null;
}

function main() {
  const envPath = environmentPath();
  if (!envPath) return;

  if (!existsSync(envPath)) {
    const examplePath = join(dirname(envPath), ".env.example");
    if (!existsSync(examplePath)) {
      fail(`Cannot create ${envPath}: missing ${examplePath}.`);
      return;
    }
    copyFileSync(examplePath, envPath);
  }

  ensureCredentialSecret(envPath);
  if (process.platform !== "win32") chmodSync(envPath, 0o600);
  console.log("MODEL_CREDENTIAL_SECRET is configured in .env.");
}

main();
