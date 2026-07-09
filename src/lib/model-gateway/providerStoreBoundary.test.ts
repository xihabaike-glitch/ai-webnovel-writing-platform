import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("provider store keeps Prisma behind a Next server-only wrapper", async () => {
  const pureSource = await readFile(new URL("./providerStore.ts", import.meta.url), "utf8");
  const serverSource = await readFile(new URL("./providerStore.server.ts", import.meta.url), "utf8");

  assert.match(serverSource, /^import "server-only";/);
  assert.match(serverSource, /lib\/db\/prisma|\.\.\/db\/prisma/);
  assert.doesNotMatch(pureSource, /server-only|lib\/db\/prisma|\.\.\/db\/prisma|typeof window/);
});
