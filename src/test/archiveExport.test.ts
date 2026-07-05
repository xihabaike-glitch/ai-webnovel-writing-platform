import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { chapterZipContentType, exportChapterZip, exportForeshadowCsv, foreshadowCsvContentType } from "../lib/export/archive.ts";

function readStoredZip(buffer: Buffer) {
  const files = new Map<string, string>();
  let offset = 0;

  while (offset + 4 < buffer.length && buffer.readUInt32LE(offset) === 0x04034b50) {
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const fileNameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const fileNameStart = offset + 30;
    const fileName = buffer.subarray(fileNameStart, fileNameStart + fileNameLength).toString("utf8");
    const contentStart = fileNameStart + fileNameLength + extraLength;
    const content = buffer.subarray(contentStart, contentStart + compressedSize).toString("utf8");
    files.set(fileName, content);
    offset = contentStart + compressedSize;
  }

  return files;
}

describe("archive exports", () => {
  const project = {
    title: "夜雨系统",
    genre: "都市悬疑",
    targetPlatformName: "番茄小说",
    targetLengthType: "5-6 万字中篇",
    currentWordCount: 3200,
    sellingPoint: "雨夜系统逼主角用破案换取记忆。",
    chapters: [
      {
        id: "chapter-2",
        order: 2,
        title: "第二章: 禁门",
        content: "她听见门后有人说话。",
        goal: "逼近真相",
        hook: "门后传来死者声音",
        conflict: "开门会失去记忆",
        valueShift: "从试探到冒险",
        cliffhanger: "钥匙自己转动",
        status: "drafted",
        wordCount: 13,
      },
      {
        id: "chapter-1",
        order: 1,
        title: "雨夜门开",
        content: "门开了。",
        hook: "死人敲门",
      },
    ],
    foreshadows: [
      {
        title: "门锁声",
        status: "planned",
        setupChapterId: "chapter-1",
        payoffChapterId: "chapter-2",
        notes: '身份线，含"双引号"',
      },
    ],
  };

  it("exports manuscript chapters as an ordered zip package", () => {
    const archive = exportChapterZip(project);
    const files = readStoredZip(archive);

    assert.equal(archive.subarray(0, 2).toString("utf8"), "PK");
    assert.match(files.get("README.md") ?? "", /可导出章节：2\/2/);
    assert.match(files.get("chapters/001-雨夜门开.md") ?? "", /门开了。/);
    assert.match(files.get("chapters/002-第二章- 禁门.md") ?? "", /章节目标：逼近真相/);
    assert.match(files.get("chapters/002-第二章- 禁门.md") ?? "", /钥匙自己转动/);
  });

  it("exports foreshadows as csv with chapter labels and escaped cells", () => {
    const csv = exportForeshadowCsv(project);

    assert.match(csv, /^\uFEFF"伏笔标题","状态","埋设章节","回收章节","备注"/);
    assert.match(csv, /"门锁声","planned","第 1 章 雨夜门开","第 2 章 第二章: 禁门","身份线，含""双引号"""/);
  });

  it("exposes archive content types", () => {
    assert.equal(chapterZipContentType(), "application/zip");
    assert.equal(foreshadowCsvContentType(), "text/csv; charset=utf-8");
  });
});
