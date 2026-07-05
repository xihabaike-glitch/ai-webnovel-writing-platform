import test from "node:test";
import assert from "node:assert/strict";
import { getPlatformProfile } from "../lib/platforms/platformProfiles.ts";
import { buildSerializationOpsDashboard } from "../lib/projects/serializationOps.ts";

const platform = getPlatformProfile("fanqie");
const project = {
  title: "夜雨系统",
  currentWordCount: 2400,
  targetWordCount: 300000,
  updateCadence: "daily_4000",
};
const chapter = {
  id: "chapter-1",
  order: 1,
  title: "第一章 雨夜系统",
  status: "draft",
  wordCount: 1200,
  hook: "系统倒计时出现。",
  cliffhanger: "第二个任务弹出。",
  updatedAt: "2026-01-01T00:00:00.000Z",
};
const checklist = {
  readinessPercent: 60,
  passCount: 6,
  todoCount: 3,
  riskCount: 1,
  items: [
    { id: "word-count", label: "投稿字数", status: "todo" as const, detail: "字数不足。" },
    { id: "platform-risk", label: "平台风险", status: "risk" as const, detail: "流量波动。" },
  ],
};

const emptyEffectComparison = {
  status: "none" as const,
  previous: null,
  current: null,
  viewsDelta: 0,
  clicksDelta: 0,
  favoritesDelta: 0,
  followsDelta: 0,
  clickRateDeltaPercent: 0,
  favoriteRateDeltaPercent: 0,
  followRateDeltaPercent: 0,
  verdict: "还没有前后对照样本。",
  wins: [],
  losses: [],
};

function emptyPublishEffect() {
  return {
    status: "empty" as const,
    records: 0,
    latest: null,
    comparison: emptyEffectComparison,
    totalViews: 0,
    totalClicks: 0,
    totalFavorites: 0,
    totalFollows: 0,
    totalComments: 0,
    totalPaidReads: 0,
    clickRatePercent: 0,
    favoriteRatePercent: 0,
    followRatePercent: 0,
    commentRatePercent: 0,
    paidReadRatePercent: 0,
    verdict: "还没有发布效果记录。",
    nextAction: "发布后录入曝光、点击、收藏、追读、评论和编辑反馈。",
    history: [],
  };
}

function collectDataOptimization() {
  return {
    status: "collect_data" as const,
    headline: "先别玄学复盘，缺数据就只是在自我感动。",
    actions: [
      {
        id: "fanqie-collect-effect-data",
        priority: "high" as const,
        area: "data" as const,
        execution: "open_target" as const,
        label: "录入首轮发布数据",
        detail: "至少补曝光、点击、收藏、追读、评论和编辑反馈。",
        evidence: "当前没有任何发布效果记录。",
        target: "发布效果复盘",
        href: "#publish-effect-panel",
      },
    ],
  };
}

function weakPublishEffect() {
  const latest = {
    id: "metric-1",
    platformId: "fanqie",
    platformName: "番茄小说",
    views: 1200,
    clicks: 36,
    favorites: 12,
    follows: 4,
    comments: 1,
    paidReads: 0,
    editorFeedback: "开头慢，卖点不够直。",
    contractStatus: "pending",
    publishUrl: "",
    notes: "",
    snapshotDate: "2026-01-04T00:00:00.000Z",
  };

  return {
    status: "weak" as const,
    records: 1,
    latest,
    comparison: { ...emptyEffectComparison, current: latest },
    totalViews: 1200,
    totalClicks: 36,
    totalFavorites: 12,
    totalFollows: 4,
    totalComments: 1,
    totalPaidReads: 0,
    clickRatePercent: 3,
    favoriteRatePercent: 1,
    followRatePercent: 0.3,
    commentRatePercent: 0.1,
    paidReadRatePercent: 0,
    verdict: "番茄小说 当前转化偏弱，先检查标题卖点和前三章兑现。",
    nextAction: "先改标题、一句话卖点和标签，解决读者点不进来的问题。",
    history: [latest],
  };
}

function urgentEffectOptimization() {
  return {
    status: "urgent_rework" as const,
    headline: "转化漏斗已经漏风，别继续硬投。",
    actions: [
      {
        id: "fanqie-fix-click-package",
        priority: "high" as const,
        area: "asset" as const,
        execution: "generate_asset_variants" as const,
        label: "重做标题、卖点和标签",
        detail: "读者没点进来，先把标题改成能一眼看懂冲突和爽点。",
        evidence: "点击率 3%，低于 5%。",
        target: "投稿资产",
        href: "#submission-asset-editor",
      },
    ],
  };
}

test("buildSerializationOpsDashboard", async (t) => {
  await t.test("prioritizes review for drafted unreviewed chapters", () => {
    const dashboard = buildSerializationOpsDashboard({
      project,
      platform,
      chapters: [chapter],
      aiTasks: [],
      submissionChecklist: checklist,
    });

    assert.equal(dashboard.dailyWordTarget, 4000);
    assert.equal(dashboard.reviewQueueCount, 1);
    assert.equal(dashboard.revisionQueueCount, 0);
    assert.equal(dashboard.publishReadyCount, 0);
    assert.equal(dashboard.actions[0].id, "review-next");
    assert.equal(dashboard.actions[0].execution?.method, "POST");
    assert.equal(dashboard.actions[0].execution?.endpoint, "/api/ai/tasks/chapter-review");
    assert.equal(dashboard.actions[0].execution?.payload.chapterId, "chapter-1");
    assert.ok(dashboard.warnings.some((warning) => warning.includes("未审稿")));
  });

  await t.test("prioritizes second pass after a weak review", () => {
    const dashboard = buildSerializationOpsDashboard({
      project,
      platform,
      chapters: [chapter],
      aiTasks: [
        {
          id: "review-1",
          chapterId: "chapter-1",
          taskType: "chapter_review",
          status: "succeeded",
          outputText: JSON.stringify({ score: 72, issues: [{ type: "hook" }] }),
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      submissionChecklist: checklist,
    });

    assert.equal(dashboard.reviewQueueCount, 0);
    assert.equal(dashboard.revisionQueueCount, 1);
    assert.equal(dashboard.actions[0].id, "revise-next");
    assert.equal(dashboard.actions[0].execution?.endpoint, "/api/chapters/chapter-1/second-pass");
    assert.equal(dashboard.actions[0].execution?.payload.mode, "platform_fit");
    assert.equal(dashboard.actions[0].execution?.payload.targetWords, 1200);
  });

  await t.test("counts reviewed and second-passed chapters as publish ready", () => {
    const dashboard = buildSerializationOpsDashboard({
      project,
      platform,
      chapters: [chapter],
      aiTasks: [
        {
          id: "review-1",
          chapterId: "chapter-1",
          taskType: "chapter_review",
          status: "succeeded",
          outputText: JSON.stringify({ score: 88, issues: [] }),
          createdAt: "2026-01-01T00:00:00.000Z",
        },
        {
          id: "second-1",
          chapterId: "chapter-1",
          taskType: "chapter_second_pass",
          status: "succeeded",
          outputText: "二改正文",
          createdAt: "2026-01-02T00:00:00.000Z",
        },
      ],
      submissionChecklist: { ...checklist, readinessPercent: 90, items: [] },
    });

    assert.equal(dashboard.publishReadyCount, 1);
    assert.equal(dashboard.nextPublishChapter?.id, "chapter-1");
    assert.equal(dashboard.actions.some((action) => action.id === "publish-next"), true);
    const publishAction = dashboard.actions.find((action) => action.id === "publish-next");
    assert.equal(publishAction?.execution?.method, "PATCH");
    assert.equal(publishAction?.execution?.endpoint, "/api/chapters/chapter-1");
    assert.equal(publishAction?.execution?.payload.status, "final");
  });

  await t.test("moves adopted candidate chapters back to review before publishing", () => {
    const dashboard = buildSerializationOpsDashboard({
      project,
      platform,
      chapters: [chapter],
      aiTasks: [
        {
          id: "review-1",
          chapterId: "chapter-1",
          taskType: "chapter_review",
          status: "succeeded",
          outputText: JSON.stringify({ score: 92, shouldSecondPass: false, issues: [] }),
          createdAt: "2026-01-01T00:00:00.000Z",
        },
        {
          id: "adopt-1",
          chapterId: "chapter-1",
          taskType: "chapter_adopt_candidate",
          status: "succeeded",
          outputText: JSON.stringify({ adopted: true }),
          createdAt: "2026-01-02T00:00:00.000Z",
        },
      ],
      submissionChecklist: { ...checklist, readinessPercent: 90, items: [] },
    });

    assert.equal(dashboard.publishReadyCount, 0);
    assert.equal(dashboard.reviewQueueCount, 1);
    assert.equal(dashboard.actions[0].id, "review-next");
    assert.ok(dashboard.warnings.some((warning) => warning.includes("旧审稿不能当发布通行证")));
  });

  await t.test("routes submission gaps to the matching repair workspace", () => {
    const dashboard = buildSerializationOpsDashboard({
      project,
      platform,
      chapters: [chapter],
      aiTasks: [
        {
          id: "review-1",
          chapterId: "chapter-1",
          taskType: "chapter_review",
          status: "succeeded",
          outputText: JSON.stringify({ score: 90, shouldSecondPass: false, issues: [] }),
          createdAt: "2026-01-01T00:00:00.000Z",
        },
        {
          id: "second-1",
          chapterId: "chapter-1",
          taskType: "chapter_second_pass",
          status: "succeeded",
          outputText: "二改正文",
          createdAt: "2026-01-02T00:00:00.000Z",
        },
      ],
      submissionChecklist: {
        ...checklist,
        items: [
          { id: "opening-hooks", label: "前三章钩子", status: "todo" as const, detail: "缺少开头钩子。" },
        ],
      },
    });

    const submissionAction = dashboard.actions.find((action) => action.id === "submission-gap");
    assert.equal(submissionAction?.href, "#retention-diagnostic");
    assert.equal(submissionAction?.hrefLabel, "补开头钩子");
    assert.ok(submissionAction?.detail.includes("下一步"));
  });

  await t.test("surfaces publish asset adoption as an ops signal", () => {
    const dashboard = buildSerializationOpsDashboard({
      project: { ...project, id: "project-1" },
      platform,
      chapters: [],
      aiTasks: [
        {
          id: "asset-task-1",
          chapterId: null,
          taskType: "platform_submission_asset_optimize",
          status: "succeeded",
          inputSnapshot: JSON.stringify({ platformId: "fanqie" }),
          outputText: JSON.stringify({
            variants: [
              {
                strategy: "强钩子版",
                title: "夜雨系统：三次选择后我封神",
                logline: "雨夜倒计时降临，主角每次选择都会触发更大的危机，却也拿到翻盘奖励。",
                synopsis: "林晚在雨夜觉醒选择系统，每一次救人、自保或反击都会让倒计时升级。她必须用连续任务换来奖励，破解城市危机背后的隐藏规则。第一卷主打高压选择、系统奖励和连续翻盘，让每章都有明确爽点和追读悬念。",
                overseasSynopsis: "Lin Wan awakens a choice system in a storm and turns escalating missions into survival rewards.",
                tags: ["都市系统", "爽文", "危机选择"],
                rationale: ["标题直接打系统和选择", "卖点更适合番茄快读"],
              },
              {
                strategy: "爽点版",
                title: "雨夜倒计时，我靠系统一路翻盘",
                logline: "主角被系统逼进连续危机，每次完成任务都能获得奖励，并把敌人的布局反杀回去。",
                synopsis: "林晚原本只是雨夜里的普通人，却在倒计时中得到系统。任务越危险，奖励越锋利，她从被追杀到主动设局，逐步揭开规则背后的敌人。故事用连续任务、反杀奖励和章末危机推动追读。",
                overseasSynopsis: "A countdown system pushes Lin Wan through missions, rewards, and escalating reversals.",
                tags: ["系统流", "逆袭", "反杀"],
                rationale: ["强化反杀期待", "标签更贴近分发"],
              },
            ],
          }),
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      submissionChecklist: { ...checklist, readinessPercent: 90, items: [] },
      submissionAssets: [
        {
          platformId: "fanqie",
          platformName: "番茄小说",
          title: "夜雨系统",
          logline: "雨夜倒计时降临，主角在救人与逃跑之间连续选择，用系统奖励一步步翻盘。",
          synopsis: "林晚在雨夜觉醒系统，每次选择都会让危机升级。他必须在救人、逃跑和揭开规则真相之间做决定，借连续任务翻盘。第一卷围绕系统倒计时、城市危机和隐藏对手展开，让主角用爽点明确的选择一步步逆袭，并把每次奖励都变成新的追读悬念。",
          overseasSynopsis: "Lin Wan awakens a system in the rain and survives escalating choices.",
          tags: ["都市系统", "爽文", "危机"],
          note: "",
          source: "ai_variant",
          updatedAt: "2026-01-02T00:00:00.000Z",
        },
      ],
      submissionAssetVersions: [
        {
          platformId: "fanqie",
          auditScore: 100,
          auditStatus: "ready",
          action: "adopt",
          sourceTaskId: "asset-task-1",
          strategy: "强钩子版",
          createdAt: "2026-01-02T00:00:00.000Z",
        },
      ],
      finalGate: {
        status: "ready_to_submit",
        label: "可投",
        headline: "番茄小说 发布门槛已过，可以保存基准后投。",
        verdict: "标题、简介、前三章、字数、审稿和投稿资产都过了投前线。",
        nextAction: "保存发布包版本基准，然后下载或复制发布包。",
        score: 100,
        blockers: [],
        items: [],
      },
    });

    assert.equal(dashboard.submissionAssetStatus.status, "ready");
    assert.equal(dashboard.submissionAssetStatus.adoptedVersions, 1);
    assert.equal(dashboard.submissionAssetStatus.generatedVariants, 2);
    assert.equal(dashboard.submissionAssetStatus.latestStrategy, "强钩子版");
    assert.ok(dashboard.submissionAssetStatus.verdict.includes("已采纳"));
    assert.equal(dashboard.submissionAssetCandidates.exists, true);
    assert.equal(dashboard.submissionAssetCandidates.variants.length, 2);
    assert.equal(dashboard.submissionAssetCandidates.variants[0].adopted, true);
    assert.equal(dashboard.submissionAssetCandidates.variants[1].execution.endpoint, "/api/projects/project-1/platform-export");
    assert.equal(dashboard.submissionAssetCandidates.variants[1].execution.payload.action, "save-asset");
    assert.equal(dashboard.submissionAssetCandidates.variants[1].execution.payload.sourceTaskId, "asset-task-1");
    assert.equal(dashboard.submissionAssetCandidates.variants[1].execution.payload.saveAction, "adopt");
    assert.equal(dashboard.actions.some((action) => action.id === "submission-asset-gap"), false);
    assert.equal(dashboard.finalSubmissionGate.status, "ready_to_submit");
    const baselineAction = dashboard.actions.find((action) => action.id === "save-publish-baseline");
    assert.equal(baselineAction?.execution?.endpoint, "/api/projects/project-1/platform-export");
    assert.equal(baselineAction?.execution?.payload.action, "snapshot");
    assert.equal(baselineAction?.label, "保存基准并下载");
    assert.equal(baselineAction?.execution?.label, "保存并下载");
    assert.equal(baselineAction?.afterSuccess?.behavior, "download");
    assert.equal(baselineAction?.afterSuccess?.href, "/api/projects/project-1/platform-export?format=markdown&platformId=fanqie");
    assert.equal(baselineAction?.afterSuccess?.nextHref, "#publish-effect-panel");
    assert.equal(baselineAction?.afterSuccess?.nextLabel, "录入发布效果");
    assert.equal(dashboard.publishBaselineStatus.exists, false);
    assert.ok(dashboard.warnings.some((warning) => warning.includes("还没有保存发布基准")));
  });

  await t.test("switches to download after a publish baseline exists", () => {
    const dashboard = buildSerializationOpsDashboard({
      project: { ...project, id: "project-1" },
      platform,
      chapters: [],
      aiTasks: [],
      submissionChecklist: { ...checklist, readinessPercent: 90, items: [] },
      submissionAssets: [
        {
          platformId: "fanqie",
          platformName: "番茄小说",
          title: "夜雨系统",
          logline: "雨夜倒计时降临，主角在救人与逃跑之间连续选择，用系统奖励一步步翻盘。",
          synopsis: "林晚在雨夜觉醒系统，每次选择都会让危机升级。他必须在救人、逃跑和揭开规则真相之间做决定，借连续任务翻盘。第一卷围绕系统倒计时、城市危机和隐藏对手展开，让主角用爽点明确的选择一步步逆袭，并把每次奖励都变成新的追读悬念。",
          overseasSynopsis: "Lin Wan awakens a system in the rain and survives escalating choices.",
          tags: ["都市系统", "爽文", "危机"],
          note: "",
          source: "ai_variant",
          updatedAt: "2026-01-02T00:00:00.000Z",
        },
      ],
      finalGate: {
        status: "ready_to_submit",
        label: "可投",
        headline: "番茄小说 发布门槛已过，可以保存基准后投。",
        verdict: "标题、简介、前三章、字数、审稿和投稿资产都过了投前线。",
        nextAction: "保存发布包版本基准，然后下载或复制发布包。",
        score: 100,
        blockers: [],
        items: [],
      },
      publishEffect: emptyPublishEffect(),
      effectOptimization: collectDataOptimization(),
      publishSnapshots: [
        {
          id: "snapshot-1",
          platformId: "fanqie",
          platformName: "番茄小说",
          title: "夜雨系统",
          action: "snapshot",
          chapterCount: 3,
          wordCount: 9600,
          preflightScore: 96,
          canExport: true,
          createdAt: "2026-01-03T00:00:00.000Z",
        },
        {
          id: "download-1",
          platformId: "fanqie",
          platformName: "番茄小说",
          title: "夜雨系统下载版",
          action: "download",
          chapterCount: 4,
          wordCount: 12800,
          preflightScore: 98,
          canExport: true,
          createdAt: "2026-01-04T00:00:00.000Z",
        },
        {
          id: "other-platform",
          platformId: "qidian",
          platformName: "起点中文网",
          title: "夜雨系统起点版",
          action: "snapshot",
          chapterCount: 5,
          wordCount: 16000,
          preflightScore: 92,
          canExport: true,
          createdAt: "2026-01-05T00:00:00.000Z",
        },
      ],
    });

    assert.equal(dashboard.publishBaselineStatus.exists, true);
    assert.equal(dashboard.publishBaselineStatus.preflightScore, 96);
    assert.ok(dashboard.publishBaselineStatus.downloadHref.includes("format=markdown"));
    assert.equal(dashboard.publishVersionHistory.length, 2);
    assert.equal(dashboard.publishVersionHistory[0].id, "download-1");
    assert.equal(dashboard.publishVersionHistory[0].actionLabel, "下载记录");
    assert.equal(dashboard.publishVersionHistory[0].downloadHref, "/api/projects/project-1/platform-export?versionId=download-1&format=markdown");
    assert.equal(dashboard.publishVersionHistory.some((version) => version.id === "other-platform"), false);
    assert.equal(dashboard.publishEffectStatus.status, "empty");
    assert.equal(dashboard.publishEffectStatus.actionLabel, "录入发布效果");
    assert.equal(dashboard.publishEffectStatus.actions[0].href, "#publish-effect-panel");
    assert.equal(dashboard.publishEffectStatus.actions[0].execution, null);
    assert.equal(dashboard.actions.some((action) => action.id === "record-publish-effect"), true);
    assert.ok(dashboard.warnings.some((warning) => warning.includes("还没录入真实发布效果")));
    assert.equal(dashboard.actions.some((action) => action.id === "save-publish-baseline"), false);
    const downloadAction = dashboard.actions.find((action) => action.id === "download-publish-package");
    assert.equal(downloadAction?.href, "/api/projects/project-1/platform-export?format=markdown&platformId=fanqie");
    assert.equal(downloadAction?.afterSuccess?.behavior, "download");
    assert.ok(downloadAction?.afterSuccess?.message.includes("录入真实发布效果"));
    assert.equal(downloadAction?.afterSuccess?.nextHref, "#publish-effect-panel");
    assert.equal(downloadAction?.afterSuccess?.nextLabel, "录入发布效果");
  });

  await t.test("routes weak publish effect to optimization work", () => {
    const dashboard = buildSerializationOpsDashboard({
      project: { ...project, id: "project-1" },
      platform,
      chapters: [],
      aiTasks: [],
      submissionChecklist: { ...checklist, readinessPercent: 90, items: [] },
      submissionAssets: [
        {
          platformId: "fanqie",
          platformName: "番茄小说",
          title: "夜雨系统",
          logline: "雨夜倒计时降临，主角在救人与逃跑之间连续选择，用系统奖励一步步翻盘。",
          synopsis: "林晚在雨夜觉醒系统，每次选择都会让危机升级。他必须在救人、逃跑和揭开规则真相之间做决定，借连续任务翻盘。第一卷围绕系统倒计时、城市危机和隐藏对手展开，让主角用爽点明确的选择一步步逆袭，并把每次奖励都变成新的追读悬念。",
          overseasSynopsis: "Lin Wan awakens a system in the rain and survives escalating choices.",
          tags: ["都市系统", "爽文", "危机"],
          note: "",
          source: "ai_variant",
          updatedAt: "2026-01-02T00:00:00.000Z",
        },
      ],
      finalGate: {
        status: "ready_to_submit",
        label: "可投",
        headline: "番茄小说 发布门槛已过，可以保存基准后投。",
        verdict: "标题、简介、前三章、字数、审稿和投稿资产都过了投前线。",
        nextAction: "保存发布包版本基准，然后下载或复制发布包。",
        score: 100,
        blockers: [],
        items: [],
      },
      publishSnapshots: [
        {
          id: "snapshot-1",
          platformId: "fanqie",
          platformName: "番茄小说",
          title: "夜雨系统",
          action: "snapshot",
          chapterCount: 3,
          wordCount: 9600,
          preflightScore: 96,
          canExport: true,
          createdAt: "2026-01-03T00:00:00.000Z",
        },
      ],
      publishEffect: weakPublishEffect(),
      effectOptimization: urgentEffectOptimization(),
    });

    assert.equal(dashboard.publishEffectStatus.status, "weak");
    assert.equal(dashboard.publishEffectStatus.label, "偏弱");
    assert.equal(dashboard.publishEffectStatus.actions[0].actionLabel, "生成候选");
    assert.equal(dashboard.publishEffectStatus.actions[0].execution?.endpoint, "/api/projects/project-1/platform-export/asset-optimize");
    assert.equal(dashboard.publishEffectStatus.actions[0].execution?.payload.platformId, "fanqie");
    const optimizeAction = dashboard.actions.find((action) => action.id === "optimize-publish-effect");
    assert.equal(optimizeAction?.priority, "high");
    assert.equal(optimizeAction?.href, "#submission-asset-editor");
    assert.equal(optimizeAction?.execution?.label, "生成候选");
    assert.equal(optimizeAction?.execution?.endpoint, "/api/projects/project-1/platform-export/asset-optimize");
    assert.ok(dashboard.warnings.some((warning) => warning.includes("发布效果偏弱")));
  });

  await t.test("requires second-pass recheck before publish readiness", () => {
    const failedRecheck = buildSerializationOpsDashboard({
      project,
      platform,
      chapters: [chapter],
      aiTasks: [
        {
          id: "second-1",
          chapterId: "chapter-1",
          taskType: "chapter_second_pass",
          status: "succeeded",
          outputText: "二改正文",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
        {
          id: "recheck-1",
          chapterId: "chapter-1",
          taskType: "chapter_review",
          status: "succeeded",
          outputText: JSON.stringify({ score: 80, shouldSecondPass: true, issues: [{ type: "payoff" }] }),
          createdAt: "2026-01-02T00:00:00.000Z",
        },
      ],
      submissionChecklist: { ...checklist, readinessPercent: 90, items: [] },
    });

    assert.equal(failedRecheck.publishReadyCount, 0);
    assert.equal(failedRecheck.revisionQueueCount, 1);
    assert.equal(failedRecheck.actions[0].id, "revise-next");

    const passedRecheck = buildSerializationOpsDashboard({
      project,
      platform,
      chapters: [chapter],
      aiTasks: [
        {
          id: "second-1",
          chapterId: "chapter-1",
          taskType: "chapter_second_pass",
          status: "succeeded",
          outputText: "二改正文",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
        {
          id: "recheck-1",
          chapterId: "chapter-1",
          taskType: "chapter_review",
          status: "succeeded",
          outputText: JSON.stringify({ score: 90, shouldSecondPass: false, issues: [{ type: "length" }] }),
          createdAt: "2026-01-02T00:00:00.000Z",
        },
      ],
      submissionChecklist: { ...checklist, readinessPercent: 90, items: [] },
    });

    assert.equal(passedRecheck.publishReadyCount, 1);
    assert.equal(passedRecheck.revisionQueueCount, 0);
  });
});
