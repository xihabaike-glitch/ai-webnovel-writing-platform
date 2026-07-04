import test from "node:test";
import assert from "node:assert/strict";
import {
  buildMultiPlatformSubmission,
  buildMultiPlatformSubmissionArchive,
  buildSinglePlatformSubmissionMarkdown,
} from "../lib/projects/multiPlatformSubmission.ts";

const chapters = [
  {
    id: "chapter-1",
    order: 1,
    title: "雨夜系统",
    content: "",
    goal: "让主角遭遇不可逆事件。",
    hook: "系统倒计时只剩十秒。",
    conflict: "主角必须在逃跑和救人之间选择。",
    cliffhanger: "系统给出第二个选择。",
    status: "draft",
    wordCount: 3000,
  },
  {
    id: "chapter-2",
    order: 2,
    title: "第一次选择",
    content: "",
    goal: "展示系统代价。",
    hook: "奖励和惩罚同时弹出。",
    conflict: "主角必须公开暴露自己的异常。",
    cliffhanger: "反派发现了系统痕迹。",
    status: "draft",
    wordCount: 3000,
  },
  {
    id: "chapter-3",
    order: 3,
    title: "反杀前夜",
    content: "",
    goal: "完成第一轮小反转。",
    hook: "倒计时在课堂上响起。",
    conflict: "主角必须牺牲短期安全换取证据。",
    cliffhanger: "系统任务对象换成了她最信任的人。",
    status: "draft",
    wordCount: 3000,
  },
];

test("buildMultiPlatformSubmission", async (t) => {
  await t.test("builds ranked variants for every MVP platform", () => {
    const result = buildMultiPlatformSubmission({
      title: "夜雨系统",
      genre: "都市系统",
      sellingPoint: "雨夜危机中觉醒系统，主角用一次次选择翻盘。",
      currentWordCount: 9000,
      targetWordCount: 300000,
      targetPlatformId: "fanqie",
      chapters,
      aiTasks: [],
    });

    assert.equal(result.variants.length, 8);
    assert.ok(result.recommendedPlatformId);
    assert.ok(result.variants[0].fitScore >= result.variants[1].fitScore);
    assert.ok(result.variants.some((variant) => variant.platformId === "qidian"));
    assert.ok(result.variants.some((variant) => variant.platformId === "webnovel"));
    assert.equal(result.packageSummary.totalPlatforms, 8);
    assert.ok(result.packageSummary.readyToArchive);
    assert.ok(result.variants.every((variant) => variant.packageMatrix.totalFields === 6));
    assert.ok(result.variants.every((variant) => variant.packageMatrix.packageFileName.endsWith("-投稿包.md")));
    assert.equal(result.archive.totalPlatforms, 8);
    assert.equal(result.archive.readyCount, result.packageSummary.readyPlatforms);
    assert.ok(result.archive.archiveFileName.endsWith(".md"));
    assert.ok(result.archive.markdown.includes("多平台投稿包归档"));
    assert.ok(result.markdown.includes("多平台投稿版本"));
    assert.ok(result.markdown.includes("平台包字段"));
  });

  await t.test("keeps overseas synopsis visible for overseas platforms", () => {
    const result = buildMultiPlatformSubmission({
      title: "夜雨系统",
      genre: "都市系统",
      sellingPoint: "雨夜危机中觉醒系统，主角用一次次选择翻盘。",
      currentWordCount: 9000,
      targetWordCount: 300000,
      targetPlatformId: "fanqie",
      chapters,
      aiTasks: [],
    });
    const webnovel = result.variants.find((variant) => variant.platformId === "webnovel");

    assert.ok(webnovel);
    assert.equal(webnovel.category, "overseas");
    assert.ok(webnovel.positioning.includes(webnovel.submissionPackage.overseasSynopsis));
    assert.equal(webnovel.packageMatrix.items.find((item) => item.id === "overseas_synopsis")?.status, "ready");
    assert.ok(webnovel.packageMatrix.nextAction.includes("归档") || webnovel.packageMatrix.nextAction.includes("先补"));
    assert.ok(result.markdown.includes("WebNovel"));
  });

  await t.test("flags weak platform packages before archive", () => {
    const result = buildMultiPlatformSubmission({
      title: "",
      genre: "",
      sellingPoint: "",
      currentWordCount: 0,
      targetWordCount: 10000,
      targetPlatformId: "zhihu_yanxuan",
      chapters: [],
      aiTasks: [],
    });
    const zhihu = result.variants.find((variant) => variant.platformId === "zhihu_yanxuan");

    assert.ok(zhihu);
    assert.equal(zhihu.packageMatrix.status, "needs_work");
    assert.ok(zhihu.packageMatrix.items.some((item) => item.id === "title" && item.status === "missing"));
    assert.ok(zhihu.packageMatrix.items.some((item) => item.id === "sample_chapters" && item.status === "warning"));
    assert.equal(result.packageSummary.readyToArchive, result.packageSummary.readyPlatforms > 0);
    assert.equal(result.archive.blockedCount, result.archive.totalPlatforms - result.archive.readyCount);
    assert.ok(result.markdown.includes("需补齐"));
  });

  await t.test("builds a downloadable archive manifest and single platform package", () => {
    const result = buildMultiPlatformSubmission({
      title: "夜雨|系统",
      genre: "都市系统",
      sellingPoint: "雨夜危机中觉醒系统，主角用一次次选择翻盘。",
      currentWordCount: 9000,
      targetWordCount: 300000,
      targetPlatformId: "fanqie",
      chapters,
      aiTasks: [],
    });
    const archive = buildMultiPlatformSubmissionArchive(result, "2026-01-06T08:00:00.000Z");
    const fanqie = result.variants.find((variant) => variant.platformId === "fanqie");

    assert.ok(fanqie);
    assert.ok(archive.archiveFileName.includes("夜雨-系统-多平台投稿包归档.md"));
    assert.ok(archive.markdown.includes("| 平台 | 状态 | 字段 | 样章 | 摘要字数 | 文件/待补字段 |"));
    assert.ok(archive.markdown.includes("已就绪平台投稿包"));
    assert.ok(archive.platforms.some((platform) => platform.fileName.includes("夜雨-系统-番茄小说-投稿包.md")));
    const singlePackage = buildSinglePlatformSubmissionMarkdown(fanqie);
    assert.ok(singlePackage.includes("# 夜雨|系统 番茄小说 投稿包"));
    assert.ok(singlePackage.includes("## 字段矩阵"));
    assert.ok(singlePackage.includes("## 样章摘要"));
  });
});
