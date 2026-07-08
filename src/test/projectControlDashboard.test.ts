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

function readySubmissionAssetForDashboard(platform: (typeof platformProfiles)[number]) {
  const base = {
    id: `asset-ready-${platform.id}`,
    platformId: platform.id,
    platformName: platform.name,
    note: "主战场资产已就绪。",
    source: "manual" as const,
    updatedAt: "2026-01-05T01:00:00.000Z",
  };

  if (platform.id === "qidian") {
    return {
      ...base,
      title: "万界长夜体系",
      logline: "少年在万界规则崩塌后重建升级体系，沿着主线追查旧神伏笔。",
      synopsis: "少年在长夜世界醒来，发现每个境界都对应一段被抹去的历史。他必须重建升级体系，推进长期主线，收束隐藏伏笔，逐步揭开宗门、王朝和旧神之间的利益链，并在每个阶段 Boss 身上拿回失落规则，最终挑战操纵万界的旧神。",
      overseasSynopsis: "",
      tags: ["玄幻", "升级", "世界观"],
    };
  }

  if (platform.id === "qimao") {
    return {
      ...base,
      title: "春风有信",
      logline: "女主回到小镇靠手艺翻身，面对债务、旧爱和家庭误会，慢慢找回生活主动权。",
      synopsis: "女主回到小镇后重新经营点心摊，面对债务、流言、旧爱误会和家庭压力。她靠手艺打开局面，查清旧账本背后的真相，也逐步修复自己和家人、旧恋人之间的关系。后续会保持日更和稳定更新，按七猫平台连载节奏推进生意成长、亲情修复和旧案证据。",
      overseasSynopsis: "",
      tags: ["言情", "种田", "年代"],
    };
  }

  if (platform.id === "jjwxc") {
    return {
      ...base,
      title: "雾中来信",
      logline: "女主收到已故好友来信，与昔日搭档重查旧案并修复彼此信任。",
      synopsis: "女主收到一封旧友来信后回到故乡，与多年未见的搭档重新调查当年的误会。故事会围绕人物动机、关系状态、情感推进和人物弧光展开，让两个人从互相指责到信任修复，也让悬疑旧案服务情感成长终点。",
      overseasSynopsis: "",
      tags: ["现言", "悬疑言情", "情感"],
    };
  }

  if (platform.id === "zhihu_yanxuan") {
    return {
      ...base,
      title: "她替我活着",
      logline: "我参加自己的葬礼，发现最亲近的人都藏着反转真相。",
      synopsis: "我站在自己的遗像前，看见另一个女人用我的名字接受所有人的悼念。前 1000 字直接抛出身份谜团、未婚夫谎言和母亲短信，三段内形成付费期待；后续用复仇、悬疑证据和身份反转推进，结尾回收谁才是真正受害者的答案。",
      overseasSynopsis: "",
      tags: ["悬疑", "复仇", "第一人称反转"],
    };
  }

  if (platform.id === "webnovel") {
    return {
      ...base,
      title: "Night Rain System",
      logline: "A betrayed trainee survives a countdown system, gains power through choices, and turns punishment into progression.",
      synopsis: "",
      overseasSynopsis: "Lin Wan is bound to a countdown system during a night rain disaster. Each timed choice grants power, unlocks new abilities, and exposes a conspiracy around her family. The story promises system progression, revenge, skill growth, and a clear power fantasy as she turns every punishment into a stronger build.",
      tags: ["Fantasy", "System", "Progression"],
    };
  }

  if (platform.id === "royal_road") {
    return {
      ...base,
      title: "Dungeon Rulebook",
      logline: "A clever survivor enters a LitRPG dungeon where every level, skill, and build choice rewrites the rules.",
      synopsis: "",
      overseasSynopsis: "A clever survivor enters a LitRPG dungeon where every room tests his build, stats, and skill choices. Progression comes from learning the rules, exploiting level mechanics, and paying the cost of each upgrade. The story focuses on visible mechanics, tactical survival, and a growing rule system.",
      tags: ["LitRPG", "Progression", "Dungeon"],
    };
  }

  if (platform.id === "wattpad") {
    return {
      ...base,
      title: "Midnight Contract",
      logline: "A young woman signs a forbidden billionaire contract and falls into a romance built on secrets, family shame, and desire.",
      synopsis: "",
      overseasSynopsis: "A young woman signs a midnight contract with a billionaire heir to save her family from ruin. Their romance grows through forbidden attraction, public secrets, and emotional betrayal, while every chapter pushes the relationship from fake alliance toward dangerous love.",
      tags: ["Romance", "Billionaire", "Forbidden Love"],
    };
  }

  return {
    ...base,
    title: "夜雨系统：雨夜倒计时",
    logline: "雨夜倒计时逼她救人，系统惩罚反成翻盘筹码。",
    synopsis: "林晚在雨夜绑定倒计时系统，每一次选择都牵动生死、复仇和悬疑真相。她从被迫救人开始，一步步摸清系统规则，把惩罚变成筹码，把背叛者拖回真相现场，并在连续任务中建立稳定目标：查清当年事故、保护真正重要的人、夺回属于自己的命运。故事保持强钩子、强情绪和连续爽点，适合平台长篇连载。",
    overseasSynopsis: "Night Rain System follows Lin Wan through timed choices and revenge.",
    tags: ["系统", "逆袭", "悬疑"],
  };
}

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
    assert.equal(dashboard.aiPipelineBatch.category, "second_pass");
    assert.equal(dashboard.aiPipelineBatch.canRun, true);
    assert.equal(dashboard.aiPipelineBatch.targetHref, "/tasks#recommended-batch");
    assert.ok(dashboard.aiPipelineBatch.actionLabel.includes("批量二改"));
    assert.equal(dashboard.aiPipelineRecentBatch.hasRecent, false);
    assert.equal(dashboard.aiPipelineRecentBatch.status, "empty");
    assert.equal(dashboard.aiPipelineBatchHealth.hasSamples, false);
    assert.equal(dashboard.aiPipelineBatchHealth.status, "empty");
    assert.ok(dashboard.modelRouteHealth.totalTasks >= 1);
    assert.ok(dashboard.modelRouteHealth.nextActions.length > 0);
    assert.equal(dashboard.productionDecision.status, "watch");
    assert.equal(dashboard.productionDecision.label, "先建样本");
    assert.equal(dashboard.productionDecision.actionExecutable, false);
    assert.equal(dashboard.productionDecision.primaryActionLabel, "执行推荐批次");
    assert.equal(dashboard.productionDecision.primaryTargetHref, "/tasks#recommended-batch");
    assert.ok(dashboard.productionDecision.reason.includes("批量健康"));
    assert.equal(dashboard.storyFoundation.status, "blocked");
    assert.equal(dashboard.storyFoundation.label, "先搭底座");
    assert.equal(dashboard.storyFoundation.axes.length, 5);
    assert.ok(dashboard.storyFoundation.headline.includes("传统写作底座"));
    assert.ok(dashboard.storyFoundation.axes.some((axis) => axis.label === "大树骨架"));
    assert.ok(dashboard.storyFoundation.axes.some((axis) => axis.label === "人物弧光"));
    assert.ok(dashboard.storyFoundation.nextAction.length > 0);
    assert.equal(dashboard.storyFoundation.canExecute, true);
    assert.ok(["outline", "characters", "story-lines", "world", "production"].includes(dashboard.storyFoundation.actionAreaId ?? ""));
    assert.equal(dashboard.storyFoundation.actionMode, "seed");
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
    assert.equal(typeof dashboard.storyFoundation.canExecute, "boolean");
    assert.equal(dashboard.areas.find((area) => area.id === "world")?.status, "good");
    assert.equal(dashboard.areas.find((area) => area.id === "export")?.status, "good");
  });

  await t.test("routes a complete tree without chapter cards to production execution", () => {
    const completeCharacters = [
      { id: "c1", name: "林晚", role: "主角", desire: "查清系统真相", need: "主动承担代价", flaw: "逃避风险", arcStart: "被动求生", arcEnd: "主动破局", voice: "克制直接", relationshipNotes: "和反派形成规则对抗" },
      { id: "c2", name: "沈砚", role: "反派", desire: "控制系统规则", need: "逼主角暴露弱点", flaw: "过度自信", arcStart: "幕后试探", arcEnd: "亲自下场", voice: "冷静压迫", relationshipNotes: "每次出手都抬高代价" },
      { id: "c3", name: "周遥", role: "重要关系", desire: "守住主角的人性", need: "承接情绪代价", flaw: "误解主角选择", arcStart: "旁观质疑", arcEnd: "共同承担", voice: "情绪更外放", relationshipNotes: "推动关系线和选择压力" },
    ];
    const outlineNodes = ["root", "opening", "ending", "trunk", "branch", "branch", "branch", "leaf", "leaf", "soil"].map((type, index) => ({
      id: `${type}-${index}`,
      parentId: index === 0 ? null : "root-0",
      chapterId: null,
      type,
      title: `${type}节点`,
      summary: `${type}摘要`,
      goal: `${type}目标`,
      hook: `${type}钩子`,
      conflict: `${type}冲突`,
      valueShift: `${type}转变`,
      platformNote: `${type}平台提示`,
      order: index,
      depth: index === 0 ? 0 : 1,
      status: "planned",
    }));

    const dashboard = buildProjectControlDashboard({
      project: { ...project, currentWordCount: 1200 },
      platform: getPlatformProfile("fanqie"),
      chapters: [chapter],
      outlineNodes,
      characters: completeCharacters,
      worldEntries: [
        { id: "w1", type: "system_rule", title: "系统规则", content: "系统每次奖励都绑定代价、限制和下一轮压力，不能让主角无成本解决问题；每次选择都必须带出新的敌人、债务或身份风险。" },
        { id: "w2", type: "taboo", title: "禁忌限制", content: "不能无代价复活，不能临时洗白，不能用无铺垫外挂跳过关键选择；任何突破都要交换记忆、关系、资源或安全身份。" },
        { id: "w3", type: "platform_soil", title: "番茄平台土壤", content: "每章必须快速给钩子、冲突、爽点和章末追读，设定解释只能服务选择压力；前三章必须高密度兑现卖点。" },
      ],
      foreshadows: [
        { id: "f1", title: "系统异常", setupChapterId: "chapter-1", payoffChapterId: "chapter-1", relatedCharacterIds: "[]", status: "paid_off", notes: "已回收" },
      ],
      plotThreads: [
        { id: "p1", type: "main", title: "系统主线", startChapterId: "chapter-1", endChapterId: "chapter-1", status: "resolved" },
      ],
      aiTasks: [],
      submissionChecklist: checklist,
    });

    assert.equal(dashboard.storyFoundation.status, "blocked");
    assert.equal(dashboard.storyFoundation.actionAreaId, "production");
    assert.equal(dashboard.storyFoundation.actionMode, "seed");
    assert.equal(dashboard.storyFoundation.canExecute, true);
    assert.ok(dashboard.storyFoundation.actionLabel.includes("章节叶片"));
    assert.equal(dashboard.priorityActions.find((action) => action.areaId === "production")?.executeLabel, "生成章节卡");
  });

  await t.test("summarizes draft batches when cards are ready and no review work exists", () => {
    const dashboard = buildProjectControlDashboard({
      project,
      platform: getPlatformProfile("fanqie"),
      chapters: [
        {
          ...chapter,
          id: "chapter-ready-draft",
          wordCount: 0,
          content: "",
          status: "outline",
          goal: "让主角被系统逼进不可逆选择。",
          hook: "系统倒计时只剩十秒。",
          conflict: "主角必须在逃跑和救人之间选择。",
          valueShift: "平静生活转向失控危机。",
          cliffhanger: "系统刷新第二个任务。",
        },
      ],
      outlineNodes: [],
      characters: [],
      worldEntries: [],
      foreshadows: [],
      plotThreads: [],
      aiTasks: [],
      submissionChecklist: checklist,
    });

    assert.equal(dashboard.aiPipelineBatch.category, "draft");
    assert.equal(dashboard.aiPipelineBatch.chapterIds[0], "chapter-ready-draft");
    assert.ok(dashboard.aiPipelineBatch.headline.includes("小批生成正文"));
    assert.ok(dashboard.areas.find((area) => area.id === "ai-pipeline")?.nextAction.includes("章节卡已过线"));
  });

  await t.test("surfaces the latest recommended batch evidence on the project dashboard", () => {
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
      gateActionAudits: [
        {
          receiptId: "batch-old",
          label: "旧批次",
          detail: "旧批次",
          href: "/tasks",
          status: "succeeded",
          message: "旧批次完成。",
          executionType: "recommended_batch",
          succeededCount: 1,
          failedCount: 0,
          payload: JSON.stringify({
            routeEffectSummary: { successRatePercent: 100, knownCostUsd: 0.01, averageQualityScore: 88, verdict: "旧证据。" },
            batchReceipt: { status: "continue", headline: "旧批次可继续", detail: "旧详情。", warnings: [] },
          }),
          createdAt: "2026-01-01T00:00:00.000Z",
        },
        {
          receiptId: "batch-new",
          label: "推荐批次",
          detail: "推荐批次",
          href: "/projects/demo-project#ai-pipeline",
          status: "succeeded",
          message: "推荐批次完成。",
          executionType: "recommended_batch",
          succeededCount: 3,
          failedCount: 1,
          payload: JSON.stringify({
            plan: {
              scaleDecisionLabel: "禁止放大",
              scaleDecisionTone: "block",
              scaleDecisionDetail: "当前命中失败样本，先完成修复与复检，再回到推荐批次。",
            },
            routeEffectSummary: { successRatePercent: 75, knownCostUsd: 0.0425, averageQualityScore: 78, verdict: "成功率偏低。" },
            batchReceipt: {
              status: "repair",
              headline: "批次有失败，先修再放大",
              detail: "第三章执行失败，先处理失败。",
              primaryLabel: "查看失败修复",
              primaryHref: "/failures",
              secondaryLabel: "回任务队列",
              secondaryHref: "/tasks",
              evidenceItems: ["成功/失败：3/1", "成功率：75%", "质量：78", "成本：$0.0425"],
              warnings: ["成功率偏低。", "失败批次不要继续放大。"],
            },
          }),
          createdAt: "2026-01-02T00:00:00.000Z",
        },
      ],
      submissionChecklist: checklist,
    });

    assert.equal(dashboard.aiPipelineRecentBatch.hasRecent, true);
    assert.equal(dashboard.aiPipelineRecentBatch.status, "repair");
    assert.equal(dashboard.aiPipelineRecentBatch.label, "先修复");
    assert.equal(dashboard.aiPipelineRecentBatch.successRatePercent, 75);
    assert.equal(dashboard.aiPipelineRecentBatch.averageQualityScore, 78);
    assert.equal(dashboard.aiPipelineRecentBatch.knownCostUsd, 0.0425);
    assert.equal(dashboard.aiPipelineRecentBatch.succeededCount, 3);
    assert.equal(dashboard.aiPipelineRecentBatch.failedCount, 1);
    assert.equal(dashboard.aiPipelineRecentBatch.scaleDecisionLabel, "禁止放大");
    assert.equal(dashboard.aiPipelineRecentBatch.scaleDecisionTone, "block");
    assert.ok(dashboard.aiPipelineRecentBatch.scaleDecisionDetail.includes("修复与复检"));
    assert.equal(dashboard.aiPipelineRecentBatch.actionLabel, "查看失败修复");
    assert.equal(dashboard.aiPipelineRecentBatch.targetHref, "/failures");
    assert.equal(dashboard.aiPipelineRecentBatch.secondaryActionLabel, "回任务队列");
    assert.equal(dashboard.aiPipelineRecentBatch.secondaryTargetHref, "/tasks");
    assert.deepEqual(dashboard.aiPipelineRecentBatch.evidenceBadges.slice(0, 3), ["成功/失败：3/1", "成功率：75%", "质量：78"]);
    assert.equal(dashboard.aiPipelineRecentBatch.actionExecutable, true);
    assert.equal(dashboard.aiPipelineRecentBatch.actionAreaId, "ai-pipeline");
    assert.equal(dashboard.aiPipelineRecentBatch.actionMode, "seed");
    assert.equal(dashboard.aiPipelineRecentBatch.executeLabel, "生成修复清单");
    assert.equal(dashboard.aiPipelineRecentBatch.relayLabel, "修复接力");
    assert.equal(dashboard.aiPipelineRecentBatch.relayTargetHref, "#ai-pipeline");
    assert.ok(dashboard.aiPipelineRecentBatch.relayDetail.includes("本书批量健康"));
    assert.ok(dashboard.aiPipelineRecentBatch.relayDetail.includes("完成清单后再复检"));
    assert.ok(dashboard.aiPipelineRecentBatch.warnings.some((warning) => warning.includes("不要继续放大")));
    assert.equal(dashboard.aiPipelineBatchHealth.hasSamples, false);
  });

  await t.test("summarizes project-scoped third-round batch health", () => {
    const tactic = {
      title: "首轮平台打法：番茄小说",
      label: "三轮稳住",
      primaryTactic: "三轮数据已站住，可以小批放大。",
      openingMove: "第一段给不可逆危机。",
      verificationMove: "继续回填曝光、点击、收藏和追读。",
      risk: "稳定加码不是无限放量。",
    };
    const dashboard = buildProjectControlDashboard({
      project,
      platform: getPlatformProfile("fanqie"),
      chapters: [chapter],
      outlineNodes: [],
      characters: [],
      worldEntries: [],
      foreshadows: [],
      plotThreads: [],
      aiTasks: [
        {
          id: "review-stable-1",
          chapterId: "chapter-1",
          taskType: "chapter_review",
          status: "succeeded",
          outputText: JSON.stringify({ score: 92, issues: [] }),
          errorMessage: null,
          modelProvider: "Claude",
          model: "claude-sonnet-4.5",
          costUsd: 0.01,
          createdAt: "2026-01-02T00:00:00.000Z",
        },
      ],
      gateActionAudits: [
        {
          receiptId: "stable-2",
          label: "三轮稳住批次健康，继续小步加码",
          detail: "番茄小说 · 夜雨系统 · 批量初稿 2 个",
          href: "/tasks#recommended-batch",
          status: "succeeded",
          message: "推荐批次完成。",
          executionType: "recommended_batch",
          succeededCount: 2,
          failedCount: 0,
          payload: JSON.stringify({
            plan: { strategyBases: [tactic], actionLabel: "批量初稿 2 个", category: "draft" },
            routeEffectSummary: { successRatePercent: 100, knownCostUsd: 0.02, averageQualityScore: 90 },
            batchReceipt: { status: "continue", headline: "三轮稳住批次健康，继续小步加码" },
          }),
          createdAt: "2026-01-02T00:00:00.000Z",
        },
        {
          receiptId: "stable-1",
          label: "三轮稳住批次健康，继续小步加码",
          detail: "番茄小说 · 夜雨系统 · 批量初稿 2 个",
          href: "/tasks#recommended-batch",
          status: "succeeded",
          message: "推荐批次完成。",
          executionType: "recommended_batch",
          succeededCount: 2,
          failedCount: 0,
          payload: JSON.stringify({
            plan: { strategyBases: [tactic], actionLabel: "批量初稿 2 个", category: "draft" },
            routeEffectSummary: { successRatePercent: 100, knownCostUsd: 0.02, averageQualityScore: 88 },
            batchReceipt: { status: "continue", headline: "三轮稳住批次健康，继续小步加码" },
          }),
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      submissionChecklist: checklist,
    });

    assert.equal(dashboard.aiPipelineBatchHealth.hasSamples, true);
    assert.equal(dashboard.aiPipelineBatchHealth.status, "usable");
    assert.equal(dashboard.aiPipelineBatchHealth.label, "可参考");
    assert.equal(dashboard.aiPipelineBatchHealth.scaleDecisionLabel, "允许小步加码");
    assert.equal(dashboard.aiPipelineBatchHealth.scaleDecisionTone, "allow");
    assert.ok(dashboard.aiPipelineBatchHealth.scaleDecisionDetail.includes("小步加码"));
    assert.equal(dashboard.productionDecision.status, "continue");
    assert.equal(dashboard.productionDecision.label, "继续生产");
    assert.equal(dashboard.productionDecision.actionExecutable, false);
    assert.equal(dashboard.productionDecision.primaryActionLabel, "执行推荐批次");
    assert.equal(dashboard.productionDecision.primaryTargetHref, "/tasks#recommended-batch");
    assert.ok(dashboard.productionDecision.reason.includes("批量健康"));
    assert.ok(dashboard.productionDecision.reason.includes("模型路线"));
    assert.equal(dashboard.aiPipelineBatchHealth.tacticLabel, "三轮稳住打法");
    assert.equal(dashboard.aiPipelineBatchHealth.sampleBatches, 2);
    assert.equal(dashboard.aiPipelineBatchHealth.successRatePercent, 100);
    assert.equal(dashboard.aiPipelineBatchHealth.averageQualityScore, 89);
    assert.ok(dashboard.aiPipelineBatchHealth.detail.includes("小步验证"));
  });

  await t.test("surfaces AI small-batch recovery as batch health evidence", () => {
    const tactic = {
      title: "首轮平台打法：番茄小说",
      label: "三轮稳住",
      primaryTactic: "三轮数据已站住，可以小批放大。",
      openingMove: "第一段给不可逆危机。",
      verificationMove: "继续回填曝光、点击、收藏和追读。",
      risk: "稳定加码不是无限放量。",
    };
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
      gateActionAudits: [
        {
          receiptId: "ai-scale-1",
          label: "AI 写审改小批恢复完成",
          detail: "番茄小说 · 夜雨系统 · 批量初稿 3 个",
          href: "/projects/demo-project#ai-pipeline",
          status: "succeeded",
          message: "AI 小批恢复完成。",
          executionType: "recommended_batch",
          succeededCount: 3,
          failedCount: 0,
          payload: JSON.stringify({
            aiPipelineRecheck: {
              dispatchKey: "ai-pipeline-recheck:demo-project:ai-plan-1:scale",
              mode: "small_batch_resume",
            },
            plan: { strategyBases: [tactic], scaleGate: "none", actionLabel: "批量初稿 3 个", category: "draft" },
            routeEffectSummary: { successRatePercent: 100, knownCostUsd: 0.03, averageQualityScore: 91 },
            batchReceipt: { status: "continue", headline: "AI 小批恢复完成" },
          }),
          createdAt: "2026-01-04T00:00:00.000Z",
        },
      ],
      submissionChecklist: checklist,
    });

    assert.equal(dashboard.aiPipelineBatchHealth.hasSamples, true);
    assert.equal(dashboard.aiPipelineBatchHealth.scaleDecisionLabel, "继续观察");
    assert.equal(dashboard.aiPipelineBatchHealth.scaleDecisionTone, "watch");
    assert.ok(dashboard.aiPipelineBatchHealth.scaleDecisionDetail.includes("恢复放量样本还薄"));
    assert.equal(dashboard.aiPipelineBatchHealth.sampleBatches, 1);
    assert.equal(dashboard.aiPipelineBatchHealth.tacticLabel, "恢复放量观察");
    assert.equal(dashboard.aiPipelineBatchHealth.executeLabel, "再跑稳定批次");
    assert.equal(dashboard.areas.find((area) => area.id === "ai-pipeline")?.executeLabel, "再跑稳定批次");
    assert.ok(dashboard.aiPipelineBatchHealth.evidence[0]?.includes("恢复放量"));
    assert.ok(dashboard.aiPipelineBatchHealth.detail.includes("恢复放量样本还薄"));
  });

  await t.test("points repeated recovery stability to platform tactic experience library", () => {
    const tactic = {
      title: "首轮平台打法：番茄小说",
      label: "三轮稳住",
      primaryTactic: "三轮数据已站住，可以小批放大。",
      openingMove: "第一段给不可逆危机。",
      verificationMove: "继续回填曝光、点击、收藏和追读。",
      risk: "稳定加码不是无限放量。",
    };
    const scalePayload = (dispatchKey: string, quality: number) => JSON.stringify({
      aiPipelineRecheck: { dispatchKey, mode: "small_batch_resume" },
      plan: { strategyBases: [tactic], scaleGate: "none", actionLabel: "批量初稿 3 个", category: "draft" },
      routeEffectSummary: { successRatePercent: 100, knownCostUsd: 0.03, averageQualityScore: quality },
      batchReceipt: { status: "continue", headline: "AI 小批恢复完成" },
    });
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
      gateActionAudits: [
        {
          receiptId: "ai-scale-2",
          label: "AI 写审改小批恢复完成",
          detail: "番茄小说 · 夜雨系统 · 批量初稿 3 个",
          href: "/projects/demo-project#ai-pipeline",
          status: "succeeded",
          message: "AI 小批恢复完成。",
          executionType: "recommended_batch",
          succeededCount: 3,
          failedCount: 0,
          payload: scalePayload("ai-pipeline-recheck:demo-project:ai-plan-1:scale-2", 92),
          createdAt: "2026-01-05T00:00:00.000Z",
        },
        {
          receiptId: "ai-scale-1",
          label: "AI 写审改小批恢复完成",
          detail: "番茄小说 · 夜雨系统 · 批量初稿 3 个",
          href: "/projects/demo-project#ai-pipeline",
          status: "succeeded",
          message: "AI 小批恢复完成。",
          executionType: "recommended_batch",
          succeededCount: 3,
          failedCount: 0,
          payload: scalePayload("ai-pipeline-recheck:demo-project:ai-plan-1:scale-1", 90),
          createdAt: "2026-01-04T00:00:00.000Z",
        },
      ],
      submissionChecklist: checklist,
    });

    assert.equal(dashboard.aiPipelineBatchHealth.status, "usable");
    assert.equal(dashboard.aiPipelineBatchHealth.recoveryBatches, 2);
    assert.equal(dashboard.aiPipelineBatchHealth.actionLabel, "写入经验库");
    assert.equal(dashboard.aiPipelineBatchHealth.targetHref, "#platform-tactic-experience");
    assert.equal(dashboard.areas.find((area) => area.id === "ai-pipeline")?.actionLabel, "沉淀经验库");
  });

  await t.test("uses blocked batch health to reprioritize AI pipeline repair", () => {
    const dashboard = buildProjectControlDashboard({
      project,
      platform: getPlatformProfile("fanqie"),
      chapters: [chapter],
      outlineNodes: [],
      characters: [],
      worldEntries: [],
      foreshadows: [],
      plotThreads: [],
      aiTasks: [
        { id: "review-1", chapterId: "chapter-1", taskType: "chapter_review", status: "succeeded", outputText: JSON.stringify({ score: 86, issues: [] }), errorMessage: null, createdAt: "2026-01-01T00:00:00.000Z" },
      ],
      gateActionAudits: [
        {
          receiptId: "blocked-batch",
          label: "失败批次",
          detail: "番茄小说 · 夜雨系统 · 批量初稿 2 个",
          href: "/tasks#recommended-batch",
          status: "failed",
          message: "推荐批次失败。",
          executionType: "recommended_batch",
          succeededCount: 0,
          failedCount: 2,
          payload: JSON.stringify({
            plan: {
              strategyBases: [{
                title: "首轮平台打法：番茄小说",
                label: "三轮稳住",
                primaryTactic: "三轮数据已站住，可以小批放大。",
                openingMove: "第一段给不可逆危机。",
                verificationMove: "继续回填曝光、点击、收藏和追读。",
                risk: "稳定加码不是无限放量。",
              }],
              actionLabel: "批量初稿 2 个",
              category: "draft",
            },
            routeEffectSummary: { successRatePercent: 0, knownCostUsd: 0.02, averageQualityScore: 68 },
            batchReceipt: { status: "repair", headline: "批次有失败，先修再放大" },
          }),
          createdAt: "2026-01-02T00:00:00.000Z",
        },
      ],
      submissionChecklist: checklist,
    });
    const aiArea = dashboard.areas.find((area) => area.id === "ai-pipeline");

    assert.equal(dashboard.aiPipelineBatchHealth.status, "blocked");
    assert.equal(dashboard.aiPipelineBatchHealth.scaleDecisionLabel, "禁止放大");
    assert.equal(dashboard.aiPipelineBatchHealth.scaleDecisionTone, "block");
    assert.ok(dashboard.aiPipelineBatchHealth.scaleDecisionDetail.includes("先修复"));
    assert.equal(dashboard.productionDecision.status, "repair");
    assert.equal(dashboard.productionDecision.label, "先修复");
    assert.equal(dashboard.productionDecision.actionExecutable, true);
    assert.equal(dashboard.productionDecision.actionAreaId, "ai-pipeline");
    assert.equal(dashboard.productionDecision.actionMode, "seed");
    assert.equal(dashboard.productionDecision.executeLabel, "生成修复清单");
    assert.equal(dashboard.productionDecision.primaryActionLabel, "修批量打法");
    assert.equal(dashboard.productionDecision.primaryTargetHref, "/failures");
    assert.equal(aiArea?.status, "blocked");
    assert.equal(aiArea?.actionLabel, "修批量打法");
    assert.equal(aiArea?.canExecute, true);
    assert.equal(aiArea?.executeLabel, "生成修复清单");
    assert.equal(dashboard.aiPipelineBatchHealth.actionExecutable, true);
    assert.equal(dashboard.aiPipelineBatchHealth.actionAreaId, "ai-pipeline");
    assert.equal(dashboard.aiPipelineBatchHealth.executeLabel, "生成修复清单");
    assert.ok(aiArea?.nextAction.includes("先别继续复用"));
    assert.ok(dashboard.criticalActions.some((action) => action.includes("AI 写审改：")));
  });

  await t.test("surfaces the latest AI pipeline repair checklist progress", () => {
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
      gateActionAudits: [
        {
          receiptId: "ai-plan-1",
          actionId: "ai-pipeline-control:demo-project",
          label: "批量打法修复清单",
          detail: "三轮稳住打法：成功率 0%，质量 68，失败 2。",
          href: "/projects/demo-project#ai-pipeline",
          status: "succeeded",
          message: "已生成批量打法修复清单。",
          executionType: "control_action",
          succeededCount: 3,
          failedCount: 0,
          payload: JSON.stringify({
            aiPipelineControlPlan: {
              status: "repair",
              tacticLabel: "三轮稳住打法",
              tacticTitle: "首轮平台打法：番茄小说",
              sampleBatches: 1,
              successRatePercent: 0,
              averageQualityScore: 68,
              failedTasks: 2,
              items: [
                { id: "stop-scale", label: "停用三轮稳住打法继续放量", completed: true },
                { id: "review-failures", label: "复盘 2 个失败任务的错误原因", completed: false },
                { id: "rerun-sample", label: "拆成 1 章小样本复验", completed: false },
              ],
              nextActions: ["停用三轮稳住打法继续放量", "复盘 2 个失败任务的错误原因", "拆成 1 章小样本复验"],
            },
          }),
          createdAt: "2026-01-03T00:00:00.000Z",
        },
      ],
      submissionChecklist: checklist,
    });

    assert.equal(dashboard.aiPipelineControlPlan.hasPlan, true);
    assert.equal(dashboard.aiPipelineControlPlan.receiptId, "ai-plan-1");
    assert.equal(dashboard.aiPipelineControlPlan.status, "repair");
    assert.equal(dashboard.aiPipelineControlPlan.completedCount, 1);
    assert.equal(dashboard.aiPipelineControlPlan.totalCount, 3);
    assert.equal(dashboard.aiPipelineControlPlan.items[0].completed, true);
    assert.ok(dashboard.aiPipelineControlPlan.nextAction.includes("还剩 2 项"));
  });

  await t.test("routes blocked batch production decision to an active AI pipeline checklist", () => {
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
      gateActionAudits: [
        {
          receiptId: "blocked-batch",
          label: "失败批次",
          detail: "番茄小说 · 夜雨系统 · 批量初稿 2 个",
          href: "/tasks#recommended-batch",
          status: "failed",
          message: "推荐批次失败。",
          executionType: "recommended_batch",
          succeededCount: 0,
          failedCount: 2,
          payload: JSON.stringify({
            plan: {
              strategyBases: [{
                title: "首轮平台打法：番茄小说",
                label: "三轮稳住",
                primaryTactic: "三轮数据已站住，可以小批放大。",
                openingMove: "第一段给不可逆危机。",
                verificationMove: "继续回填曝光、点击、收藏和追读。",
                risk: "稳定加码不是无限放量。",
              }],
              actionLabel: "批量初稿 2 个",
              category: "draft",
            },
            routeEffectSummary: { successRatePercent: 0, knownCostUsd: 0.02, averageQualityScore: 68 },
            batchReceipt: { status: "repair", headline: "批次有失败，先修再放大" },
          }),
          createdAt: "2026-01-02T00:00:00.000Z",
        },
        {
          receiptId: "ai-plan-active",
          actionId: "ai-pipeline-control:demo-project",
          label: "批量打法修复清单",
          detail: "三轮稳住打法：成功率 0%，质量 68，失败 2。",
          href: "/projects/demo-project#ai-pipeline",
          status: "succeeded",
          message: "已生成批量打法修复清单。",
          executionType: "control_action",
          succeededCount: 3,
          failedCount: 0,
          payload: JSON.stringify({
            aiPipelineControlPlan: {
              status: "repair",
              items: [
                { id: "stop-scale", label: "停用三轮稳住打法继续放量", completed: true },
                { id: "review-failures", label: "复盘 2 个失败任务的错误原因", completed: false },
              ],
            },
          }),
          createdAt: "2026-01-03T00:00:00.000Z",
        },
      ],
      submissionChecklist: checklist,
    });

    assert.equal(dashboard.aiPipelineBatchHealth.status, "blocked");
    assert.equal(dashboard.productionDecision.status, "repair");
    assert.equal(dashboard.productionDecision.actionExecutable, false);
    assert.equal(dashboard.productionDecision.actionAreaId, null);
    assert.equal(dashboard.productionDecision.actionMode, null);
    assert.equal(dashboard.productionDecision.dispatchStatus, "assigned");
    assert.equal(dashboard.productionDecision.dispatchLabel, "清单处理中");
    assert.ok(dashboard.productionDecision.dispatchDetail.includes("1/2"));
    assert.equal(dashboard.productionDecision.dispatchHref, "#ai-pipeline");
    assert.equal(dashboard.productionDecision.primaryActionLabel, "看修复清单");
    assert.equal(dashboard.productionDecision.primaryTargetHref, "#ai-pipeline");
  });

  await t.test("enables AI pipeline recheck after every repair checklist item is complete", () => {
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
      gateActionAudits: [
        {
          receiptId: "ai-plan-complete",
          actionId: "ai-pipeline-control:demo-project",
          label: "批量打法修复清单",
          detail: "三轮稳住打法：成功率 0%，质量 68，失败 2。",
          href: "/projects/demo-project#ai-pipeline",
          status: "succeeded",
          message: "已生成批量打法修复清单。",
          executionType: "control_action",
          succeededCount: 3,
          failedCount: 0,
          payload: JSON.stringify({
            aiPipelineControlPlan: {
              status: "repair",
              items: [
                { id: "stop-scale", label: "停用三轮稳住打法继续放量", completed: true },
                { id: "review-failures", label: "复盘 2 个失败任务的错误原因", completed: true },
                { id: "rerun-sample", label: "拆成 1 章小样本复验", completed: true },
              ],
            },
          }),
          createdAt: "2026-01-03T00:00:00.000Z",
        },
      ],
      submissionChecklist: checklist,
    });

    assert.equal(dashboard.aiPipelineControlPlan.completedCount, 3);
    assert.equal(dashboard.aiPipelineControlPlan.canRecheck, true);
    assert.equal(dashboard.aiPipelineControlPlan.recheckLabel, "复检批量健康");
    assert.ok(dashboard.aiPipelineControlPlan.nextAction.includes("清单已全部完成"));
  });

  await t.test("surfaces AI pipeline recheck dispatch handoff", () => {
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
      gateActionAudits: [
        {
          receiptId: "ai-plan-dispatched",
          actionId: "ai-pipeline-control:demo-project",
          label: "批量打法修复清单",
          detail: "三轮稳住打法：成功率 0%，质量 68，失败 2。",
          href: "/projects/demo-project#ai-pipeline",
          status: "succeeded",
          message: "复检完成：先修打法。只能恢复小样本复验。",
          executionType: "control_action",
          succeededCount: 3,
          failedCount: 0,
          payload: JSON.stringify({
            aiPipelineControlPlan: {
              status: "repair",
              items: [
                { id: "stop-scale", label: "停用三轮稳住打法继续放量", completed: true },
              ],
              recheck: {
                status: "sample_required",
                healthLabel: "先修打法",
                detail: "还有失败样本。",
                dispatchKey: "ai-pipeline-recheck:demo-project:ai-plan-dispatched:sample",
                dispatchTitle: "AI 写审改：跑 1 章小样本复验",
              },
            },
          }),
          createdAt: "2026-01-03T00:00:00.000Z",
        },
      ],
      submissionChecklist: checklist,
    });

    assert.equal(dashboard.aiPipelineControlPlan.recheckStatus, "sample_required");
    assert.equal(dashboard.aiPipelineControlPlan.recheckDispatchKey, "ai-pipeline-recheck:demo-project:ai-plan-dispatched:sample");
    assert.equal(dashboard.aiPipelineControlPlan.recheckDispatchTitle, "AI 写审改：跑 1 章小样本复验");
    assert.equal(dashboard.aiPipelineControlPlan.recheckDispatchHref, "/dispatch?queue=ai_pipeline#dispatch-ai-pipeline-recheck:demo-project:ai-plan-dispatched:sample");
    assert.equal(dashboard.aiPipelineControlPlan.recheckActionLabel, "运行 1 章复验");
    assert.equal(dashboard.aiPipelineControlPlan.recheckOutcomeLabel, "继续修复");
    assert.equal(dashboard.aiPipelineControlPlan.recheckOutcomeTone, "warning");
    assert.ok(dashboard.aiPipelineControlPlan.recheckOutcomeDetail.includes("1 章小样本复验"));
    assert.ok(dashboard.aiPipelineControlPlan.recheckOutcomeDetail.includes("派单验收"));
    assert.equal(dashboard.aiPipelineControlPlan.canRecheck, false);
  });

  await t.test("surfaces AI pipeline recheck recovery outcome", () => {
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
      gateActionAudits: [
        {
          receiptId: "ai-plan-ready",
          actionId: "ai-pipeline-control:demo-project",
          label: "批量打法修复清单",
          detail: "三轮稳住打法：成功率 0%，质量 68，失败 2。",
          href: "/projects/demo-project#ai-pipeline",
          status: "succeeded",
          message: "复检完成：可小批恢复。",
          executionType: "control_action",
          succeededCount: 3,
          failedCount: 0,
          payload: JSON.stringify({
            aiPipelineControlPlan: {
              status: "watch",
              items: [
                { id: "stop-scale", label: "停用三轮稳住打法继续放量", completed: true },
              ],
              recheck: {
                status: "small_batch_ready",
                healthLabel: "可小批恢复",
                detail: "小样本通过，可以恢复谨慎小批。",
              },
            },
          }),
          createdAt: "2026-01-03T00:00:00.000Z",
        },
      ],
      submissionChecklist: checklist,
    });

    assert.equal(dashboard.aiPipelineControlPlan.recheckOutcomeLabel, "可小样本恢复");
    assert.equal(dashboard.aiPipelineControlPlan.recheckOutcomeTone, "success");
    assert.ok(dashboard.aiPipelineControlPlan.recheckOutcomeDetail.includes("谨慎小批"));
    assert.equal(dashboard.aiPipelineControlPlan.recheckActionLabel, "恢复小批执行");
    assert.equal(dashboard.aiPipelineControlPlan.recheckActionHref, "/tasks#recommended-batch");
  });

  await t.test("turns AI recovery outcome into visible prompt memory", () => {
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
      gateActionAudits: [
        {
          receiptId: "ai-plan-ready",
          actionId: "ai-pipeline-control:demo-project",
          label: "批量打法修复清单",
          detail: "三轮稳住打法：成功率 0%，质量 68，失败 2。",
          href: "/projects/demo-project#ai-pipeline",
          status: "succeeded",
          message: "复检完成：可小批恢复。",
          executionType: "control_action",
          succeededCount: 3,
          failedCount: 0,
          payload: JSON.stringify({
            aiPipelineControlPlan: {
              status: "watch",
              items: [
                { id: "stop-scale", label: "停用三轮稳住打法继续放量", completed: true },
              ],
              recheck: {
                status: "small_batch_ready",
                healthLabel: "可小批恢复",
                detail: "小样本通过，可以恢复谨慎小批。",
              },
            },
          }),
          createdAt: "2026-01-03T00:00:00.000Z",
        },
        {
          receiptId: "ai-plan-sample",
          actionId: "ai-pipeline-control:demo-project",
          label: "批量打法小样本复验",
          detail: "三轮稳住打法：先回 1 章小样本。",
          href: "/projects/demo-project#ai-pipeline",
          status: "succeeded",
          message: "复检完成：继续观察。",
          executionType: "control_action",
          succeededCount: 1,
          failedCount: 0,
          payload: JSON.stringify({
            aiPipelineControlPlan: {
              status: "watch",
              items: [{ id: "sample", label: "回到 1 章样本", completed: true }],
              recheck: {
                status: "sample_required",
                healthLabel: "继续小样本复验",
                detail: "质量证据不足，先继续观察。",
              },
            },
          }),
          createdAt: "2026-01-02T00:00:00.000Z",
        },
      ],
      submissionChecklist: checklist,
    });

    assert.equal(dashboard.aiPipelinePromptMemory.hasMemory, true);
    assert.equal(dashboard.aiPipelinePromptMemory.label, "提示词已携带恢复记忆");
    assert.equal(dashboard.aiPipelinePromptMemory.lifecycleStatus, "active");
    assert.equal(dashboard.aiPipelinePromptMemory.lifecycleLabel, "继续生效");
    assert.equal(dashboard.aiPipelinePromptMemory.gateTone, "ready");
    assert.equal(dashboard.aiPipelinePromptMemory.gateStatusLabel, "小批观察");
    assert.ok(dashboard.aiPipelinePromptMemory.gateStatusDetail.includes("只允许小批"));
    assert.equal(dashboard.aiPipelinePromptMemory.gateActionMode, "link");
    assert.equal(dashboard.aiPipelinePromptMemory.gateActionLabel, "去小批执行");
    assert.equal(dashboard.aiPipelinePromptMemory.gateActionHref, "/tasks#recommended-batch");
    assert.equal(dashboard.aiPipelinePromptMemory.actionLabel, "继续小批观察");
    assert.ok(dashboard.aiPipelinePromptMemory.controlDetail.includes("失效条件"));
    assert.ok(dashboard.aiPipelinePromptMemory.headline.includes("可小批恢复"));
    assert.ok(dashboard.aiPipelinePromptMemory.detail.includes("初稿、审稿、二改"));
    assert.ok(dashboard.aiPipelinePromptMemory.promptBlock.includes("AI 写审改恢复证据"));
    assert.ok(dashboard.aiPipelinePromptMemory.promptBlock.includes("谨慎小批"));
    assert.equal(dashboard.aiPipelinePromptMemory.promptFeedback.statusLabel, "可恢复");
    assert.equal(dashboard.aiPipelinePromptMemory.promptFeedback.headline, "可小批恢复，提示词正在携带恢复约束");
    assert.ok(dashboard.aiPipelinePromptMemory.promptFeedback.detail.includes("小样本通过"));
    assert.equal(dashboard.aiPipelinePromptMemory.promptFeedback.primaryActionLabel, "继续小批，不放大批");
    assert.deepEqual(dashboard.aiPipelinePromptMemory.history.map((item) => `${item.statusLabel}:${item.transitionLabel}`), [
      "可恢复:继续观察 -> 可恢复",
      "继续观察:初始：继续观察",
    ]);
    assert.equal(dashboard.aiPipelinePromptMemory.history[0].sourceLabel, "批量打法修复清单");
    assert.equal(dashboard.aiPipelinePromptMemory.history[0].primaryActionLabel, "继续小批，不放大批");
    assert.ok(dashboard.aiPipelinePromptMemory.history[1].detail.includes("质量证据不足"));
    assert.ok(dashboard.aiPipelinePromptMemory.evidence.some((item) => item.includes("小样本通过")));
    assert.equal(dashboard.aiPipelinePromptMemory.targetHref, "#ai-pipeline");
    assert.equal(dashboard.aiPipelinePromptMemory.latestAt, "2026-01-03T00:00:00.000Z");
  });

  await t.test("marks AI recovery prompt memory for rollback when resumed batch falls below quality", () => {
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
      gateActionAudits: [
        {
          receiptId: "ai-scale-weak",
          label: "AI 写审改小批恢复跌线",
          detail: "番茄小说 · 夜雨系统 · 批量初稿 3 个",
          href: "/projects/demo-project#ai-pipeline",
          status: "failed",
          message: "恢复小批质量跌线，暂停继续放量。",
          executionType: "recommended_batch",
          succeededCount: 2,
          failedCount: 1,
          payload: JSON.stringify({
            aiPipelineRecheck: {
              dispatchKey: "ai-pipeline-recheck:demo-project:ai-plan-1:scale",
              mode: "small_batch_resume",
            },
            routeEffectSummary: { successRatePercent: 67, knownCostUsd: 0.04, averageQualityScore: 72 },
            batchReceipt: {
              status: "review_quality",
              headline: "恢复小批质量跌线",
              detail: "质量低于 85，先回滚到 1 章复验。",
            },
          }),
          createdAt: "2026-01-04T00:00:00.000Z",
        },
      ],
      submissionChecklist: checklist,
    });

    assert.equal(dashboard.aiPipelinePromptMemory.hasMemory, true);
    assert.equal(dashboard.aiPipelinePromptMemory.lifecycleStatus, "rollback");
    assert.equal(dashboard.aiPipelinePromptMemory.lifecycleLabel, "回滚小样本");
    assert.equal(dashboard.aiPipelinePromptMemory.gateTone, "blocked");
    assert.equal(dashboard.aiPipelinePromptMemory.gateStatusLabel, "禁止放量");
    assert.ok(dashboard.aiPipelinePromptMemory.gateStatusDetail.includes("1 章复验"));
    assert.equal(dashboard.aiPipelinePromptMemory.gateActionMode, "rollback");
    assert.equal(dashboard.aiPipelinePromptMemory.gateActionLabel, "派 1 章复验");
    assert.equal(dashboard.aiPipelinePromptMemory.gateActionHref, null);
    assert.equal(dashboard.aiPipelinePromptMemory.actionLabel, "回滚到 1 章复验");
    assert.ok(dashboard.aiPipelinePromptMemory.controlDetail.includes("暂停小批"));
    assert.ok(dashboard.aiPipelinePromptMemory.nextAction.includes("不要继续扩大批量"));
    assert.ok(dashboard.aiPipelinePromptMemory.promptBlock.includes("回滚到小样本修复"));
    assert.equal(dashboard.aiPipelinePromptMemory.targetHref, "#ai-pipeline");
  });

  await t.test("clears older AI recovery prompt memory with a control receipt", () => {
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
      gateActionAudits: [
        {
          receiptId: "ai-memory-clear",
          actionId: "ai-pipeline-memory:demo-project",
          label: "AI 恢复记忆已清除",
          detail: "人工清除旧恢复记忆。",
          href: "/projects/demo-project#ai-pipeline",
          status: "succeeded",
          message: "旧恢复记忆已清除，后续提示词不再携带这条证据。",
          executionType: "control_action",
          succeededCount: 1,
          failedCount: 0,
          payload: JSON.stringify({
            aiPipelinePromptMemoryControl: {
              action: "clear",
              label: "清除旧记忆",
              detail: "旧恢复证据已过期，停止带入提示词。",
            },
          }),
          createdAt: "2026-01-05T00:00:00.000Z",
        },
        {
          receiptId: "ai-plan-ready",
          actionId: "ai-pipeline-control:demo-project",
          label: "批量打法修复清单",
          detail: "三轮稳住打法：成功率 0%，质量 68，失败 2。",
          href: "/projects/demo-project#ai-pipeline",
          status: "succeeded",
          message: "复检完成：可小批恢复。",
          executionType: "control_action",
          succeededCount: 3,
          failedCount: 0,
          payload: JSON.stringify({
            aiPipelineControlPlan: {
              status: "watch",
              items: [{ id: "stop-scale", label: "停用三轮稳住打法继续放量", completed: true }],
              recheck: {
                status: "small_batch_ready",
                healthLabel: "可小批恢复",
                detail: "小样本通过，可以恢复谨慎小批。",
              },
            },
          }),
          createdAt: "2026-01-03T00:00:00.000Z",
        },
      ],
      submissionChecklist: checklist,
    });

    assert.equal(dashboard.aiPipelinePromptMemory.hasMemory, false);
    assert.equal(dashboard.aiPipelinePromptMemory.lifecycleStatus, "empty");
    assert.equal(dashboard.aiPipelinePromptMemory.lifecycleLabel, "已清除");
    assert.equal(dashboard.aiPipelinePromptMemory.gateTone, "empty");
    assert.equal(dashboard.aiPipelinePromptMemory.gateStatusLabel, "无恢复证据");
    assert.ok(dashboard.aiPipelinePromptMemory.gateStatusDetail.includes("等待新复检"));
    assert.equal(dashboard.aiPipelinePromptMemory.gateActionMode, null);
    assert.equal(dashboard.aiPipelinePromptMemory.gateActionLabel, null);
    assert.equal(dashboard.aiPipelinePromptMemory.gateActionHref, null);
    assert.equal(dashboard.aiPipelinePromptMemory.label, "提示词记忆已清除");
    assert.equal(dashboard.aiPipelinePromptMemory.promptBlock, "");
    assert.ok(dashboard.aiPipelinePromptMemory.controlDetail.includes("旧恢复证据已过期"));
    assert.equal(dashboard.aiPipelinePromptMemory.latestAt, "2026-01-05T00:00:00.000Z");
  });

  await t.test("manual rollback control overrides active AI recovery prompt memory", () => {
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
      gateActionAudits: [
        {
          receiptId: "ai-memory-rollback",
          actionId: "ai-pipeline-memory:demo-project",
          label: "AI 恢复记忆回滚小样本",
          detail: "人工回滚恢复记忆。",
          href: "/projects/demo-project#ai-pipeline",
          status: "succeeded",
          message: "已把恢复记忆回滚到 1 章复验。",
          executionType: "control_action",
          succeededCount: 1,
          failedCount: 0,
          payload: JSON.stringify({
            aiPipelinePromptMemoryControl: {
              action: "rollback",
              label: "人工回滚",
              detail: "读感不稳，先回滚到 1 章复验。",
            },
          }),
          createdAt: "2026-01-05T00:00:00.000Z",
        },
        {
          receiptId: "ai-plan-ready",
          actionId: "ai-pipeline-control:demo-project",
          label: "批量打法修复清单",
          detail: "三轮稳住打法：成功率 0%，质量 68，失败 2。",
          href: "/projects/demo-project#ai-pipeline",
          status: "succeeded",
          message: "复检完成：可小批恢复。",
          executionType: "control_action",
          succeededCount: 3,
          failedCount: 0,
          payload: JSON.stringify({
            aiPipelineControlPlan: {
              status: "watch",
              items: [{ id: "stop-scale", label: "停用三轮稳住打法继续放量", completed: true }],
              recheck: {
                status: "small_batch_ready",
                healthLabel: "可小批恢复",
                detail: "小样本通过，可以恢复谨慎小批。",
              },
            },
          }),
          createdAt: "2026-01-03T00:00:00.000Z",
        },
      ],
      submissionChecklist: checklist,
    });

    assert.equal(dashboard.aiPipelinePromptMemory.hasMemory, true);
    assert.equal(dashboard.aiPipelinePromptMemory.lifecycleStatus, "rollback");
    assert.equal(dashboard.aiPipelinePromptMemory.lifecycleLabel, "回滚小样本");
    assert.equal(dashboard.aiPipelinePromptMemory.gateTone, "blocked");
    assert.equal(dashboard.aiPipelinePromptMemory.gateStatusLabel, "禁止放量");
    assert.ok(dashboard.aiPipelinePromptMemory.gateStatusDetail.includes("人工回滚"));
    assert.equal(dashboard.aiPipelinePromptMemory.gateActionMode, "rollback");
    assert.equal(dashboard.aiPipelinePromptMemory.gateActionLabel, "派 1 章复验");
    assert.equal(dashboard.aiPipelinePromptMemory.gateActionHref, null);
    assert.equal(dashboard.aiPipelinePromptMemory.actionLabel, "回滚到 1 章复验");
    assert.ok(dashboard.aiPipelinePromptMemory.promptBlock.includes("人工回滚"));
    assert.ok(dashboard.aiPipelinePromptMemory.controlDetail.includes("读感不稳"));
    assert.equal(dashboard.aiPipelinePromptMemory.latestAt, "2026-01-05T00:00:00.000Z");
  });

  await t.test("summarizes model route health for the project control dashboard", () => {
    const dashboard = buildProjectControlDashboard({
      project: {
        ...project,
        aiMonthlyBudgetUsd: 5,
        aiMaxTaskCostUsd: 0.25,
        aiMaxBatchCostUsd: 1,
        aiMaxFailureRatePercent: 20,
        aiBudgetEnforcement: "block",
      },
      platform: getPlatformProfile("fanqie"),
      chapters: [chapter],
      outlineNodes: [],
      characters: [],
      worldEntries: [],
      foreshadows: [],
      plotThreads: [],
      modelProviders: [
        {
          id: "deepseek-provider",
          providerId: "deepseek",
          displayName: "DeepSeek",
          defaultModel: "deepseek-chat",
          enabled: true,
          encryptedApiKey: "encrypted",
        },
        {
          id: "gpt-provider",
          providerId: "gpt",
          displayName: "GPT",
          defaultModel: "gpt-4.1",
          enabled: true,
          encryptedApiKey: "encrypted",
        },
      ],
      modelRoutes: [
        { taskType: "chapter_draft", primaryProviderConfigId: "deepseek-provider", fallbackProviderConfigId: "gpt-provider" },
        { taskType: "chapter_review", primaryProviderConfigId: "gpt-provider", fallbackProviderConfigId: "deepseek-provider" },
      ],
      aiTasks: [
        {
          id: "draft-1",
          projectId: "project-1",
          chapterId: "chapter-1",
          taskType: "chapter_draft",
          providerConfigId: "deepseek-provider",
          model: "deepseek-chat",
          status: "succeeded",
          outputText: JSON.stringify({ score: 88 }),
          inputSnapshot: "{}",
          inputTokens: 1000,
          outputTokens: 1400,
          costUsd: 0.01,
          errorMessage: null,
          createdAt: "2026-01-01T00:00:00.000Z",
          modelProvider: { providerId: "deepseek", displayName: "DeepSeek" },
        },
        {
          id: "draft-2",
          projectId: "project-1",
          chapterId: "chapter-1",
          taskType: "chapter_draft",
          providerConfigId: "deepseek-provider",
          model: "deepseek-chat",
          status: "succeeded",
          outputText: JSON.stringify({ score: 92 }),
          inputSnapshot: "{}",
          inputTokens: 900,
          outputTokens: 1300,
          costUsd: 0.01,
          errorMessage: null,
          createdAt: "2026-01-02T00:00:00.000Z",
          modelProvider: { providerId: "deepseek", displayName: "DeepSeek" },
        },
        {
          id: "review-1",
          projectId: "project-1",
          chapterId: "chapter-1",
          taskType: "chapter_review",
          providerConfigId: "gpt-provider",
          model: "gpt-4.1",
          status: "failed",
          outputText: null,
          inputSnapshot: "{}",
          inputTokens: 700,
          outputTokens: 0,
          costUsd: 0.02,
          errorMessage: "timeout",
          createdAt: "2026-01-03T00:00:00.000Z",
          modelProvider: { providerId: "gpt", displayName: "GPT" },
        },
        {
          id: "review-2",
          projectId: "project-1",
          chapterId: "chapter-1",
          taskType: "chapter_review",
          providerConfigId: "gpt-provider",
          model: "gpt-4.1",
          status: "failed",
          outputText: null,
          inputSnapshot: "{}",
          inputTokens: 700,
          outputTokens: 0,
          costUsd: 0.02,
          errorMessage: "timeout",
          createdAt: "2026-01-04T00:00:00.000Z",
          modelProvider: { providerId: "gpt", displayName: "GPT" },
        },
      ],
      submissionChecklist: checklist,
    });

    assert.equal(dashboard.modelRouteHealth.status, "repair");
    assert.equal(dashboard.modelRouteHealth.label, "先修路由");
    assert.equal(dashboard.modelRouteHealth.configuredProviders, 2);
    assert.equal(dashboard.modelRouteHealth.enabledProviders, 2);
    assert.equal(dashboard.modelRouteHealth.successRatePercent, 50);
    assert.equal(dashboard.modelRouteHealth.failureRatePercent, 50);
    assert.ok(dashboard.modelRouteHealth.preferredRouteLabels.some((label) => label.includes("正文初稿")));
    assert.ok(dashboard.modelRouteHealth.avoidRouteLabels.some((label) => label.includes("章节审稿")));
    assert.equal(dashboard.modelRouteHealth.targetHref, "/settings/models");
    assert.equal(dashboard.productionDecision.status, "repair");
    assert.equal(dashboard.productionDecision.label, "先修复");
    assert.equal(dashboard.productionDecision.actionExecutable, true);
    assert.equal(dashboard.productionDecision.actionAreaId, "model-route");
    assert.equal(dashboard.productionDecision.actionMode, "seed");
    assert.equal(dashboard.productionDecision.executeLabel, "生成模型路线修复派单");
    assert.equal(dashboard.productionDecision.primaryActionLabel, "修模型路线");
  });

  await t.test("feeds model route repair dispatch status back into production decision", () => {
    const dashboard = buildProjectControlDashboard({
      project: {
        ...project,
        aiMonthlyBudgetUsd: 5,
        aiMaxTaskCostUsd: 0.25,
        aiMaxBatchCostUsd: 1,
        aiMaxFailureRatePercent: 20,
        aiBudgetEnforcement: "block",
      },
      platform: getPlatformProfile("fanqie"),
      chapters: [chapter],
      outlineNodes: [],
      characters: [],
      worldEntries: [],
      foreshadows: [],
      plotThreads: [],
      modelProviders: [
        {
          id: "gpt-provider",
          providerId: "gpt",
          displayName: "GPT",
          defaultModel: "gpt-4.1",
          enabled: true,
          encryptedApiKey: "encrypted",
        },
      ],
      modelRoutes: [
        { taskType: "chapter_review", primaryProviderConfigId: "gpt-provider", fallbackProviderConfigId: null },
      ],
      aiTasks: [
        {
          id: "review-1",
          projectId: "project-1",
          chapterId: "chapter-1",
          taskType: "chapter_review",
          providerConfigId: "gpt-provider",
          model: "gpt-4.1",
          status: "failed",
          outputText: null,
          inputSnapshot: "{}",
          inputTokens: 700,
          outputTokens: 0,
          costUsd: 0.02,
          errorMessage: "timeout",
          createdAt: "2026-01-03T00:00:00.000Z",
          modelProvider: { providerId: "gpt", displayName: "GPT" },
        },
      ],
      gateDispatchTasks: [
        {
          dispatchKey: "model-route-repair:project-1:123",
          stage: "model_route_confirmation_recheck",
          state: "assigned",
          title: "模型路线修复派单",
          detail: "修复章节审稿模型路线。",
          href: "/settings/models?projectId=project-1#model-task-audit",
          actionLabel: "修复并复测",
          completionEvidence: "",
          reviewLatestAt: "2026-01-04T00:00:00.000Z",
        },
      ],
      submissionChecklist: checklist,
    });

    assert.equal(dashboard.productionDecision.dispatchStatus, "assigned");
    assert.equal(dashboard.productionDecision.dispatchLabel, "已派单");
    assert.ok(dashboard.productionDecision.dispatchDetail.includes("模型路线修复派单"));
    assert.equal(dashboard.productionDecision.dispatchHref, "/dispatch#dispatch-model-route-repair:project-1:123");
    assert.equal(dashboard.productionDecision.actionExecutable, false);
    assert.equal(dashboard.productionDecision.primaryActionLabel, "查看模型路线派单");
    assert.equal(dashboard.productionDecision.primaryTargetHref, "/dispatch#dispatch-model-route-repair:project-1:123");
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
      submissionAssets: platformProfiles.map(readySubmissionAssetForDashboard),
      submissionChecklist: { ...checklist, readinessPercent: 90, items: [] },
    });

    assert.equal(dashboard.platformVerdict.actionKind, "rewrite_first_three");
    assert.equal(dashboard.platformVerdict.actionExecutable, true);
    assert.equal(dashboard.platformVerdict.actionLabel, "重写前三章");
    assert.equal(dashboard.platformVerdict.actionAnchor, "first-three-rewrite");
  });
});
