import test from "node:test";
import assert from "node:assert/strict";
import { getPlatformProfile, platformProfiles } from "../lib/platforms/platformProfiles.ts";
import { buildProjectControlDashboard } from "../lib/projects/projectControlDashboard.ts";

const project = {
  title: "夜雨系统",
  genre: "都市系统",
  sellingPoint: "雨夜危机中觉醒系统，主角用选择翻盘。",
  targetLengthType: "long_300k_plus",
  targetWordCount: 300000,
  currentWordCount: 1200,
  updateCadence: "daily_4000",
};
const chapter = {
  id: "chapter-1",
  order: 1,
  title: "第一章 雨夜系统",
  content: "林晚推开门，系统提示音在雨夜响起。",
  wordCount: 1200,
  goal: "让主角遭遇系统。",
  hook: "系统倒计时出现。",
  conflict: "主角必须救人或逃跑。",
  valueShift: "平静转向危机。",
  cliffhanger: "系统给出第二个任务。",
  status: "draft",
  updatedAt: "2026-01-01T00:00:00.000Z",
};
const checklist = {
  readinessPercent: 70,
  passCount: 7,
  todoCount: 2,
  riskCount: 1,
  items: [{ id: "word-count", label: "投稿字数", status: "todo" as const, detail: "字数不足。" }],
};

test("buildProjectControlDashboard", async (t) => {
  await t.test("aggregates project health areas and critical actions", () => {
    const dashboard = buildProjectControlDashboard({
      project,
      platform: getPlatformProfile("fanqie"),
      chapters: [chapter],
      outlineNodes: [
        { id: "root", parentId: null, chapterId: null, type: "root", title: "总纲", summary: "总纲", goal: "总目标", hook: "总钩子", conflict: "总冲突", valueShift: "总转变", platformNote: "平台", order: 0, depth: 0, status: "planned" },
        { id: "opening", parentId: "root", chapterId: "chapter-1", type: "opening", title: "开头", summary: "开头", goal: "目标", hook: "钩子", conflict: "冲突", valueShift: "转变", platformNote: "平台", order: 1, depth: 1, status: "chapter_card" },
      ],
      characters: [],
      worldEntries: [],
      foreshadows: [],
      plotThreads: [],
      aiTasks: [
        { id: "review-1", chapterId: "chapter-1", taskType: "chapter_review", status: "succeeded", outputText: JSON.stringify({ score: 72, issues: [{ type: "hook" }] }), errorMessage: null, createdAt: "2026-01-01T00:00:00.000Z" },
        {
          id: "asset-1",
          chapterId: null,
          taskType: "control_asset_generate",
          status: "succeeded",
          inputSnapshot: JSON.stringify({ areaId: "world" }),
          outputText: JSON.stringify({
            generated: {
              worldEntries: [
                { type: "system_rule", title: "雨夜系统", content: "系统每次奖励都绑定新的债务和关系压力。" },
              ],
            },
            qualityGate: { score: 88, status: "pass", passed: true, issues: [], nextActions: [] },
            repair: { attempted: true },
          }),
          errorMessage: null,
          createdAt: "2026-01-02T00:00:00.000Z",
        },
      ],
      submissionChecklist: checklist,
    });

    assert.equal(dashboard.areas.length, 8);
    assert.equal(dashboard.metrics.chapters, 1);
    assert.equal(dashboard.metrics.publishableChapters, 1);
    assert.equal(dashboard.platformVerdict.status, "needs_evidence");
    assert.ok(dashboard.platformVerdict.primaryPlatformName);
    assert.ok(dashboard.platformVerdict.nextAction.length > 0);
    assert.equal(dashboard.platformVerdict.actionKind, "save_evidence_baseline");
    assert.equal(dashboard.platformVerdict.actionExecutable, true);
    assert.equal(dashboard.platformVerdict.actionLabel, "保存证据基准");
    assert.equal(dashboard.platformVerdict.targetAnchor, "platform-strategy-verdict");
    assert.equal(dashboard.platformFeedback.total, 0);
    assert.equal(dashboard.platformFeedback.targetAnchor, "platform-knowledge");
    assert.ok(dashboard.platformFeedback.headline.includes("还没有平台反哺链路回执"));
    assert.equal(dashboard.platformEvidenceLoop.status, "empty");
    assert.equal(dashboard.platformEvidenceLoop.score, 0);
    assert.equal(dashboard.platformEvidenceLoop.actionLabel, "启动证据闭环");
    assert.equal(dashboard.storyFoundation.status, "blocked");
    assert.equal(dashboard.storyFoundation.label, "先搭底座");
    assert.equal(dashboard.storyFoundation.axes.length, 5);
    assert.ok(dashboard.storyFoundation.headline.includes("传统写作底座"));
    assert.ok(dashboard.storyFoundation.axes.some((axis) => axis.label === "大树骨架"));
    assert.ok(dashboard.storyFoundation.axes.some((axis) => axis.label === "人物弧光"));
    assert.ok(dashboard.storyFoundation.nextAction.length > 0);
    assert.equal(dashboard.areas.find((area) => area.id === "export")?.status, "blocked");
    assert.ok(dashboard.areas.find((area) => area.id === "export")?.nextAction.includes("先处理"));
    assert.equal(dashboard.priorityActions.length, 4);
    assert.ok(dashboard.priorityActions.some((action) => action.areaId === "characters" && action.targetAnchor === "character-arc"));
    assert.ok(dashboard.priorityActions.every((action) => action.actionLabel.length > 0));
    assert.ok(dashboard.priorityActions.some((action) => action.areaId === "characters" && action.canExecute && action.executeLabel === "补人物卡"));
    assert.ok(dashboard.priorityActions.some((action) => action.areaId === "characters" && action.canGenerate && action.generateLabel === "AI 生成人物"));
    assert.equal(dashboard.controlAssetQualityReports.length, 1);
    assert.equal(dashboard.controlAssetQualityReports[0].areaLabel, "世界观资料");
    assert.equal(dashboard.controlAssetQualityReports[0].score, 88);
    assert.equal(dashboard.controlAssetQualityReports[0].repaired, true);
    assert.ok(dashboard.overallScore > 0);
    assert.ok(dashboard.criticalActions.some((action) => action.includes("人物弧光")));
  });

  await t.test("surfaces platform feedback receipts as control evidence", () => {
    const dashboard = buildProjectControlDashboard({
      project,
      platform: getPlatformProfile("fanqie"),
      chapters: [chapter],
      outlineNodes: [],
      characters: [],
      worldEntries: [],
      foreshadows: [],
      plotThreads: [],
      aiTasks: [],
      platformKnowledgeFeedbackReceipts: [
        {
          id: "feedback-1",
          platformId: "fanqie",
          platformName: "番茄小说",
          actionLabel: "执行正反馈链",
          title: "番茄小说｜反哺链路回执",
          message: "把正反馈经验继续喂给生成链路。",
          completedStepLabel: "保存证据基准",
          stopReason: "第一步已自动完成。",
          nextAction: "继续生成投稿资产候选。",
          href: "#package-version-history",
          severity: "success",
          createdAt: "2026-01-06T00:00:00.000Z",
        },
      ],
      submissionChecklist: checklist,
    });

    assert.equal(dashboard.platformFeedback.total, 1);
    assert.equal(dashboard.platformFeedback.successCount, 1);
    assert.equal(dashboard.platformFeedback.latest?.platformName, "番茄小说");
    assert.equal(dashboard.platformFeedback.latest?.completedStepLabel, "保存证据基准");
    assert.equal(dashboard.platformFeedback.targetAnchor, "package-version-history");
    assert.ok(dashboard.platformFeedback.headline.includes("执行正反馈链"));
    assert.equal(dashboard.platformEvidenceLoop.platformName, "番茄小说");
    assert.equal(dashboard.platformEvidenceLoop.feedbackCount, 1);
    assert.ok(dashboard.platformEvidenceLoop.score > 0);
  });

  await t.test("scores platform evidence loop from gate completion and publish metrics", () => {
    const dashboard = buildProjectControlDashboard({
      project,
      platform: getPlatformProfile("fanqie"),
      chapters: [chapter],
      outlineNodes: [],
      characters: [],
      worldEntries: [],
      foreshadows: [],
      plotThreads: [],
      aiTasks: [],
      platformPublishMetrics: [
        {
          id: "metric-fanqie",
          platformId: "fanqie",
          platformName: "番茄小说",
          views: 1600,
          clicks: 320,
          favorites: 120,
          follows: 80,
          comments: 18,
          paidReads: 4,
          editorFeedback: "编辑建议继续放量。",
          contractStatus: "pending",
          publishUrl: "",
          notes: "首轮数据转好。",
          snapshotDate: "2026-01-07T00:00:00.000Z",
        },
      ],
      platformKnowledgeFeedbackReceipts: [
        {
          id: "gate-dispatch-completion:feedback-1",
          platformId: "fanqie",
          platformName: "番茄小说",
          actionLabel: "Gate 派单完成回灌",
          title: "番茄小说｜Gate 派单完成回灌",
          message: "Gate 派单已完成。",
          completedStepLabel: "Gate 派单完成：修平台包装",
          stopReason: "已收口派单完成证据，无需再次派单。",
          nextAction: "回到平台导出中心复核反哺历史，并刷新项目控制台。",
          href: "/projects/demo-project#platform-export",
          severity: "success",
          createdAt: "2026-01-07T01:00:00.000Z",
        },
        {
          id: "feedback-2",
          platformId: "fanqie",
          platformName: "番茄小说",
          actionLabel: "保存证据基准",
          title: "番茄小说｜反哺链路回执",
          message: "保存改版前证据。",
          completedStepLabel: "保存证据基准",
          stopReason: "基准已保存。",
          nextAction: "观察下一轮发布效果。",
          href: "#platform-export",
          severity: "success",
          createdAt: "2026-01-06T00:00:00.000Z",
        },
      ],
      submissionChecklist: checklist,
    });

    assert.equal(dashboard.platformEvidenceLoop.status, "scale");
    assert.equal(dashboard.platformEvidenceLoop.label, "可加码");
    assert.ok(dashboard.platformEvidenceLoop.score >= 80);
    assert.equal(dashboard.platformEvidenceLoop.gateCompletionCount, 1);
    assert.equal(dashboard.platformEvidenceLoop.metricsCount, 1);
    assert.ok(dashboard.platformEvidenceLoop.evidence.some((item) => item.includes("Gate 完成回灌")));
  });

  await t.test("rewards a more complete production system", () => {
    const dashboard = buildProjectControlDashboard({
      project: { ...project, currentWordCount: 2400 },
      platform: getPlatformProfile("fanqie"),
      chapters: [{ ...chapter, wordCount: 2400, status: "revising" }],
      outlineNodes: ["root", "opening", "ending", "trunk", "soil"].map((type, index) => ({
        id: type,
        parentId: index === 0 ? null : "root",
        chapterId: type === "opening" ? "chapter-1" : null,
        type,
        title: type,
        summary: type,
        goal: type,
        hook: type,
        conflict: type,
        valueShift: type,
        platformNote: type,
        order: index,
        depth: index === 0 ? 0 : 1,
        status: "planned",
      })),
      characters: [
        { id: "c1", name: "林晚", role: "主角", desire: "查清系统", need: "主动选择", flaw: "逃避", arcStart: "被动", arcEnd: "主动", voice: "克制", relationshipNotes: "和反派有牵连" },
      ],
      worldEntries: [
        { id: "w1", type: "system_rule", title: "系统规则", content: "系统任务必须伴随代价，并推动主角做出高风险选择。每次奖励都要带出新的债务、敌人或关系压力。" },
        { id: "w2", type: "taboo", title: "复活禁忌", content: "不能无代价复活，任何复活都必须交换记忆或关系。禁忌一旦触发，会让主角失去最重要的证据。" },
        { id: "w3", type: "platform_soil", title: "平台土壤", content: "每章必须有爽点、冲突和章末追读，信息要前置。设定只服务选择压力，不能连续解释超过两段。" },
        { id: "w4", type: "platform_soil", title: "首轮平台打法：番茄小说", content: "状态：历史可复用\n打法：番茄小说 已完成修复、复测、重验和效果回填，可以作为同类平台的恢复模板。\n开头动作：新项目可复用：先修标题简介标签和前三章兑现，再小步重验。\n验证动作：创建后先跑前三章和平台包装，再记录首轮曝光、点击、收藏、追读。\n风险：不要直接放量，先保留小步验证窗口。\n交接状态：reuse\n交接标签：复用交接\n交接说明：沿用番茄历史高压钩子，但首日必须回填数据证据。\n推荐平台：番茄小说\n推荐模板：fanqie_system_reversal\n首日动作：开头：第一段给倒计时。\n首日动作：验证：回填前三章追读。\n避坑边界：不要直接放量，先做小样本。" },
      ],
      foreshadows: [
        { id: "f1", title: "系统异常", setupChapterId: "chapter-1", payoffChapterId: "chapter-1", relatedCharacterIds: "[]", status: "paid_off", notes: "已回收" },
      ],
      plotThreads: [
        { id: "p1", type: "main", title: "系统主线", startChapterId: "chapter-1", endChapterId: "chapter-1", status: "resolved" },
      ],
      aiTasks: [
        { id: "draft-1", chapterId: "chapter-1", taskType: "chapter_draft", status: "succeeded", outputText: chapter.content, errorMessage: null, createdAt: "2026-01-01T00:00:00.000Z" },
        { id: "review-1", chapterId: "chapter-1", taskType: "chapter_review", status: "succeeded", outputText: JSON.stringify({ score: 88, shouldSecondPass: false, issues: [] }), errorMessage: null, createdAt: "2026-01-02T00:00:00.000Z" },
        { id: "second-1", chapterId: "chapter-1", taskType: "chapter_second_pass", status: "succeeded", outputText: chapter.content, errorMessage: null, createdAt: "2026-01-03T00:00:00.000Z" },
      ],
      publishSnapshots: [
        {
          id: "snapshot-fanqie",
          platformId: "fanqie",
          platformName: "番茄小说",
          title: "夜雨系统",
          action: "snapshot",
          chapterCount: 1,
          wordCount: 2400,
          preflightScore: 95,
          canExport: true,
          createdAt: "2026-01-04T00:00:00.000Z",
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
          snapshotDate: "2026-01-05T00:00:00.000Z",
        },
      ],
      submissionChecklist: { ...checklist, readinessPercent: 90, items: [] },
    });

    assert.ok(dashboard.overallScore >= 60);
    assert.ok(["ready", "needs_repair", "needs_evidence"].includes(dashboard.platformVerdict.status));
    assert.equal(dashboard.platformVerdict.primaryPlatformName, "番茄小说");
    assert.ok(dashboard.platformVerdict.primaryScore > 0);
    assert.ok(dashboard.platformVerdict.actionLabel.length > 0);
    assert.equal(dashboard.startTactic?.label, "历史可复用");
    assert.equal(dashboard.startTactic?.handoffStatus, "reuse");
    assert.equal(dashboard.startTactic?.handoffLabel, "复用交接");
    assert.ok(dashboard.startTactic?.firstDayActions?.some((action) => action.includes("第一段给倒计时")));
    assert.ok(dashboard.startTactic?.avoidRules?.some((rule) => rule.includes("不要直接放量")));
    assert.ok(dashboard.startTactic?.openingMove.includes("小步重验"));
    assert.ok(dashboard.startTactic?.verificationMove.includes("首轮曝光"));
    assert.equal(dashboard.startDecision.status, "scale");
    assert.equal(dashboard.startDecision.label, "可放大");
    assert.equal(dashboard.startDecision.actionLabel, "进入小批放大");
    assert.equal(dashboard.startDecision.targetAnchor, "ai-pipeline");
    assert.ok(dashboard.startDecision.nextExperiment.includes("前三章"));
    assert.ok(dashboard.startDecision.evidence.some((item) => item.includes("历史可复用")));
    assert.ok(dashboard.startDecision.evidence.some((item) => item.includes("复用交接")));
    assert.ok(dashboard.startDecision.evidence.some((item) => item.includes("推荐模板")));
    assert.ok(dashboard.startDecision.evidence.some((item) => item.includes("避坑边界")));
    assert.ok(dashboard.storyFoundation.score >= 60);
    assert.ok(["good", "watch"].includes(dashboard.storyFoundation.status));
    assert.ok(dashboard.storyFoundation.axes.some((axis) => axis.id === "world" && axis.status === "good"));
    assert.ok(dashboard.storyFoundation.axes.some((axis) => axis.id === "characters" && axis.score > 0));
    assert.equal(dashboard.areas.find((area) => area.id === "world")?.status, "good");
    assert.equal(dashboard.areas.find((area) => area.id === "export")?.status, "good");
  });

  await t.test("pauses project starts when the stored tactic is a historical avoidance signal", () => {
    const dashboard = buildProjectControlDashboard({
      project,
      platform: getPlatformProfile("qimao"),
      chapters: [chapter],
      outlineNodes: [],
      characters: [],
      worldEntries: [
        {
          id: "w-avoid",
          type: "platform_soil",
          title: "首轮平台打法：七猫免费小说",
          content: [
            "状态：批量避坑",
            "打法：不要复用开场三页设定说明，先回到强冲突和强情绪。",
            "开头动作：避开已验证失败开头：主角先讲设定再遇危机；改用：第一屏先给身份暴露和保底悬念。",
            "验证动作：创建后只做小批验证，先看前三章审稿分、失败率和平台包装，不允许直接放量。",
            "风险：先拆失败样本和低分原因，暂停把这套打法继续放进新批次。",
          ].join("\n"),
        },
      ],
      foreshadows: [],
      plotThreads: [],
      aiTasks: [],
      submissionChecklist: checklist,
    });

    assert.equal(dashboard.startTactic?.label, "批量避坑");
    assert.equal(dashboard.startDecision.status, "pause");
    assert.equal(dashboard.startDecision.label, "先停用");
    assert.equal(dashboard.startDecision.actionLabel, "重写前三章");
    assert.equal(dashboard.startDecision.targetAnchor, "first-three-rewrite");
    assert.ok(dashboard.startDecision.headline.includes("别再复用"));
    assert.ok(dashboard.startDecision.nextExperiment.includes("小批验证"));
    assert.ok(dashboard.startDecision.evidence.some((item) => item.includes("批量避坑")));
  });

  await t.test("promotes executable asset generation after evidence baseline exists", () => {
    const dashboard = buildProjectControlDashboard({
      project,
      platform: getPlatformProfile("fanqie"),
      chapters: [chapter],
      outlineNodes: [],
      characters: [],
      worldEntries: [],
      foreshadows: [],
      plotThreads: [],
      aiTasks: [],
      publishSnapshots: platformProfiles.map((platform) => ({
          id: `snapshot-weak-asset-${platform.id}`,
          platformId: platform.id,
          platformName: platform.name,
          title: "夜雨系统",
          action: "snapshot",
          chapterCount: 1,
          wordCount: 1200,
          preflightScore: 55,
          canExport: false,
          createdAt: "2026-01-04T00:00:00.000Z",
        })),
      submissionAssets: platformProfiles.map((platform) => ({
          id: `asset-weak-${platform.id}`,
          platformId: platform.id,
          platformName: platform.name,
          title: "夜",
          logline: "系统。",
          synopsis: "她醒了。",
          overseasSynopsis: "",
          tags: ["慢热"],
          note: "弱资产。",
          source: "manual",
          updatedAt: "2026-01-04T01:00:00.000Z",
        })),
      submissionChecklist: checklist,
    });

    assert.equal(dashboard.platformVerdict.actionKind, "generate_asset_variants");
    assert.equal(dashboard.platformVerdict.actionExecutable, true);
    assert.equal(dashboard.platformVerdict.actionLabel, "生成投稿资产候选");
    assert.equal(dashboard.platformVerdict.actionAnchor, "submission-asset-editor");
  });

  await t.test("promotes executable first-three rewrite after assets are ready", () => {
    const firstThree = [1, 2, 3].map((order) => ({
      ...chapter,
      id: `chapter-${order}`,
      order,
      title: `第${order}章 雨夜系统`,
      content: "林晚推开门，系统提示音在雨夜响起。她必须马上做选择，否则雨中的人会死。",
      wordCount: 1600,
      hook: "系统倒计时出现。",
      conflict: "主角必须救人或逃跑。",
      cliffhanger: "系统给出第二个任务。",
    }));

    const dashboard = buildProjectControlDashboard({
      project: { ...project, currentWordCount: 4800 },
      platform: getPlatformProfile("fanqie"),
      chapters: firstThree,
      outlineNodes: [],
      characters: [],
      worldEntries: [],
      foreshadows: [],
      plotThreads: [],
      aiTasks: [],
      publishSnapshots: platformProfiles.map((platform) => ({
        id: `snapshot-before-rewrite-${platform.id}`,
        platformId: platform.id,
        platformName: platform.name,
        title: "夜雨系统",
        action: "snapshot",
        chapterCount: 3,
        wordCount: 4800,
        preflightScore: 72,
        canExport: false,
        createdAt: "2026-01-05T00:00:00.000Z",
      })),
      submissionAssets: platformProfiles.map((platform) => ({
        id: `asset-ready-${platform.id}`,
        platformId: platform.id,
        platformName: platform.name,
        title: "夜雨系统：雨夜倒计时",
        logline: "雨夜倒计时逼她救人，系统惩罚反成翻盘筹码。",
        synopsis: "林晚在雨夜绑定倒计时系统，每一次选择都牵动生死、复仇和悬疑真相。她从被迫救人开始，一步步摸清系统规则，把惩罚变成筹码，把背叛者拖回真相现场，并在连续任务中建立稳定目标：查清当年事故、保护真正重要的人、夺回属于自己的命运。故事保持强钩子、强情绪和连续爽点，适合平台长篇连载。",
        overseasSynopsis: "Night Rain System follows Lin Wan through timed choices and revenge.",
        tags: ["系统", "逆袭", "悬疑"],
        note: "主战场资产已就绪。",
        source: "manual",
        updatedAt: "2026-01-05T01:00:00.000Z",
      })),
      submissionChecklist: { ...checklist, readinessPercent: 90, items: [] },
    });

    assert.equal(dashboard.platformVerdict.actionKind, "rewrite_first_three");
    assert.equal(dashboard.platformVerdict.actionExecutable, true);
    assert.equal(dashboard.platformVerdict.actionLabel, "重写前三章");
    assert.equal(dashboard.platformVerdict.actionAnchor, "first-three-rewrite");
  });
});
