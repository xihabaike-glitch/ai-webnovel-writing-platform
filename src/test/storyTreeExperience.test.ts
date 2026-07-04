import test from "node:test";
import assert from "node:assert/strict";
import {
  buildStoryTreeExperienceApplyDispatch,
  buildStoryTreeExperienceGuide,
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
  assert.equal(guide.items[0].status, "usable");
  assert.equal(guide.items[0].axisLabel, "分支因果");
  assert.equal(guide.items[0].title, "补分支因果");
  assert.ok(guide.items[0].lesson.includes("章节初稿分支因果从 68 提到 78 分"));
  assert.ok(guide.promptBlock.includes("大树复检经验"));
  assert.ok(guide.promptBlock.includes("可复用｜分支因果｜68 -> 78 分"));
  assert.ok(guide.promptBlock.includes("避坑｜开头结尾｜82 -> 72 分"));
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
