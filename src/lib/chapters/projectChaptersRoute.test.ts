import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const directory = await mkdtemp(join(tmpdir(), "project-chapters-route-"));
process.env.DATABASE_URL = `file:${join(directory, "test.db")}`;

const { prisma } = await import("../db/prisma.ts");
await prisma.$executeRawUnsafe(`
  CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY
  )
`);
await prisma.$executeRawUnsafe(`
  CREATE TABLE "Chapter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "volumeId" TEXT,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "goal" TEXT NOT NULL DEFAULT '',
    "hook" TEXT NOT NULL DEFAULT '',
    "conflict" TEXT NOT NULL DEFAULT '',
    "valueShift" TEXT NOT NULL DEFAULT '',
    "cliffhanger" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

const { GET } = await import("../../app/api/projects/[projectId]/chapters/route.ts");

test.after(async () => {
  await prisma.$disconnect();
  await rm(directory, { recursive: true, force: true });
});

test("GET chapters returns 404 when the project does not exist", async () => {
  const response = await GET(new Request("http://localhost/api/projects/missing/chapters"), {
    params: Promise.resolve({ projectId: "missing-project" }),
  });

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: "Project not found" });
});
