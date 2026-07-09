import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

test("open source packaging docs exist", () => {
  [
    "CONTRIBUTING.md",
    "ROADMAP.md",
    "docs/POSITIONING.md",
    "docs/COMMUNITY.md",
    "docs/LAUNCH_PLAN.md",
    "docs/PRESS_KIT.md",
    "docs/GITHUB_INTRO.md",
    "LICENSE",
    ".github/ISSUE_TEMPLATE/bug_report.md",
    ".github/ISSUE_TEMPLATE/feature_request.md",
    ".github/ISSUE_TEMPLATE/platform_rule.md",
    ".github/ISSUE_TEMPLATE/writing_workflow.md",
    ".github/pull_request_template.md",
  ].forEach((path) => assert.equal(existsSync(path), true, `${path} should exist`));
});

test("readme presents the public open source positioning", () => {
  const readme = read("README.md");

  assert.ok(readme.includes("让 AI 像编辑部一样协作，让作者像主编一样掌控网文生产。"));
  assert.ok(readme.includes("Open-source AI writing workspace for serious webnovel creators."));
  assert.ok(readme.includes("不是普通 AI 聊天框"));
  assert.ok(readme.includes("作者才是主编"));
  assert.ok(readme.includes("## Quick Start"));
  assert.ok(readme.includes("cp .env.example .env"));
  assert.ok(readme.includes("npm run db:seed"));
  assert.ok(readme.includes("本地 SQLite"));
  assert.ok(readme.includes("## Community"));
  assert.ok(readme.includes("## Contributing"));
  assert.ok(readme.includes("MIT License"));
});

test("positioning and press kit explain the unique value", () => {
  const positioning = read("docs/POSITIONING.md");
  const pressKit = read("docs/PRESS_KIT.md");

  assert.ok(positioning.includes("普通 AI 写作工具解决“帮我写一段”"));
  assert.ok(positioning.includes("传统小说软件解决“帮我管理章节”"));
  assert.ok(positioning.includes("通用 Agent 平台解决“帮我编排模型”"));
  assert.ok(positioning.includes("一条可持续生产流水线"));
  assert.ok(pressKit.includes("GitHub Release 文案"));
  assert.ok(pressKit.includes("社群招募短文"));
  assert.ok(pressKit.includes("7 天 AI 网文首章样本挑战"));
});

test("github intro and license are ready for public release", () => {
  const intro = read("docs/GITHUB_INTRO.md");
  const license = read("LICENSE");

  assert.ok(intro.includes("GitHub About Description"));
  assert.ok(intro.includes("推荐 Topics"));
  assert.ok(intro.includes("docs/POSITIONING.md"));
  assert.ok(intro.includes("docs/PRESS_KIT.md"));
  assert.ok(license.includes("MIT License"));
  assert.ok(license.includes("Copyright (c) 2026 xihabaike-glitch"));
});

test("quick start docs include fresh clone bootstrap steps", () => {
  const readme = read("README.md");
  const usage = read("docs/USAGE.md");

  for (const doc of [readme, usage]) {
    assert.ok(doc.includes("cp .env.example .env"));
    assert.ok(doc.includes("npm install"));
    assert.ok(doc.includes("npm run db:seed"));
    assert.ok(doc.includes("npm run dev"));
    assert.ok(doc.includes("本地 SQLite"));
  }
});

test("community and roadmap describe creator participation", () => {
  const community = read("docs/COMMUNITY.md");
  const roadmap = read("ROADMAP.md");

  assert.ok(community.includes("AI 网文创作实验室"));
  assert.ok(community.includes("首章钩子拆解"));
  assert.ok(community.includes("平台打法共建"));
  assert.ok(community.includes("失败样本复盘"));
  assert.ok(roadmap.includes("Phase 1"));
  assert.ok(roadmap.includes("Phase 2"));
  assert.ok(roadmap.includes("Phase 3"));
  assert.ok(roadmap.includes("Phase 4"));
});

test("usage guide is detailed enough for first-run creators", () => {
  const usage = read("docs/USAGE.md");

  assert.ok(usage.includes("首次使用：从 0 到第一条可验收样本"));
  assert.ok(usage.includes("页面级操作手册"));
  assert.ok(usage.includes("首章样本怎么跑"));
  assert.ok(usage.includes("AI 编辑部岗位怎么配"));
  assert.ok(usage.includes("任务回执怎么填"));
  assert.ok(usage.includes("总闸门怎么看"));
  assert.ok(usage.includes("发布包怎么检查"));
  assert.ok(usage.includes("常见问题"));
  assert.ok(usage.includes("最小验收清单"));
});

test("github templates request actionable evidence", () => {
  const bug = read(".github/ISSUE_TEMPLATE/bug_report.md");
  const feature = read(".github/ISSUE_TEMPLATE/feature_request.md");
  const platformRule = read(".github/ISSUE_TEMPLATE/platform_rule.md");
  const workflow = read(".github/ISSUE_TEMPLATE/writing_workflow.md");
  const pr = read(".github/pull_request_template.md");

  assert.ok(bug.includes("复现步骤"));
  assert.ok(feature.includes("使用场景"));
  assert.ok(platformRule.includes("目标平台"));
  assert.ok(workflow.includes("真实样本"));
  assert.ok(pr.includes("用户价值"));
  assert.ok(pr.includes("验证方式"));
});
