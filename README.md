# AI Webnovel Writing Platform

AI 网文写作平台项目。

当前已经从“计划文档”推进到可运行的网页产品骨架。产品入口不是聊天框，而是面向网文作者的 AI 写作生产平台：传统写作工作台负责作品、章节、大纲、人物、世界观、伏笔和发布包，AI 模型负责审稿、补强、改写、平台适配和任务回执。

## 当前交付口径

- `/`：毒舌 PM 交付入口，直达“验收真实流水线”。
- `/docs`：开发文档总览，汇总 PM 路线、8 平台范围、模型接口和流水线验收口径。
- `/projects`：作品工作台，承载开书、大树结构、章节、人物、世界观、伏笔、首日流程、前三章改写和平台发布包。
- `/tasks`：任务中心，集中处理跨项目草稿、审稿、二改、导出、投稿修复和批量节奏。
- `/dispatch`：派单中心，把模型执行、角色任务、完成证据和人工验收串起来。
- `/gate`：总闸门，负责批量生产前的样本、复查、失败率、成本和恢复证据检查。
- `/failures`：失败修复中心，按模型配置、提示词上下文、样本重试和人工复盘拆分修复泳道。
- `/references`：开源参考库，沉淀 30+ GitHub 案例、AI 编辑部角色和平台执行卡。
- `/settings/models`：模型设置，预留 Claude / DeepSeek / Kimi / GPT 和 OpenAI-compatible 接口。

平台范围已经锁定：8/8 核心平台已完成，覆盖起点中文网、番茄小说、七猫、晋江文学城、知乎盐选、WebNovel、Royal Road、Wattpad；剩余 10 个平台不再添加。

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

开发时优先证明真实作品流水线：开书骨架、首章样本、审稿二改、派单回执、总闸门、失败修复、发布包和平台复盘。不要把“新增平台”当作进度。

## Documents

- `docs/ai-writing-platform-dev-doc.md`: 项目梳理、竞品参考与整体开发文档
- `docs/PRD.md`: 产品需求文档
- `docs/TECHNICAL_DESIGN.md`: 技术设计文档
- `docs/superpowers/plans/2026-07-01-ai-writing-platform-mvp.md`: MVP 实施计划
