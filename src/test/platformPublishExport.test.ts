import test from "node:test";
import assert from "node:assert/strict";
import { getPlatformProfile, platformProfiles } from "../lib/platforms/platformProfiles.ts";
import {
  buildPlatformPublishExportCenter,
  buildPlatformPublishArchive,
  buildPublishPackageRestorePatch,
  buildPublishPackageVersionComparison,
  countPublishPackageVersionActions,
  filterPublishPackageVersions,
  normalizePublishPackageVersionAction,
  parsePublishSnapshotTags,
} from "../lib/projects/platformPublishExport.ts";
import { buildPublishRepairTaskSnapshot } from "../lib/projects/publishRepairActionExecution.ts";

const chapters = [
  {
    id: "chapter-1",
    order: 1,
    title: "雨夜系统",
    content: "林晚推开门，系统提示音在雨夜响起。她知道自己已经没有退路。",
    wordCount: 32,
    goal: "让主角遭遇系统。",
    hook: "雨夜系统提示音响起。",
    conflict: "主角必须救人或逃跑。",
    cliffhanger: "系统给出第二个任务。",
    status: "revising",
  },
];

const finalChapters = [1, 2, 3].map((order) => ({
  id: `chapter-${order}`,
  order,
  title: `第${order}夜`,
  content: `第${order}夜，林晚被系统逼到绝境，她必须在倒计时结束前完成选择。`,
  wordCount: 2600,
  goal: "让主角完成高压选择。",
  hook: `第${order}夜开局就出现倒计时。`,
  conflict: "主角必须在救人与自保之间选择。",
  cliffhanger: "系统弹出隐藏任务。",
  status: "final",
}));

const passedReviews = finalChapters.map((chapter, index) => ({
  chapterId: chapter.id,
  taskType: "chapter_review",
  status: "succeeded",
  outputText: JSON.stringify({ score: 92 - index, shouldSecondPass: false }),
  createdAt: `2026-01-0${index + 1}T00:00:00.000Z`,
}));

const readyChecklist = {
  readinessPercent: 90,
  passCount: 9,
  todoCount: 0,
  riskCount: 1,
  items: [],
};

test("buildPlatformPublishExportCenter", async (t) => {
  await t.test("builds packages for all MVP platforms", () => {
    const center = buildPlatformPublishExportCenter({
      project: {
        title: "夜雨系统",
        genre: "都市系统",
        sellingPoint: "雨夜危机中觉醒系统，主角用选择翻盘。",
        currentWordCount: 1200,
        targetWordCount: 300000,
      },
      targetPlatform: getPlatformProfile("fanqie"),
      chapters,
    });

    assert.equal(center.packages.length, platformProfiles.length);
    assert.equal(center.recommendedPlatformId, "fanqie");
    assert.equal(center.totalPublishableChapters, 1);
    assert.ok(center.packages.some((pack) => pack.platformId === "qidian"));
    assert.ok(center.packages.some((pack) => pack.platformId === "wattpad"));
    assert.ok(center.packages[0].repairActions.some((action) => action.kind === "run_chapter_review"));
    assert.equal(center.packages[0].repairPath.status, "needs_repair");
    assert.equal(center.packages[0].repairPath.nextStep?.kind, "run_chapter_review");
    assert.equal(center.packages[0].repairPath.executableActions, 1);
    assert.equal(center.packages[0].repairPath.manualActions, 0);
    assert.equal(center.workspace.readyPlatforms, 0);
    assert.equal(center.workspace.blockedPlatforms, platformProfiles.length);
    assert.ok(center.workspace.nextActions.some((action) => action.kind === "run_chapter_review"));
  });

  await t.test("dedupes workspace repair actions across platforms", () => {
    const center = buildPlatformPublishExportCenter({
      project: {
        title: "夜雨系统",
        genre: "都市系统",
        sellingPoint: "雨夜危机中觉醒系统，主角用选择翻盘。",
        currentWordCount: 1200,
        targetWordCount: 300000,
      },
      targetPlatform: getPlatformProfile("fanqie"),
      chapters,
      platforms: [getPlatformProfile("fanqie"), getPlatformProfile("qidian")],
    });
    const reviewAction = center.workspace.nextActions.find((action) => action.kind === "run_chapter_review");

    assert.equal(center.workspace.blockedPlatforms, 2);
    assert.equal(center.workspace.executableActions, 1);
    assert.equal(reviewAction?.occurrenceCount, 2);
    assert.deepEqual(reviewAction?.platformNames.sort(), ["番茄小说", "起点中文网"].sort());
    assert.ok(center.workspace.headline.includes("2 个平台"));
  });

  await t.test("uses overseas packaging for overseas platforms", () => {
    const center = buildPlatformPublishExportCenter({
      project: {
        title: "Night Rain System",
        genre: "System Fantasy",
        sellingPoint: "a protagonist forced to survive through system choices",
        currentWordCount: 1200,
        targetWordCount: 300000,
      },
      targetPlatform: getPlatformProfile("webnovel"),
      chapters,
      platforms: [getPlatformProfile("webnovel")],
    });
    const pack = center.packages[0];

    assert.equal(pack.platformId, "webnovel");
    assert.ok(pack.synopsis.includes("Night Rain System is a System Fantasy web novel"));
    assert.ok(pack.chapters[0].formattedTitle.startsWith("Chapter 1:"));
    assert.ok(pack.warnings.some((warning) => warning.includes("海外平台")));
  });

  await t.test("renders markdown with chapter body and platform warnings", () => {
    const center = buildPlatformPublishExportCenter({
      project: {
        title: "夜雨系统",
        genre: "都市系统",
        sellingPoint: "雨夜危机中觉醒系统，主角用选择翻盘。",
        currentWordCount: 1200,
        targetWordCount: 300000,
      },
      targetPlatform: getPlatformProfile("fanqie"),
      chapters,
      platforms: [getPlatformProfile("fanqie")],
    });
    const markdown = center.packages[0].markdown;

    assert.ok(markdown.includes("# 番茄小说 发布包"));
    assert.ok(markdown.includes("林晚推开门"));
    assert.ok(markdown.includes("发布前质检"));
    assert.ok(markdown.includes("修复动作"));
    assert.ok(markdown.includes("风险提醒"));
  });

  await t.test("allows export when chapters and checklist pass final preflight", () => {
    const center = buildPlatformPublishExportCenter({
      project: {
        title: "夜雨系统",
        genre: "都市系统",
        sellingPoint: "雨夜危机中觉醒系统，主角用选择翻盘。",
        currentWordCount: 9000,
        targetWordCount: 300000,
      },
      targetPlatform: getPlatformProfile("fanqie"),
      chapters: finalChapters,
      aiTasks: passedReviews,
      submissionChecklist: readyChecklist,
      platforms: [getPlatformProfile("fanqie")],
    });
    const pack = center.packages[0];

    assert.equal(pack.canExport, true);
    assert.equal(pack.preflight.blocked.length, 0);
    assert.equal(pack.repairActions.length, 0);
    assert.equal(pack.repairPath.status, "ready");
    assert.equal(pack.repairPath.nextStep, null);
    assert.equal(pack.repairPath.totalActions, 0);
    assert.equal(pack.chapters.every((chapter) => chapter.ready), true);
    assert.ok(pack.markdown.includes("导出状态：允许导出"));
  });

  await t.test("prefers persisted platform submission assets", () => {
    const center = buildPlatformPublishExportCenter({
      project: {
        title: "夜雨系统",
        genre: "都市系统",
        sellingPoint: "雨夜危机中觉醒系统，主角用选择翻盘。",
        currentWordCount: 9000,
        targetWordCount: 300000,
      },
      targetPlatform: getPlatformProfile("fanqie"),
      chapters: finalChapters,
      aiTasks: passedReviews,
      submissionChecklist: readyChecklist,
      platforms: [getPlatformProfile("fanqie")],
      submissionAssets: [
        {
          id: "asset-fanqie",
          platformId: "fanqie",
          platformName: "番茄小说",
          title: "夜雨系统：倒计时重生",
          logline: "系统每晚倒计时，女主用选择把绝境打成爽点。",
          synopsis: "林晚在雨夜绑定倒计时系统，每一次选择都牵动生死与复仇。",
          overseasSynopsis: "Night Rain System follows Lin Wan through deadly timed choices.",
          tags: ["系统", "重生", "强爽点"],
          note: "首秀前强调前三章钩子。",
          source: "manual",
          updatedAt: "2026-01-06T08:00:00.000Z",
        },
      ],
    });
    const pack = center.packages[0];

    assert.equal(pack.title, "夜雨系统：倒计时重生");
    assert.equal(pack.logline, "系统每晚倒计时，女主用选择把绝境打成爽点。");
    assert.equal(pack.synopsis, "林晚在雨夜绑定倒计时系统，每一次选择都牵动生死与复仇。");
    assert.deepEqual(pack.tags, ["系统", "重生", "强爽点"]);
    assert.equal(pack.submissionAsset?.persisted, true);
    assert.ok(pack.publishNote.includes("首秀前强调前三章钩子。"));
    assert.ok(pack.markdown.includes("夜雨系统：倒计时重生"));
  });

  await t.test("blocks export when latest review still asks for a second pass", () => {
    const center = buildPlatformPublishExportCenter({
      project: {
        title: "夜雨系统",
        genre: "都市系统",
        sellingPoint: "雨夜危机中觉醒系统，主角用选择翻盘。",
        currentWordCount: 9000,
        targetWordCount: 300000,
      },
      targetPlatform: getPlatformProfile("fanqie"),
      chapters: finalChapters,
      aiTasks: [
        ...passedReviews.slice(1),
        {
          chapterId: "chapter-1",
          taskType: "chapter_review",
          status: "succeeded",
          outputText: JSON.stringify({ score: 72, shouldSecondPass: true }),
          createdAt: "2026-01-09T00:00:00.000Z",
        },
      ],
      submissionChecklist: readyChecklist,
      platforms: [getPlatformProfile("fanqie")],
    });
    const pack = center.packages[0];

    assert.equal(pack.canExport, false);
    assert.ok(pack.preflight.blocked.some((item) => item.includes("1 章未通过")));
    assert.ok(pack.repairActions.some((action) => action.kind === "run_second_pass" && action.chapterId === "chapter-1"));
    assert.equal(pack.repairPath.nextStep?.kind, "run_second_pass");
    assert.equal(pack.repairPath.executableActions, 1);
    assert.equal(pack.repairPath.groups.some((group) => group.kind === "run_second_pass" && group.count === 1), true);
    assert.ok(pack.chapters[0].preflight.blocked.some((item) => item.includes("仍要求二改")));
  });

  await t.test("blocks export when submission readiness is below threshold", () => {
    const center = buildPlatformPublishExportCenter({
      project: {
        title: "夜雨系统",
        genre: "都市系统",
        sellingPoint: "雨夜危机中觉醒系统，主角用选择翻盘。",
        currentWordCount: 9000,
        targetWordCount: 300000,
      },
      targetPlatform: getPlatformProfile("fanqie"),
      chapters: finalChapters,
      aiTasks: passedReviews,
      submissionChecklist: { ...readyChecklist, readinessPercent: 70 },
      platforms: [getPlatformProfile("fanqie")],
    });
    const pack = center.packages[0];

    assert.equal(pack.canExport, false);
    assert.ok(pack.preflight.blocked.some((item) => item.includes("低于 80%")));
    assert.ok(pack.repairActions.some((action) => action.kind === "open_submission_package"));
    assert.equal(pack.repairPath.nextStep?.kind, "open_submission_package");
    assert.equal(pack.repairPath.manualActions, 1);
  });

  await t.test("summarizes publish repair task history", () => {
    const center = buildPlatformPublishExportCenter({
      project: {
        title: "夜雨系统",
        genre: "都市系统",
        sellingPoint: "雨夜危机中觉醒系统，主角用选择翻盘。",
        currentWordCount: 9000,
        targetWordCount: 300000,
      },
      targetPlatform: getPlatformProfile("fanqie"),
      chapters: finalChapters,
      aiTasks: [
        ...passedReviews,
        {
          id: "repair-review-1",
          chapterId: "chapter-1",
          taskType: "chapter_review",
          status: "succeeded",
          inputSnapshot: buildPublishRepairTaskSnapshot({
            kind: "run_chapter_review",
            label: "补章节审稿",
            detail: "进入章节工作台运行审稿。",
            chapterId: "chapter-1",
            chapterTitle: "第1夜",
          }, "{}"),
          outputText: JSON.stringify({ score: 91, shouldSecondPass: false }),
          createdAt: "2026-01-10T00:00:00.000Z",
        },
      ],
      submissionChecklist: readyChecklist,
      platforms: [getPlatformProfile("fanqie")],
    });
    const pack = center.packages[0];

    assert.equal(pack.repairHistory.length, 1);
    assert.equal(pack.repairHistory[0].label, "补章节审稿");
    assert.equal(pack.repairHistory[0].score, 91);
    assert.ok(pack.repairHistory[0].message.includes("已通过"));
    assert.ok(pack.markdown.includes("最近修复记录"));
  });

  await t.test("attaches recent publish package versions by platform", () => {
    const center = buildPlatformPublishExportCenter({
      project: {
        title: "夜雨系统",
        genre: "都市系统",
        sellingPoint: "雨夜危机中觉醒系统，主角用选择翻盘。",
        currentWordCount: 9000,
        targetWordCount: 300000,
      },
      targetPlatform: getPlatformProfile("fanqie"),
      chapters: finalChapters,
      aiTasks: passedReviews,
      submissionChecklist: readyChecklist,
      platforms: [getPlatformProfile("fanqie")],
      publishSnapshots: [
        {
          id: "old-fanqie",
          platformId: "fanqie",
          platformName: "番茄小说",
          title: "夜雨系统",
          action: "copy",
          chapterCount: 3,
          wordCount: 7800,
          preflightScore: 88,
          canExport: true,
          createdAt: "2026-01-01T00:00:00.000Z",
        },
        {
          id: "qidian-version",
          platformId: "qidian",
          platformName: "起点中文网",
          title: "夜雨系统",
          action: "download",
          chapterCount: 3,
          wordCount: 7800,
          preflightScore: 90,
          canExport: true,
          createdAt: "2026-01-03T00:00:00.000Z",
        },
        {
          id: "new-fanqie",
          platformId: "fanqie",
          platformName: "番茄小说",
          title: "夜雨系统",
          action: "download",
          chapterCount: 3,
          wordCount: 7800,
          preflightScore: 95,
          canExport: true,
          createdAt: "2026-01-04T00:00:00.000Z",
        },
      ],
    });
    const pack = center.packages[0];

    assert.equal(pack.publishVersions.length, 2);
    assert.equal(pack.publishVersions[0].id, "new-fanqie");
    assert.equal(pack.publishVersions[1].id, "old-fanqie");
    assert.equal(pack.publishVersions.every((version) => version.platformId === "fanqie"), true);
  });

  await t.test("filters and counts publish package versions by action", () => {
    const versions = [
      {
        id: "copy-1",
        platformId: "fanqie",
        platformName: "番茄小说",
        title: "夜雨系统",
        action: "copy",
        chapterCount: 3,
        wordCount: 7800,
        preflightScore: 90,
        canExport: true,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "archive-1",
        platformId: "qidian",
        platformName: "起点中文网",
        title: "夜雨系统",
        action: "archive",
        chapterCount: 3,
        wordCount: 7800,
        preflightScore: 92,
        canExport: true,
        createdAt: "2026-01-02T00:00:00.000Z",
      },
      {
        id: "unknown-1",
        platformId: "webnovel",
        platformName: "WebNovel",
        title: "夜雨系统",
        action: "manual-save",
        chapterCount: 3,
        wordCount: 7800,
        preflightScore: 91,
        canExport: true,
        createdAt: "2026-01-03T00:00:00.000Z",
      },
      {
        id: "restore-1",
        platformId: "fanqie",
        platformName: "番茄小说",
        title: "夜雨系统",
        action: "restore",
        chapterCount: 3,
        wordCount: 7800,
        preflightScore: 93,
        canExport: true,
        createdAt: "2026-01-04T00:00:00.000Z",
      },
    ];
    const counts = countPublishPackageVersionActions(versions);

    assert.equal(normalizePublishPackageVersionAction("manual-save"), "snapshot");
    assert.equal(normalizePublishPackageVersionAction("restore"), "restore");
    assert.equal(counts.all, 4);
    assert.equal(counts.copy, 1);
    assert.equal(counts.archive, 1);
    assert.equal(counts.snapshot, 1);
    assert.equal(counts.restore, 1);
    assert.equal(filterPublishPackageVersions(versions, "archive").map((version) => version.id).join(","), "archive-1");
    assert.equal(filterPublishPackageVersions(versions, "restore").map((version) => version.id).join(","), "restore-1");
    assert.equal(filterPublishPackageVersions(versions, "all").length, 4);
  });

  await t.test("compares publish package versions with the current package", () => {
    const center = buildPlatformPublishExportCenter({
      project: {
        title: "夜雨系统",
        genre: "都市系统",
        sellingPoint: "雨夜危机中觉醒系统，主角用选择翻盘。",
        currentWordCount: 9000,
        targetWordCount: 300000,
      },
      targetPlatform: getPlatformProfile("fanqie"),
      chapters: finalChapters,
      aiTasks: passedReviews,
      submissionChecklist: readyChecklist,
      platforms: [getPlatformProfile("fanqie")],
    });
    const pack = center.packages[0];
    const comparison = buildPublishPackageVersionComparison({
      id: "snapshot-1",
      platformId: "fanqie",
      platformName: "番茄小说",
      title: "旧书名",
      logline: pack.logline,
      synopsis: pack.synopsis,
      tags: parsePublishSnapshotTags(JSON.stringify(pack.tags)),
      markdown: "# 旧发布包",
      action: "copy",
      chapterCount: pack.chapters.length,
      wordCount: pack.chapters.reduce((sum, chapter) => sum + chapter.wordCount, 0),
      preflightScore: pack.preflight.score - 5,
      canExport: pack.canExport,
      createdAt: "2026-01-05T00:00:00.000Z",
    }, pack);

    assert.equal(parsePublishSnapshotTags("not json").length, 0);
    assert.ok(comparison.changedCount >= 2);
    assert.equal(comparison.items.find((item) => item.label === "书名")?.changed, true);
    assert.equal(comparison.items.find((item) => item.label === "标签")?.changed, false);
    assert.equal(comparison.items.find((item) => item.label === "质检分")?.changed, true);
  });

  await t.test("builds a safe restore patch from publish package versions", () => {
    const patch = buildPublishPackageRestorePatch({
      title: " 旧版夜雨系统 ",
      logline: " 旧版卖点：雨夜系统翻盘。 ",
    });

    assert.equal(patch.title, "旧版夜雨系统");
    assert.equal(patch.sellingPoint, "旧版卖点：雨夜系统翻盘。");
    assert.deepEqual(patch.restoredFields, ["title", "sellingPoint"]);
  });

  await t.test("builds an all-platform archive from exportable packages", () => {
    const center = buildPlatformPublishExportCenter({
      project: {
        title: "夜雨系统",
        genre: "都市系统",
        sellingPoint: "雨夜危机中觉醒系统，主角用选择翻盘。",
        currentWordCount: 9000,
        targetWordCount: 300000,
      },
      targetPlatform: getPlatformProfile("fanqie"),
      chapters: finalChapters,
      aiTasks: passedReviews,
      submissionChecklist: readyChecklist,
      platforms: [getPlatformProfile("fanqie"), getPlatformProfile("webnovel")],
    });
    const archive = buildPlatformPublishArchive(center, "夜雨系统", "2026-01-06T08:00:00.000Z");

    assert.equal(archive.readyCount, 2);
    assert.equal(archive.blockedCount, 0);
    assert.equal(archive.totalChapterCount, 6);
    assert.equal(archive.totalWordCount, 15600);
    assert.ok(archive.platforms.some((platform) => platform.fileName === "夜雨系统-番茄小说-发布包.md"));
    assert.ok(archive.markdown.includes("# 夜雨系统 全平台投稿包"));
    assert.ok(archive.markdown.includes("| 番茄小说 | 可导出 |"));
    assert.ok(archive.markdown.includes("### WebNovel"));
    assert.ok(archive.markdown.includes("# 番茄小说 发布包"));
  });

  await t.test("keeps blocked platforms in the archive manifest", () => {
    const center = buildPlatformPublishExportCenter({
      project: {
        title: "夜雨|系统",
        genre: "都市系统",
        sellingPoint: "雨夜危机中觉醒系统，主角用选择翻盘。",
        currentWordCount: 1200,
        targetWordCount: 300000,
      },
      targetPlatform: getPlatformProfile("fanqie"),
      chapters,
      platforms: [getPlatformProfile("fanqie")],
    });
    const archive = buildPlatformPublishArchive(center, "夜雨|系统", "2026-01-06T08:00:00.000Z");

    assert.equal(archive.readyCount, 0);
    assert.equal(archive.blockedCount, 1);
    assert.ok(archive.platforms[0].fileName.includes("夜雨-系统-番茄小说-发布包.md"));
    assert.ok(archive.markdown.includes("暂无通过质检的平台发布包。"));
    assert.ok(archive.markdown.includes("| 番茄小说 | 需处理 |"));
  });
});
