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
- Quality Gate：没有样本、复查、失败修复和发布包证据，不允许扩大批量。
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

## Current Delivery State

当前项目已经是可运行的网页产品骨架，8/8 核心平台已完成，剩余 10 个平台不再添加。当前重点不是扩平台，而是继续打磨真实写作、任务回执、派单回执、失败修复、发布包与平台复盘验收口径。

模型侧已经从“预留接口”推进到模型岗位矩阵、职责路由和推荐批次缺岗硬拦截：Claude / DeepSeek / Kimi / GPT 与 OpenAI-compatible 模型按岗位进入写作流水线，所有 AI 输出都应作为候选稿、任务回执或发布建议，由作者人工采用。

主控闸门 交付入口负责验收真实流水线；端到端可见验收口径地图覆盖任务回执验收口径、派单回执验收口径、失败修复回执验收口径、发布包与平台复盘验收口径。

## Product Map

- `/`：主控闸门 交付入口，直达真实流水线验收。
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
cp .env.example .env
npm install
npm run db:seed
npm run dev
```

`npm run db:seed` 会初始化本地 SQLite 演示/种子数据，让 `/projects`、`/references`、`/gate`、`/dispatch` 等页面在 fresh clone 后就能浏览完整样例。

Open:

```txt
http://localhost:3000
```

Useful checks:

```bash
npm test
npm run build
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
- `docs/GITHUB_INTRO.md`：GitHub 简介和 Topics 素材。
- `docs/ai-writing-platform-dev-doc.md`：项目梳理、竞品参考与整体开发文档。
- `docs/PRD.md`：产品需求文档。
- `docs/TECHNICAL_DESIGN.md`：技术设计文档。

## License

MIT License. See `LICENSE`.
