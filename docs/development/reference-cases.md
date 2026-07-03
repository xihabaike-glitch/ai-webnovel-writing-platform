# AI 网文写作平台开发参考案例库

这份文档用于把 30 个 GitHub 开源项目转成开发参考，不是让产品照抄功能。判断标准只有一个：它能不能帮助我们把 AI 网文写作平台做得更像作者真正会用的生产工具。

## 毒舌产品经理 5.0 结论

当前项目已经有平台模板、开书流程、模型路由、任务队列和发布门禁。下一步不要再堆“AI 聊天”，应该补齐四件事：

1. 写作工作台：让作者能在同一处看到开头钩子、结尾、主干、支线、人物弧光、章节卡和正文。
2. 模型任务化：Claude、DeepSeek、Kimi、GPT 不要只做供应商配置，要按任务自动分工。
3. 项目知识库：世界观、人物、伏笔、历史章节、平台策略都要变成模型可召回的土壤。
4. 多平台发布流水线：起点、番茄、七猫、知乎盐选、WebNovel、Royal Road、Wattpad 要能生成不同投稿包和复盘版本。

## 传统写作工具

| 案例 | 链接 | 可借鉴点 | 对本项目的启发 | 风险提醒 |
| --- | --- | --- | --- | --- |
| novelWriter | https://github.com/vkbo/novelWriter | 长篇小说项目、章节树、元数据、字数统计集中。 | 写作工作台要先尊重作者结构，再嵌入 AI 建议。 | 容易偏桌面单机工具。 |
| bibisco | https://github.com/andreafeccomandi/bibisco | 人物访谈、场景、章节和结构化小说资产。 | 人物弧光要能被章节引用和模型校验。 | 填写成本可能过重。 |
| Manuskript | https://github.com/olivierkes/manuskript | 雪花法、概要、章节分层、写作进度。 | 适合“先开头和结尾，再主干，再分支”的大树结构。 | 规划太重会拖慢新手。 |
| Quoll Writer | https://github.com/garybentley/quollwriter | 目标、想法、章节和低干扰写作环境。 | AI 只在卡点、复盘、下一章建议时出现。 | 缺少平台运营指标。 |
| Wavemaker Cards | https://github.com/wavemakercards/wavemaker-v5 | 卡片构思、时间线、章节计划。 | 主线、支线、伏笔和爽点适合做成可拖拽卡片。 | 太自由会缺少平台约束。 |
| Writer | https://github.com/josephernest/writing | 极简网页写作器，学习成本低。 | 开篇钩子、正文、改稿建议要留在同一写作视野。 | 不能单独支撑长篇项目。 |

## AI 工作流与模型平台

| 案例 | 链接 | 可借鉴点 | 对本项目的启发 | 风险提醒 |
| --- | --- | --- | --- | --- |
| Dify | https://github.com/langgenius/dify | 应用编排、知识库、模型接入、调试链路完整。 | 把多模型包装成写作任务，而不是聊天框。 | 通用能力强但不垂直。 |
| Flowise | https://github.com/FlowiseAI/Flowise | 可视化节点编排、提示词链、人工审核节点。 | 开书、首章、复审、二改、发布包可做成流程。 | 普通作者不该直接面对节点复杂度。 |
| LangChain | https://github.com/langchain-ai/langchain | 链式调用、工具、检索和代理生态。 | 章节生产可拆成诊断、召回、草稿、复审、二改。 | 抽象过多会增加维护成本。 |
| LlamaIndex | https://github.com/run-llama/llama_index | 文档索引、上下文组装和 RAG。 | 长篇要按人物、势力、伏笔、卷纲召回资料。 | 检索来源必须可解释。 |
| AutoGen | https://github.com/microsoft/autogen | 多代理协作和角色对话。 | 可拆主编、爽点编辑、设定编辑、海外编辑等角色。 | 多代理容易空转。 |
| crewAI | https://github.com/crewAIInc/crewAI | 角色、任务、流程和产物交付清晰。 | Skill 角色适合承担平台定位、人物弧光、发布包装。 | 角色过多会让用户迷糊。 |
| n8n | https://github.com/n8n-io/n8n | 自动化触发器、外部服务连接和任务执行。 | 发布、数据回收、复盘提醒可以闭环。 | 自动推进前必须有人审稿。 |
| Open WebUI | https://github.com/open-webui/open-webui | 多模型聊天、知识库、本地模型体验。 | 作者需要看到任务用了哪个模型、成本和 fallback。 | 聊天范式会稀释写作平台定位。 |
| LibreChat | https://github.com/danny-avila/LibreChat | 多提供商接入和插件生态。 | Claude、GPT、DeepSeek、Kimi 要统一接入口径。 | 不要只做统一聊天壳。 |
| LobeChat | https://github.com/lobehub/lobe-chat | 模型配置、角色市场、现代 UI。 | 可做番茄编辑、起点主编、盐选反转编辑等角色预设。 | 角色必须绑定真实产物。 |
| AnythingLLM | https://github.com/Mintplex-Labs/anything-llm | 工作区文档、知识问答和 RAG。 | 每本书应有独立素材库，限制模型引用范围。 | 文档问答不等于创作节奏。 |
| Jan | https://github.com/menloresearch/jan | 本地 AI、隐私和低成本试写。 | 长篇设定和未公开大纲可走本地或私有模型路线。 | 本地模型质量差异大。 |

## 知识库与编辑器

| 案例 | 链接 | 可借鉴点 | 对本项目的启发 | 风险提醒 |
| --- | --- | --- | --- | --- |
| AppFlowy | https://github.com/AppFlowy-IO/AppFlowy | 块编辑、数据库、工作区组织。 | 人物、章节、伏笔、平台包要能筛选和关联。 | 通用表格会让新手无从下手。 |
| Logseq | https://github.com/logseq/logseq | 双链笔记和大纲式知识组织。 | 伏笔、章节、人物之间需要反向链接。 | 双链太自由会迷路。 |
| Joplin | https://github.com/laurent22/joplin | 笔记、同步、离线、附件。 | 图片、链接、灵感片段都应进入项目土壤。 | 非结构化素材很难被 AI 稳定使用。 |
| BookStack | https://github.com/BookStackApp/BookStack | 书本、章节、页面的层级隐喻。 | 世界观百科可以按书、卷、势力、地点归档。 | 百科需要和章节生产联动。 |
| Docmost | https://github.com/docmost/docmost | 协作文档、评论和权限。 | 未来可支持主笔、编辑、运营协作。 | MVP 先不要把协作做重。 |
| Outline | https://github.com/outline/outline | 文档树、搜索和权限管理。 | 平台策略、人物卡、卷纲和复盘要可检索。 | 企业知识库气质偏重。 |
| HedgeDoc | https://github.com/hedgedoc/hedgedoc | Markdown 协作编辑和实时预览。 | 章节审阅、改稿意见和模型版本对比可轻量承载。 | 纯 Markdown 对非技术作者不够友好。 |

## 出版发布流水线

| 案例 | 链接 | 可借鉴点 | 对本项目的启发 | 风险提醒 |
| --- | --- | --- | --- | --- |
| mdBook | https://github.com/rust-lang/mdBook | Markdown 组织为可发布书籍站点。 | 作品按卷、章、番外导出，便于整体检查。 | 技术文档导向明显。 |
| HonKit | https://github.com/honkit/honkit | GitBook 风格出版流程和插件。 | 多平台投稿包可像构建目标一样生成。 | MVP 应先固定模板。 |
| GitBook | https://github.com/GitbookIO/gitbook | Markdown 到书籍站点的结构思路。 | 正文、作者简介、卖点、样章可统一生成目录。 | 项目较老，只取结构思想。 |
| Pandoc | https://github.com/jgm/pandoc | Markdown、HTML、docx、epub 等多格式转换。 | 适合后续支持投稿、审稿、海外翻译多格式产物。 | 需要封装成一键导出。 |
| Zola | https://github.com/getzola/zola | 静态站点生成和模板系统。 | 可生成试读页、设定页、更新公告。 | 优先级低于稿件质量。 |
| Zotero | https://github.com/zotero/zotero | 资料收集、引用和来源管理。 | 现实、历史、海外题材素材要保留来源和使用场景。 | 学术功能要轻量化。 |

## 平台风格映射

| 平台 | 产品侧重点 |
| --- | --- |
| 番茄小说 | 高频钩子、强爽点、首秀前 8 万字质量控制、广告免费阅读节奏。 |
| 起点中文网 | 长篇世界观、升级体系、卷结构、长期伏笔和 IP 化潜力。 |
| 七猫 | 稳定更新、情绪供给、保底向长篇节奏和下沉市场阅读习惯。 |
| 知乎盐选 | 1-15 万字短中篇、第一人称、强冲突、反转和付费节点。 |
| WebNovel | 英文系统流、玄幻、快节奏升级、海外读者可理解的设定表达。 |
| Royal Road | 西幻、LitRPG、Progression Fantasy、硬设定和成长曲线。 |
| Wattpad | 欧美言情、狼人、豪门、情绪张力、社交传播和标签文化。 |

## 下一步开发顺序

1. 写作工作台 v1：新增“项目驾驶舱进入后的创作工作台”，左侧大树结构，中心章节卡与正文，右侧人物弧光和模型建议。
2. 案例库页面：把本文件里的 30 个参考项目做成产品内参考库，按四类筛选，服务团队开发和后续 PRD 复盘。
3. 模型任务路由升级：基于当前模型预设，增加任务级推荐原因、失败后替代模型、成本预估和人工确认。
4. 项目土壤库：让世界观、人物、伏笔、素材、历史章节能被章节生成与复审召回。
5. 多平台包生成：把番茄、起点、七猫、知乎盐选、WebNovel、Royal Road、Wattpad 的标题、简介、标签、样章、英文 synopsis 分开生成和归档。
