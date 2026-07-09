# AI Webnovel Writing Platform

面向网文作者的 AI 写作生产平台：用大树结构管理作品，用 Claude、DeepSeek、Kimi、GPT 组成 AI 编辑部，从开书、首章样本、审稿二改、派单回执到总闸门和发布包，跑通可验收的网文创作流水线。

AI 网文写作平台不是“一键生成小说”的聊天玩具，而是一个面向作者和工作室的写作生产系统。传统写作工作台负责作品、章节、大纲、人物、世界观、伏笔和发布包；AI 模型负责候选稿、审稿、补强、改写、资料整理、平台适配和任务回执；毒舌 PM 闸门负责拦住没有证据的批量生产。

## GitHub 简介

**Short description**

AI webnovel writing platform for structured long-form fiction, platform-specific writing workflows, multi-model editorial roles, PM gates, dispatch receipts, and submission packages.

**中文简介**

一个专为网文作者设计的 AI 写作工作台，帮助作者从选平台、定篇幅、搭大纲树、写章节、审稿、二改、派单、失败修复到导出投稿，完成可持续、可验收、可复盘的连载生产流程。

**核心亮点**

- 大树写作法：开头、结尾、主干、分支、叶片、土壤分层管理。
- 8 个核心平台：起点中文网、番茄小说、七猫、晋江文学城、知乎盐选、WebNovel、Royal Road、Wattpad。
- AI 编辑部：Claude、DeepSeek、Kimi、GPT 和 OpenAI-compatible 模型按岗位协作。
- 作者可控：AI 输出默认是候选稿或回执，不能直接覆盖正文。
- 毒舌 PM 闸门：没有样本、复查、失败修复和发布包证据，不允许批量生产。

## 当前交付口径

- `/`：毒舌 PM 交付入口，直达“验收真实流水线”。
- `/docs`：开发文档总览，汇总 PM 路线、8 平台范围、模型接口和流水线验收口径。
- `/projects`：作品工作台，承载开书、大树结构、章节、人物、世界观、伏笔、首日流程、前三章改写和平台发布包。
- `/tasks`：任务中心，集中处理跨项目草稿、审稿、二改、导出、投稿修复和批量节奏。
- `/dispatch`：派单中心，把模型执行、角色任务、完成证据和人工验收串起来。
- `/gate`：总闸门，负责批量生产前的样本、复查、失败率、成本和恢复证据检查。
- `/failures`：失败修复中心，按模型配置、提示词上下文、样本重试和人工复盘拆分修复泳道。
- `/references`：开源参考库，沉淀 30+ GitHub 案例、AI 编辑部角色和平台执行卡。
- `/settings/models`：模型设置，承接 Claude / DeepSeek / Kimi / GPT、OpenAI-compatible、模型岗位矩阵、职责路由和推荐批次缺岗硬拦截后的修复入口。

平台范围已经锁定：8/8 核心平台已完成，覆盖起点中文网、番茄小说、七猫、晋江文学城、知乎盐选、WebNovel、Royal Road、Wattpad；剩余 10 个平台不再添加。

## 端到端可见验收口径地图

- `/projects`：承接开书、发布包与平台复盘验收口径，发布包必须看到平台包、样章、标签、卖点、版本基线、真实反馈和复盘指标。
- `/tasks`：承接任务回执验收口径，每个推荐任务都要看到执行角色、输入、输出、人工验收和下一步。
- `/dispatch`：承接派单回执验收口径，完成派单前必须补完成依据，回总闸门时才有可复检证据。
- `/gate`：承接放量复检和派单证据总控，缺样本、复查、质量、成本、失败率或恢复证据时禁止放大。
- `/failures`：承接失败修复回执验收口径，固定检查失败原因、修复泳道、重试样本、恢复观察和是否暂停批量。

## 本地运行

```bash
npm install
npm run dev
```

常用验证：

```bash
npm test
npm run build
```

开发时优先证明真实作品流水线：开书骨架、首章样本、审稿二改、派单回执、模型岗位矩阵、职责路由、总闸门、失败修复、发布包和平台复盘。不要把“新增平台”当作进度。

## Documents

- `docs/USAGE.md`: 产品使用说明
- `docs/GITHUB_INTRO.md`: GitHub 简介、仓库描述和推广文案素材
- `docs/ai-writing-platform-dev-doc.md`: 项目梳理、竞品参考与整体开发文档
- `docs/PRD.md`: 产品需求文档
- `docs/TECHNICAL_DESIGN.md`: 技术设计文档
- `docs/superpowers/plans/2026-07-01-ai-writing-platform-mvp.md`: MVP 实施计划
