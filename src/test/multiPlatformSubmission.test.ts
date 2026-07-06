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
      projectId: "project-1",
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
    assert.equal(result.archive.deliveryScope.corePlatformCount, 8);
    assert.equal(result.archive.deliveryScope.pausedExpansionCount, 0);
    assert.equal(result.archive.deliveryScope.statusLabel, "8/8 核心平台已纳入发布闭环");
    assert.ok(result.archive.deliveryScope.scopeDecision.includes("扩展平台不再作为待补缺口"));
    assert.ok(result.archive.archiveFileName.endsWith(".md"));
    assert.ok(result.archive.markdown.includes("多平台投稿包归档"));
    assert.ok(result.archive.markdown.includes("平台范围：8/8 核心平台已纳入发布闭环"));
    assert.ok(result.archive.markdown.includes("扩展平台：不纳入本期投稿包，不再作为待补缺口"));
    assert.equal(result.archive.markdown.includes("剩余 10"), false);
    assert.equal(result.archive.markdown.includes("## 待补齐平台"), false);
    assert.equal(result.effectSummary.trackedPlatforms, 0);
    assert.equal(result.effectSummary.needsDataPlatforms, 8);
    assert.equal(result.decisionBoard.status, "no_data");
    assert.ok(result.decisionBoard.lanes.some((lane) => lane.kind === "collect_data"));
    assert.ok(result.decisionBoard.tasks.some((task) => task.kind === "collect_data" && task.ownerRole === "数据编辑"));
    assert.ok(result.decisionBoard.tasks.every((task) => task.acceptanceCriteria.length >= 2));
    assert.ok(result.markdown.includes("多平台投稿版本"));
    assert.ok(result.markdown.includes("平台包字段"));
    assert.ok(result.markdown.includes("投放追踪"));
    assert.ok(result.markdown.includes("投放决策"));
  });

  await t.test("keeps overseas synopsis visible for overseas platforms", () => {
    const result = buildMultiPlatformSubmission({
      projectId: "project-1",
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
    assert.equal(zhihu.decision.kind, "prepare_package");
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
    assert.ok(archive.markdown.includes("| 平台 | 状态 | 追踪 | 字段 | 样章 | 摘要字数 | 文件/待补字段 |"));
    assert.ok(archive.markdown.includes("已就绪平台投稿包"));
    assert.ok(archive.markdown.includes("投放决策板"));
    assert.ok(archive.markdown.includes("决策执行单"));
    assert.ok(archive.platforms.some((platform) => platform.fileName.includes("夜雨-系统-番茄小说-投稿包.md")));
    const singlePackage = buildSinglePlatformSubmissionMarkdown(fanqie);
    assert.ok(singlePackage.includes("# 夜雨|系统 番茄小说 投稿包"));
    assert.ok(singlePackage.includes("## 字段矩阵"));
    assert.ok(singlePackage.includes("## 样章摘要"));
    assert.ok(singlePackage.includes("## 投放追踪证据"));
    assert.ok(singlePackage.includes("## 投放决策证据"));
  });

  await t.test("summarizes post-submission effect tracking", () => {
    const result = buildMultiPlatformSubmission({
      projectId: "project-1",
      title: "夜雨系统",
      genre: "都市系统",
      sellingPoint: "雨夜危机中觉醒系统，主角用一次次选择翻盘。",
      currentWordCount: 9000,
      targetWordCount: 300000,
      targetPlatformId: "fanqie",
      chapters,
      aiTasks: [],
      platformPublishMetrics: [
        {
          platformId: "fanqie",
          platformName: "番茄小说",
          views: 1200,
          clicks: 180,
          favorites: 72,
          follows: 36,
          comments: 12,
          paidReads: 0,
          editorFeedback: "开头钩子有效。",
          contractStatus: "unknown",
          publishUrl: "https://example.com/fanqie",
          notes: "首轮小样本",
          snapshotDate: "2026-01-06T08:00:00.000Z",
        },
        {
          platformId: "qimao",
          platformName: "七猫",
          views: 200,
          clicks: 6,
          favorites: 1,
          follows: 0,
          comments: 0,
          paidReads: 0,
          editorFeedback: "",
          contractStatus: "unknown",
          publishUrl: "",
          notes: "入口弱",
          snapshotDate: "2026-01-06T08:00:00.000Z",
        },
        {
          platformId: "webnovel",
          platformName: "WebNovel",
          views: 300,
          clicks: 45,
          favorites: 18,
          follows: 9,
          comments: 3,
          paidReads: 0,
          editorFeedback: "Editor invite.",
          contractStatus: "invited",
          publishUrl: "https://example.com/webnovel",
          notes: "海外反馈",
          snapshotDate: "2026-01-06T08:00:00.000Z",
        },
      ],
    });
    const fanqie = result.variants.find((variant) => variant.platformId === "fanqie");
    const qimao = result.variants.find((variant) => variant.platformId === "qimao");
    const webnovel = result.variants.find((variant) => variant.platformId === "webnovel");

    assert.ok(fanqie);
    assert.equal(fanqie.effectTracking.status, "promising");
    assert.equal(fanqie.decision.kind, "scale");
    assert.equal(fanqie.effectTracking.clickRatePercent, 15);
    assert.equal(fanqie.effectTracking.favoriteRatePercent, 6);
    assert.ok(qimao);
    assert.equal(qimao.effectTracking.status, "weak");
    assert.ok(qimao.effectTracking.repairFocus.some((item) => item.includes("标题") && item.includes("简介")));
    assert.ok(qimao.effectTracking.repairFocus.some((item) => item.includes("标签") && item.includes("卖点")));
    assert.ok(qimao.effectTracking.repairFocus.some((item) => item.includes("前三章") && item.includes("兑现")));
    assert.equal(qimao.decision.kind, "repair");
    assert.ok(qimao.decision.evidence.some((item) => item.includes("前三章")));
    assert.ok(webnovel);
    assert.equal(webnovel.effectTracking.status, "signed");
    assert.equal(webnovel.decision.kind, "main");
    assert.equal(result.effectSummary.trackedPlatforms, 3);
    assert.equal(result.effectSummary.weakPlatforms, 1);
    assert.equal(result.effectSummary.promisingPlatforms, 1);
    assert.equal(result.effectSummary.signedPlatforms, 1);
    assert.equal(result.decisionBoard.status, "main_locked");
    assert.equal(result.decisionBoard.primaryPlatformId, "webnovel");
    assert.ok(result.decisionBoard.lanes.some((lane) => lane.kind === "repair" && lane.count === 1));
    assert.ok(result.decisionBoard.nextActions.some((action) => action.includes("WebNovel")));
    assert.ok(result.decisionBoard.tasks.some((task) => task.platformId === "webnovel" && task.kind === "main" && task.ownerRole === "增长运营"));
    assert.ok(result.decisionBoard.tasks.some((task) => task.platformId === "qimao" && task.kind === "repair" && task.ownerRole === "平台编辑"));
    const qimaoRepairTask = result.decisionBoard.tasks.find((task) => task.platformId === "qimao" && task.kind === "repair");
    assert.ok(qimaoRepairTask);
    assert.ok(qimaoRepairTask.detail.includes("复盘修复焦点"));
    assert.ok(qimaoRepairTask.acceptanceCriteria.some((item) => item.includes("标题") && item.includes("简介")));
    assert.ok(qimaoRepairTask.acceptanceCriteria.some((item) => item.includes("标签") && item.includes("卖点")));
    assert.ok(qimaoRepairTask.acceptanceCriteria.some((item) => item.includes("前三章") && item.includes("兑现")));
    assert.equal(result.decisionBoard.tasks[0].platformId, "webnovel");
    assert.ok(result.decisionBoard.tasks.every((task) => task.href.startsWith("/projects/project-1#")));
    assert.ok(result.archive.markdown.includes("有苗头"));
    assert.ok(result.archive.markdown.includes("复盘修复焦点"));
    assert.ok(result.archive.markdown.includes("先修前三章兑现"));
  });
});
