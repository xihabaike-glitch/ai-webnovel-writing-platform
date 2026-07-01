import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSubmissionOptimizationPrompt,
  submissionOptimizationResultSchema,
  type SubmissionOptimizationResult,
} from "../lib/ai/buildSubmissionOptimizationPrompt.ts";
import {
  buildPlatformSubmissionAssetOptimizationPrompt,
  platformSubmissionAssetOptimizationResultSchema,
} from "../lib/ai/buildPlatformSubmissionAssetOptimizationPrompt.ts";
import { MockAdapter } from "../lib/model-gateway/mockAdapter.ts";
import { getPlatformProfile } from "../lib/platforms/platformProfiles.ts";
import { buildSubmissionAssetAudit } from "../lib/projects/platformPublishExport.ts";
import { buildSubmissionPackage } from "../lib/projects/submissionPackage.ts";

const submissionPackage = buildSubmissionPackage({
  title: "夜雨系统",
  genre: "都市系统",
  sellingPoint: "雨夜危机中觉醒系统，主角用一次次选择翻盘。",
  currentWordCount: 6000,
  targetWordCount: 300000,
  platform: getPlatformProfile("fanqie"),
  chapters: [
    {
      order: 1,
      title: "雨夜系统",
      content: "",
      goal: "让主角遭遇不可逆事件。",
      hook: "系统倒计时只剩十秒。",
      conflict: "主角必须在逃跑和救人之间选择。",
      cliffhanger: "系统给出第二个选择。",
      wordCount: 3000,
    },
  ],
});

test("buildSubmissionOptimizationPrompt", async (t) => {
  await t.test("includes platform packaging context", () => {
    const prompt = buildSubmissionOptimizationPrompt({
      platform: getPlatformProfile("fanqie"),
      submissionPackage,
    });

    assert.ok(prompt.systemPrompt.includes("投稿包装编辑"));
    assert.ok(prompt.userPrompt.includes("番茄小说"));
    assert.ok(prompt.userPrompt.includes("原一句话卖点"));
  });

  await t.test("mock adapter returns parseable optimization JSON", async () => {
    const prompt = buildSubmissionOptimizationPrompt({
      platform: getPlatformProfile("fanqie"),
      submissionPackage,
    });
    const result = await new MockAdapter().generate({
      providerId: "mock",
      model: "mock-writer",
      systemPrompt: prompt.systemPrompt,
      userPrompt: prompt.userPrompt,
    });
    const parsed = JSON.parse(result.text) as SubmissionOptimizationResult;

    assert.doesNotThrow(() => submissionOptimizationResultSchema.parse(parsed));
    assert.ok(parsed.logline.includes("高压选择"));
    assert.ok(parsed.tags.length >= 5);
    assert.ok(parsed.rationale.length > 0);
  });
});

test("buildPlatformSubmissionAssetOptimizationPrompt", async (t) => {
  const platform = getPlatformProfile("fanqie");
  const asset = {
    title: "夜雨系统",
    logline: "系统",
    synopsis: "林晚醒来。",
    overseasSynopsis: "Lin Wan wakes up.",
    tags: ["系统"],
    note: "先救投稿资产。",
  };
  const audit = buildSubmissionAssetAudit(platform, asset);

  await t.test("includes audit issues and current asset fields", () => {
    const prompt = buildPlatformSubmissionAssetOptimizationPrompt({
      platform,
      asset,
      audit,
      chapters: [
        {
          order: 1,
          title: "雨夜系统",
          goal: "让主角遭遇系统。",
          hook: "倒计时只剩十秒。",
          conflict: "救人与逃跑二选一。",
          cliffhanger: "系统给出第二个选择。",
        },
      ],
    });

    assert.ok(prompt.systemPrompt.includes("平台投稿资产优化师"));
    assert.ok(prompt.userPrompt.includes("当前质检问题"));
    assert.ok(prompt.userPrompt.includes("当前一句话卖点：系统"));
  });

  await t.test("mock adapter returns parseable platform asset variants", async () => {
    const prompt = buildPlatformSubmissionAssetOptimizationPrompt({
      platform,
      asset,
      audit,
      chapters: [],
    });
    const result = await new MockAdapter().generate({
      providerId: "mock",
      model: "mock-writer",
      systemPrompt: prompt.systemPrompt,
      userPrompt: prompt.userPrompt,
    });
    const parsed = platformSubmissionAssetOptimizationResultSchema.parse(JSON.parse(result.text));

    assert.equal(parsed.variants.length, 3);
    assert.ok(parsed.variants[0].title.includes("夜雨系统"));
    assert.ok(parsed.variants.every((variant) => variant.tags.length >= 3));
  });
});
