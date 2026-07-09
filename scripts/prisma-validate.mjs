import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const prismaCli = fileURLToPath(
  new URL("../node_modules/prisma/build/index.js", import.meta.url),
);
const databaseUrl =
  process.env.DATABASE_URL?.trim() || "file:./.prisma-validate.db";
const result = spawnSync(process.execPath, [prismaCli, "validate"], {
  env: { ...process.env, DATABASE_URL: databaseUrl },
  stdio: "inherit",
  shell: false,
});

process.exit(result.status ?? 1);
