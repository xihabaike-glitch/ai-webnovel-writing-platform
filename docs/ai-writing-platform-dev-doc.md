# AI 网文写作平台开发文档

日期：2026-07-07

## 0. 当前交付状态

当前版本已经从“计划文档”推进到可运行的网页产品骨架。产品入口不再是单一聊天框，而是围绕作品生产、平台投稿、模型派工和失败复盘形成闭环。

### 0.1 页面地图

1. `/docs`：开发文档总览。对齐毒舌 PM 路线、8 个核心平台、30+ GitHub 参考案例、AI 模型接口和大树写作流程。
2. `/projects`：作品工作台。承载开书、平台目标、章节、大纲、人物、世界观、伏笔、首日流程、前三章改写和发布包。
3. `/tasks`：任务中心。集中处理跨项目草稿、审稿、二改、导出、投稿修复、失败恢复和批量生产节奏。
4. `/dispatch`：派单中心。把首日工作、模型执行、验收回执和角色任务串起来。
5. `/gate`：总闸门。负责生产放大前的证据检查，防止没有样本、没有复查、没有失败修复就进入批量。
6. `/failures`：失败修复中心。按模型配置、提示词上下文、样本重试和人工复盘拆分修复泳道，必要时暂停批量。
7. `/references`：开源参考库。收录 30 个以上 GitHub 项目，并把参考价值转成产品开发路径、AI 编辑部角色和平台执行卡。
8. `/settings/models`：模型设置。预留 Claude、DeepSeek、Kimi、GPT、OpenAI-compatible 等接口，并把模型绑定到具体写作岗位。

### 0.2 平台范围锁定

平台范围已经锁定为 8 个核心平台：起点中文网、番茄小说、七猫、晋江文学城、知乎盐选、WebNovel、Royal Road、Wattpad。

当前状态是：**8/8 核心平台已完成**。扩展平台不再作为待补缺口，**剩余 10 个平台不再添加**。后续工作只围绕这 8 个平台继续打磨写作、投稿、复盘三段闭环。

### 0.3 模型岗位与接口

模型接口不是聊天窗口，而是 AI 编辑部岗位：

1. Claude：长篇结构主编，负责人物弧光、主线支线、前三章结构复审和长上下文审稿。
2. DeepSeek：中文网文写手，负责章节初稿、爽点补强、中文节奏改写和小样本试写。
3. Kimi：长上下文资料官，负责世界观整理、历史章节召回、资料压缩和连续性检查。
4. GPT：海外投稿包装编辑，负责 WebNovel、Royal Road、Wattpad 的英文简介、标签和包装改写。

模型岗位必须绑定任务、备用模型、人工验收和成本观察。任何模型输出默认是候选稿或回执，不得直接覆盖作者正文。

### 0.4 毒舌 PM 闸门

当前产品的 PM 闸门规则如下：

1. 写作前先看作品骨架：开头、结尾、主干、分支、叶片、土壤必须有最小可用材料。
2. 批量前先看样本：没有单章样本、审稿复查和人工采用证据，不允许扩大批量。
3. 失败后先修原因：失败修复中心按泳道给出优先级；模型配置或上下文失败未修复时必须暂停批量。
4. 恢复后先观察：历史失败清空后，也只允许小批量观察恢复，不能直接放大。
5. 投稿前先过平台包：8 个平台都要有写作抓手、投稿抓手、复盘指标和版本记录。

### 0.5 下一步验收口径

下一步不是继续加平台，也不是堆更多炫技能力，而是逐项证明现有闭环可以跑通：

1. 从 `/projects` 创建或打开作品，完成开头钩子、结尾承诺、主干、分支和章节卡。
2. 从 `/settings/models` 确认模型岗位和任务路由，确保 Claude、DeepSeek、Kimi、GPT 都有明确用途。
3. 从 `/tasks` 和 `/dispatch` 验收首日写作、模型执行、回执接受和下一步任务。
4. 从 `/gate` 检查是否允许批量生产。
5. 从 `/failures` 处理失败修复中心的优先泳道，必要时暂停批量。
6. 从 `/references` 回看 30+ 开源案例和 8 平台执行卡，防止产品偏离网文生产。

## 1. 毒舌产品经理 5.0 结论

这个项目如果做成“又一个 AI 聊天框”，基本没有价值。用户不是缺一个能胡诌剧情的模型，用户缺的是一个能长期管理作品、平台策略、人物弧光、章节节奏、伏笔回收、多模型调用成本的生产系统。

所以产品定位必须改成：

> 面向网文作者的 AI 写作生产平台。传统写作工作台是地基，AI 模型是可插拔协作层，平台规则库是商业策略层。

不要把 AI 放在主界面中央。主界面应该是作品、章节、大纲、人物、世界观、伏笔、平台目标。AI 应该像编辑部员工一样出现在右侧：能审稿、补强、改写、拆大纲、查连续性，但不能夺走作者的控制权。

### 必须砍掉的伪需求

1. “一键生成百万字小说”：听起来爽，实际交付不可控，容易变成垃圾内容工厂。
2. “全平台风格自动适配”：第一版只做规则提示和结构建议，不承诺一键变爆款。
3. “所有模型都深度适配”：第一版只做统一模型适配器，Claude、DeepSeek、Kimi、GPT 先用同一协议接入。
4. “复杂社交社区”：先别做。写作工具最怕还没解决写作，就开始做社区。
5. “漂亮大屏数据看板”：作者最需要的是能写、能管、能改，不是看仪表盘自我感动。

### 真正应该做的壁垒

1. 长篇工程管理：章节、卷、人物、设定、伏笔、时间线。
2. 平台策略库：起点、番茄、七猫、晋江、知乎盐选、WebNovel、Royal Road、Wattpad。
3. 多模型适配：Claude、DeepSeek、Kimi、GPT、OpenAI-compatible、自定义本地模型。
4. 结构化审稿：钩子、爽点、章末悬念、人物弧光、伏笔回收、平台适配。
5. 作者可控：AI 只能建议和生成候选稿，最终进入正文必须由作者确认。

## 2. 产品目标

### 一句话定位

一个专为网文作者设计的 AI 写作工作台，帮助作者从选平台、定题材、搭大纲、写章节、审稿、改稿到导出投稿，完成可持续连载。

### 目标用户

1. 新人作者：不知道选哪个平台，不知道怎么起稿，需要模板和流程。
2. 稳定更新作者：需要管理长篇、人物、伏笔、更新计划。
3. 工作室作者：需要多人协作、多模型分工、审稿标准化。
4. 出海作者：需要把中文网文逻辑改写为 WebNovel、Royal Road、Wattpad 适配结构。

### 核心使用场景

1. 创建一个新作品，选择目标平台和篇幅。
2. 先写开头钩子和结尾，再构建主干和支线。
3. 在章节编辑器中写正文，同时查看人物、伏笔和平台提示。
4. 调用 AI 检查章节钩子、爽点、人物弧光和章末悬念。
5. 调用不同模型做不同任务，例如 Claude 审结构、DeepSeek 写中文网文段落、Kimi 整理长上下文、GPT 做多语言和综合改写。
6. 导出章节包、大纲、人物设定、投稿摘要。

## 3. 30 个 GitHub 开源项目筛选

筛选标准：

1. 和小说、长文、AI 写作、多模型接口、编辑器、长上下文管理相关。
2. 能为本项目提供产品结构、技术架构或反面教训。
3. 不要求都是网文垂类，但必须能服务 AI 写作平台设计。

| 编号 | 项目 | 类型 | 可参考点 | 不要照抄 |
|---|---|---|---|---|
| 1 | [vkbo/novelWriter](https://github.com/vkbo/novelWriter) | 传统小说编辑器 | 多文档组织、Markdown-like 文稿、元数据、交叉引用 | 桌面端重，缺少 AI 和平台策略 |
| 2 | [olivierkes/manuskript](https://github.com/olivierkes/manuskript) | 小说规划工具 | 人物、情节、章节、雪花法规划 | UI 和交互偏老，网页端不能照搬 |
| 3 | [andreafeccomandi/bibisco](https://github.com/andreafeccomandi/bibisco) | 小说写作软件 | 章节、场景、人物、地点、叙事线、导出 | 适合传统小说，网文连载和平台策略不足 |
| 4 | [smith-and-web/kindling](https://github.com/smith-and-web/kindling) | 现代小说写作软件 | 大纲常驻、离线、导入 Scrivener/Plottr/yWriter/Obsidian | 明确不做 AI，本项目需要 AI 层 |
| 5 | [brsloan/warewoolf](https://github.com/brsloan/warewoolf) | 极简小说编辑器 | Chapters / Editor / Notes 三栏极简结构 | 功能太少，只适合作为写作专注模式参考 |
| 6 | [ParaplegicRacehorse/plume-creator](https://github.com/ParaplegicRacehorse/plume-creator) | 写作组织工具 | item/folder/text 的通用文档组织 | 项目演进复杂，不能作为主架构唯一参考 |
| 7 | [egonSchiele/chisel](https://github.com/egonSchiele/chisel) | 本地 AI 写作应用 | 本地模型、OpenAI API、隐私优先 | 平台覆盖窄，Mac arm64 限制不能学 |
| 8 | [steven-tey/novel](https://github.com/steven-tey/novel) | AI WYSIWYG 编辑器 | Notion-like 编辑器、AI 自动补全、Tiptap/Next.js | 它是编辑器组件，不是完整写作平台 |
| 9 | [langchain-ai/story-writing](https://github.com/langchain-ai/story-writing) | LangGraph 故事写作示例 | 章节版本、多分支续写、agent 工作流 | 更像 demo，缺少网文工程管理 |
| 10 | [raestrada/storycraftr](https://github.com/raestrada/storycraftr) | AI 故事 CLI | 世界观、书籍大纲、章节生成 | CLI 产品形态不适合普通作者 |
| 11 | [NousResearch/autonovel](https://github.com/NousResearch/autonovel) | 自动小说流水线 | foundation、角色、世界、outline、voice、canon 流程 | 太自动化，作者控制权不足 |
| 12 | [GOAT-AI-lab/GOAT-Storytelling-Agent](https://github.com/GOAT-AI-lab/GOAT-Storytelling-Agent) | 长故事 agent | 自顶向下长故事规划、可控尺度写作 | 学结构，不学“无人监督生成” |
| 13 | [guerra2fernando/libriscribe](https://github.com/guerra2fernando/libriscribe) | 多 agent 图书创作 | 多专业 agent、从概念到手稿 | 偏图书，不够网文平台化 |
| 14 | [KazKozDev/NovelGenerator](https://github.com/KazKozDev/NovelGenerator) | LLM 小说生成器 | 多 agent 生成完整小说、角色和风格 | 生成导向过强，需要改成作者工作台 |
| 15 | [datacrystals/AIStoryWriter](https://github.com/datacrystals/AIStoryWriter) | AI 长故事生成 | Ollama、本地模型、长篇生成 | 不能只做 prompt 到小说 |
| 16 | [EdwardAThomson/NovelWriter](https://github.com/EdwardAThomson/NovelWriter) | LLM 小说 GUI | 参数、宇宙设定、大纲、场景、章节正文 | Tkinter 桌面产品形态不可照搬 |
| 17 | [principia-ai/WriteHERE](https://github.com/principia-ai/WriteHERE) | 长文递归规划 | recursive planning、动态拆解、写作任务适配 | 更偏研究框架，需要产品化重构 |
| 18 | [forsonny/book-os](https://github.com/forsonny/book-os) | AI 小说上下文系统 | Standards / Novel / Manuscripts 三层上下文 | 适合工作流参考，不是完整应用 |
| 19 | [ThomasHoussin/Claude-Book](https://github.com/ThomasHoussin/Claude-Book) | Claude Code 小说多 agent | planner、writer、style-linter、character-reviewer | 绑定 Claude Code，需抽象成通用模型层 |
| 20 | [jblemee/bmad-book-builder](https://github.com/jblemee/bmad-book-builder) | 小说开发 agent 团队 | Story Architect、Character Keeper、Style Coach 等角色 | 角色体系可学，不能照搬 BMAD 术语 |
| 21 | [john-paul-ruf/novel-engine](https://github.com/john-paul-ruf/novel-engine) | 桌面小说工程平台 | phase-gated pipeline、SQLite、本地桌面、7 个编辑 agent | 桌面优先，本项目要网页优先 |
| 22 | [mrigankad/Novel-OS](https://github.com/mrigankad/Novel-OS) | 多 agent 小说编辑基础设施 | 任意 LLM、专业编辑 agent、持续记忆 | 注意不要做成复杂到作者不会用 |
| 23 | [Narcooo/inkos](https://github.com/Narcooo/inkos) | 中文 AI 写作/互动叙事 | 连续性审计、AI 味检测、世界状态、分支互动 | 功能野心大，MVP 不能一次吞完 |
| 24 | [Ckokoski/authorclaw](https://github.com/Ckokoski/authorclaw) | 自主 AI 写作 agent | planning、revision、promotion、skills、dashboard | 安全边界必须收紧，别让 agent 乱执行 |
| 25 | [christiandarkin/Creative-Writers-Toolkit](https://github.com/christiandarkin/Creative-Writers-Toolkit) | GPT 创意写作工具集 | 角色大纲、故事梗概、创意探索 | 老 GPT-3 时代项目，只学任务拆分 |
| 26 | [mshumer/gpt-author](https://github.com/mshumer/gpt-author) | 一键生成 EPUB 小说 | GPT + 图像 + EPUB 输出链路 | 这是反面教材：炫技强，生产控制弱 |
| 27 | [open-webui/open-webui](https://github.com/open-webui/open-webui) | 多模型 AI 平台 | Ollama、OpenAI-compatible、RAG、自托管 | 太通用，不能把写作产品做成通用聊天站 |
| 28 | [Mintplex-Labs/anything-llm](https://github.com/Mintplex-Labs/anything-llm) | 本地优先 AI/RAG 平台 | 多模型、多用户、文档管道、agent、向量库 | RAG 很强，但写作结构不是核心 |
| 29 | [lobehub/lobe-chat](https://github.com/lobehub/lobe-chat) | 多模型聊天框架 | 多 provider、插件、现代 UI、私有部署 | 聊天体验可学，但写作要围绕文稿 |
| 30 | [SillyTavern/SillyTavern](https://github.com/SillyTavern/SillyTavern) | 角色/剧情 LLM 前端 | 角色卡、世界信息、上下文管理、多后端 | 社区角色扮演强，不等于严肃网文生产 |

## 4. 竞品结论

### 4.1 我们必须学习的东西

1. novelWriter / bibisco / Manuskript：作品工程管理是底座。
2. Kindling / WareWoolf：写作界面必须克制，不要把作者吓跑。
3. Novel Engine / Novel-OS / Claude-Book：AI 角色要流程化，不是聊天化。
4. Open WebUI / Lobe Chat / AnythingLLM：模型提供商要抽象，不要绑死一家。
5. InkOS / GOAT / autonovel：长篇必须有连续性审计和 canon 机制。

### 4.2 我们必须避开的坑

1. 一键生成导向：会让产品沦为垃圾稿机器。
2. 纯聊天导向：写作上下文会散，文稿状态不可控。
3. 桌面复杂软件导向：普通网文作者不想学工程软件。
4. 角色太多：agent 名字越炫，作者越不知道该点谁。
5. 平台策略缺失：不懂起点、番茄、七猫、知乎盐选、WebNovel、Royal Road、Wattpad，就不是网文工具。

## 5. MVP 范围

第一版只做“能让作者真的开始写”的闭环：

1. 作品项目管理
2. 平台画像库
3. 篇幅模板
4. 大纲树
5. 章节编辑器
6. 人物库
7. 世界观/设定库
8. 伏笔表
9. 模型配置
10. AI 右侧助手
11. 章节审稿
12. Markdown/docx 导出

### MVP 不做

1. 用户社区
2. 投稿平台自动发布
3. 收益预测
4. 版权交易
5. 短剧分镜
6. 自动生成整本书
7. 多人实时协作
8. 复杂移动端 App

## 6. 平台画像库

### 6.1 国内平台

#### 起点中文网

定位：付费订阅长篇，男频顶流，适合精品长线和 IP 改编。

产品规则：

1. 默认推荐 50 万字以上规划。
2. 强制填写世界观、升级体系、势力结构、卷结构。
3. 重点检查主线持续性、阶段 Boss、人物成长、长期伏笔。
4. 第一章不只要爽，还要有世界期待和长期钩子。

#### 番茄小说

定位：免费广告平台，新人友好，重快节奏和强钩子。

产品规则：

1. 默认强调前三章钩子。
2. 检查爽点密度、读完率风险、章末悬念。
3. 适合系统、重生、逆袭、年代、甜宠、悬疑。
4. 支持 8 万字首秀前结构检查。

#### 七猫

定位：免费广告/保底导向，适合稳定收益和长篇更新。

产品规则：

1. 强调稳定更新计划。
2. 检查长线情绪供给。
3. 适合女频言情、种田、年代、豪门、悬疑，也覆盖男频玄幻都市。
4. 输出保底向大纲和章节节奏。

#### 晋江文学城

定位：女频、纯爱、百合、言情强平台。

产品规则：

1. 强化人物关系网。
2. 强化情绪推进和人物弧光。
3. 审核风险提示更严格。
4. 支持慢热、细腻、关系驱动结构。

#### 知乎盐选

定位：短篇/中短篇反转付费内容。

产品规则：

1. 默认支持 1 万到 15 万字。
2. 第一人称、悬疑、复仇、虐恋、脑洞优先。
3. 强制设计反转链。
4. 结尾必须回收核心情绪和真相。

### 6.2 海外平台

#### WebNovel

定位：起点国际，适合英文原创/翻译出海。

产品规则：

1. 玄幻、系统、升级、强情节优先。
2. 支持中文大纲到英文 synopsis。
3. 支持章节标题英文化。
4. 检查海外读者是否能理解设定。

#### Royal Road

定位：海外原创连载，Progression Fantasy、LitRPG、修真变体强。

产品规则：

1. 强制维护等级、技能、数值、地图、装备。
2. 检查成长曲线是否清晰。
3. 战斗逻辑和系统限制必须明确。
4. 支持读者反馈驱动的设定修正。

#### Wattpad

定位：全球大众故事社区，欧美言情、狼人、豪门、青春强。

产品规则：

1. 强化角色吸引力和关系张力。
2. 强化标签策略。
3. 章节更短，情绪钩子更密。
4. 支持社区评论反馈摘要。

## 7. 核心产品模块

### 7.1 作品工作台

显示：

1. 作品名
2. 目标平台
3. 目标字数
4. 当前字数
5. 完成进度
6. 更新计划
7. 最近章节
8. 待处理审稿问题

### 7.2 大纲树

采用大树结构：

1. 根：核心卖点、主题、商业钩子。
2. 树干：主线。
3. 大枝：卷结构。
4. 小枝：支线。
5. 叶片：章节。
6. 土壤：平台规则、人物设定、世界观、读者预期。

### 7.3 章节编辑器

左侧：章节目录。  
中间：正文编辑器。  
右侧：章节卡和 AI 助手。

章节卡字段：

1. 章节标题
2. 本章目标
3. 开头钩子
4. 冲突
5. 价值变化
6. 章末悬念
7. 出场人物
8. 涉及伏笔
9. 平台适配提醒
10. 字数目标

### 7.4 人物库

字段：

1. 姓名
2. 平台定位
3. 角色功能
4. 外在目标
5. 内在需求
6. 致命缺陷
7. 人物弧光
8. 关系网
9. 口癖和语气
10. 出场章节
11. 结局状态

### 7.5 世界观/设定库

字段：

1. 世界规则
2. 等级体系
3. 技能体系
4. 势力结构
5. 地图地点
6. 物品道具
7. 禁忌和代价
8. 平台适配说明

### 7.6 伏笔表

字段：

1. 伏笔名称
2. 埋设章节
3. 回收章节
4. 关联人物
5. 关联主线/支线
6. 当前状态：未埋设、已埋设、待回收、已回收、已废弃
7. 风险提示

## 8. AI 模型接口设计

### 8.1 模型提供商

第一版支持：

1. Claude
2. DeepSeek
3. Kimi
4. GPT
5. OpenAI-compatible 自定义接口
6. Ollama/本地模型预留

### 8.2 统一模型适配器

```ts
export type ModelProviderId =
  | "claude"
  | "deepseek"
  | "kimi"
  | "gpt"
  | "openai_compatible"
  | "ollama";

export interface ModelProviderConfig {
  id: ModelProviderId;
  displayName: string;
  baseUrl?: string;
  apiKey?: string;
  defaultModel: string;
  enabled: boolean;
  maxContextTokens?: number;
}

export interface GenerateRequest {
  providerId: ModelProviderId;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  projectContext?: ProjectContextPacket;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface GenerateResult {
  text: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    costUsd?: number;
  };
  raw?: unknown;
}
```

### 8.3 模型任务分工

| 任务 | 推荐模型 | 原因 |
|---|---|---|
| 长篇结构审稿 | Claude | 长上下文、结构理解强 |
| 中文网文段落生成 | DeepSeek | 中文表达和成本较适合批量 |
| 长资料整理 | Kimi | 长上下文资料处理优势 |
| 多语言/海外改写 | GPT | 综合能力和英文输出稳定 |
| 私有草稿审阅 | Ollama/本地模型 | 隐私优先 |

### 8.4 AI 助手入口

AI 只在右侧助手中出现，功能包括：

1. 检查开头钩子
2. 检查章节爽点
3. 检查人物弧光
4. 检查章末悬念
5. 检查伏笔回收
6. 改写为番茄风
7. 改写为起点风
8. 压缩为知乎盐选短篇结构
9. 改写为 WebNovel 英文 synopsis
10. 检查 Royal Road 升级体系
11. 检查 Wattpad 情绪标签

## 9. 后端数据模型草案

### 9.1 Project

```ts
interface Project {
  id: string;
  title: string;
  targetPlatform: PlatformId;
  targetLengthType: "short_10k" | "mid_50k" | "long_300k_plus" | "mega_1m_plus";
  targetWordCount: number;
  currentWordCount: number;
  genre: string;
  createdAt: string;
  updatedAt: string;
}
```

### 9.2 Chapter

```ts
interface Chapter {
  id: string;
  projectId: string;
  volumeId?: string;
  order: number;
  title: string;
  content: string;
  wordCount: number;
  goal: string;
  hook: string;
  conflict: string;
  valueShift: string;
  cliffhanger: string;
  status: "outline" | "draft" | "revising" | "final";
  createdAt: string;
  updatedAt: string;
}
```

### 9.3 Character

```ts
interface Character {
  id: string;
  projectId: string;
  name: string;
  role: "protagonist" | "antagonist" | "ally" | "mentor" | "love_interest" | "supporting";
  desire: string;
  need: string;
  flaw: string;
  arcStart: string;
  arcEnd: string;
  voice: string;
  relationshipNotes: string;
}
```

### 9.4 PlotThread

```ts
interface PlotThread {
  id: string;
  projectId: string;
  type: "main" | "branch" | "romance" | "mystery" | "world" | "power";
  title: string;
  startChapterId?: string;
  endChapterId?: string;
  status: "planned" | "active" | "resolved" | "abandoned";
}
```

### 9.5 Foreshadow

```ts
interface Foreshadow {
  id: string;
  projectId: string;
  title: string;
  setupChapterId?: string;
  payoffChapterId?: string;
  relatedCharacterIds: string[];
  status: "planned" | "setup" | "payoff_pending" | "paid_off" | "abandoned";
  notes: string;
}
```

## 10. 技术架构建议

### 10.1 前端

建议：

1. Next.js 或 Vite + React。
2. 编辑器使用 Tiptap 或 Lexical。
3. 状态管理使用 Zustand。
4. 大纲树使用 React Flow 或自研树组件。
5. UI 以工作台为主，不做营销首页。

### 10.2 后端

建议：

1. Node.js + NestJS，或 Next.js API Route 起步。
2. 数据库：PostgreSQL。
3. 本地/轻量版本可用 SQLite。
4. 长文本版本管理独立表。
5. 模型调用经统一 Model Gateway。

### 10.3 存储

1. 正文保存为结构化章节内容。
2. 每次 AI 改写生成候选版本，不覆盖正文。
3. 重要文稿支持快照。
4. 导出 Markdown/docx/zip。

### 10.4 安全

1. API Key 加密保存。
2. 前端不直接暴露第三方模型 key。
3. 每次模型调用记录 provider、model、token、费用。
4. AI 输出默认进入候选区，不自动覆盖正文。

## 11. API 草案

```txt
POST /api/projects
GET  /api/projects
GET  /api/projects/:id
PATCH /api/projects/:id

POST /api/projects/:id/chapters
GET  /api/projects/:id/chapters
PATCH /api/chapters/:chapterId

POST /api/projects/:id/characters
GET  /api/projects/:id/characters
PATCH /api/characters/:characterId

POST /api/projects/:id/foreshadows
GET  /api/projects/:id/foreshadows
PATCH /api/foreshadows/:foreshadowId

GET  /api/platforms
GET  /api/platforms/:id

POST /api/model-providers
GET  /api/model-providers
PATCH /api/model-providers/:id

POST /api/ai/tasks/chapter-review
POST /api/ai/tasks/hook-review
POST /api/ai/tasks/platform-adapt
POST /api/ai/tasks/outline-expand
POST /api/ai/tasks/continuity-check
```

## 12. 开发路线图

### Phase 0：产品骨架

产出：

1. 作品创建
2. 平台选择
3. 篇幅选择
4. 章节列表
5. 基础编辑器

验收：

1. 用户能创建作品。
2. 用户能写章节。
3. 用户能保存和继续编辑。

### Phase 1：传统写作工作台

产出：

1. 大纲树
2. 人物库
3. 世界观库
4. 伏笔表
5. 章节卡

验收：

1. 用户能用大树结构搭一本书。
2. 每章能绑定人物、伏笔、主线/支线。

### Phase 2：平台画像库

产出：

1. 起点
2. 番茄
3. 七猫
4. 晋江
5. 知乎盐选
6. WebNovel
7. Royal Road
8. Wattpad

验收：

1. 创建项目时能按平台生成写作建议。
2. 章节侧栏能显示平台适配提醒。

### Phase 3：模型网关

产出：

1. Claude 配置
2. DeepSeek 配置
3. Kimi 配置
4. GPT 配置
5. OpenAI-compatible 配置
6. 调用日志
7. 流式输出

验收：

1. 用户能配置至少一个模型。
2. 同一个 AI 任务能切换不同模型运行。

### Phase 4：AI 写作助手

产出：

1. 钩子检查
2. 章节审稿
3. 平台适配建议
4. 人物弧光检查
5. 伏笔回收检查
6. 候选改写版本

验收：

1. AI 输出不会自动覆盖正文。
2. 审稿结果能定位到章节问题。
3. 用户能把候选改写应用到正文。

### Phase 5：导出和版本

产出：

1. Markdown 导出
2. docx 导出
3. 章节 zip 导出
4. 大纲导出
5. 快照版本

验收：

1. 用户能导出完整作品资料。
2. 用户能回滚到历史版本。

## 13. 第一版信息架构

```txt
作品工作台
├─ 概览
├─ 大纲树
├─ 章节
│  ├─ 章节目录
│  ├─ 正文编辑器
│  └─ AI 助手
├─ 人物
├─ 世界观
├─ 伏笔
├─ 平台策略
├─ 模型设置
└─ 导出
```

## 14. 角色 Skill 设计

第一版不要做太多角色，先做 8 个：

1. 平台总编：判断作品适合哪个平台。
2. 大纲架构师：负责主线、卷结构、大树结构。
3. 钩子编辑：专看第一章、前三章、章末悬念。
4. 人物编辑：检查人物弧光和关系。
5. 伏笔编辑：检查埋设和回收。
6. 爽点编辑：检查网文节奏和读者期待。
7. 海外编辑：适配 WebNovel、Royal Road、Wattpad。
8. 连贯性审校：检查设定、时间线、人物行为冲突。

## 15. 验收标准

MVP 合格标准：

1. 作者不调用 AI，也能当传统写作工具使用。
2. 作者调用 AI，可以完成章节审稿、钩子检查、平台适配。
3. 每个 AI 输出都有来源上下文和应用按钮。
4. 支持至少 4 类模型提供商：Claude、DeepSeek、Kimi、GPT。
5. 支持至少 8 个目标平台画像：起点、番茄、七猫、晋江、知乎盐选、WebNovel、Royal Road、Wattpad。
6. 能导出可投稿/可备份的文稿和大纲。

平台范围收口：剩余 10 个扩展平台不再添加，不作为当前版本缺口；开发、测试和页面提示都以 8 个核心平台为验收范围。

## 16. 下一步

建议下一步不要直接开写代码，先做两个交付物：

1. `PRD.md`：产品需求文档，锁定页面、字段、MVP 范围。
2. `TECHNICAL_DESIGN.md`：技术方案，锁定数据库、模型网关、编辑器选型、API。

如果要快速进入开发，建议第一版技术栈：

1. Next.js
2. TypeScript
3. Tiptap
4. PostgreSQL
5. Prisma
6. Zustand
7. Tailwind CSS
8. Model Gateway 自研
