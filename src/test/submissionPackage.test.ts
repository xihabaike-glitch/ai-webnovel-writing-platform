import test from "node:test";
import assert from "node:assert/strict";
import { buildSubmissionPackage } from "../lib/projects/submissionPackage.ts";
import { buildSubmissionAssetSavePayload } from "../lib/projects/submissionAssetSavePayload.ts";
import { getPlatformProfile } from "../lib/platforms/platformProfiles.ts";

const chapters = [
  {
    order: 1,
    title: "雨夜系统",
    content: "林晚推开门，系统提示音在雨夜响起。",
    goal: "让主角遭遇不可逆事件。",
    hook: "系统倒计时只剩十秒。",
    conflict: "主角必须在逃跑和救人之间选择。",
    cliffhanger: "系统给出第二个选择。",
    wordCount: 3000,
  },
  {
    order: 2,
    title: "第二个选择",
    content: "",
    goal: "验证系统规则。",
    hook: "奖励变成陷阱。",
    conflict: "主角的解法制造新麻烦。",
    cliffhanger: "反派看到提示。",
    wordCount: 3000,
  },
];

test("buildSubmissionPackage", async (t) => {
  await t.test("builds Chinese submission materials with tags and first chapter summaries", () => {
    const pack = buildSubmissionPackage({
      title: "夜雨系统",
      genre: "都市系统",
      sellingPoint: "雨夜危机中觉醒系统，主角用一次次选择翻盘。",
      currentWordCount: 6000,
      targetWordCount: 300000,
      platform: getPlatformProfile("fanqie"),
      chapters,
    });

    assert.equal(pack.platformName, "番茄小说");
    assert.equal(pack.platformId, "fanqie");
    assert.ok(pack.synopsis.includes("夜雨系统"));
    assert.ok(pack.tags.includes("都市系统"));
    assert.ok(pack.firstThreeSummaries[0].summary.includes("系统倒计时"));
    assert.ok(pack.markdown.includes("## 中文简介"));
  });

  await t.test("builds overseas synopsis for overseas platforms", () => {
    const pack = buildSubmissionPackage({
      title: "Night Rain System",
      genre: "Urban Fantasy",
      sellingPoint: "a system awakening in a rain-soaked crisis",
      currentWordCount: 6000,
      targetWordCount: 300000,
      platform: getPlatformProfile("webnovel"),
      chapters,
    });

    assert.equal(pack.platformName, "WebNovel");
    assert.ok(pack.overseasSynopsis.includes("Night Rain System"));
    assert.ok(pack.overseasSynopsis.includes("WebNovel"));
    assert.ok(pack.markdown.includes("## Overseas Synopsis"));
  });

  await t.test("builds a publish asset adoption payload from optimized submission materials", () => {
    const payload = buildSubmissionAssetSavePayload({
      platformId: "fanqie",
      source: {
        title: "夜雨系统",
        logline: "雨夜系统倒计时，主角在救人与逃跑之间连续翻盘。",
        synopsis: "林晚在雨夜觉醒系统，每次选择都会让局面升级。",
        overseasSynopsis: "Lin Wan awakens a system in the rain.",
        tags: ["都市系统", "爽文", "悬疑"],
      },
      note: "由投稿资料面板采纳 AI 优化版。",
      sourceTaskId: "task-1",
      strategy: "投稿资料优化版",
      adopt: true,
    });

    assert.equal(payload.action, "save-asset");
    assert.equal(payload.platformId, "fanqie");
    assert.equal(payload.saveAction, "adopt");
    assert.equal(payload.sourceTaskId, "task-1");
    assert.equal(payload.strategy, "投稿资料优化版");
    assert.equal(payload.tags, "都市系统、爽文、悬疑");
  });
});
