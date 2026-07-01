import test from "node:test";
import assert from "node:assert/strict";
import { buildDefaultOutlineNodes } from "../lib/outlines/defaultOutline.ts";
import { getPlatformProfile } from "../lib/platforms/platformProfiles.ts";
import { buildStoryStructureDiagnostic } from "../lib/projects/storyStructureDiagnostic.ts";

const platform = getPlatformProfile("fanqie");
const project = {
  title: "夜雨系统",
  genre: "都市系统",
  sellingPoint: "雨夜系统翻盘",
  targetLengthType: "long_300k_plus",
  targetWordCount: 300000,
  currentWordCount: 6600,
};
const outlineNodes = buildDefaultOutlineNodes({
  projectId: "project-1",
  title: project.title,
  genre: project.genre,
  sellingPoint: project.sellingPoint,
  platform,
});
const chapters = [1, 2, 3].map((order) => ({
  id: `chapter-${order}`,
  order,
  title: `第 ${order} 章`,
  wordCount: 2200,
  goal: "推进主线",
  hook: "系统倒计时响起",
  conflict: "主角必须立刻做选择",
  valueShift: "从被动变主动",
  cliffhanger: "新的任务出现",
  status: "draft",
}));

test("buildStoryStructureDiagnostic", async (t) => {
  await t.test("scores a project with a complete tree and supporting lines", () => {
    const diagnostic = buildStoryStructureDiagnostic({
      project,
      platform,
      chapters,
      outlineNodes,
      characters: [
        {
          id: "character-1",
          name: "林晚",
          role: "主角",
          desire: "活下去并查清系统来源",
          need: "学会主动选择",
          flaw: "遇事先逃避",
          arcStart: "被系统推着走",
          arcEnd: "主动定义规则",
        },
      ],
      foreshadows: [
        {
          id: "foreshadow-1",
          title: "系统来源",
          setupChapterId: "chapter-1",
          payoffChapterId: "chapter-3",
          status: "paid_off",
          notes: "第一章埋系统异常，第三章回收。",
        },
        {
          id: "foreshadow-2",
          title: "反派标记",
          setupChapterId: "chapter-2",
          payoffChapterId: null,
          status: "planned",
          notes: "反派能识别系统标记。",
        },
      ],
      plotThreads: [
        {
          id: "thread-1",
          type: "main",
          title: "系统主线",
          startChapterId: "chapter-1",
          endChapterId: null,
          status: "active",
        },
        {
          id: "thread-2",
          type: "branch",
          title: "反派压力线",
          startChapterId: "chapter-2",
          endChapterId: "chapter-3",
          status: "resolved",
        },
      ],
    });

    assert.ok(diagnostic.score >= 80);
    assert.ok(diagnostic.treeSignals.every((signal) => signal.count > 0));
    assert.ok(diagnostic.items.some((item) => item.id === "character-arc" && item.status === "pass"));
    assert.ok(diagnostic.markdown.includes("整书结构健康度诊断"));
  });

  await t.test("flags missing structure support", () => {
    const diagnostic = buildStoryStructureDiagnostic({
      project: {
        ...project,
        targetWordCount: 10000,
        targetLengthType: "short_10k",
      },
      platform: getPlatformProfile("zhihu_yanxuan"),
      chapters: [],
      outlineNodes: [],
      characters: [],
      foreshadows: [],
      plotThreads: [],
    });

    assert.ok(diagnostic.score < 50);
    assert.ok(diagnostic.treeSignals.some((signal) => signal.status === "fail"));
    assert.ok(diagnostic.items.some((item) => item.id === "tree-skeleton" && item.status === "fail"));
    assert.ok(diagnostic.actionPlan.length >= 3);
  });
});
