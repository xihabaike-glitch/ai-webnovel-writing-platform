# Open Source Community Packaging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Package AI Webnovel Writing Platform as a public open-source project and creator community launch with README, positioning, roadmap, contribution, press, community, and GitHub feedback templates.

**Architecture:** This is a documentation and repository-packaging change, not a product feature change. The README becomes the public front door, root-level `CONTRIBUTING.md` and `ROADMAP.md` serve GitHub users, `docs/*.md` serve creators and launch planning, `.github/*` guides contributor feedback, and one source test verifies the packaging surface remains present and aligned.

**Tech Stack:** Markdown, GitHub repository metadata conventions, Node.js `node:test` source checks, existing Next.js/TypeScript project.

## Global Constraints

- Do not add new writing platforms.
- Do not change database schema.
- Do not add model calling logic.
- Do not add new UI pages.
- Do not auto-post to social platforms.
- Keep the unified Slogan: `让 AI 像编辑部一样协作，让作者像主编一样掌控网文生产。`
- Keep the English subtitle: `Open-source AI writing workspace for serious webnovel creators.`
- Keep the eight platform scope: 起点中文网、番茄小说、七猫、晋江文学城、知乎盐选、WebNovel、Royal Road、Wattpad.
- AI output must remain framed as drafts, candidates, receipts, or suggestions requiring author acceptance.

---

## File Structure

Create:

- `src/test/packagingDocsSource.test.ts`  
  A lightweight Node source test that reads Markdown files and GitHub templates to ensure the packaging files exist and include key positioning phrases.

- `CONTRIBUTING.md`  
  GitHub-facing contribution guide for authors, editors, prompt contributors, platform researchers, and developers.

- `ROADMAP.md`  
  Public roadmap split into open-source readiness, real sample loop, platform template co-creation, and ecosystem co-creation.

- `docs/POSITIONING.md`  
  Product positioning, unique value, borrowed inspirations, anti-positioning, and target audience explanation.

- `docs/COMMUNITY.md`  
  Community name, welcome message, rules, member roles, channels, and first activities.

- `docs/LAUNCH_PLAN.md`  
  Launch schedule, channel strategy, staged content calendar, and 7-day first-chapter challenge.

- `docs/PRESS_KIT.md`  
  Copy-ready GitHub, Zhihu, WeChat, short-video, and community launch materials.

- `docs/USAGE.md`  
  Detailed creator-facing manual covering first run, page-by-page workflow, first-chapter sample, AI editorial roles, receipts, PM gate, failure repair, submission packages, community challenge, FAQ, and acceptance checklist.

- `.github/ISSUE_TEMPLATE/bug_report.md`  
  Bug report template for product, docs, workflow, and model configuration issues.

- `.github/ISSUE_TEMPLATE/feature_request.md`  
  Feature request template requiring scenario, user type, acceptance, and non-goals.

- `.github/ISSUE_TEMPLATE/platform_rule.md`  
  Platform rule contribution template for platform tactics and evidence.

- `.github/ISSUE_TEMPLATE/writing_workflow.md`  
  Writing workflow template for real samples, first-chapter challenge, and failure retrospectives.

- `.github/pull_request_template.md`  
  PR template requiring scope, user value, evidence, tests, and workflow impact.

Modify:

- `README.md`  
  Rebuild public front door with Slogan, positioning, why this is not a chatbot, feature list, page map, supported platforms, quick start, workflow, docs links, community, contributing, roadmap.

- `docs/GITHUB_INTRO.md`  
  Convert from standalone scratchpad into an index that points to README and `docs/PRESS_KIT.md`, while preserving reusable short descriptions and topics.

---

### Task 1: Add Packaging Documentation Source Test

**Files:**
- Create: `src/test/packagingDocsSource.test.ts`

**Interfaces:**
- Consumes: Markdown files and `.github` templates that later tasks create.
- Produces: A source-level packaging regression check run by `node --test src/test/packagingDocsSource.test.ts` and `npm test`.

- [ ] **Step 1: Write the failing test**

Create `src/test/packagingDocsSource.test.ts` with:

```ts
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
  assert.ok(readme.includes("## Community"));
  assert.ok(readme.includes("## Contributing"));
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
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
node --test src/test/packagingDocsSource.test.ts
```

Expected: FAIL because the new packaging files do not exist, README does not yet contain the complete public packaging structure, and `docs/USAGE.md` does not yet include the expanded first-run creator manual sections.

- [ ] **Step 3: Commit the failing test**

Run:

```bash
git add src/test/packagingDocsSource.test.ts
git commit -m "test: cover open source packaging docs"
```

---

### Task 2: Rebuild README as Public Front Door

**Files:**
- Modify: `README.md`
- Test: `src/test/packagingDocsSource.test.ts`

**Interfaces:**
- Consumes: The slogan, subtitle, platform scope, and page map from the spec.
- Produces: README sections referenced by the packaging source test.

- [ ] **Step 1: Replace README content**

Rewrite `README.md` with these sections in this exact order:

```md
# AI Webnovel Writing Platform

让 AI 像编辑部一样协作，让作者像主编一样掌控网文生产。

Open-source AI writing workspace for serious webnovel creators.

AI Webnovel Writing Platform 是一个面向网文创作者的开源 AI 写作生产平台。它不是普通 AI 聊天框，也不是一键生成小说工具，而是把大树结构、平台打法、AI 编辑部、任务回执、失败修复和投稿包放进同一条可验收创作流水线。

## Why This Exists

现在很多 AI 写作工具都停在“帮我写一段”。

但真正的网文创作不是一次生成，而是一条长期生产线：

选平台 → 定卖点 → 搭结构 → 写首章 → 审稿 → 二改 → 人工采用 → 小样本验证 → 失败修复 → 扩写 → 投稿包 → 数据复盘。

所以这个项目不把 AI 放在中心，而是把作品放在中心。AI 是编辑部成员，作者才是主编。

## Core Features

- Story Tree First：先写开头和结尾，再写主干、分支、叶片和土壤。
- Platform-Aware Writing：围绕 8 个核心平台组织开头、篇幅、标签、卖点、投稿包和复盘指标。
- AI Editorial Team：Claude、DeepSeek、Kimi、GPT 和 OpenAI-compatible 模型按岗位协作。
- Author-Controlled Draft Flow：AI 输出默认是候选稿、审稿意见、二改版本或任务回执，不能直接覆盖正文。
- Dispatch Receipts：每个任务都记录角色、输入、输出、人工验收和下一步。
- PM Gate：没有样本、复查、失败修复和发布包证据，不允许扩大批量。
- Failure Recovery：按模型配置、提示词上下文、样本重试和人工复盘拆解失败原因。
- Submission Packages：从标题、简介、标签、样章、卖点、版本基线到真实反馈形成闭环。

## Supported Platforms

- 起点中文网
- 番茄小说
- 七猫
- 晋江文学城
- 知乎盐选
- WebNovel
- Royal Road
- Wattpad

The platform scope is intentionally locked to these eight channels. The next priority is improving writing, submission, and review loops, not adding more platforms.

## Product Map

- `/`：毒舌 PM 交付入口，直达真实流水线验收。
- `/docs`：开发文档总览。
- `/projects`：作品工作台，承载开书、大树结构、章节、人物、世界观、伏笔、首日流程、前三章改写和平台发布包。
- `/projects/[projectId]`：单本作品总控页。
- `/tasks`：任务中心，处理跨项目草稿、审稿、二改、导出、投稿修复和批量节奏。
- `/dispatch`：派单中心，把模型执行、角色任务、完成证据和人工验收串起来。
- `/gate`：总闸门，检查样本、复查、失败率、成本和恢复证据。
- `/failures`：失败修复中心。
- `/references`：30+ GitHub 案例、AI 编辑部角色和平台执行卡。
- `/settings/models`：Claude、DeepSeek、Kimi、GPT、OpenAI-compatible 和模型岗位矩阵。

## Quick Start

```bash
npm install
npm run dev
```

Open:

```txt
http://localhost:3000
```

Useful checks:

```bash
npm test
npm run build
```

Seed local data when needed:

```bash
npm run db:seed
```

## Recommended Workflow

1. Create a project in `/projects`.
2. Choose target platform and length.
3. Build the story tree: hook, ending promise, trunk, branches, leaves, and soil.
4. Prepare characters, worldbuilding, foreshadows, and chapter cards.
5. Run one first-chapter sample before batch production.
6. Review, rewrite, and manually accept or reject AI candidates.
7. Record dispatch receipts in `/dispatch`.
8. Recheck production readiness in `/gate`.
9. Repair failures in `/failures`.
10. Build submission packages and review feedback in `/projects`.

## Community

社群名称：AI 网文创作实验室。

这是给网文作者、AI 写作产品开发者、剧情策划、提示词玩家和内容创业者的开源实验社群。我们会围绕首章钩子拆解、平台打法共建、AI 编辑部提示词、失败样本复盘、投稿包互评和 7 天 AI 网文首章样本挑战进行共创。

See `docs/COMMUNITY.md` and `docs/LAUNCH_PLAN.md`.

## Contributing

欢迎贡献：

- 平台规则和真实经验。
- 写作模板和首章样本。
- AI 编辑部提示词。
- 失败复盘。
- 文档改进。
- Bug 修复和产品功能。

Start with `CONTRIBUTING.md`.

## Roadmap

See `ROADMAP.md`.

## Documents

- `docs/USAGE.md`：产品使用说明。
- `docs/POSITIONING.md`：项目定位与独特价值。
- `docs/COMMUNITY.md`：社群说明。
- `docs/LAUNCH_PLAN.md`：发布计划。
- `docs/PRESS_KIT.md`：对外发布文案素材。
- `docs/GITHUB_INTRO.md`：GitHub 简介和 Topics 素材。
- `docs/ai-writing-platform-dev-doc.md`：项目梳理、竞品参考与整体开发文档。
- `docs/PRD.md`：产品需求文档。
- `docs/TECHNICAL_DESIGN.md`：技术设计文档。

## License

License information will follow the repository owner’s open-source release decision.
```

- [ ] **Step 2: Run focused test**

Run:

```bash
node --test src/test/packagingDocsSource.test.ts
```

Expected: Still FAIL because other files are not created yet, but README-related assertions pass.

- [ ] **Step 3: Commit README**

Run:

```bash
git add README.md
git commit -m "docs: package readme for open source launch"
```

---

### Task 3: Add Positioning, Roadmap, Community, Launch, and Press Docs

**Files:**
- Create: `ROADMAP.md`
- Create: `docs/POSITIONING.md`
- Create: `docs/COMMUNITY.md`
- Create: `docs/LAUNCH_PLAN.md`
- Create: `docs/PRESS_KIT.md`
- Modify: `docs/GITHUB_INTRO.md`
- Test: `src/test/packagingDocsSource.test.ts`

**Interfaces:**
- Consumes: README positioning and the approved packaging spec.
- Produces: Public documentation referenced by README and source tests.

- [ ] **Step 1: Create `ROADMAP.md`**

Create the roadmap with four sections:

```md
# Roadmap

AI Webnovel Writing Platform 的 Roadmap 同时面向作者和开发者。它不以“多加平台”为进度，而以真实写作闭环、平台模板共建和生态贡献为进度。

## Phase 1: Open Source Ready

- Public README, usage guide, contribution guide, and roadmap.
- GitHub Issue templates and PR template.
- Community launch kit.
- Clear page map and local start instructions.

## Phase 2: Real Sample Loop

- Run the 7 天 AI 网文首章样本挑战.
- Collect first-chapter hooks, review notes, rewrite evidence, and author adoption results.
- Build a small failure sample library.
- Turn real creator feedback into issues and platform rule updates.

## Phase 3: Platform Template Co-Creation

- 番茄开篇模板。
- 起点长篇结构模板。
- 七猫稳定更新模板。
- 晋江人物关系模板。
- 知乎盐选反转模板。
- WebNovel / Royal Road / Wattpad 出海模板。

## Phase 4: Ecosystem Co-Creation

- More model provider adapters.
- Community prompt library for editorial roles.
- Submission package templates.
- Writing sample evaluation sets.
- Future author studio collaboration workflows.

## Non-Goals

- No new platforms before the eight core platform loops become stronger.
- No one-click million-word generation.
- No automatic submission without author review.
- No AI overwrite of accepted manuscript content.
```

- [ ] **Step 2: Create `docs/POSITIONING.md`**

Create the positioning doc with:

```md
# Positioning

## One-Liner

面向网文创作者的开源 AI 写作生产平台：大树结构、平台打法、AI 编辑部、任务回执、失败修复和投稿包一体化工作台。

## Slogan

让 AI 像编辑部一样协作，让作者像主编一样掌控网文生产。

## What Makes It Different

普通 AI 写作工具解决“帮我写一段”。

传统小说软件解决“帮我管理章节”。

通用 Agent 平台解决“帮我编排模型”。

AI Webnovel Writing Platform 解决的是：一部网文如何从平台选择、开篇钩子、人物弧光、章节生产、审稿二改、失败修复，到投稿包和复盘，形成一条可持续生产流水线。

## Inspired By

- novelWriter, bibisco, Manuskript：长篇写作组织、人物资料和章节结构。
- Dify, Flowise, LangChain, LlamaIndex：AI 工作流、模型编排、知识召回。
- AutoGen, crewAI：多角色协作。
- AppFlowy, Logseq, Outline：知识工作区、文档组织和双向关系。
- Pandoc, mdBook, GitBook：出版与导出流水线。

The project borrows patterns, not product identity. It is optimized for webnovel production rather than generic documents, generic chat, or generic agent workflows.

## Anti-Positioning

- 不是纯聊天机器人。
- 不是一键生成百万字小说。
- 不是自动投稿工具。
- 不是低质量批量洗稿工具。
- 不是用炫技页面替代真实写作闭环的演示项目。

## Product Thesis

AI should not replace the author. AI should become the author’s editorial team, research assistant, reviewer, rewrite partner, and submission packaging assistant. The author remains the editor-in-chief.
```

- [ ] **Step 3: Create `docs/COMMUNITY.md`**

Create the community doc with the exact community name, rules, roles, and activities from the spec. It must include `AI 网文创作实验室`, `首章钩子拆解`, `平台打法共建`, and `失败样本复盘`.

- [ ] **Step 4: Create `docs/LAUNCH_PLAN.md`**

Create the launch plan with:

```md
# Launch Plan

## Goal

Launch AI Webnovel Writing Platform as both a GitHub open-source project and the home base for AI 网文创作实验室.

## Phase 1: Open Source Launch, Days 1-3

- Publish updated README.
- Publish press kit.
- Publish community guide.
- Create GitHub Release.
- Share launch announcement in WeChat groups, Zhihu, creator circles, and developer communities.

## Phase 2: Feature Breakdown, Week 1

Day 1: 大树写作法。  
Day 2: 8 个平台策略。  
Day 3: AI 编辑部岗位。  
Day 4: 首章样本、审稿、二改。  
Day 5: PM 闸门和任务回执。  
Day 6: 失败修复中心。  
Day 7: 投稿包和复盘。

## Phase 3: Co-Creation Recruiting, Weeks 2-4

- Recruit webnovel authors.
- Recruit editors and reviewers.
- Recruit prompt contributors.
- Recruit frontend and full-stack developers.
- Recruit overseas-platform writers.
- Convert feedback into GitHub issues.

## 7 天 AI 网文首章样本挑战

1. Pick one target platform.
2. Create one project.
3. Write hook, ending promise, and story tree.
4. Run one first-chapter sample.
5. Review and rewrite.
6. Record author acceptance or rejection.
7. Share the retrospective.
```

- [ ] **Step 5: Create `docs/PRESS_KIT.md`**

Create a copy-ready press kit with sections named `GitHub Release 文案`, `社群招募短文`, `短视频或动态文案`, and `7 天 AI 网文首章样本挑战`. Include the slogan and the eight-platform scope.

- [ ] **Step 6: Update `docs/GITHUB_INTRO.md`**

Keep short descriptions and topics, and add an opening note:

```md
> This file is the compact GitHub metadata and copy index. For full launch copy, use `docs/PRESS_KIT.md`. For product positioning, use `docs/POSITIONING.md`.
```

- [ ] **Step 7: Run focused test**

Run:

```bash
node --test src/test/packagingDocsSource.test.ts
```

Expected: Still FAIL because CONTRIBUTING and GitHub templates are not created yet, but positioning, press kit, community, and roadmap assertions pass.

- [ ] **Step 8: Commit docs**

Run:

```bash
git add ROADMAP.md docs/POSITIONING.md docs/COMMUNITY.md docs/LAUNCH_PLAN.md docs/PRESS_KIT.md docs/GITHUB_INTRO.md
git commit -m "docs: add open source launch package"
```

---

### Task 4: Expand Detailed Usage Guide

**Files:**
- Modify: `docs/USAGE.md`
- Test: `src/test/packagingDocsSource.test.ts`

**Interfaces:**
- Consumes: Existing usage guide, README workflow, and community challenge language.
- Produces: A detailed first-run manual referenced by README and verified by `usage guide is detailed enough for first-run creators`.

- [ ] **Step 1: Expand `docs/USAGE.md`**

Rewrite or extend `docs/USAGE.md` so it keeps the existing product explanation and includes these exact section headings:

```md
## 3. 首次使用：从 0 到第一条可验收样本

## 4. 页面级操作手册

## 5. 首章样本怎么跑

## 6. AI 编辑部岗位怎么配

## 7. 任务回执怎么填

## 8. 总闸门怎么看

## 9. 失败修复怎么处理

## 10. 发布包怎么检查

## 11. 社群共创和 7 天首章样本挑战

## 12. 常见问题

## 13. 最小验收清单
```

The content under those headings must explain:

- how to start the local app;
- what to do first in `/projects`;
- how to build the story tree;
- how to run only one first-chapter sample before batch production;
- how to configure Claude, DeepSeek, Kimi, GPT, and OpenAI-compatible models as editorial roles;
- how to use `/tasks`, `/dispatch`, `/gate`, `/failures`, `/references`, and `/settings/models`;
- what evidence makes a dispatch receipt complete;
- how to decide between allow small-step scale, observe, and block;
- how to inspect submission packages;
- how community members can join the 7-day first-chapter challenge;
- common mistakes and answers.

- [ ] **Step 2: Run focused test**

Run:

```bash
node --test src/test/packagingDocsSource.test.ts
```

Expected: Still FAIL because CONTRIBUTING and GitHub templates are not created yet, but usage-guide assertions pass.

- [ ] **Step 3: Commit usage guide**

Run:

```bash
git add docs/USAGE.md
git commit -m "docs: expand creator usage guide"
```

---

### Task 5: Add Contribution Guide and GitHub Templates

**Files:**
- Create: `CONTRIBUTING.md`
- Create: `.github/ISSUE_TEMPLATE/bug_report.md`
- Create: `.github/ISSUE_TEMPLATE/feature_request.md`
- Create: `.github/ISSUE_TEMPLATE/platform_rule.md`
- Create: `.github/ISSUE_TEMPLATE/writing_workflow.md`
- Create: `.github/pull_request_template.md`
- Test: `src/test/packagingDocsSource.test.ts`

**Interfaces:**
- Consumes: Community roles and contribution types from the packaging docs.
- Produces: GitHub contribution paths and issue templates.

- [ ] **Step 1: Create `CONTRIBUTING.md`**

Create a guide with sections:

```md
# Contributing

Thanks for helping build AI Webnovel Writing Platform.

This project welcomes both code and non-code contributions. 网文作者、编辑、提示词玩家、平台研究者和开发者都可以参与。

## Good Contributions

- Platform rules backed by examples.
- Writing workflow feedback from real samples.
- First-chapter hook breakdowns.
- AI editorial role prompts.
- Failure retrospectives.
- Documentation fixes.
- Bug fixes and focused product improvements.

## Before You Open an Issue

Please include the user type, target platform, current workflow step, expected result, actual result, and evidence.

## Before You Open a Pull Request

- Keep changes focused.
- Explain user value.
- Do not add new platforms without discussion.
- Do not let AI overwrite accepted manuscript content.
- Run relevant tests.

## Local Checks

```bash
npm test
npm run build
```
```

- [ ] **Step 2: Create issue templates**

Create:

`.github/ISSUE_TEMPLATE/bug_report.md`

```md
---
name: Bug report
about: Report a product, workflow, docs, or model configuration problem
title: "[Bug] "
labels: bug
---

## 问题描述

## 复现步骤

1.
2.
3.

## 期望结果

## 实际结果

## 影响页面或流程

## 目标平台

## 证据截图或回执
```

`.github/ISSUE_TEMPLATE/feature_request.md`

```md
---
name: Feature request
about: Suggest a focused feature with a real writing scenario
title: "[Feature] "
labels: enhancement
---

## 使用场景

## 用户类型

## 当前卡点

## 希望增加的能力

## 验收标准

## 不应该做什么
```

`.github/ISSUE_TEMPLATE/platform_rule.md`

```md
---
name: Platform rule
about: Contribute platform tactics, rules, examples, or review criteria
title: "[Platform Rule] "
labels: platform-rule
---

## 目标平台

## 适用题材或篇幅

## 规则或打法

## 示例

## 风险或反例

## 如何进入产品
```

`.github/ISSUE_TEMPLATE/writing_workflow.md`

```md
---
name: Writing workflow
about: Share a real sample workflow, first-chapter challenge, or failure retrospective
title: "[Workflow] "
labels: writing-workflow
---

## 真实样本背景

## 目标平台

## 已完成步骤

## AI 参与方式

## 作者采用或退回结论

## 失败点或复盘

## 希望社区帮助什么
```

- [ ] **Step 3: Create PR template**

Create `.github/pull_request_template.md`:

```md
## Summary

## 用户价值

## 改动范围

## 影响的写作流水线

## 验证方式

- [ ] `npm test`
- [ ] `npm run build`
- [ ] 文档或模板已人工检查

## 风险

## 截图或证据
```

- [ ] **Step 4: Run focused test**

Run:

```bash
node --test src/test/packagingDocsSource.test.ts
```

Expected: PASS with 6 tests passing.

- [ ] **Step 5: Commit contribution files**

Run:

```bash
git add CONTRIBUTING.md .github/ISSUE_TEMPLATE/bug_report.md .github/ISSUE_TEMPLATE/feature_request.md .github/ISSUE_TEMPLATE/platform_rule.md .github/ISSUE_TEMPLATE/writing_workflow.md .github/pull_request_template.md
git commit -m "docs: add contribution and github templates"
```

---

### Task 6: Verify Packaging and Push

**Files:**
- Verify only, no planned file changes.

**Interfaces:**
- Consumes: All docs and templates from prior tasks.
- Produces: Verified branch ready for public packaging review.

- [ ] **Step 1: Run focused packaging test**

Run:

```bash
node --test src/test/packagingDocsSource.test.ts
```

Expected: PASS, 6 tests passing.

- [ ] **Step 2: Run full test suite**

Run:

```bash
npm test
```

Expected: PASS with all tests passing.

- [ ] **Step 3: Run Markdown/source checks**

Run:

```bash
git diff --check
```

Expected: exit 0 with no whitespace errors.

- [ ] **Step 4: Inspect status**

Run:

```bash
git status --short --branch
```

Expected: clean working tree on `codex/final-delivery-platform-tactic-archive`.

- [ ] **Step 5: Push branch**

Run:

```bash
git push
```

Expected: branch updates on `origin/codex/final-delivery-platform-tactic-archive`.
