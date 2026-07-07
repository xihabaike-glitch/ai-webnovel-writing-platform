import test from "node:test";
import assert from "node:assert/strict";
import { buildSubmissionChecklist } from "../lib/projects/submissionChecklist.ts";
import { getPlatformProfile } from "../lib/platforms/platformProfiles.ts";

const chapters = [
  {
    id: "chapter-1",
    title: "第一章",
    order: 1,
    status: "final",
    wordCount: 3000,
    hook: "系统倒计时只剩十秒。",
    cliffhanger: "第二个选择出现。",
  },
  {
    id: "chapter-2",
    title: "第二章",
    order: 2,
    status: "draft",
    wordCount: 3000,
    hook: "主角被迫验证系统。",
    cliffhanger: "反派看到系统提示。",
  },
  {
    id: "chapter-3",
    title: "第三章",
    order: 3,
    status: "draft",
    wordCount: 3000,
    hook: "奖励变成新的陷阱。",
    cliffhanger: "倒计时重置。",
  },
];

test("buildSubmissionChecklist", async (t) => {
  await t.test("requires stronger word count for free long-form platforms", () => {
    const checklist = buildSubmissionChecklist({
      title: "夜雨系统",
      genre: "都市系统",
      sellingPoint: "雨夜危机中觉醒系统，主角用一次次选择翻盘。",
      currentWordCount: 9000,
      targetWordCount: 300000,
      platform: getPlatformProfile("fanqie"),
      chapters,
      aiTasks: chapters.map((chapter) => ({
        taskType: "chapter_review",
        status: "succeeded",
        chapter: { id: chapter.id },
      })),
    });

    assert.equal(checklist.items.find((item) => item.id === "word-count")?.status, "pass");
    assert.equal(checklist.items.find((item) => item.id === "first-three")?.status, "pass");
    assert.equal(checklist.items.find((item) => item.id === "reviewed-first-three")?.status, "pass");
    assert.ok(checklist.readinessPercent > 60);
  });

  await t.test("allows a lower first submission line for Zhihu short stories", () => {
    const checklist = buildSubmissionChecklist({
      title: "雨夜反转",
      genre: "悬疑",
      sellingPoint: "第一人称雨夜复仇反转故事。",
      currentWordCount: 1200,
      targetWordCount: 10000,
      platform: getPlatformProfile("zhihu_yanxuan"),
      chapters: chapters.slice(0, 1),
      aiTasks: [],
    });

    assert.equal(checklist.items.find((item) => item.id === "word-count")?.status, "pass");
    assert.equal(checklist.items.find((item) => item.id === "first-three")?.status, "todo");
  });

  await t.test("requires fresh first-three reviews after adopting candidate prose", () => {
    const checklist = buildSubmissionChecklist({
      title: "夜雨系统",
      genre: "都市系统",
      sellingPoint: "雨夜危机中觉醒系统，主角用一次次选择翻盘。",
      currentWordCount: 9000,
      targetWordCount: 300000,
      platform: getPlatformProfile("fanqie"),
      chapters,
      aiTasks: [
        ...chapters.map((chapter, index) => ({
          taskType: "chapter_review",
          status: "succeeded",
          chapter: { id: chapter.id },
          createdAt: `2026-01-0${index + 1}T00:00:00.000Z`,
        })),
        {
          taskType: "chapter_adopt_candidate",
          status: "succeeded",
          chapter: { id: "chapter-1" },
          createdAt: "2026-01-05T00:00:00.000Z",
        },
      ],
    });

    const reviewItem = checklist.items.find((item) => item.id === "reviewed-first-three");
    assert.equal(reviewItem?.status, "todo");
    assert.ok(reviewItem?.detail.includes("已审稿 2/3"));
  });

  await t.test("checks short closure and long-form structure by length preset", () => {
    const shortChecklist = buildSubmissionChecklist({
      title: "雨夜反转",
      genre: "悬疑",
      sellingPoint: "第一人称雨夜复仇反转故事。",
      currentWordCount: 9500,
      targetLengthType: "short_10k",
      targetWordCount: 10000,
      platform: getPlatformProfile("zhihu_yanxuan"),
      chapters: [chapters[0]],
      aiTasks: [],
    });
    const longChecklist = buildSubmissionChecklist({
      title: "夜雨系统",
      genre: "都市系统",
      sellingPoint: "雨夜危机中觉醒系统，主角用一次次选择翻盘。",
      currentWordCount: 9000,
      targetLengthType: "long_300k_plus",
      targetWordCount: 300000,
      platform: getPlatformProfile("fanqie"),
      chapters,
      aiTasks: chapters.map((chapter) => ({
        taskType: "chapter_review",
        status: "succeeded",
        chapter: { id: chapter.id },
      })),
    });

    const shortLengthItem = shortChecklist.items.find((item) => item.id === "length-structure");
    const longLengthItem = longChecklist.items.find((item) => item.id === "length-structure");
    assert.equal(shortLengthItem?.status, "pass");
    assert.ok(shortLengthItem?.detail.includes("闭环结尾"));
    assert.equal(longLengthItem?.status, "risk");
    assert.ok(longLengthItem?.detail.includes("主干"));
    assert.ok(longLengthItem?.detail.includes("支线"));
    assert.ok(longLengthItem?.detail.includes("人物弧光"));
    assert.ok(longLengthItem?.detail.includes("伏笔回收"));
  });

  await t.test("uses story structure diagnostic evidence for long-form submission gates", () => {
    const strongDiagnosticItems = [
      { id: "tree-skeleton", label: "大树骨架", status: "pass" as const, evidence: "开头、结尾、主干、分支、叶片和土壤齐备。" },
      { id: "trunk-pressure", label: "主干压力", status: "pass" as const, evidence: "主干节点和剧情线齐备。" },
      { id: "branch-coverage", label: "支线覆盖", status: "pass" as const, evidence: "三条支线已绑定剧情线。" },
      { id: "character-arc", label: "人物弧光", status: "pass" as const, evidence: "主角弧光完整。" },
      { id: "foreshadow-payoff", label: "伏笔回收", status: "pass" as const, evidence: "伏笔有埋点和回收。" },
    ];
    const readyChecklist = buildSubmissionChecklist({
      title: "夜雨系统",
      genre: "都市系统",
      sellingPoint: "雨夜危机中觉醒系统，主角用一次次选择翻盘。",
      currentWordCount: 9000,
      targetLengthType: "long_300k_plus",
      targetWordCount: 300000,
      platform: getPlatformProfile("fanqie"),
      chapters,
      aiTasks: chapters.map((chapter) => ({
        taskType: "chapter_review",
        status: "succeeded",
        chapter: { id: chapter.id },
      })),
      structureDiagnostic: {
        score: 88,
        items: strongDiagnosticItems,
      },
    });
    const weakChecklist = buildSubmissionChecklist({
      title: "夜雨系统",
      genre: "都市系统",
      sellingPoint: "雨夜危机中觉醒系统，主角用一次次选择翻盘。",
      currentWordCount: 9000,
      targetLengthType: "long_300k_plus",
      targetWordCount: 300000,
      platform: getPlatformProfile("fanqie"),
      chapters,
      aiTasks: chapters.map((chapter) => ({
        taskType: "chapter_review",
        status: "succeeded",
        chapter: { id: chapter.id },
      })),
      structureDiagnostic: {
        score: 61,
        items: [
          ...strongDiagnosticItems.filter((item) => item.id !== "character-arc" && item.id !== "foreshadow-payoff"),
          { id: "character-arc", label: "人物弧光", status: "fail" as const, evidence: "完整弧光 0 个。" },
          { id: "foreshadow-payoff", label: "伏笔回收", status: "warn" as const, evidence: "只有埋点，没有回收章。" },
        ],
      },
    });

    const readyLengthItem = readyChecklist.items.find((item) => item.id === "length-structure");
    const weakLengthItem = weakChecklist.items.find((item) => item.id === "length-structure");
    assert.equal(readyLengthItem?.status, "pass");
    assert.ok(readyLengthItem?.detail.includes("结构诊断 88 分"));
    assert.equal(weakLengthItem?.status, "risk");
    assert.ok(weakLengthItem?.detail.includes("人物弧光"));
    assert.ok(weakLengthItem?.detail.includes("伏笔回收"));
  });
});
