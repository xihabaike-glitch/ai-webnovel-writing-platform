import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { docxContentType, exportDocxFileSuffix, exportProjectDocxByMode } from "../lib/export/docx.ts";

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

describe("exportProjectDocxByMode", () => {
  const project = {
    title: "夜雨系统",
    genre: "都市悬疑",
    targetPlatformName: "番茄小说",
    targetLengthType: "5-6 万字中篇",
    targetWordCount: 60000,
    currentWordCount: 3200,
    sellingPoint: "雨夜系统逼主角用破案换取记忆。",
    chapters: [{ id: "chapter-1", order: 1, title: "雨夜门开", content: "门开了。", hook: "死人敲门" }],
    outlineNodes: [{ type: "RootIdea", title: "核心卖点", summary: "破案换记忆。", depth: 0, order: 1 }],
    characters: [{ name: "林晚", role: "主角", desire: "找回记忆", flaw: "逃避" }],
    foreshadows: [{ title: "门锁声", setupChapterId: "chapter-1", notes: "身份线。" }],
  };

  it("builds a valid docx package with full manuscript content", () => {
    const docx = exportProjectDocxByMode(project, "full");
    const files = readStoredZip(docx);
    const document = files.get("word/document.xml") ?? "";

    assert.equal(docx.subarray(0, 2).toString("utf8"), "PK");
    assert.equal(files.has("[Content_Types].xml"), true);
    assert.equal(files.has("_rels/.rels"), true);
    assert.equal(files.has("word/styles.xml"), true);
    assert.match(document, /夜雨系统/);
    assert.match(document, /正文/);
    assert.match(document, /门开了。/);
  });

  it("keeps outline docx focused on outline content", () => {
    const document = readStoredZip(exportProjectDocxByMode(project, "outline")).get("word/document.xml") ?? "";

    assert.match(document, /夜雨系统 大纲包/);
    assert.match(document, /大纲树/);
    assert.doesNotMatch(document, /门开了。/);
    assert.doesNotMatch(document, /人物设定/);
  });

  it("keeps character docx focused on characters and foreshadows", () => {
    const document = readStoredZip(exportProjectDocxByMode(project, "characters")).get("word/document.xml") ?? "";

    assert.match(document, /夜雨系统 人物伏笔包/);
    assert.match(document, /人物设定/);
    assert.match(document, /门锁声/);
    assert.doesNotMatch(document, /正文/);
  });

  it("uses docx filenames and content type explicitly", () => {
    assert.equal(exportDocxFileSuffix("full"), "完整资料包");
    assert.equal(exportDocxFileSuffix("outline"), "大纲包");
    assert.equal(exportDocxFileSuffix("characters"), "人物伏笔包");
    assert.equal(docxContentType(), "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  });
});
