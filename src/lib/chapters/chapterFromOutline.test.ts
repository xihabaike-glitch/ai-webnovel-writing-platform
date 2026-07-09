import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { PrismaClient } from "@prisma/client";
import {
  claimOutlineNodeForChapter,
  OutlineNodeAlreadyClaimedError,
} from "./chapterFromOutline.ts";

async function createOutlineDatabase() {
  const directory = await mkdtemp(join(tmpdir(), "outline-chapter-claim-"));
  const database = new PrismaClient({ datasourceUrl: `file:${join(directory, "test.db")}` });
  await database.$executeRawUnsafe(`
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
  await database.$executeRawUnsafe(`
    CREATE TABLE "OutlineNode" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "projectId" TEXT NOT NULL,
      "parentId" TEXT,
      "chapterId" TEXT,
      "type" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "summary" TEXT NOT NULL DEFAULT '',
      "goal" TEXT NOT NULL DEFAULT '',
      "hook" TEXT NOT NULL DEFAULT '',
      "conflict" TEXT NOT NULL DEFAULT '',
      "valueShift" TEXT NOT NULL DEFAULT '',
      "platformNote" TEXT NOT NULL DEFAULT '',
      "order" INTEGER NOT NULL DEFAULT 0,
      "depth" INTEGER NOT NULL DEFAULT 0,
      "status" TEXT NOT NULL DEFAULT 'planned',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await database.outlineNode.create({
    data: {
      id: "outline-1",
      projectId: "project-1",
      type: "leaf",
      title: "Opening beat",
    },
  });

  return {
    database,
    async cleanup() {
      await database.$disconnect();
      await rm(directory, { recursive: true, force: true });
    },
  };
}

test("a conditional outline claim rolls back a concurrent orphan chapter", async (t) => {
  const { database, cleanup } = await createOutlineDatabase();
  t.after(cleanup);

  await database.$transaction(async (tx) => {
    await tx.chapter.create({
      data: {
        id: "chapter-winner",
        projectId: "project-1",
        order: 1,
        title: "Winner",
      },
    });
    await claimOutlineNodeForChapter(tx, {
      outlineNodeId: "outline-1",
      projectId: "project-1",
      chapterId: "chapter-winner",
    });
  });

  await assert.rejects(
    database.$transaction(async (tx) => {
      await tx.chapter.create({
        data: {
          id: "chapter-loser",
          projectId: "project-1",
          order: 2,
          title: "Loser",
        },
      });
      await claimOutlineNodeForChapter(tx, {
        outlineNodeId: "outline-1",
        projectId: "project-1",
        chapterId: "chapter-loser",
      });
    }),
    OutlineNodeAlreadyClaimedError,
  );

  const outlineNode = await database.outlineNode.findUniqueOrThrow({ where: { id: "outline-1" } });
  const orphan = await database.chapter.findUnique({ where: { id: "chapter-loser" } });
  assert.equal(outlineNode.chapterId, "chapter-winner");
  assert.equal(orphan, null);
});
