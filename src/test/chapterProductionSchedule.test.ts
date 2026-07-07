import test from "node:test";
import assert from "node:assert/strict";
import { getPlatformProfile } from "../lib/platforms/platformProfiles.ts";
import { buildChapterProductionSchedule } from "../lib/projects/chapterProductionSchedule.ts";

const project = {
  title: "夜雨系统",
  targetLengthType: "long_300k_plus",
  targetWordCount: 300000,
  currentWordCount: 6000,
  updateCadence: "日更4k",
};

const platform = getPlatformProfile("fanqie");

test("buildChapterProductionSchedule", async (t) => {
  await t.test("turns outline and support materials into a production queue", () => {
    const schedule = buildChapterProductionSchedule({
      project,
      platform,
      chapters: [
        {
          id: "chapter-1",
          order: 1,
          title: "第1章 开局：雨夜系统",
          wordCount: 0,
          goal: "让主角遭遇系统。",
          hook: "倒计时只剩十秒。",
          conflict: "救人会暴露自己。",
          valueShift: "普通生活转向危机。",
          cliffhanger: "系统给出第二个任务。",
          status: "outline",
        },
      ],
      outlineNodes: [
        {
          id: "opening-1",
          chapterId: "chapter-1",
          type: "opening",
          title: "雨夜系统",
          summary: "主角在雨夜遇到系统。",
          goal: "让主角遭遇系统。",
          hook: "倒计时只剩十秒。",
          conflict: "救人会暴露自己。",
          valueShift: "普通生活转向危机。",
          platformNote: "第一章强钩子。",
          order: 1,
          depth: 1,
          status: "chapter_card",
        },
        {
          id: "trunk-1",
          chapterId: null,
          type: "trunk",
          title: "第一次反杀",
          summary: "主角利用系统规则反杀。",
          goal: "让主角主动使用规则。",
          hook: "奖励会索取代价。",
          conflict: "反派提前堵门。",
          valueShift: "主角从被动逃生转为主动布局。",
          platformNote: "章末留追读。",
          order: 2,
          depth: 1,
          status: "planned",
        },
      ],
      characters: [
        {
          id: "character-1",
          name: "林晚",
          role: "主角",
          desire: "查清系统来源",
          need: "主动选择自己的规则",
          arcStart: "被系统推着走",
          arcEnd: "反过来定义系统规则",
        },
      ],
      worldEntries: [
        {
          id: "world-1",
          type: "system_rule",
          title: "系统任务规则",
          content: "系统任务必须伴随代价。",
        },
      ],
      foreshadows: [
        {
          id: "foreshadow-1",
          title: "系统来源异常",
          setupChapterId: "chapter-1",
          payoffChapterId: null,
          status: "setup",
          notes: "第一章埋异常。",
        },
      ],
      plotThreads: [],
    });

    assert.equal(schedule.dashboard.totalItems, 2);
    assert.equal(schedule.dashboard.chapterCardItems, 1);
    assert.equal(schedule.dashboard.outlineReadyItems, 1);
    assert.equal(schedule.dashboard.suggestedDailyWords, 4000);
    assert.equal(schedule.items[0].status, "card_ready");
    assert.equal(schedule.items[1].status, "outline_ready");
    assert.equal(schedule.items[0].quickFix, null);
    assert.equal(schedule.items[1].quickFix, null);
    assert.ok(schedule.items[0].lineBeats.some((beat) => beat.includes("系统来源异常")));
    assert.ok(schedule.items[1].worldAnchors.includes("系统任务规则"));
  });

  await t.test("flags blocked nodes and missing support materials", () => {
    const schedule = buildChapterProductionSchedule({
      project,
      platform,
      chapters: [],
      outlineNodes: [
        {
          id: "branch-1",
          chapterId: null,
          type: "branch",
          title: "支线压力",
          summary: "",
          goal: "",
          hook: "",
          conflict: "",
          valueShift: "",
          platformNote: "",
          order: 1,
          depth: 1,
          status: "planned",
        },
      ],
      characters: [],
      worldEntries: [],
      foreshadows: [],
      plotThreads: [],
    });

    assert.equal(schedule.dashboard.blockedItems, 1);
    assert.equal(schedule.items[0].status, "blocked");
    assert.deepEqual(schedule.items[0].missingFields, ["目标", "钩子", "冲突", "转变"]);
    assert.equal(schedule.items[0].quickFix?.method, "PATCH");
    assert.equal(schedule.items[0].quickFix?.endpoint, "/api/outline-nodes/branch-1");
    assert.ok(schedule.items[0].quickFix?.payload.summary.includes("支线压力"));
    assert.ok(schedule.items[0].quickFix?.payload.goal.includes("支线压力"));
    assert.ok(schedule.items[0].quickFix?.payload.hook);
    assert.ok(schedule.items[0].quickFix?.payload.conflict.includes("选择"));
    assert.ok(schedule.items[0].quickFix?.payload.valueShift.includes("主线风险"));
    assert.ok(schedule.items[0].quickFix?.payload.platformNote);
    assert.ok(schedule.dashboard.warnings.some((warning) => warning.includes("人物弧光")));
    assert.ok(schedule.dashboard.warnings.some((warning) => warning.includes("世界观设定")));
  });

  await t.test("repairs summary-only blocked cards without overwriting complete core fields", () => {
    const schedule = buildChapterProductionSchedule({
      project,
      platform,
      chapters: [],
      outlineNodes: [
        {
          id: "leaf-1",
          chapterId: null,
          type: "leaf",
          title: "生活压力",
          summary: "",
          goal: "让主角被现实问题逼到墙角。",
          hook: "房东堵门。",
          conflict: "交租和救人只能选一个。",
          valueShift: "主角从回避变成正面处理。",
          platformNote: "",
          order: 1,
          depth: 1,
          status: "planned",
        },
      ],
      characters: [],
      worldEntries: [],
      foreshadows: [],
      plotThreads: [],
    });

    assert.equal(schedule.items[0].status, "blocked");
    assert.deepEqual(schedule.items[0].missingFields, []);
    assert.deepEqual(Object.keys(schedule.items[0].quickFix?.payload ?? {}).sort(), ["platformNote", "summary"]);
  });

  await t.test("turns length presets into production card targets and structure advice", () => {
    const shortSchedule = buildChapterProductionSchedule({
      project: {
        ...project,
        targetLengthType: "short_10k",
        targetWordCount: 10000,
        currentWordCount: 0,
      },
      platform,
      chapters: [],
      outlineNodes: [],
      characters: [],
      worldEntries: [],
      foreshadows: [],
      plotThreads: [],
    });
    const longSchedule = buildChapterProductionSchedule({
      project,
      platform,
      chapters: [],
      outlineNodes: [],
      characters: [],
      worldEntries: [],
      foreshadows: [],
      plotThreads: [],
    });

    assert.equal(shortSchedule.dashboard.lengthPlan.minimumProductionCards, 4);
    assert.equal(shortSchedule.dashboard.lengthPlan.targetWordCount, 10000);
    assert.ok(shortSchedule.dashboard.lengthPlan.structureFocus.includes("闭环结尾"));
    assert.ok(shortSchedule.dashboard.warnings.some((warning) => warning.includes("1 万字短篇")));
    assert.equal(longSchedule.dashboard.lengthPlan.minimumProductionCards, 30);
    assert.equal(longSchedule.dashboard.lengthPlan.targetWordCount, 300000);
    assert.ok(longSchedule.dashboard.lengthPlan.structureFocus.includes("主干"));
    assert.ok(longSchedule.dashboard.warnings.some((warning) => warning.includes("30 万字以上长篇")));
    assert.ok(longSchedule.dashboard.nextActions.some((action) => action.includes("篇幅打法")));
  });
});
