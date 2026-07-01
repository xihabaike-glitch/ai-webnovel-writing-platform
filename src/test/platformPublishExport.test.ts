import test from "node:test";
import assert from "node:assert/strict";
import { getPlatformProfile, platformProfiles } from "../lib/platforms/platformProfiles.ts";
import { buildPlatformPublishExportCenter } from "../lib/projects/platformPublishExport.ts";

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
    assert.ok(markdown.includes("风险提醒"));
  });
});
