import test from "node:test";
import assert from "node:assert/strict";
import { getPlatformProfile, platformProfiles } from "../lib/platforms/platformProfiles.ts";
import {
  buildPlatformPublishExportCenter,
  buildPlatformPublishArchive,
  buildPlatformPublishEffectSaveReview,
  buildPlatformStrategyExecutionReceipt,
  buildPlatformStrategySwitchPlan,
  buildPublishPackageRestorePatch,
  buildPublishPackageVersionComparison,
  buildSubmissionAssetAdoptionReviewReceipt,
  buildSubmissionAssetIssueResolutions,
  buildSubmissionAssetEditorReview,
  buildSubmissionAssetAudit,
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

const assetOptimizationOutput = JSON.stringify({
  variants: [
    {
      strategy: "强钩子爽点版",
      title: "夜雨系统：倒计时重生",
      logline: "系统每晚倒计时，女主用选择把绝境打成爽点。",
      synopsis: "林晚在雨夜绑定倒计时系统，每一次选择都牵动生死与复仇。她必须把系统惩罚反手变成翻盘筹码，沿着隐藏任务追查真相，并把背叛者拖回雨夜审判。",
      overseasSynopsis: "Night Rain System follows Lin Wan through deadly timed choices.",
      tags: ["系统", "重生", "强爽点"],
      rationale: ["标题保留倒计时危机", "卖点直接突出连续翻盘"],
    },
    {
      strategy: "主线悬疑版",
      title: "雨夜倒计时",
      logline: "每次倒计时都逼她救人，也逼出当年背叛真相。",
      synopsis: "林晚在雨夜接到系统倒计时，被迫在救人和自保间选择。每次任务都把她推近当年的背叛真相，也让新的敌人浮出水面。",
      overseasSynopsis: "A countdown system forces Lin Wan to uncover betrayal in the rain.",
      tags: ["系统", "悬疑", "复仇"],
      rationale: ["强化主线谜团", "适合观察收藏动机"],
    },
    {
      strategy: "情绪复仇版",
      title: "倒计时复仇夜",
      logline: "她被系统逼回雨夜，把背叛者一个个拖进审判。",
      synopsis: "林晚死后重回雨夜，倒计时系统让她连续面对救人与复仇选择。她把每次惩罚改成奖励，反手清算背叛她的人。",
      overseasSynopsis: "Lin Wan returns to a rainy night and turns system punishments into revenge.",
      tags: ["重生", "复仇", "爽文"],
      rationale: ["复仇情绪更强", "标题更短更适合点击"],
    },
  ],
});

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
    assert.equal(center.deliveryScope.statusLabel, "8/8 核心平台已完成");
    assert.equal(center.deliveryScope.expansionLabel, "剩余 10 个平台不再添加");
    assert.equal(center.deliveryScope.pausedExpansionCount, 10);
    assert.ok(center.deliveryScope.scopeDecision.includes("扩展平台不再作为待补缺口"));
    assert.equal(center.recommendedPlatformId, "fanqie");
    assert.equal(center.totalPublishableChapters, 1);
    assert.ok(center.packages.some((pack) => pack.platformId === "qidian"));
    assert.ok(center.packages.some((pack) => pack.platformId === "wattpad"));
    assert.ok(center.packages[0].repairActions.some((action) => action.kind === "run_chapter_review"));
    assert.equal(center.packages[0].repairPath.status, "needs_repair");
    assert.equal(center.packages[0].repairPath.nextStep?.kind, "run_chapter_review");
    assert.equal(center.packages[0].repairPath.steps[0]?.kind, "run_chapter_review");
    assert.equal(center.packages[0].repairPath.steps[0]?.status, "active");
    assert.equal(center.packages[0].repairPath.executableActions, 1);
    assert.equal(center.packages[0].repairPath.manualActions, 0);
    assert.equal(center.workspace.readyPlatforms, 0);
    assert.equal(center.workspace.blockedPlatforms, platformProfiles.length);
    assert.ok(center.workspace.nextActions.some((action) => action.kind === "run_chapter_review"));
    assert.equal(center.platformStrategy.length, platformProfiles.length);
    assert.equal(center.platformStrategy[0].rank, 1);
    assert.equal(center.strategyVerdict.status, "needs_evidence");
    assert.equal(center.strategyVerdict.primary?.platformId, center.platformStrategy[0].platformId);
    assert.ok(center.strategyVerdict.nextAction.includes("缺") || center.strategyVerdict.nextAction.includes("录入"));
    assert.ok(center.strategyVerdict.rationale.some((line) => line.includes("主平台")));
    assert.equal(center.activeStrategyPlan?.platformId, "fanqie");
    assert.equal(center.activeStrategyPlan?.progress.status, "in_progress");
    assert.equal(center.activeStrategyPlan?.steps[0].status, "done");
    assert.equal(center.platformStrategy.find((item) => item.platformId === "fanqie")?.reviewDecision.kind, "collect");
    assert.ok(center.platformStrategy.find((item) => item.platformId === "fanqie")?.reviewDecision.tasks.some((task) => task.id === "record-first-publish-effect"));
    assert.equal(
      center.platformStrategy.find((item) => item.platformId === "fanqie")?.reviewDecision.tasks.find((task) => task.id === "archive-current-submission")?.execution,
      "save_snapshot",
    );
    assert.equal(center.executionHandoffs.length, platformProfiles.length);
    assert.equal(center.executionHandoffs[0].pipelineStages.join("、"), "写作、投稿、复盘");
    assert.equal(center.executionHandoffs[0].preflightScore, center.packages[0].preflight.score);
    assert.equal(center.executionHandoffs[0].canExport, center.packages[0].canExport);
    assert.ok(center.executionHandoffs[0].currentAction.includes("先修"));
    assert.equal(center.executionHandoffs[0].actionLabel, center.packages[0].repairPath.nextStep?.label);
    assert.equal(center.executionHandoffs[0].actionKind, center.packages[0].repairPath.nextStep?.kind);
    assert.equal(center.executionHandoffs[0].actionHref.includes("#"), true);
    assert.equal(center.executionHandoffSummary.readyCount, 0);
    assert.equal(center.executionHandoffSummary.blockedCount, platformProfiles.length);
    assert.equal(center.executionHandoffSummary.primaryAction?.actionLabel, center.executionHandoffs[0].actionLabel);
    assert.ok(center.executionHandoffSummary.primaryActionCount >= 1);
    assert.ok(center.executionHandoffSummary.primaryActionPlatformNames.includes(center.executionHandoffSummary.primaryAction?.platformName ?? ""));
    assert.ok(center.executionHandoffSummary.headline.includes("优先处理"));
    assert.ok(center.executionHandoffSummary.headline.includes("影响"));
    assert.ok(center.executionHandoffSummary.nextAction.includes(center.executionHandoffSummary.primaryAction?.platformName ?? ""));
    assert.ok(center.executionHandoffs.find((item) => item.platformId === "fanqie")?.submissionFocus.some((item) => item.includes("首秀")));
    assert.ok(center.executionHandoffs.find((item) => item.platformId === "qidian")?.writingFocus.some((item) => item.includes("卷结构")));
    const fanqiePack = center.packages.find((pack) => pack.platformId === "fanqie");
    assert.equal(fanqiePack?.publishEffect.status, "empty");
    assert.ok(fanqiePack?.publishEffect.nextAction.includes("录入"));
    assert.equal(fanqiePack?.effectCapturePlan.status, "needs_record");
    assert.ok(fanqiePack?.effectCapturePlan.primaryMetrics.some((item) => item.includes("首秀曝光")));
    assert.ok(fanqiePack?.effectCapturePlan.requiredFields.some((item) => item.label === "曝光"));
    assert.ok(fanqiePack?.effectCapturePlan.missingFields.some((item) => item.label === "曝光"));
    assert.ok(fanqiePack?.effectCapturePlan.nextAction.includes("先回填"));
    assert.equal(center.effectCaptureSummary.status, "needs_record");
    assert.equal(center.effectCaptureSummary.readyToReviewCount, 0);
    assert.equal(center.effectCaptureSummary.needsRecordCount, platformProfiles.length);
    assert.equal(center.effectCaptureSummary.platformNamesNeedingInput.length, platformProfiles.length);
    assert.equal(center.effectCaptureSummary.primaryPlatformId, center.packages[0].platformId);
    assert.equal(center.effectCaptureSummary.actionHref, "#publish-effect-panel");
    assert.ok(center.effectCaptureSummary.actionLabel.includes(center.packages[0].platformName));
    assert.equal(center.effectCaptureSummary.tasks.length, platformProfiles.length);
    assert.equal(center.effectCaptureSummary.tasks[0].platformId, center.effectCaptureSummary.primaryPlatformId);
    assert.equal(center.effectCaptureSummary.tasks[0].actionHref, "#publish-effect-panel");
    assert.ok(center.effectCaptureSummary.tasks[0].missingFields.includes("曝光"));
    assert.ok(center.effectCaptureSummary.headline.includes("真实效果"));
    assert.ok(center.effectCaptureSummary.nextAction.includes("先回填"));
    assert.equal(center.packages[0].dispatchEffectValidation.status, "needs_effect");
    assert.ok(center.packages[0].dispatchEffectValidation.verdict.includes("不能证明平台增长有效"));
    assert.ok(center.packages[0].dispatchEffectValidation.nextAction.includes("曝光、点击、收藏、追读"));
    assert.equal(center.packages[0].effectOptimization.status, "collect_data");
    assert.ok(center.packages[0].effectOptimization.actions.some((action) => action.area === "data"));
    assert.ok(center.packages[0].effectOptimization.actions.some((action) => action.execution === "open_target" && action.href === "#publish-effect-panel"));
    assert.equal(center.packages[0].finalGate.status, "do_not_submit");
    assert.ok(center.packages[0].finalGate.blockers.some((item) => item.includes("前三章")));
    assert.ok(center.packages[0].finalGate.items.some((item) => item.id === "review-records" && item.status === "block"));
    assert.equal(center.platformReadinessSummary.totalPlatforms, platformProfiles.length);
    assert.equal(center.platformReadinessSummary.needsSubmissionRepairCount, platformProfiles.length);
    assert.equal(center.platformReadinessSummary.readyToSubmitCount, 0);
    assert.equal(center.platformReadinessSummary.needsEffectRecordCount, 0);
    assert.equal(center.platformReadinessSummary.notGeneratedCount, 0);
    assert.ok(center.platformReadinessSummary.headline.includes("投稿材料没过线"));
    assert.equal(center.platformLaunchQueue.status, "blocked");
    assert.equal(center.platformLaunchQueue.items.length, platformProfiles.length);
    assert.equal(center.platformLaunchQueue.items[0].platformId, center.platformReadinessSummary.primaryAction?.platformId);
    assert.equal(center.platformLaunchQueue.items[0].actionKind, "repair_submission");
    assert.ok(center.platformLaunchQueue.items[0].whyNow.includes("终检"));
    assert.ok(center.platformLaunchQueue.items[0].acceptance.includes("终检"));
    assert.ok(center.platformLaunchQueue.nextAction.includes(center.platformLaunchQueue.items[0].platformName));
    assert.equal(center.packages[0].preview.status, "blocked");
    assert.ok(center.packages[0].preview.headline.includes("还不能交付"));
    assert.ok(center.packages[0].preview.chapterLine.includes("1 章"));
    assert.ok(center.packages[0].preview.riskLine.includes("阻塞"));
    assert.ok(center.packages[0].preview.nextAction.includes("补"));
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
      aiTasks: [
        ...passedReviews,
        {
          id: "asset-optimize-1",
          chapterId: null,
          taskType: "platform_submission_asset_optimize",
          status: "succeeded",
          inputSnapshot: JSON.stringify({ platformId: "fanqie" }),
          outputText: assetOptimizationOutput,
          createdAt: "2026-01-07T07:00:00.000Z",
        },
      ],
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
    assert.equal(pack.finalGate.status, "ready_to_submit");
    assert.equal(pack.finalGate.label, "可投");
    assert.ok(pack.finalGate.items.every((item) => item.status === "pass"));
    assert.ok(pack.finalGate.verdict.includes("标题、简介、前三章"));
    assert.ok(pack.markdown.includes("导出状态：允许导出"));
    assert.ok(pack.markdown.includes("最终裁决：可投"));
    assert.equal(center.executionHandoffs[0].actionKind, "record_publish_effect");
    assert.equal(center.executionHandoffs[0].actionLabel, "记录发布效果");
    assert.equal(center.executionHandoffs[0].actionHref, "#publish-effect-panel");
    assert.equal(center.executionHandoffSummary.readyCount, 1);
    assert.equal(center.executionHandoffSummary.blockedCount, 0);
    assert.equal(center.executionHandoffSummary.primaryAction?.actionKind, "record_publish_effect");
    assert.equal(center.executionHandoffSummary.primaryActionCount, 1);
    assert.deepEqual(center.executionHandoffSummary.primaryActionPlatformNames, ["番茄小说"]);
    assert.ok(center.executionHandoffSummary.headline.includes("可以进入复盘"));
    assert.equal(center.effectCaptureSummary.status, "needs_record");
    assert.equal(center.effectCaptureSummary.needsRecordCount, 1);
    assert.equal(center.effectCaptureSummary.primaryPlatformId, "fanqie");
    assert.equal(center.effectCaptureSummary.actionHref, "#publish-effect-panel");
    assert.equal(center.effectCaptureSummary.tasks.length, 1);
    assert.equal(center.effectCaptureSummary.tasks[0].platformName, "番茄小说");
    assert.equal(center.platformReadinessSummary.totalPlatforms, 1);
    assert.equal(center.platformReadinessSummary.readyToSubmitCount, 0);
    assert.equal(center.platformReadinessSummary.needsPackageExportCount, 1);
    assert.equal(center.platformReadinessSummary.needsEffectRecordCount, 0);
    assert.equal(center.platformReadinessSummary.needsSubmissionRepairCount, 0);
    assert.equal(center.platformReadinessSummary.notGeneratedCount, 0);
    assert.equal(center.platformReadinessSummary.items[0]?.status, "needs_package_export");
    assert.equal(center.platformReadinessSummary.items[0]?.actionHref, "#platform-export");
    assert.ok(center.platformReadinessSummary.headline.includes("1 个平台发布包已过线"));
    assert.ok(center.platformReadinessSummary.nextAction.includes("保存发布基准"));
    assert.equal(pack.preview.status, "needs_baseline");
    assert.ok(pack.preview.headline.includes("缺发布基准"));
    assert.equal(pack.preview.actionHref, "#platform-export");
    assert.ok(pack.preview.chapterLine.includes("3 章"));
    assert.ok(pack.preview.chapterLine.includes("7800 字"));
    assert.ok(pack.preview.assetLine.includes("标签"));
    assert.ok(pack.preview.assetLine.includes("个"));
  });

  await t.test("blocks export when candidate adoption makes old reviews stale", () => {
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
          chapterId: "chapter-1",
          taskType: "chapter_adopt_candidate",
          status: "succeeded",
          outputText: JSON.stringify({ adopted: true }),
          createdAt: "2026-01-08T00:00:00.000Z",
        },
      ],
      submissionChecklist: readyChecklist,
      platforms: [getPlatformProfile("fanqie")],
    });
    const pack = center.packages[0];
    const staleChapter = pack.chapters.find((item) => item.id === "chapter-1");

    assert.equal(pack.canExport, false);
    assert.equal(staleChapter?.ready, false);
    assert.ok(staleChapter?.preflight.blocked.some((item) => item.includes("旧审稿")));
    assert.equal(staleChapter?.repairActions[0]?.kind, "run_chapter_review");
    assert.ok(pack.preflight.blocked.some((item) => item.includes("未通过发布前质检")));
    assert.equal(pack.finalGate.status, "fix_first");
    assert.ok(pack.markdown.includes("补章节审稿"));
  });

  await t.test("blocks export while a second-pass candidate is not adopted", () => {
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
      chapterRevisions: [
        {
          id: "revision-second-pass",
          chapterId: "chapter-1",
          source: "chapter_second_pass_candidate",
          sourceTaskId: "second-pass-task",
          title: "第1夜",
          content: "二改候选稿正文，钩子更强，但还没有进入当前正文。",
          wordCount: 2800,
          notes: "二改候选稿。",
          createdAt: "2026-01-08T00:00:00.000Z",
        },
      ],
      submissionChecklist: readyChecklist,
      platforms: [getPlatformProfile("fanqie")],
    });
    const pack = center.packages[0];

    assert.equal(pack.canExport, false);
    assert.ok(pack.chapters[0].preflight.blocked.some((item) => item.includes("未采纳的二改候选稿")));
    assert.ok(pack.repairActions.some((action) => (
      action.kind === "adopt_candidate"
      && action.chapterId === "chapter-1"
      && action.candidateRevisionId === "revision-second-pass"
    )));
    assert.equal(pack.repairPath.nextStep?.kind, "adopt_candidate");
    assert.equal(pack.repairPath.nextStep?.candidateRevisionId, "revision-second-pass");
    assert.equal(pack.repairPath.steps[0]?.kind, "adopt_candidate");
    assert.equal(pack.repairPath.steps[0]?.status, "active");
    assert.equal(pack.repairPath.executableActions, 1);
    assert.equal(pack.repairPath.manualActions, 0);
  });

  await t.test("does not block an adopted second-pass candidate", () => {
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
          taskType: "chapter_adopt_candidate",
          status: "succeeded",
          outputText: JSON.stringify({ adopted: true }),
          inputSnapshot: JSON.stringify({ revisionId: "revision-second-pass" }),
          createdAt: "2026-01-09T00:00:00.000Z",
        },
        {
          chapterId: "chapter-1",
          taskType: "chapter_review",
          status: "succeeded",
          outputText: JSON.stringify({ score: 92, shouldSecondPass: false }),
          createdAt: "2026-01-10T00:00:00.000Z",
        },
      ],
      chapterRevisions: [
        {
          id: "revision-second-pass",
          chapterId: "chapter-1",
          source: "chapter_second_pass_candidate",
          sourceTaskId: "second-pass-task",
          title: "第1夜",
          content: "二改候选稿正文，已经被采纳过。",
          wordCount: 2800,
          notes: "二改候选稿。",
          createdAt: "2026-01-08T00:00:00.000Z",
        },
      ],
      submissionChecklist: readyChecklist,
      platforms: [getPlatformProfile("fanqie")],
    });
    const pack = center.packages[0];

    assert.equal(pack.canExport, true);
    assert.equal(pack.repairActions.some((action) => action.kind === "adopt_candidate"), false);
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
      aiTasks: [
        ...passedReviews,
        {
          id: "asset-optimize-1",
          chapterId: null,
          taskType: "platform_submission_asset_optimize",
          status: "succeeded",
          inputSnapshot: JSON.stringify({ platformId: "fanqie" }),
          outputText: assetOptimizationOutput,
          createdAt: "2026-01-07T07:00:00.000Z",
        },
      ],
      submissionChecklist: readyChecklist,
      platforms: [getPlatformProfile("fanqie")],
      submissionAssets: [
        {
          id: "asset-fanqie",
          platformId: "fanqie",
          platformName: "番茄小说",
          title: "夜雨系统：倒计时重生",
          logline: "系统每晚倒计时，女主用选择把绝境打成爽点。",
          synopsis: "林晚在雨夜绑定倒计时系统，每一次选择都牵动生死与复仇。她必须在救人与自保之间连续做出决定，把系统惩罚反手变成翻盘筹码，沿着隐藏任务追查当年真相，同时把背叛她的人一步步拖回雨夜审判，并逼出幕后黑手的新任务。",
          overseasSynopsis: "Night Rain System follows Lin Wan through deadly timed choices.",
          tags: ["系统", "重生", "强爽点"],
          note: "首秀前强调前三章钩子。",
          source: "manual",
          updatedAt: "2026-01-06T08:00:00.000Z",
        },
      ],
      submissionAssetVersions: [
        {
          id: "asset-version-1",
          platformId: "fanqie",
          platformName: "番茄小说",
          title: "夜雨系统：倒计时重生",
          logline: "系统每晚倒计时，女主用选择把绝境打成爽点。",
          synopsis: "林晚在雨夜绑定倒计时系统，每一次选择都牵动生死与复仇。她必须在救人与自保之间连续做出决定，把系统惩罚反手变成翻盘筹码，沿着隐藏任务追查当年真相，同时把背叛她的人一步步拖回雨夜审判，并逼出幕后黑手的新任务。",
          overseasSynopsis: "Night Rain System follows Lin Wan through deadly timed choices.",
          tags: ["系统", "重生", "强爽点"],
          note: "首秀前强调前三章钩子。",
          source: "manual",
          auditScore: 100,
          auditStatus: "ready",
          action: "save",
          createdAt: "2026-01-07T08:00:00.000Z",
        },
        {
          id: "asset-version-adopted",
          platformId: "fanqie",
          platformName: "番茄小说",
          title: "夜雨系统：倒计时翻盘",
          logline: "系统每晚倒计时，女主用选择把危机打成连续翻盘爽点。",
          synopsis: "林晚在雨夜绑定倒计时系统，每一次选择都牵动生死与复仇。她必须把系统惩罚反手变成翻盘筹码，沿着隐藏任务追查真相，并把背叛者拖回雨夜审判。",
          overseasSynopsis: "Night Rain System follows Lin Wan through deadly timed choices.",
          tags: ["系统", "重生", "强爽点"],
          note: "采纳 AI 候选。",
          source: "ai_variant",
          auditScore: 96,
          auditStatus: "ready",
          action: "adopt",
          sourceTaskId: "asset-optimize-1",
          strategy: "强钩子爽点版",
          createdAt: "2026-01-08T08:00:00.000Z",
        },
      ],
      platformPublishMetrics: [
        {
          id: "metric-fanqie-1",
          platformId: "fanqie",
          platformName: "番茄小说",
          views: 1200,
          clicks: 180,
          favorites: 72,
          follows: 36,
          comments: 12,
          paidReads: 0,
          editorFeedback: "标题方向可以，前三章继续加压。",
          contractStatus: "pending",
          publishUrl: "https://fanqie.example/book/1",
          notes: "首轮测试数据。",
          snapshotDate: "2026-01-09T08:00:00.000Z",
        },
      ],
    });
    const pack = center.packages[0];

    assert.equal(pack.title, "夜雨系统：倒计时重生");
    assert.equal(pack.logline, "系统每晚倒计时，女主用选择把绝境打成爽点。");
    assert.ok(pack.synopsis.includes("把系统惩罚反手变成翻盘筹码"));
    assert.deepEqual(pack.tags, ["系统", "重生", "强爽点"]);
    assert.equal(pack.submissionAsset?.persisted, true);
    assert.equal(pack.submissionAssetAudit.status, "ready");
    assert.equal(pack.submissionAssetVersions.length, 2);
    assert.equal(pack.submissionAssetVersions[0].id, "asset-version-adopted");
    assert.equal(pack.submissionAssetAdoption.generatedVariants, 3);
    assert.equal(pack.submissionAssetAdoption.adoptedVersions, 1);
    assert.equal(pack.submissionAssetAdoption.adoptionRatePercent, 33);
    assert.deepEqual(pack.submissionAssetAdoption.recentStrategies, ["强钩子爽点版"]);
    assert.equal(pack.publishEffect.status, "promising");
    assert.equal(pack.publishEffect.totalViews, 1200);
    assert.equal(pack.publishEffect.clickRatePercent, 15);
    assert.equal(pack.publishEffect.favoriteRatePercent, 6);
    assert.equal(pack.publishEffect.followRatePercent, 3);
    assert.ok(pack.publishEffect.verdict.includes("有可追的苗头"));
    assert.equal(pack.effectCapturePlan.status, "ready_to_review");
    assert.deepEqual(pack.effectCapturePlan.missingFields, []);
    assert.ok(pack.effectCapturePlan.primaryMetrics.includes("读完率"));
    assert.ok(pack.effectCapturePlan.nextAction.includes("可以复盘"));
    assert.equal(center.effectCaptureSummary.status, "ready_to_review");
    assert.equal(center.effectCaptureSummary.readyToReviewCount, 1);
    assert.equal(center.effectCaptureSummary.needsRecordCount, 0);
    assert.equal(center.effectCaptureSummary.missingFieldPlatformCount, 0);
    assert.equal(center.effectCaptureSummary.actionHref, "#platform-strategy-ranking");
    assert.ok(center.effectCaptureSummary.actionLabel.includes("平台排序"));
    assert.deepEqual(center.effectCaptureSummary.tasks, []);
    assert.ok(center.effectCaptureSummary.nextAction.includes("进入平台排序"));
    assert.equal(pack.publishEffect.comparison.status, "none");
    assert.equal(pack.dispatchEffectValidation.status, "reusable_success");
    assert.equal(pack.dispatchEffectValidation.label, "可沉淀");
    assert.ok(pack.dispatchEffectValidation.nextAction.includes("写入经验库"));
    assert.equal(pack.effectOptimization.status, "scale");
    assert.ok(pack.effectOptimization.actions.some((action) => action.label.includes("放大")));
    assert.equal(pack.experimentPlan.status, "winner_found");
    assert.equal(pack.experimentPlan.candidates.length, 3);
    assert.ok(pack.experimentPlan.candidates.some((candidate) => candidate.recommended && candidate.title.includes("夜雨系统")));
    const saveReview = buildPlatformPublishEffectSaveReview(pack);
    assert.equal(saveReview.status, "scale");
    assert.equal(saveReview.effectStatus, "promising");
    assert.ok(saveReview.headline.includes("可以加码"));
    assert.ok(saveReview.recommendedAction?.label.includes("放大"));
    assert.ok(pack.publishNote.includes("首秀前强调前三章钩子。"));
    assert.ok(pack.markdown.includes("夜雨系统：倒计时重生"));
    assert.ok(pack.markdown.includes("投稿资产质检"));
    assert.ok(pack.markdown.includes("发布效果复盘"));
    assert.ok(pack.markdown.includes("验收后效果判定"));
    assert.ok(pack.markdown.includes("可沉淀"));
    assert.ok(pack.markdown.includes("执行前后对照"));
    assert.ok(pack.markdown.includes("二轮优化清单"));
    assert.ok(pack.markdown.includes("下一轮A/B实验"));
  });

  await t.test("compares publish metrics before and after an optimization round", () => {
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
          id: "asset-optimize-1",
          chapterId: null,
          taskType: "platform_submission_asset_optimize",
          status: "succeeded",
          inputSnapshot: JSON.stringify({ platformId: "fanqie" }),
          outputText: assetOptimizationOutput,
          createdAt: "2026-01-09T09:00:00.000Z",
        },
      ],
      submissionChecklist: readyChecklist,
      platforms: [getPlatformProfile("fanqie")],
      submissionAssetVersions: [
        {
          id: "asset-version-ab",
          platformId: "fanqie",
          platformName: "番茄小说",
          title: "夜雨系统：倒计时重生",
          logline: "系统每晚倒计时，女主用选择把绝境打成爽点。",
          synopsis: "林晚在雨夜绑定倒计时系统，每一次选择都牵动生死与复仇。她必须把系统惩罚反手变成翻盘筹码，沿着隐藏任务追查真相，并把背叛者拖回雨夜审判。",
          overseasSynopsis: "Night Rain System follows Lin Wan through deadly timed choices.",
          tags: ["系统", "重生", "强爽点"],
          note: "采纳 A/B 候选。",
          source: "ai_variant",
          auditScore: 100,
          auditStatus: "ready",
          action: "adopt",
          sourceTaskId: "asset-optimize-1",
          strategy: "强钩子爽点版",
          createdAt: "2026-01-09T10:00:00.000Z",
        },
      ],
      platformPublishMetrics: [
        {
          id: "metric-after",
          platformId: "fanqie",
          platformName: "番茄小说",
          views: 1200,
          clicks: 180,
          favorites: 72,
          follows: 36,
          comments: 12,
          paidReads: 0,
          editorFeedback: "二轮后点击和追读变好。",
          contractStatus: "pending",
          publishUrl: "",
          notes: "二轮后。",
          snapshotDate: "2026-01-10T08:00:00.000Z",
        },
        {
          id: "metric-before",
          platformId: "fanqie",
          platformName: "番茄小说",
          views: 1000,
          clicks: 80,
          favorites: 20,
          follows: 10,
          comments: 3,
          paidReads: 0,
          editorFeedback: "二轮前数据。",
          contractStatus: "pending",
          publishUrl: "",
          notes: "二轮前。",
          snapshotDate: "2026-01-09T08:00:00.000Z",
        },
      ],
    });
    const comparison = center.packages[0].publishEffect.comparison;

    assert.equal(comparison.status, "improved");
    assert.equal(comparison.viewsDelta, 200);
    assert.equal(comparison.clickRateDeltaPercent, 7);
    assert.equal(comparison.favoriteRateDeltaPercent, 4);
    assert.equal(comparison.followRateDeltaPercent, 2);
    assert.ok(comparison.wins.some((item) => item.includes("点击率")));
    assert.ok(comparison.verdict.includes("正反馈"));
    const attribution = center.packages[0].experimentPlan.attribution;
    const knowledge = center.platformKnowledge.find((item) => item.platformId === "fanqie");
    assert.equal(attribution.status, "positive");
    assert.equal(attribution.attributedStrategy, "强钩子爽点版");
    assert.ok(attribution.platformLearnings.some((learning) => learning.includes("番茄小说")));
    assert.equal(knowledge?.status, "learned");
    assert.equal(knowledge?.positiveCount, 1);
    assert.ok(knowledge?.winningSignals.some((signal) => signal.includes("夜雨系统")));
    assert.equal(knowledge?.applications.length, 3);
    assert.ok(knowledge?.applications.some((item) => item.area === "submission_asset" && item.status === "reuse"));
    assert.ok(knowledge?.applications.some((item) => item.area === "first_three" && item.impact.includes("钩子")));
    assert.ok(knowledge?.applications.some((item) => item.area === "strategy" && item.impact.includes("知识库分")));
    assert.equal(knowledge?.feedbackLoop.actionLabel, "执行正反馈链");
    assert.ok(knowledge?.feedbackLoop.headline.includes("正反馈经验"));
    assert.ok(knowledge?.feedbackLoop.nextStepLabel.length);
    assert.ok(center.platformStrategy[0].scores.knowledge >= 80);
    assert.ok(center.platformStrategy[0].reasons.some((reason) => reason.includes("知识库")));
    assert.ok(center.packages[0].markdown.includes("实验结果归因"));
  });

  await t.test("does not attribute comparison changes without an adopted experiment version", () => {
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
      platformPublishMetrics: [
        {
          id: "metric-after-no-version",
          platformId: "fanqie",
          platformName: "番茄小说",
          views: 1200,
          clicks: 180,
          favorites: 72,
          follows: 36,
          comments: 12,
          paidReads: 0,
          editorFeedback: "二轮后点击和追读变好。",
          contractStatus: "pending",
          publishUrl: "",
          notes: "二轮后。",
          snapshotDate: "2026-01-10T08:00:00.000Z",
        },
        {
          id: "metric-before-no-version",
          platformId: "fanqie",
          platformName: "番茄小说",
          views: 1000,
          clicks: 80,
          favorites: 20,
          follows: 10,
          comments: 3,
          paidReads: 0,
          editorFeedback: "二轮前数据。",
          contractStatus: "pending",
          publishUrl: "",
          notes: "二轮前。",
          snapshotDate: "2026-01-09T08:00:00.000Z",
        },
      ],
    });
    const attribution = center.packages[0].experimentPlan.attribution;
    const knowledge = center.platformKnowledge.find((item) => item.platformId === "fanqie");

    assert.equal(center.packages[0].publishEffect.comparison.status, "improved");
    assert.equal(attribution.status, "no_experiment");
    assert.equal(knowledge?.status, "insufficient");
    assert.ok(knowledge?.avoidSignals.some((signal) => signal.includes("缺采纳版本")));
    assert.ok(knowledge?.applications.every((item) => item.status === "collect"));
    assert.ok(knowledge?.applications.some((item) => item.impact.includes("补证据")));
    assert.equal(knowledge?.feedbackLoop.actionLabel, "启动补证据链");
    assert.ok(knowledge?.feedbackLoop.nextStepLabel.includes("保存") || knowledge?.feedbackLoop.nextStepLabel.includes("候选"));
    assert.ok(attribution.verdict.includes("不能证明"));
    assert.ok(attribution.nextAction.includes("采纳"));
  });

  await t.test("ranks platform strategy from readiness, assets, effects, and comparison", () => {
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
      platforms: [getPlatformProfile("fanqie"), getPlatformProfile("qimao")],
      platformPublishMetrics: [
        {
          id: "metric-qimao-after",
          platformId: "qimao",
          platformName: "七猫",
          views: 1200,
          clicks: 180,
          favorites: 72,
          follows: 36,
          comments: 12,
          paidReads: 0,
          editorFeedback: "二轮后变好。",
          contractStatus: "pending",
          publishUrl: "",
          notes: "二轮后。",
          snapshotDate: "2026-01-10T08:00:00.000Z",
        },
        {
          id: "metric-qimao-before",
          platformId: "qimao",
          platformName: "七猫",
          views: 1000,
          clicks: 80,
          favorites: 20,
          follows: 10,
          comments: 3,
          paidReads: 0,
          editorFeedback: "二轮前。",
          contractStatus: "pending",
          publishUrl: "",
          notes: "二轮前。",
          snapshotDate: "2026-01-09T08:00:00.000Z",
        },
      ],
    });
    const top = center.platformStrategy[0];

    assert.equal(top.platformId, "qimao");
    assert.equal(top.rank, 1);
    assert.ok(top.score > center.platformStrategy[1].score);
    assert.ok(["focus", "grow"].includes(top.recommendation));
    assert.equal(top.reviewDecision.kind, "scale");
    assert.equal(center.strategyVerdict.status, "ready");
    assert.equal(center.strategyVerdict.primary?.platformId, "qimao");
    assert.ok(center.strategyVerdict.headline.includes("主推"));
    assert.ok(center.strategyVerdict.backups.length <= 2);
    assert.ok(top.reviewDecision.tasks.some((task) => task.id === "archive-winning-version" && task.priority === "high"));
    assert.equal(top.reviewDecision.tasks.find((task) => task.id === "keep-main-platform")?.execution, "apply_strategy");
    assert.ok(top.reasons.some((reason) => reason.includes("二轮对照 improved")));
  });

  await t.test("builds second-round optimization actions from weak publish metrics", () => {
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
      platformPublishMetrics: [
        {
          id: "metric-fanqie-weak",
          platformId: "fanqie",
          platformName: "番茄小说",
          views: 1000,
          clicks: 30,
          favorites: 8,
          follows: 4,
          comments: 1,
          paidReads: 0,
          editorFeedback: "开头慢，卖点不够直。",
          contractStatus: "rejected",
          publishUrl: "",
          notes: "弱转化样本。",
          snapshotDate: "2026-01-10T08:00:00.000Z",
        },
      ],
    });
    const pack = center.packages[0];
    const strategy = center.platformStrategy[0];

    assert.equal(pack.publishEffect.status, "weak");
    assert.equal(pack.dispatchEffectValidation.status, "rework");
    assert.ok(pack.dispatchEffectValidation.verdict.includes("不能复用为成功结论"));
    assert.equal(strategy.reviewDecision.kind, "repair");
    assert.ok(strategy.reviewDecision.tasks.some((task) => task.id === "rewrite-opening-hook" && task.priority === "high"));
    assert.equal(strategy.reviewDecision.tasks.find((task) => task.id === "fix-submission-asset")?.execution, "generate_asset_variants");
    assert.equal(pack.effectOptimization.status, "urgent_rework");
    assert.ok(pack.effectOptimization.headline.includes("转化漏斗"));
    assert.ok(pack.effectOptimization.actions.some((action) => (
      action.area === "asset"
      && action.execution === "generate_asset_variants"
      && action.label.includes("重做标题")
    )));
    assert.ok(pack.effectOptimization.actions.some((action) => (
      action.area === "opening"
      && action.execution === "rewrite_first_three"
      && action.label.includes("收藏动机")
    )));
    assert.ok(pack.effectOptimization.actions.some((action) => action.evidence.includes("开头慢")));
    assert.equal(pack.experimentPlan.status, "needs_candidates");
    assert.ok(pack.experimentPlan.nextAction.includes("生成"));
    const saveReview = buildPlatformPublishEffectSaveReview(pack);
    assert.equal(saveReview.status, "urgent_rework");
    assert.equal(saveReview.effectStatus, "weak");
    assert.ok(saveReview.headline.includes("先返工"));
    assert.equal(saveReview.recommendedAction?.execution, "generate_asset_variants");
  });

  await t.test("reranks strategy review tasks from the weakest current bottleneck", () => {
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
          id: "asset-weak",
          platformId: "fanqie",
          platformName: "番茄小说",
          title: "夜",
          logline: "系统。",
          synopsis: "她醒了。",
          overseasSynopsis: "",
          tags: ["慢热"],
          note: "弱资产。",
          source: "manual",
          updatedAt: "2026-01-09T08:00:00.000Z",
        },
      ],
      platformPublishMetrics: [
        {
          id: "metric-fanqie-weak-asset",
          platformId: "fanqie",
          platformName: "番茄小说",
          views: 1000,
          clicks: 30,
          favorites: 8,
          follows: 4,
          comments: 1,
          paidReads: 0,
          editorFeedback: "开头慢，卖点不够直。",
          contractStatus: "rejected",
          publishUrl: "",
          notes: "弱转化样本。",
          snapshotDate: "2026-01-10T08:00:00.000Z",
        },
      ],
    });
    const firstTask = center.platformStrategy[0].reviewDecision.tasks[0];

    assert.equal(firstTask.id, "fix-submission-asset");
    assert.equal(firstTask.rankTarget, "asset");
    assert.ok(firstTask.rankReason.includes("投稿资产"));
    assert.equal(center.platformStrategy[0].reviewDecision.nextPlan.steps[0].taskId, firstTask.id);
    assert.equal(center.platformStrategy[0].reviewDecision.nextPlan.steps[0].dayLabel, "今天");
    assert.equal(center.platformStrategy[0].reviewDecision.nextPlan.steps[0].status, "next");
    assert.equal(center.platformStrategy[0].reviewDecision.nextPlan.steps[2].dayLabel, "第7天");
    assert.equal(center.platformStrategy[0].reviewDecision.nextPlan.steps[2].href, "#platform-strategy-ranking");
    assert.ok(center.platformStrategy[0].reviewDecision.nextPlan.checkpoint.includes("第 7 天"));
  });

  await t.test("advances review plan status from completed evidence", () => {
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
          id: "asset-ready",
          platformId: "fanqie",
          platformName: "番茄小说",
          title: "夜雨系统：倒计时重生",
          logline: "雨夜倒计时逼她选择，林晚把系统惩罚打成翻盘爽点。",
          synopsis: "林晚在雨夜绑定倒计时系统，每一次选择都牵动生死、复仇和悬疑真相。她从被迫救人开始，一步步摸清系统规则，把惩罚变成筹码，把背叛者拖回真相现场，并在连续任务中建立稳定目标：查清当年事故、保护真正重要的人、夺回属于自己的命运。",
          overseasSynopsis: "Night Rain System follows Lin Wan through timed choices.",
          tags: ["系统", "逆袭", "悬疑"],
          note: "资产已过审。",
          source: "manual",
          updatedAt: "2026-01-09T08:00:00.000Z",
        },
      ],
      publishSnapshots: [
        {
          id: "snapshot-ready",
          platformId: "fanqie",
          platformName: "番茄小说",
          title: "夜雨系统",
          action: "snapshot",
          chapterCount: 3,
          wordCount: 7800,
          preflightScore: 95,
          canExport: true,
          createdAt: "2026-01-09T09:00:00.000Z",
        },
      ],
      platformPublishMetrics: [
        {
          id: "metric-ready",
          platformId: "fanqie",
          platformName: "番茄小说",
          views: 1000,
          clicks: 180,
          favorites: 60,
          follows: 30,
          comments: 8,
          paidReads: 0,
          editorFeedback: "继续观察。",
          contractStatus: "pending",
          publishUrl: "",
          notes: "首轮数据。",
          snapshotDate: "2026-01-10T08:00:00.000Z",
        },
      ],
    });
    const plan = center.platformStrategy[0].reviewDecision.nextPlan;

    assert.equal(plan.completedSteps >= 1, true);
    assert.equal(plan.steps[0].status, "done");
    assert.equal(plan.currentStepId, plan.steps.find((step) => step.status === "next")?.id ?? null);
    assert.ok(plan.currentStepLabel);
  });

  await t.test("scores platform submission asset fields", () => {
    const weakFanqieAudit = buildSubmissionAssetAudit(getPlatformProfile("fanqie"), {
      title: "夜",
      logline: "系统",
      synopsis: "她醒了。",
      overseasSynopsis: "",
      tags: ["慢热"],
    });
    const strongQidianAudit = buildSubmissionAssetAudit(getPlatformProfile("qidian"), {
      title: "万界长夜体系",
      logline: "少年在万界规则崩塌后重建升级体系，沿着主线追查旧神伏笔。",
      synopsis: "少年在长夜世界醒来，发现每个境界都对应一段被抹去的历史。他必须重建升级体系，推进长期主线，收束隐藏伏笔，逐步揭开宗门、王朝和旧神之间的利益链，并在每个阶段 Boss 身上拿回失落规则，最终挑战操纵万界的旧神。",
      overseasSynopsis: "",
      tags: ["玄幻", "升级", "世界观"],
    });

    assert.equal(weakFanqieAudit.status, "blocked");
    assert.ok(weakFanqieAudit.issues.some((issue) => issue.field === "logline"));
    assert.equal(strongQidianAudit.status, "ready");
    assert.ok(strongQidianAudit.score >= 90);
  });

  await t.test("scores overseas platforms with platform-specific packaging signals", () => {
    const weakWebNovelAudit = buildSubmissionAssetAudit(getPlatformProfile("webnovel"), {
      title: "Rain Choice",
      logline: "A betrayed trainee must survive a rain-soaked academy conspiracy while enemies close in from every side.",
      synopsis: "A betrayed trainee enters a dangerous academy and faces enemies, secrets, and a growing conspiracy around his missing family.",
      overseasSynopsis: "A betrayed trainee enters a dangerous academy and faces enemies, secrets, and a growing conspiracy around his missing family. Every chapter pushes him into a harder choice while old allies become threats and the truth behind the rain slowly becomes impossible to ignore.",
      tags: ["academy", "mystery", "revenge"],
    });
    const weakRoyalRoadAudit = buildSubmissionAssetAudit(getPlatformProfile("royal_road"), {
      title: "Dungeon Rain",
      logline: "A clever survivor enters a deadly dungeon and fights monsters while trying to return home alive.",
      synopsis: "A clever survivor enters a dungeon where every room tests courage, trust, and the will to keep moving forward.",
      overseasSynopsis: "A clever survivor enters a dungeon where every room tests courage, trust, and the will to keep moving forward. The story follows dangerous battles, uncertain alliances, and the slow discovery that the dungeon is connected to a world-changing secret.",
      tags: ["dungeon", "fantasy", "survival"],
    });
    const weakWattpadAudit = buildSubmissionAssetAudit(getPlatformProfile("wattpad"), {
      title: "Midnight Contract",
      logline: "A young woman signs a risky midnight contract to save her family from ruin and public shame.",
      synopsis: "A young woman signs a contract that changes her public image and forces her into a house full of secrets.",
      overseasSynopsis: "A young woman signs a contract that changes her public image and forces her into a house full of secrets. She must protect her family, navigate public pressure, and decide how much of herself she is willing to sacrifice for a polished life.",
      tags: ["family", "drama", "secrets"],
    });

    assert.equal(weakWebNovelAudit.status, "needs_work");
    assert.ok(weakWebNovelAudit.issues.some((issue) => issue.label.includes("WebNovel")));
    assert.equal(weakRoyalRoadAudit.status, "needs_work");
    assert.ok(weakRoyalRoadAudit.issues.some((issue) => issue.label.includes("Royal Road")));
    assert.equal(weakWattpadAudit.status, "needs_work");
    assert.ok(weakWattpadAudit.issues.some((issue) => issue.label.includes("Wattpad")));
  });

  await t.test("scores domestic core platforms with platform-specific publishing checks", () => {
    const weakFanqieAudit = buildSubmissionAssetAudit(getPlatformProfile("fanqie"), {
      title: "雨夜系统",
      logline: "主角在危机中觉醒系统，靠选择逆袭翻盘，连续面对追杀、背叛和新任务。",
      synopsis: "主角在雨夜危机中觉醒系统，被迫在救人和自保之间做出选择。故事会持续推进系统任务、背叛真相和一次次翻盘，主角不断用新能力解决眼前危机，并追查系统背后的隐藏操盘者。后续会围绕任务代价、反派压迫和关系背叛不断加码，让读者持续看到危机、选择和逆袭结果。",
      overseasSynopsis: "",
      tags: ["系统", "逆袭", "爽文"],
    });
    const weakQidianAudit = buildSubmissionAssetAudit(getPlatformProfile("qidian"), {
      title: "万界长夜",
      logline: "少年在世界规则崩塌后重建升级体系，沿着主线追查旧神伏笔和境界真相。",
      synopsis: "少年在长夜世界醒来，发现每个境界都对应一段被抹去的历史。他必须重建升级体系，推进长期主线，收束隐藏伏笔，并在每个阶段敌人身上拿回失落规则，最终挑战操纵万界的旧神。故事会持续围绕修行体系、旧神真相和主角成长推进，让读者看到长篇目标和升级期待。",
      overseasSynopsis: "",
      tags: ["玄幻", "升级", "世界观"],
    });
    const weakQimaoAudit = buildSubmissionAssetAudit(getPlatformProfile("qimao"), {
      title: "春风有信",
      logline: "女主回到小镇靠手艺翻身，面对债务、旧爱和家庭误会，慢慢找回生活主动权。",
      synopsis: "女主回到小镇后重新经营点心摊，面对债务、流言、旧爱误会和家庭压力。她靠手艺打开局面，查清旧账本背后的真相，也逐步修复自己和家人、旧恋人之间的关系。后续会继续推进生意成长、亲情修复和旧案证据，让读者看到生活目标、关系变化和情绪回报。",
      overseasSynopsis: "",
      tags: ["言情", "种田", "年代"],
    });

    assert.equal(weakFanqieAudit.status, "needs_work");
    assert.ok(weakFanqieAudit.issues.some((issue) => issue.label.includes("番茄开头钩子")));
    assert.equal(weakQidianAudit.status, "needs_work");
    assert.ok(weakQidianAudit.issues.some((issue) => issue.label.includes("起点长线结构")));
    assert.equal(weakQimaoAudit.status, "needs_work");
    assert.ok(weakQimaoAudit.issues.some((issue) => issue.label.includes("七猫稳定更新")));
  });

  await t.test("scores female and short platforms with arc and paywall checks", () => {
    const weakJinjiangAudit = buildSubmissionAssetAudit(getPlatformProfile("jjwxc"), {
      title: "旧雨来信",
      logline: "女主和旧友重逢，在现言悬疑里重新面对关系裂痕与情感误会。",
      synopsis: "女主收到一封旧友来信后回到故乡，与多年未见的搭档重新调查当年的误会。故事会围绕关系压力、情感拉扯和旧案线索推进，让两个人在现言悬疑氛围中面对过去，也让读者看到他们从回避到合作的变化。后续会继续处理家庭压力、旧友秘密和彼此试探，让情绪线持续推进。",
      overseasSynopsis: "",
      tags: ["现言", "悬疑言情", "情感"],
    });
    const weakZhihuAudit = buildSubmissionAssetAudit(getPlatformProfile("zhihu_yanxuan"), {
      title: "她替我活着",
      logline: "我参加自己的葬礼，发现最亲近的人都藏着反转真相。",
      synopsis: "我站在自己的遗像前，看见另一个女人用我的名字接受所有人的悼念。为了查清真相，我开始跟踪她、接近未婚夫，也发现母亲和好友都在撒谎。故事会持续推进悬疑、复仇和身份反转，让读者不断怀疑谁才是真正的受害者。",
      overseasSynopsis: "",
      tags: ["悬疑", "复仇", "第一人称反转"],
    });

    assert.equal(weakJinjiangAudit.status, "needs_work");
    assert.ok(weakJinjiangAudit.issues.some((issue) => issue.label.includes("晋江人物弧光")));
    assert.equal(weakZhihuAudit.status, "needs_work");
    assert.ok(weakZhihuAudit.issues.some((issue) => issue.label.includes("盐选付费节点")));
  });

  await t.test("summarizes submission asset audit as editor review guidance", () => {
    const weakZhihuAudit = buildSubmissionAssetAudit(getPlatformProfile("zhihu_yanxuan"), {
      title: "她替我活着",
      logline: "我参加自己的葬礼，发现最亲近的人都藏着反转真相。",
      synopsis: "我站在自己的遗像前，看见另一个女人用我的名字接受所有人的悼念。为了查清真相，我开始跟踪她、接近未婚夫，也发现母亲和好友都在撒谎。故事会持续推进悬疑、复仇和身份反转，让读者不断怀疑谁才是真正的受害者。",
      overseasSynopsis: "",
      tags: ["悬疑", "复仇", "第一人称反转"],
    });

    const review = buildSubmissionAssetEditorReview("知乎盐选", weakZhihuAudit);

    assert.equal(review.tone, "warning");
    assert.equal(review.headline, "知乎盐选入口变量还需要编辑返工。");
    assert.equal(review.primaryAction, "先修：盐选付费节点不够明确");
    assert.ok(review.focusIssues.some((issue) => issue.label === "盐选付费节点不够明确"));
    assert.ok(review.evidence.some((item) => item.includes("知乎盐选反转/付费期待明确")));
  });

  await t.test("marks which editor review issues an optimized variant resolves", () => {
    const platform = getPlatformProfile("zhihu_yanxuan");
    const sourceAudit = buildSubmissionAssetAudit(platform, {
      title: "她替我活着",
      logline: "我参加自己的葬礼，发现最亲近的人都藏着反转真相。",
      synopsis: "我站在自己的遗像前，看见另一个女人用我的名字接受所有人的悼念。为了查清真相，我开始跟踪她、接近未婚夫，也发现母亲和好友都在撒谎。故事会持续推进悬疑、复仇和身份反转，让读者不断怀疑谁才是真正的受害者。",
      overseasSynopsis: "",
      tags: ["悬疑", "复仇", "第一人称反转"],
    });
    const variantAudit = buildSubmissionAssetAudit(platform, {
      title: "她替我活着",
      logline: "我参加自己的葬礼，发现最亲近的人都藏着反转真相。",
      synopsis: "我站在自己的遗像前，看见另一个女人用我的名字接受所有人的悼念。前 1000 字直接抛出身份谜团、未婚夫谎言和母亲短信，三段内形成付费期待；后续用复仇、悬疑证据和身份反转推进，结尾回收谁才是真正受害者的答案。",
      overseasSynopsis: "",
      tags: ["悬疑", "复仇", "第一人称反转"],
    });

    const resolutions = buildSubmissionAssetIssueResolutions(sourceAudit, variantAudit);

    assert.ok(resolutions.some((item) => item.label === "盐选付费节点不够明确"));
    assert.ok(resolutions.every((item) => item.status === "resolved"));
  });

  await t.test("builds post-adoption review receipt for saved asset variants", () => {
    const platform = getPlatformProfile("zhihu_yanxuan");
    const sourceAudit = buildSubmissionAssetAudit(platform, {
      title: "她替我活着",
      logline: "我参加自己的葬礼，发现最亲近的人都藏着反转真相。",
      synopsis: "我站在自己的遗像前，看见另一个女人用我的名字接受所有人的悼念。为了查清真相，我开始跟踪她、接近未婚夫，也发现母亲和好友都在撒谎。故事会持续推进悬疑、复仇和身份反转，让读者不断怀疑谁才是真正的受害者。",
      overseasSynopsis: "",
      tags: ["悬疑", "复仇", "第一人称反转"],
    });
    const variantAudit = buildSubmissionAssetAudit(platform, {
      title: "她替我活着",
      logline: "我参加自己的葬礼，发现最亲近的人都藏着反转真相。",
      synopsis: "我站在自己的遗像前，看见另一个女人用我的名字接受所有人的悼念。前 1000 字直接抛出身份谜团、未婚夫谎言和母亲短信，三段内形成付费期待；后续用复仇、悬疑证据和身份反转推进，结尾回收谁才是真正受害者的答案。",
      overseasSynopsis: "",
      tags: ["悬疑", "复仇", "第一人称反转"],
    });
    const addressedIssues = buildSubmissionAssetIssueResolutions(sourceAudit, variantAudit);

    const receipt = buildSubmissionAssetAdoptionReviewReceipt({
      platformName: platform.name,
      strategy: "盐选付费节点补强",
      audit: variantAudit,
      addressedIssues,
    });

    assert.equal(receipt.score, variantAudit.score);
    assert.equal(receipt.resolvedLabels, "盐选付费节点不够明确");
    assert.equal(receipt.remainingLabels, "暂无");
    assert.ok(receipt.message.includes("质检"));
    assert.ok(receipt.nextAction.includes("保存发布基准"));
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
    assert.equal(pack.repairPath.steps[0]?.kind, "run_second_pass");
    assert.equal(pack.repairPath.steps[0]?.status, "active");
    assert.equal(pack.repairPath.executableActions, 1);
    assert.equal(pack.repairPath.groups.some((group) => group.kind === "run_second_pass" && group.count === 1), true);
    assert.ok(pack.chapters[0].preflight.blocked.some((item) => item.includes("仍要求二改")));
  });

  await t.test("builds an ordered repair pipeline for mixed blockers", () => {
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
      submissionChecklist: { ...readyChecklist, readinessPercent: 70 },
      platforms: [getPlatformProfile("fanqie")],
    });
    const pack = center.packages[0];

    assert.equal(pack.canExport, false);
    assert.equal(pack.repairPath.steps.length, 2);
    assert.equal(pack.repairPath.steps[0]?.kind, "run_second_pass");
    assert.equal(pack.repairPath.steps[0]?.status, "active");
    assert.equal(pack.repairPath.steps[1]?.kind, "open_submission_package");
    assert.equal(pack.repairPath.steps[1]?.status, "queued");
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
    assert.equal(center.platformStrategy[0].reviewDecision.history.some((item) => item.id === "snapshot-new-fanqie"), true);
    assert.equal(center.platformStrategy[0].reviewDecision.history.find((item) => item.id === "snapshot-new-fanqie")?.href, "#package-version-history");
  });

  await t.test("summarizes strategy review history from versions, assets, and metrics", () => {
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
          id: "snapshot-fanqie",
          platformId: "fanqie",
          platformName: "番茄小说",
          title: "夜雨系统",
          action: "snapshot",
          chapterCount: 3,
          wordCount: 7800,
          preflightScore: 95,
          canExport: true,
          createdAt: "2026-01-04T00:00:00.000Z",
        },
      ],
      submissionAssetVersions: [
        {
          id: "asset-version-fanqie",
          platformId: "fanqie",
          platformName: "番茄小说",
          title: "夜雨系统：倒计时重生",
          logline: "系统每晚倒计时，女主用选择把绝境打成爽点。",
          synopsis: "林晚在雨夜绑定倒计时系统，每一次选择都牵动生死与复仇。她必须在救人与自保之间连续做出决定，把系统惩罚反手变成翻盘筹码，沿着隐藏任务追查当年真相，同时把背叛她的人一步步拖回雨夜审判，并逼出幕后黑手的新任务。",
          overseasSynopsis: "Night Rain System follows Lin Wan through timed choices.",
          tags: ["系统", "重生", "强爽点"],
          note: "首秀前强调前三章钩子。",
          source: "ai_variant",
          auditScore: 96,
          auditStatus: "ready",
          action: "adopt",
          sourceTaskId: "asset-task-1",
          strategy: "强钩子爽点版",
          createdAt: "2026-01-05T00:00:00.000Z",
        },
      ],
      platformPublishMetrics: [
        {
          id: "metric-fanqie",
          platformId: "fanqie",
          platformName: "番茄小说",
          views: 1000,
          clicks: 180,
          favorites: 60,
          follows: 30,
          comments: 8,
          paidReads: 0,
          editorFeedback: "继续观察。",
          contractStatus: "pending",
          publishUrl: "",
          notes: "首轮数据。",
          snapshotDate: "2026-01-06T00:00:00.000Z",
        },
      ],
    });
    const history = center.platformStrategy[0].reviewDecision.history;
    const ledger = center.platformStrategy[0].reviewDecision.evidenceLedger;

    assert.deepEqual(history.slice(0, 3).map((item) => item.type), ["metric", "asset", "snapshot"]);
    assert.ok(history[0].detail.includes("曝光 1000"));
    assert.ok(history[1].detail.includes("强钩子爽点版"));
    assert.equal(history[2].href, "#package-version-history");
    assert.equal(ledger.status, "ready");
    assert.equal(ledger.completedSignals, 4);
    assert.equal(ledger.entries.slice(0, 3).map((entry) => entry.type).join(","), "metric,asset,snapshot");
    assert.ok(ledger.entries[0].scoreImpact.includes("点击率"));
    assert.ok(ledger.entries[1].nextReason.includes("入口素材"));
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

  await t.test("builds an execution chain when applying a ranked platform strategy", () => {
    const strategy = {
      rank: 1,
      platformId: "qimao" as const,
      platformName: "七猫",
      score: 76,
      recommendation: "grow" as const,
      reviewDecision: {
        kind: "iterate" as const,
        label: "小步迭代",
        detail: "数据还没差到要撤，也没好到能猛冲。",
        action: "做一轮小改动，再记录下一轮数据对照。",
        tasks: [],
        nextPlan: {
          headline: "七猫 下一轮计划：小步改、留证据、第 7 天再判断。",
          cadence: "seven_day" as const,
          status: "complete" as const,
          completedSteps: 0,
          totalSteps: 0,
          currentStepId: null,
          currentStepLabel: "回排行榜做最终判断",
          checkpoint: "第 7 天必须看策略分、真实数据和版本对照，再决定加码/迭代/修打法/撤退。",
          steps: [],
        },
        evidenceLedger: {
          status: "empty" as const,
          score: 0,
          headline: "七猫 还没有复盘证据，别急着拍脑袋。",
          completedSignals: 0,
          totalSignals: 4,
          latestEvidenceAt: null,
          missingSignals: [],
          entries: [],
        },
        history: [],
      },
      verdict: "七猫可以继续加码，但先补齐短板。",
      nextAction: "修投稿资产后重写前三章。",
      href: "#platform-export",
      scores: {
        preflight: 88,
        asset: 72,
        effect: 58,
        comparison: 58,
        adoption: 45,
      },
      reasons: ["投稿资产 72 分"],
      risks: ["标签不够精准"],
    };
    const plan = buildPlatformStrategySwitchPlan(strategy, getPlatformProfile("fanqie"));

    assert.equal(plan.platformId, "qimao");
    assert.equal(plan.previousPlatformId, "fanqie");
    assert.ok(plan.headline.includes("七猫"));
    assert.equal(plan.steps[0].status, "done");
    assert.equal(plan.steps[1].id, "save-evidence-baseline");
    assert.equal(plan.steps[1].href, "#package-version-history");
    assert.equal(plan.steps[1].status, "next");
    assert.equal(plan.steps[1].executable, true);
    assert.equal(plan.evidenceStatus, "empty");
    assert.ok(plan.decisionBasis.includes("只覆盖 0/4"));
    assert.ok(plan.steps.some((step) => step.href === "#first-three-rewrite"));
    assert.ok(plan.steps.some((step) => step.href === "#publish-effect-panel"));
  });

  await t.test("promotes first-three rewrite after the platform asset is ready", () => {
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
      platforms: [getPlatformProfile("qimao")],
      submissionAssets: [
        {
          id: "asset-qimao",
          platformId: "qimao",
          platformName: "七猫",
          title: "夜雨系统：倒计时翻盘",
          logline: "雨夜倒计时逼她选择，林晚把系统惩罚打成翻盘爽点。",
          synopsis: "林晚在雨夜绑定倒计时系统，每一次选择都牵动生死、复仇和悬疑真相。她从被迫救人开始，一步步摸清系统规则，把惩罚变成筹码，把背叛者拖回真相现场，并在连续任务中建立稳定目标：查清当年事故、保护真正重要的人、夺回属于自己的命运。故事保持强钩子、强情绪和连续爽点，适合七猫免费长篇平台连载。",
          overseasSynopsis: "Night Rain System follows Lin Wan through timed choices and revenge.",
          tags: ["系统", "逆袭", "悬疑"],
          note: "七猫主战场资产。",
          source: "manual",
          updatedAt: "2026-01-06T08:00:00.000Z",
        },
      ],
      publishSnapshots: [
        {
          id: "snapshot-qimao-baseline",
          platformId: "qimao",
          platformName: "七猫",
          title: "夜雨系统",
          action: "snapshot",
          chapterCount: 0,
          wordCount: 0,
          preflightScore: 20,
          canExport: false,
          createdAt: "2026-01-06T09:00:00.000Z",
        },
      ],
    });
    const strategy = center.platformStrategy[0];
    const pack = center.packages[0];
    const plan = buildPlatformStrategySwitchPlan(strategy, getPlatformProfile("fanqie"), pack);

    assert.equal(pack.submissionAssetAudit.status, "ready");
    assert.equal(pack.canExport, false);
    assert.equal(plan.progress.completedSteps, 3);
    assert.equal(plan.progress.progressPercent, 60);
    assert.equal(plan.progress.nextStepLabel, "重写前三章");
    assert.equal(plan.steps.find((step) => step.id === "save-evidence-baseline")?.status, "done");
    assert.equal(plan.steps.find((step) => step.id === "fix-submission-asset")?.status, "done");
    assert.equal(plan.steps.find((step) => step.id === "rewrite-first-three")?.status, "next");
    assert.equal(plan.steps.find((step) => step.id === "rewrite-first-three")?.executable, true);
  });

  await t.test("promotes publish effect recording after rewrite makes the package exportable", () => {
    const center = buildPlatformPublishExportCenter({
      project: {
        title: "夜雨系统",
        genre: "都市系统",
        sellingPoint: "雨夜危机中觉醒系统，主角用选择翻盘。",
        currentWordCount: 9000,
        targetWordCount: 300000,
      },
      targetPlatform: getPlatformProfile("qimao"),
      chapters: finalChapters,
      aiTasks: passedReviews,
      submissionChecklist: readyChecklist,
      platforms: [getPlatformProfile("qimao")],
      submissionAssets: [
        {
          id: "asset-qimao-ready",
          platformId: "qimao",
          platformName: "七猫",
          title: "夜雨系统：倒计时翻盘",
          logline: "雨夜倒计时逼她选择，林晚把系统惩罚打成翻盘爽点。",
          synopsis: "林晚在雨夜绑定倒计时系统，每一次选择都牵动生死、复仇和悬疑真相。她从被迫救人开始，一步步摸清系统规则，把惩罚变成筹码，把背叛者拖回真相现场，并在连续任务中建立稳定目标：查清当年事故、保护真正重要的人、夺回属于自己的命运。故事保持强钩子、强情绪和连续爽点，适合七猫免费长篇平台连载。",
          overseasSynopsis: "Night Rain System follows Lin Wan through timed choices and revenge.",
          tags: ["系统", "逆袭", "悬疑"],
          note: "七猫主战场资产。",
          source: "manual",
          updatedAt: "2026-01-06T08:00:00.000Z",
        },
      ],
      publishSnapshots: [
        {
          id: "snapshot-qimao-ready",
          platformId: "qimao",
          platformName: "七猫",
          title: "夜雨系统",
          action: "snapshot",
          chapterCount: 3,
          wordCount: 7800,
          preflightScore: 95,
          canExport: true,
          createdAt: "2026-01-07T09:00:00.000Z",
        },
      ],
    });
    const strategy = center.platformStrategy[0];
    const pack = center.packages[0];
    const plan = buildPlatformStrategySwitchPlan(strategy, getPlatformProfile("qimao"), pack);

    assert.equal(pack.canExport, true);
    assert.equal(pack.publishEffect.records, 0);
    assert.equal(plan.steps.find((step) => step.id === "save-evidence-baseline")?.status, "done");
    assert.equal(plan.steps.find((step) => step.id === "rewrite-first-three")?.status, "done");
    assert.equal(plan.steps.find((step) => step.id === "record-publish-effect")?.status, "next");
    assert.equal(plan.steps.find((step) => step.id === "record-publish-effect")?.executable, true);
  });

  await t.test("marks publish effect recording done after real metrics are saved", () => {
    const center = buildPlatformPublishExportCenter({
      project: {
        title: "夜雨系统",
        genre: "都市系统",
        sellingPoint: "雨夜危机中觉醒系统，主角用选择翻盘。",
        currentWordCount: 9000,
        targetWordCount: 300000,
      },
      targetPlatform: getPlatformProfile("qimao"),
      chapters: finalChapters,
      aiTasks: passedReviews,
      submissionChecklist: readyChecklist,
      platforms: [getPlatformProfile("qimao")],
      submissionAssets: [
        {
          id: "asset-qimao-ready",
          platformId: "qimao",
          platformName: "七猫",
          title: "夜雨系统：倒计时翻盘",
          logline: "雨夜倒计时逼她选择，林晚把系统惩罚打成翻盘爽点。",
          synopsis: "林晚在雨夜绑定倒计时系统，每一次选择都牵动生死、复仇和悬疑真相。她从被迫救人开始，一步步摸清系统规则，把惩罚变成筹码，把背叛者拖回真相现场，并在连续任务中建立稳定目标：查清当年事故、保护真正重要的人、夺回属于自己的命运。故事保持强钩子、强情绪和连续爽点，适合七猫免费长篇平台连载。",
          overseasSynopsis: "Night Rain System follows Lin Wan through timed choices and revenge.",
          tags: ["系统", "逆袭", "悬疑"],
          note: "七猫主战场资产。",
          source: "manual",
          updatedAt: "2026-01-06T08:00:00.000Z",
        },
      ],
      publishSnapshots: [
        {
          id: "snapshot-qimao-final",
          platformId: "qimao",
          platformName: "七猫",
          title: "夜雨系统",
          action: "snapshot",
          chapterCount: 3,
          wordCount: 7800,
          preflightScore: 95,
          canExport: true,
          createdAt: "2026-01-07T09:00:00.000Z",
        },
      ],
      platformPublishMetrics: [
        {
          id: "metric-qimao",
          platformId: "qimao",
          platformName: "七猫",
          views: 1200,
          clicks: 240,
          favorites: 80,
          follows: 36,
          comments: 8,
          paidReads: 0,
          editorFeedback: "继续观察前三章转化。",
          contractStatus: "pending",
          publishUrl: "https://example.com/qimao",
          notes: "首轮数据。",
          snapshotDate: "2026-01-08T00:00:00.000Z",
        },
      ],
    });
    const strategy = center.platformStrategy[0];
    const pack = center.packages[0];
    const plan = buildPlatformStrategySwitchPlan(strategy, getPlatformProfile("qimao"), pack);

    assert.equal(pack.publishEffect.records, 1);
    assert.equal(plan.progress.status, "complete");
    assert.equal(plan.progress.completedSteps, 5);
    assert.equal(plan.progress.progressPercent, 100);
    assert.equal(plan.progress.actionLabel, "复盘排行榜");
    assert.equal(plan.progress.actionHref, "#platform-strategy-ranking");
    assert.equal(plan.steps.find((step) => step.id === "record-publish-effect")?.status, "done");
    assert.equal(plan.steps.find((step) => step.id === "record-publish-effect")?.executable, false);
  });

  await t.test("builds PM-style receipts after strategy steps execute", () => {
    const strategy = {
      rank: 1,
      platformId: "qimao" as const,
      platformName: "七猫",
      score: 76,
      recommendation: "grow" as const,
      verdict: "七猫可以继续加码，但先补齐短板。",
      nextAction: "修投稿资产后重写前三章。",
      href: "#platform-export",
      scores: {
        preflight: 88,
        asset: 72,
        effect: 58,
        comparison: 58,
        adoption: 45,
      },
      reasons: ["投稿资产 72 分"],
      risks: ["标签不够精准"],
    };
    const plan = buildPlatformStrategySwitchPlan(strategy, getPlatformProfile("fanqie"));
    const baselineReceipt = buildPlatformStrategyExecutionReceipt(plan, "save-evidence-baseline");
    const assetReceipt = buildPlatformStrategyExecutionReceipt(plan, "fix-submission-asset", 3);
    const adoptedReceipt = buildPlatformStrategyExecutionReceipt(plan, "adopt-submission-asset", 1);
    const rewriteReceipt = buildPlatformStrategyExecutionReceipt(plan, "rewrite-first-three", 3);
    const effectReceipt = buildPlatformStrategyExecutionReceipt(plan, "save-publish-effect");
    const switchReceipt = buildPlatformStrategyExecutionReceipt(plan, "switch-target-platform");

    assert.equal(baselineReceipt.href, "#publish-effect-panel");
    assert.equal(baselineReceipt.severity, "success");
    assert.ok(baselineReceipt.nextAction.includes("录入真实发布效果"));
    assert.equal(assetReceipt.href, "#submission-asset-editor");
    assert.equal(assetReceipt.severity, "needs_action");
    assert.ok(assetReceipt.message.includes("3 个候选方案"));
    assert.ok(assetReceipt.nextAction.includes("采纳"));
    assert.equal(adoptedReceipt.severity, "success");
    assert.ok(adoptedReceipt.message.includes("已经落库"));
    assert.ok(adoptedReceipt.nextAction.includes("执行链"));
    assert.equal(rewriteReceipt.href, "#platform-export");
    assert.ok(rewriteReceipt.message.includes("已重写 3 章"));
    assert.ok(rewriteReceipt.nextAction.includes("发布前质检"));
    assert.equal(effectReceipt.severity, "success");
    assert.ok(effectReceipt.message.includes("真实数据"));
    assert.ok(effectReceipt.nextAction.includes("排行榜"));
    assert.equal(switchReceipt.href, plan.progress.actionHref);
    assert.ok(switchReceipt.nextAction.includes(plan.progress.actionLabel));
  });
});
