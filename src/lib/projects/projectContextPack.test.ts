import assert from "node:assert/strict";
import test from "node:test";
import {
  buildProjectContextPack,
  upsertProjectContextChapter,
  type ProjectContextChapter,
} from "./projectContextPack.ts";

function chapter(id: string, order: number): ProjectContextChapter {
  return {
    id,
    order,
    title: `Chapter ${order}`,
    content: `Content ${order}`,
    hook: `Hook ${order}`,
    conflict: `Conflict ${order}`,
    cliffhanger: `Cliffhanger ${order}`,
    status: "draft",
  };
}

test("a newly created rewrite chapter is inserted in order before context history is built", () => {
  const updatedChapters = upsertProjectContextChapter(
    [chapter("chapter-3", 3), chapter("chapter-2", 2)],
    chapter("chapter-1-created", 1),
  );

  assert.deepEqual(updatedChapters.map((item) => item.id), [
    "chapter-1-created",
    "chapter-2",
    "chapter-3",
  ]);

  const context = buildProjectContextPack({
    currentChapterId: "chapter-1-created",
    chapters: updatedChapters,
    characters: [],
    worldEntries: [],
    foreshadows: [],
    plotThreads: [],
  });
  const history = context.blocks.find((block) => block.id === "history");

  assert.deepEqual(history?.items, ["当前为开篇或首章，无需历史章节承接。"]);
  assert.equal(context.sourceCounts.historyChapters, 0);
  assert.doesNotMatch(context.promptBlock, /Chapter 2|Chapter 3/);
});
