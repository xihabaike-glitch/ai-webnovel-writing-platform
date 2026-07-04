import test from "node:test";
import assert from "node:assert/strict";
import {
  buildStoryTreeChapterExperienceRecommendations,
  buildStoryTreeExperienceEffectFeedback,
  buildStoryTreeExperienceApplyDispatch,
  buildStoryTreeExperienceApplyDispatchKey,
  buildStoryTreeExperienceEffectDashboard,
  buildStoryTreeExperienceGuide,
  buildStoryTreeExperienceSecondPassAdvice,
  matchStoryTreeExperienceAdviceForInstruction,
  parseStoryTreeRecheckEvidenceLine,
} from "../lib/ai/storyTreeExperience.ts";
import { getPlatformProfile } from "../lib/platforms/platformProfiles.ts";

test("parseStoryTreeRecheckEvidenceLine reads score movement and action", () => {
  const parsed = parseStoryTreeRecheckEvidenceLine(
    "大树结构复检：68 -> 78 分，分数变好：结构待精修；返工动作：分支因果：把支线改成主线压力的直接后果。",
  );

  assert.equal(parsed?.previousScore, 68);
  assert.equal(parsed?.currentScore, 78);
  assert.equal(parsed?.verdict, "分数变好");
  assert.equal(parsed?.action, "分支因果：把支线改成主线压力的直接后果。");
});

test("buildStoryTreeExperienceGuide turns rechecks into prompt memory", () => {
  const guide = buildStoryTreeExperienceGuide([
    {
      dispatchKey: "story-tree:project-1:chapter-1:chapter_draft:branch_causality",
      title: "补分支因果",
      href: "/projects/project-1/chapters/chapter-1",
      evidence: [
        "大树质检：结构重写，68 分；主干推进需补强。",
        "大树结构复检：68 -> 78 分，分数变好：结构待精修；返工动作：分支因果：把支线改成主线压力的直接后果。",
      ],
      completedAt: "2026-07-05T08:00:00.000Z",
      updatedAt: "2026-07-05T08:00:00.000Z",
    },
    {
      dispatchKey: "story-tree:project-1:chapter-2:first_three_rewrite:opening_ending",
      title: "重压开头结尾",
      href: "/projects/project-1/chapters/chapter-2",
      evidence: [
        "大树结构复检：82 -> 72 分，分数变差：开头钩子被削弱；返工动作：开头结尾：删掉开篇解释，先给不可逆选择。",
      ],
      completedAt: "2026-07-05T09:00:00.000Z",
      updatedAt: "2026-07-05T09:00:00.000Z",
    },
  ]);

  assert.equal(guide.summary.total, 2);
  assert.equal(guide.summary.usable, 1);
  assert.equal(guide.summary.avoid, 1);
  assert.equal(guide.groups.length, 6);
  assert.equal(guide.groups.find((group) => group.axisId === "all")?.total, 2);
  assert.equal(guide.groups.find((group) => group.axisId === "branch_causality")?.usable, 1);
  assert.equal(guide.groups.find((group) => group.axisId === "opening_ending")?.avoid, 1);
  assert.equal(guide.groups.find((group) => group.axisId === "character_arc")?.total, 0);
  assert.equal(guide.items[0].status, "usable");
  assert.equal(guide.items[0].axisLabel, "分支因果");
  assert.equal(guide.items[0].title, "补分支因果");
  assert.ok(guide.items[0].lesson.includes("章节初稿分支因果从 68 提到 78 分"));
  assert.ok(guide.promptBlock.includes("大树复检经验"));
  assert.ok(guide.promptBlock.includes("可复用｜分支因果｜68 -> 78 分"));
  assert.ok(guide.promptBlock.includes("避坑｜开头结尾｜82 -> 72 分"));
});

test("buildStoryTreeExperienceGuide promotes latest effect feedback and dedupes learned actions", () => {
  const guide = buildStoryTreeExperienceGuide([
    {
      dispatchKey: "story-tree:project-1:chapter-1:chapter_draft:branch_causality",
      title: "补分支因果",
      href: "/projects/project-1/chapters/chapter-1",
      evidence: [
        "大树结构复检：68 -> 78 分，分数变好：结构待精修；返工动作：分支因果：把支线改成主线压力的直接后果。",
      ],
      completedAt: "2026-07-05T08:00:00.000Z",
      updatedAt: "2026-07-05T08:00:00.000Z",
    },
    {
      dispatchKey: "story-tree-experience:project-1:chapter_draft:branch_causality:story-tree_project-1_chapter-1_chapter_draft_branch_causality",
      title: "夜雨系统 · 应用经验分支因果",
      href: "/projects/project-1/chapters/chapter-1",
      evidence: [
        "大树结构复检：68 -> 78 分，分数变好：结构待精修；返工动作：分支因果：把支线改成主线压力的直接后果。",
        "经验动作：分支因果：把支线改成主线压力的直接后果。",
        "经验应用效果：分支因果 78 -> 68 分，效果变弱：支线没有绑定主线压力。",
      ],
      completedAt: "2026-07-05T10:00:00.000Z",
      updatedAt: "2026-07-05T10:00:00.000Z",
    },
  ]);

  assert.equal(guide.summary.total, 1);
  assert.equal(guide.summary.avoid, 1);
  assert.equal(guide.items[0].status, "avoid");
  assert.equal(guide.items[0].effectStatus, "weakened");
  assert.ok(guide.items[0].effectLine?.includes("效果变弱"));
  assert.ok(guide.promptBlock.includes("避坑｜分支因果"));
  assert.ok(guide.promptBlock.includes("经验应用效果"));
});

test("buildStoryTreeExperienceEffectDashboard summarizes returned advice effects", () => {
  const guide = buildStoryTreeExperienceGuide([
    {
      dispatchKey: "story-tree-experience:project-1:chapter_draft:branch_causality:reinforced",
      title: "应用分支因果",
      href: "/projects/project-1/chapters/chapter-1",
      evidence: [
        "大树结构复检：68 -> 78 分，分数变好：结构待精修；返工动作：分支因果：把支线改成主线压力的直接后果。",
        "经验动作：分支因果：把支线改成主线压力的直接后果。",
        "经验应用效果：分支因果 78 -> 84 分，继续有效：支线已经反压主线。",
      ],
      completedAt: "2026-07-05T11:00:00.000Z",
      updatedAt: "2026-07-05T11:00:00.000Z",
    },
    {
      dispatchKey: "story-tree-experience:project-1:chapter_draft:opening_ending:weakened",
      title: "应用开头结尾",
      href: "/projects/project-1/chapters/chapter-2",
      evidence: [
        "大树结构复检：82 -> 72 分，分数变差：开头钩子被削弱；返工动作：开头结尾：删掉开篇解释，先给不可逆选择。",
        "经验应用效果：开头结尾 72 -> 62 分，效果变弱：开头解释又变多。",
      ],
      completedAt: "2026-07-05T10:00:00.000Z",
      updatedAt: "2026-07-05T10:00:00.000Z",
    },
    {
      dispatchKey: "story-tree:project-1:chapter-3:chapter_draft:trunk_motion",
      title: "补主干推进",
      href: "/projects/project-1/chapters/chapter-3",
      evidence: [
        "大树结构复检：70 -> 74 分，分数未变：推进还需要观察；返工动作：主干推进：每 800 字必须出现新选择。",
      ],
      completedAt: "2026-07-05T09:00:00.000Z",
      updatedAt: "2026-07-05T09:00:00.000Z",
    },
  ]);
  const dashboard = buildStoryTreeExperienceEffectDashboard(guide);

  assert.equal(dashboard.summary.total, 3);
  assert.equal(dashboard.summary.reinforced, 1);
  assert.equal(dashboard.summary.weakened, 1);
  assert.equal(dashboard.summary.noFeedback, 1);
  assert.ok(dashboard.decision.includes("有效和变弱经验并存"));
  assert.equal(dashboard.reusableItems[0].axisLabel, "分支因果");
  assert.equal(dashboard.avoidItems[0].axisLabel, "开头结尾");
  assert.equal(dashboard.watchItems[0].axisLabel, "主干推进");
});

test("buildStoryTreeChapterExperienceRecommendations matches weak chapter axes", () => {
  const guide = buildStoryTreeExperienceGuide([
    {
      dispatchKey: "story-tree:project-1:chapter-1:chapter_draft:branch_causality",
      title: "补分支因果",
      href: "/projects/project-1/chapters/chapter-1",
      evidence: [
        "大树结构复检：68 -> 82 分，分数变好：结构可用；返工动作：分支因果：把支线改成主线压力的直接后果。",
      ],
      completedAt: "2026-07-05T08:00:00.000Z",
      updatedAt: "2026-07-05T08:00:00.000Z",
    },
    {
      dispatchKey: "story-tree:project-1:chapter-2:chapter_draft:opening_ending",
      title: "重写开头结尾",
      href: "/projects/project-1/chapters/chapter-2",
      evidence: [
        "大树结构复检：70 -> 84 分，分数变好：结构可用；返工动作：开头结尾：先给不可逆选择。",
      ],
      completedAt: "2026-07-05T09:00:00.000Z",
      updatedAt: "2026-07-05T09:00:00.000Z",
    },
  ]);
  const recommendations = buildStoryTreeChapterExperienceRecommendations({
    guide,
    audit: {
      score: 66,
      label: "结构需二改",
      summary: "大树质检：结构需二改。",
      shouldRewrite: true,
      topActions: ["分支因果：支线必须绑定主线压力。"],
      axes: [
        { id: "branch_causality", label: "分支因果", score: 45, status: "fail", evidence: "支线游离。", suggestion: "支线必须绑定主线压力。" },
        { id: "opening_ending", label: "开头结尾", score: 82, status: "pass", evidence: "开头结尾可用。", suggestion: "保持。" },
      ],
    },
  });

  assert.equal(recommendations.length, 1);
  assert.equal(recommendations[0].axisId, "branch_causality");
  assert.equal(recommendations[0].status, "usable");
  assert.ok(recommendations[0].reason.includes("45 分"));
  assert.ok(recommendations[0].instruction.includes("复用已验证"));
});

test("recommended story tree experience can become an apply dispatch", () => {
  const guide = buildStoryTreeExperienceGuide([
    {
      dispatchKey: "story-tree:project-1:chapter-1:chapter_draft:branch_causality",
      title: "补分支因果",
      href: "/projects/project-1/chapters/chapter-1",
      evidence: [
        "大树结构复检：68 -> 82 分，分数变好：结构可用；返工动作：分支因果：把支线改成主线压力的直接后果。",
      ],
      completedAt: "2026-07-05T08:00:00.000Z",
      updatedAt: "2026-07-05T08:00:00.000Z",
    },
  ]);
  const recommendations = buildStoryTreeChapterExperienceRecommendations({
    guide,
    audit: {
      score: 61,
      label: "结构需二改",
      summary: "大树质检：结构需二改。",
      shouldRewrite: true,
      topActions: ["分支因果：支线必须绑定主线压力。"],
      axes: [
        { id: "branch_causality", label: "分支因果", score: 41, status: "fail", evidence: "支线游离。", suggestion: "支线必须绑定主线压力。" },
      ],
    },
  });
  const dispatch = buildStoryTreeExperienceApplyDispatch({
    projectId: "project-1",
    projectTitle: "夜雨系统",
    platform: getPlatformProfile("fanqie"),
    item: recommendations[0].item,
    now: "2026-07-05T10:00:00.000Z",
  });

  assert.equal(dispatch.state, "assigned");
  assert.equal(dispatch.id, buildStoryTreeExperienceApplyDispatchKey("project-1", recommendations[0].item));
  assert.equal(dispatch.actionLabel, "应用经验");
  assert.equal(dispatch.href, "/projects/project-1/chapters/chapter-1");
  assert.ok(dispatch.evidence.some((item) => item.includes("经验动作")));
});

test("buildStoryTreeChapterExperienceRecommendations excludes already returned dispatches", () => {
  const guide = buildStoryTreeExperienceGuide([
    {
      dispatchKey: "story-tree:project-1:chapter-1:chapter_draft:branch_causality",
      title: "补分支因果",
      href: "/projects/project-1/chapters/chapter-1",
      evidence: [
        "大树结构复检：68 -> 82 分，分数变好：结构可用；返工动作：分支因果：把支线改成主线压力的直接后果。",
      ],
      completedAt: "2026-07-05T08:00:00.000Z",
      updatedAt: "2026-07-05T08:00:00.000Z",
    },
  ]);
  const recommendations = buildStoryTreeChapterExperienceRecommendations({
    guide,
    audit: {
      score: 61,
      label: "结构需二改",
      summary: "大树质检：结构需二改。",
      shouldRewrite: true,
      topActions: ["分支因果：支线必须绑定主线压力。"],
      axes: [
        { id: "branch_causality", label: "分支因果", score: 41, status: "fail", evidence: "支线游离。", suggestion: "支线必须绑定主线压力。" },
      ],
    },
    excludeDispatchKeys: ["story-tree:project-1:chapter-1:chapter_draft:branch_causality"],
  });

  assert.equal(recommendations.length, 0);
});

test("buildStoryTreeExperienceApplyDispatch turns a learned action into an assigned task", () => {
  const guide = buildStoryTreeExperienceGuide([
    {
      dispatchKey: "story-tree:project-1:chapter-1:chapter_draft:branch_causality",
      title: "补分支因果",
      href: "/projects/project-1/chapters/chapter-1",
      evidence: [
        "大树结构复检：68 -> 78 分，分数变好：结构待精修；返工动作：分支因果：把支线改成主线压力的直接后果。",
      ],
      completedAt: "2026-07-05T08:00:00.000Z",
      updatedAt: "2026-07-05T08:00:00.000Z",
    },
  ]);
  const dispatch = buildStoryTreeExperienceApplyDispatch({
    projectId: "project-1",
    projectTitle: "夜雨系统",
    platform: getPlatformProfile("fanqie"),
    item: guide.items[0],
    now: "2026-07-05T10:00:00.000Z",
  });

  assert.equal(dispatch.id, "story-tree-experience:project-1:chapter_draft:branch_causality:story-tree_project-1_chapter-1_chapter_draft_branch_causality");
  assert.equal(dispatch.state, "assigned");
  assert.equal(dispatch.actionLabel, "应用经验");
  assert.equal(dispatch.href, "/projects/project-1/chapters/chapter-1");
  assert.ok(dispatch.title.includes("应用经验分支因果"));
  assert.ok(dispatch.detail.includes("把支线改成主线压力的直接后果"));
  assert.ok(dispatch.priorityScore > 86);
  assert.ok(dispatch.acceptanceCriteria.some((item) => item.includes("重新保存或复检")));
  assert.ok(dispatch.evidence.some((item) => item.includes("大树结构复检")));
});

test("buildStoryTreeExperienceSecondPassAdvice turns completed apply dispatches into chapter rewrite advice", () => {
  const advice = buildStoryTreeExperienceSecondPassAdvice([
    {
      databaseId: "task-1",
      dispatchKey: "story-tree-experience:project-1:chapter_draft:branch_causality:story-tree_project-1_chapter-1_chapter_draft_branch_causality",
      state: "completed",
      title: "夜雨系统 · 应用经验分支因果",
      detail: "章节初稿复检沉淀。",
      href: "/projects/project-1/chapters/chapter-1",
      evidence: [
        "大树结构复检：68 -> 78 分，分数变好：结构待精修；返工动作：分支因果：把支线改成主线压力的直接后果。",
        "经验动作：分支因果：把支线改成主线压力的直接后果。",
        "经验应用效果：分支因果 78 -> 84 分，继续有效：继续让支线服务主线压力。",
      ],
      completionEvidence: "已把妹妹支线改成反派逼迫主角暴露系统的直接压力。",
      completedAt: "2026-07-05T10:00:00.000Z",
      updatedAt: "2026-07-05T10:00:00.000Z",
    },
    {
      databaseId: "task-2",
      dispatchKey: "story-tree-experience:project-1:chapter_draft:opening_ending:story-tree_project-1_chapter-2_chapter_draft_opening_ending",
      state: "completed",
      title: "夜雨系统 · 应用经验开头结尾",
      detail: "另一章经验。",
      href: "/projects/project-1/chapters/chapter-2",
      evidence: ["经验动作：开头结尾：先给不可逆选择。"],
      completionEvidence: "已处理。",
      completedAt: "2026-07-05T11:00:00.000Z",
      updatedAt: "2026-07-05T11:00:00.000Z",
    },
  ], "chapter-1");

  assert.equal(advice.length, 1);
  assert.equal(advice[0].databaseId, "task-1");
  assert.equal(advice[0].axisLabel, "分支因果");
  assert.equal(advice[0].axisId, "branch_causality");
  assert.equal(advice[0].sourceScore, 78);
  assert.equal(advice[0].status, "usable");
  assert.equal(advice[0].effectStatus, "reinforced");
  assert.ok(advice[0].effectLine?.includes("继续有效"));
  assert.equal(advice[0].action, "分支因果：把支线改成主线压力的直接后果。");
  assert.equal(advice[0].completionEvidence, "已把妹妹支线改成反派逼迫主角暴露系统的直接压力。");
  assert.ok(advice[0].instruction.includes("沿用已完成派单结论二改「分支因果」"));
  assert.ok(advice[0].instruction.includes("把支线改成主线压力的直接后果"));
  assert.ok(advice[0].instruction.includes("已把妹妹支线改成反派逼迫主角暴露系统的直接压力"));
  assert.equal(advice[0].instruction.includes("。。结构动作"), false);
});

test("matches used story tree advice and scores its second-pass effect", () => {
  const advice = buildStoryTreeExperienceSecondPassAdvice([
    {
      databaseId: "task-1",
      dispatchKey: "story-tree-experience:project-1:chapter_draft:branch_causality:story-tree_project-1_chapter-1_chapter_draft_branch_causality",
      state: "completed",
      title: "夜雨系统 · 应用经验分支因果",
      detail: "章节初稿复检沉淀。",
      href: "/projects/project-1/chapters/chapter-1",
      evidence: [
        "大树结构复检：68 -> 78 分，分数变好：结构待精修；返工动作：分支因果：把支线改成主线压力的直接后果。",
        "经验动作：分支因果：把支线改成主线压力的直接后果。",
      ],
      completionEvidence: "已把妹妹支线改成反派逼迫主角暴露系统的直接压力。",
      completedAt: "2026-07-05T10:00:00.000Z",
      updatedAt: "2026-07-05T10:00:00.000Z",
    },
  ], "chapter-1");
  const matched = matchStoryTreeExperienceAdviceForInstruction(advice, `请二改。${advice[0].instruction}`);
  const feedback = buildStoryTreeExperienceEffectFeedback({
    advice: matched[0],
    audit: {
      score: 84,
      label: "结构可用",
      summary: "大树结构 84 分。",
      shouldRewrite: false,
      topActions: [],
      axes: [
        {
          id: "branch_causality",
          label: "分支因果",
          score: 84,
          status: "pass",
          evidence: "支线已经反压主线。",
          suggestion: "继续让支线服务主线压力。",
        },
      ],
    },
  });

  assert.equal(matched.length, 1);
  assert.equal(feedback.status, "reinforced");
  assert.equal(feedback.databaseId, "task-1");
  assert.ok(feedback.line.includes("经验应用效果：分支因果 78 -> 84 分，继续有效"));
});
