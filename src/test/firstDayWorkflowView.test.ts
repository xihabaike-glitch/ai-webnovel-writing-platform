import assert from "node:assert/strict";
import test from "node:test";
import { buildFirstDayStepView } from "../lib/projects/firstDayWorkflowView.ts";

test("buildFirstDayStepView separates task center acceptance evidence", () => {
  const view = buildFirstDayStepView({
    id: "skeleton",
    label: "搭建大树骨架",
    status: "done",
    owner: "策划",
    evidence: "0 个大纲节点，0 张章节卡。 任务中心已验收：首日骨架派单已完成，开头结尾主干分支土壤都已经复核。",
    instruction: "确认开头、结尾、主干、分支、叶片和土壤都已经生成。",
    actionLabel: "看项目总控",
    href: "/projects/project-1#project-control",
  });

  assert.equal(view.primaryEvidence, "0 个大纲节点，0 张章节卡。");
  assert.equal(view.acceptanceLabel, "任务中心验收");
  assert.equal(view.acceptanceEvidence, "首日骨架派单已完成，开头结尾主干分支土壤都已经复核。");
  assert.equal(view.hasTaskAcceptance, true);
});

test("buildFirstDayStepView keeps normal evidence unchanged", () => {
  const view = buildFirstDayStepView({
    id: "opening-hook",
    label: "确认开头钩子",
    status: "active",
    owner: "作者",
    evidence: "第一章：天降系统。钩子：主角被迫当天逆袭。",
    instruction: "补完整开头冲突。",
    actionLabel: "打开第一章",
    href: "/projects/project-1/chapters/chapter-1",
  });

  assert.equal(view.primaryEvidence, "第一章：天降系统。钩子：主角被迫当天逆袭。");
  assert.equal(view.acceptanceEvidence, null);
  assert.equal(view.hasTaskAcceptance, false);
});
