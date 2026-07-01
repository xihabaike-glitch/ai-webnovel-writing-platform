import test from "node:test";
import assert from "node:assert/strict";
import { buildSubmissionPackage } from "../lib/projects/submissionPackage.ts";
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
});
