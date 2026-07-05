import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildExportPackageReadiness, exportProjectMarkdown } from "../lib/export/markdown.ts";

describe("exportProjectMarkdown", () => {
  it("exports project title and ordered chapters by order field", () => {
    const markdown = exportProjectMarkdown({
      title: "夜雨系统",
      chapters: [
        { order: 2, title: "第二章", content: "她回头。" },
        { order: 1, title: "第一章", content: "门开了。" },
      ],
    });

    assert.match(markdown, /# 夜雨系统/);
    assert.match(markdown, /## 第 1 章 第一章/);
    assert.equal(markdown.indexOf("## 第 1 章 第一章") < markdown.indexOf("## 第 2 章 第二章"), true);
  });

  it("exports a full writing package with outline, characters, world and foreshadows", () => {
    const markdown = exportProjectMarkdown({
      title: "夜雨系统",
      genre: "都市悬疑",
      targetPlatformName: "番茄小说",
      targetLengthType: "5-6 万字中篇",
      targetWordCount: 60000,
      currentWordCount: 3200,
      sellingPoint: "雨夜系统逼主角用破案换取记忆。",
      updateCadence: "日更",
      chapters: [{
        id: "chapter-1",
        order: 1,
        title: "雨夜门开",
        content: "门开了。",
        goal: "让主角被迫接案。",
        hook: "门外站着已经死去的人。",
        conflict: "报警会触发系统惩罚。",
        valueShift: "从逃避到接案。",
        cliffhanger: "死者说出了主角的秘密。",
      }],
      outlineNodes: [{
        type: "RootIdea",
        title: "雨夜系统",
        summary: "破案换记忆。",
        depth: 0,
        order: 1,
      }],
      characters: [{
        name: "林晚",
        role: "主角",
        desire: "找回记忆",
        flaw: "习惯逃避",
        arcStart: "被动自保",
        arcEnd: "主动承担真相代价",
      }],
      worldEntries: [{ type: "规则", title: "系统代价", content: "每次胜利都会丢失一段关系记忆。" }],
      foreshadows: [{ title: "门锁声", status: "planned", setupChapterId: "chapter-1", notes: "结尾回收身份线。" }],
      plotThreads: [{ type: "主线", title: "旧案真相", status: "active" }],
    });

    assert.match(markdown, /## 作品信息/);
    assert.match(markdown, /## 大纲树/);
    assert.match(markdown, /## 人物设定/);
    assert.match(markdown, /### 林晚/);
    assert.match(markdown, /## 世界观\/设定/);
    assert.match(markdown, /## 伏笔表/);
    assert.match(markdown, /门锁声/);
    assert.match(markdown, /## 正文/);
    assert.match(markdown, /开头钩子/);
  });

  it("blocks export handoff when manuscript and core assets are missing", () => {
    const readiness = buildExportPackageReadiness({
      title: "夜",
      chapters: [],
    });

    assert.equal(readiness.status, "blocked");
    assert.equal(readiness.todoCount > 0, true);
    assert.match(readiness.nextAction, /作品基础信息|正文内容|大纲树|人物弧光/);
  });

  it("marks a complete writing package as ready", () => {
    const readiness = buildExportPackageReadiness({
      title: "夜雨系统",
      genre: "都市悬疑",
      sellingPoint: "雨夜系统逼主角用破案换取记忆。",
      chapters: [{
        order: 1,
        title: "雨夜门开",
        content: "门开了。",
        goal: "接案",
        hook: "死人敲门",
        conflict: "报警会惩罚",
        cliffhanger: "秘密曝光",
      }],
      outlineNodes: [
        { type: "RootIdea", title: "核心卖点" },
        { type: "MainPlot", title: "旧案真相" },
        { type: "Chapter", title: "雨夜门开" },
      ],
      characters: [{
        name: "林晚",
        role: "主角",
        desire: "找回记忆",
        flaw: "逃避",
        arcStart: "被动",
        arcEnd: "主动",
      }],
      worldEntries: [{ type: "规则", title: "系统代价", content: "胜利有代价。" }],
      foreshadows: [{ title: "门锁声" }],
    });

    assert.equal(readiness.status, "ready");
    assert.equal(readiness.todoCount, 0);
    assert.equal(readiness.riskCount, 0);
  });
});
