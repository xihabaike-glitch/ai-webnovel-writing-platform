import { getPlatformProfile, type PlatformId } from "../platforms/platformProfiles.ts";
import { buildPlatformExecutionCard, type PlatformExecutionCard } from "../platforms/platformExecutionCards.ts";

export type ReferenceCaseCategory =
  | "writing_tool"
  | "ai_workflow"
  | "knowledge_workspace"
  | "publishing_pipeline";

export interface ReferenceCaseCategoryMeta {
  id: ReferenceCaseCategory;
  label: string;
  productQuestion: string;
}

export interface OpenSourceReferenceCase {
  id: string;
  name: string;
  category: ReferenceCaseCategory;
  sourceUrl: string;
  referenceValue: string;
  aiWritingLesson: string;
  productRisk: string;
  tags: string[];
}

export interface ReferenceCaseDevelopmentPlan {
  totalCases: number;
  categoryBlocks: Array<{
    category: ReferenceCaseCategory;
    label: string;
    question: string;
    cases: OpenSourceReferenceCase[];
  }>;
  nextBuildMoves: string[];
}

export interface ReferenceCaseLibraryView {
  totalCases: number;
  platformScope: ReferenceCasePlatformScope;
  selectedCategory: ReferenceCaseCategory | "all";
  categoryTabs: Array<{
    id: ReferenceCaseCategory | "all";
    label: string;
    count: number;
    href: string;
    productQuestion: string;
  }>;
  visibleCases: OpenSourceReferenceCase[];
  productManagerNotes: string[];
  nextBuildMoves: string[];
  topTags: Array<{
    tag: string;
    count: number;
  }>;
}

export interface ReferenceCasePlatformScope {
  corePlatformCount: number;
  completedPlatformCount: number;
  pausedExpansionCount: number;
  statusLabel: string;
  scopeDecision: string;
  platformNames: string[];
  platformCards: ReferenceCasePlatformCard[];
}

export type ReferenceCasePlatformCard = PlatformExecutionCard;

export const referenceCaseCategories: ReferenceCaseCategoryMeta[] = [
  {
    id: "writing_tool",
    label: "传统写作工具",
    productQuestion: "作者怎样组织项目、章节、人物、设定和写作状态？",
  },
  {
    id: "ai_workflow",
    label: "AI 工作流与模型平台",
    productQuestion: "多模型、提示词、任务编排、失败重试和知识检索怎样落到产品里？",
  },
  {
    id: "knowledge_workspace",
    label: "知识库与编辑器",
    productQuestion: "世界观、素材、人物关系、版本和双链资料怎样长期沉淀？",
  },
  {
    id: "publishing_pipeline",
    label: "出版发布流水线",
    productQuestion: "稿件如何导出、归档、审阅、发布，并适配多平台包？",
  },
];

export const openSourceReferenceCases: OpenSourceReferenceCase[] = [
  {
    id: "novelwriter",
    name: "novelWriter",
    category: "writing_tool",
    sourceUrl: "https://github.com/vkbo/novelWriter",
    referenceValue: "长篇小说项目管理、章节树、元数据和文稿统计做得很集中，适合参考传统作者工作台。",
    aiWritingLesson: "AI 网文平台需要先尊重作者的章节树和设定树，再把模型建议嵌进去，不能让 AI 生成流程压过写作流程。",
    productRisk: "功能容易偏桌面工具，协作和多模型能力不足。",
    tags: ["novel", "outline", "desktop"],
  },
  {
    id: "bibisco",
    name: "bibisco",
    category: "writing_tool",
    sourceUrl: "https://github.com/andreafeccomandi/bibisco",
    referenceValue: "人物访谈、场景、章节和叙事结构围绕小说创作组织，适合参考人物弧光与故事资产表。",
    aiWritingLesson: "人物弧光不能只做字段填写，应变成可追踪的提问、校验和章节引用，让模型有明确上下文。",
    productRisk: "结构化深度高，但对快节奏网文作者可能显得填写成本偏重。",
    tags: ["character", "scene", "structure"],
  },
  {
    id: "manuskript",
    name: "Manuskript",
    category: "writing_tool",
    sourceUrl: "https://github.com/olivierkes/manuskript",
    referenceValue: "雪花法、概要、章节分层和写作进度管理完整，适合参考从结局倒推主干的规划体验。",
    aiWritingLesson: "平台可以把开头、结尾、主干、分支、叶片和土壤做成递进式生成，不让用户一开始面对空白页。",
    productRisk: "规划模型复杂时容易把作者困在表格里，需要给一键跳过和轻量模式。",
    tags: ["snowflake", "planning", "progress"],
  },
  {
    id: "quollwriter",
    name: "Quoll Writer",
    category: "writing_tool",
    sourceUrl: "https://github.com/garybentley/quollwriter",
    referenceValue: "以作者写作过程为中心，提供目标、想法、章节和提醒，适合参考低干扰创作环境。",
    aiWritingLesson: "AI 工具应该在作者需要时出现，默认保持写作流畅，重点服务卡点、复盘和下一章建议。",
    productRisk: "低干扰体验如果缺少运营指标，会弱化网文平台的更新与留存要求。",
    tags: ["focus", "goals", "notes"],
  },
  {
    id: "wavemaker",
    name: "Wavemaker Cards",
    category: "writing_tool",
    sourceUrl: "https://github.com/wavemakercards/wavemaker-v5",
    referenceValue: "卡片式构思、时间线和章节计划轻量好用，适合参考剧情卡片和分支素材池。",
    aiWritingLesson: "把主线、支线、伏笔和爽点做成可拖拽卡片，模型才能按树形结构补叶片而不是整段乱写。",
    productRisk: "卡片太自由会导致缺少平台约束，需要叠加番茄、起点、盐选等风格校验。",
    tags: ["cards", "timeline", "outline"],
  },
  {
    id: "writer",
    name: "Writer",
    category: "writing_tool",
    sourceUrl: "https://github.com/josephernest/writing",
    referenceValue: "极简网页写作器展示了低成本、低学习门槛的纯写作体验，适合参考编辑区基础交互。",
    aiWritingLesson: "开篇钩子、章节正文和改稿建议应该在同一个写作视野内完成，避免用户频繁切页。",
    productRisk: "极简编辑器本身不解决长篇结构管理，需要和项目资产、版本和任务中心结合。",
    tags: ["editor", "minimal", "web"],
  },
  {
    id: "dify",
    name: "Dify",
    category: "ai_workflow",
    sourceUrl: "https://github.com/langgenius/dify",
    referenceValue: "应用编排、提示词、知识库、模型接入和调试链路完整，适合参考 AI 应用生产后台。",
    aiWritingLesson: "网文平台需要把 Claude、DeepSeek、Kimi、GPT 等模型包装成写作任务，而不是只提供聊天窗口。",
    productRisk: "通用平台能力强但不垂直，若照搬会失去网文平台的题材、爽点和连载节奏判断。",
    tags: ["workflow", "rag", "llm"],
  },
  {
    id: "flowise",
    name: "Flowise",
    category: "ai_workflow",
    sourceUrl: "https://github.com/FlowiseAI/Flowise",
    referenceValue: "可视化节点编排适合参考模型任务流、提示词链、重试节点和人工审核节点。",
    aiWritingLesson: "开书、首章、复审、二改、发布包可以做成可解释流程，让作者知道每一步为什么发生。",
    productRisk: "节点编辑器对普通作者可能太技术化，需要在前端隐藏复杂度。",
    tags: ["nodes", "automation", "prompt"],
  },
  {
    id: "langchain",
    name: "LangChain",
    category: "ai_workflow",
    sourceUrl: "https://github.com/langchain-ai/langchain",
    referenceValue: "链式调用、工具、检索和代理生态成熟，适合参考模型网关和任务工具化思路。",
    aiWritingLesson: "章节生成应拆成结构诊断、资料检索、草稿生成、风格复审、二改执行等稳定链路。",
    productRisk: "抽象层多会提高维护成本，产品侧要保留清晰的失败原因和回滚入口。",
    tags: ["chains", "agents", "tools"],
  },
  {
    id: "llama-index",
    name: "LlamaIndex",
    category: "ai_workflow",
    sourceUrl: "https://github.com/run-llama/llama_index",
    referenceValue: "文档索引、知识检索和上下文组装能力强，适合参考世界观资料与历史章节召回。",
    aiWritingLesson: "长篇网文需要按人物、势力、伏笔、卷纲和历史章节召回资料，避免模型改坏设定。",
    productRisk: "检索结果如果不解释来源，作者很难判断模型建议是否可信。",
    tags: ["rag", "index", "context"],
  },
  {
    id: "autogen",
    name: "AutoGen",
    category: "ai_workflow",
    sourceUrl: "https://github.com/microsoft/autogen",
    referenceValue: "多代理协作模式适合参考策划、编辑、审稿、运营等角色分工。",
    aiWritingLesson: "可以把毒舌产品经理、主编、爽点编辑、设定编辑、海外本地化编辑拆成不同模型角色。",
    productRisk: "多代理容易互相空转，需要任务终止条件和明确产物格式。",
    tags: ["multi-agent", "review", "roles"],
  },
  {
    id: "crewai",
    name: "crewAI",
    category: "ai_workflow",
    sourceUrl: "https://github.com/crewAIInc/crewAI",
    referenceValue: "角色、任务、流程和产物交付拆分明确，适合参考 Skill 角色协作和流水线分派。",
    aiWritingLesson: "网文项目可按平台定位、角色弧光、章节生产、发布包装、数据复盘拆成角色任务。",
    productRisk: "角色过多会让用户难以理解，需要只暴露结果和关键审核点。",
    tags: ["agents", "tasks", "roles"],
  },
  {
    id: "n8n",
    name: "n8n",
    category: "ai_workflow",
    sourceUrl: "https://github.com/n8n-io/n8n",
    referenceValue: "自动化触发器、任务执行和外部服务连接成熟，适合参考发布后数据回收和通知。",
    aiWritingLesson: "章节发布、平台效果记录、复盘提醒和下一轮改稿可以形成自动闭环。",
    productRisk: "自动化若缺少人工确认，可能把未通过审核的稿件推进到发布环节。",
    tags: ["automation", "integration", "triggers"],
  },
  {
    id: "open-webui",
    name: "Open WebUI",
    category: "ai_workflow",
    sourceUrl: "https://github.com/open-webui/open-webui",
    referenceValue: "多模型聊天、知识库和本地模型体验成熟，适合参考模型列表、会话和权限管理。",
    aiWritingLesson: "作者需要清楚看到当前任务用了哪个模型、花费多少、失败后切到了哪个备用模型。",
    productRisk: "聊天范式太强会把写作任务拉回问答工具，必须强化项目化工作流。",
    tags: ["chat", "models", "local-llm"],
  },
  {
    id: "librechat",
    name: "LibreChat",
    category: "ai_workflow",
    sourceUrl: "https://github.com/danny-avila/LibreChat",
    referenceValue: "多提供商聊天和插件生态适合参考 Claude、GPT、DeepSeek、Kimi 等统一接入。",
    aiWritingLesson: "模型供应商设置要独立于写作业务，让平台按任务自动选择长上下文、低成本或强审稿模型。",
    productRisk: "若只做统一聊天壳，无法形成网文平台的持续生产壁垒。",
    tags: ["providers", "chat", "plugins"],
  },
  {
    id: "lobe-chat",
    name: "LobeChat",
    category: "ai_workflow",
    sourceUrl: "https://github.com/lobehub/lobe-chat",
    referenceValue: "模型配置、角色市场和现代聊天 UI 质量高，适合参考模型体验与角色预设。",
    aiWritingLesson: "可以提供番茄爽文编辑、起点长篇主编、盐选反转编辑、WebNovel 本地化编辑等预设角色。",
    productRisk: "角色市场很容易变成提示词堆积，需要和真实写作产物绑定。",
    tags: ["assistant", "presets", "ui"],
  },
  {
    id: "anything-llm",
    name: "AnythingLLM",
    category: "ai_workflow",
    sourceUrl: "https://github.com/Mintplex-Labs/anything-llm",
    referenceValue: "面向文档和工作区的知识问答成熟，适合参考项目级资料库和权限边界。",
    aiWritingLesson: "每本书都应有独立素材库，模型只能在该项目范围内引用设定、章节和平台策略。",
    productRisk: "文档问答偏知识检索，直接用于创作会缺少章节节奏和人物变化。",
    tags: ["workspace", "documents", "rag"],
  },
  {
    id: "jan",
    name: "Jan",
    category: "ai_workflow",
    sourceUrl: "https://github.com/menloresearch/jan",
    referenceValue: "本地 AI 桌面应用适合参考隐私、本地模型和低成本试写体验。",
    aiWritingLesson: "长篇草稿、敏感设定和未公开大纲可以提供本地或私有模型路线，降低作者顾虑。",
    productRisk: "本地模型质量和性能差异大，需要把适用任务限定在资料整理、初稿和低风险改写。",
    tags: ["local-ai", "privacy", "desktop"],
  },
  {
    id: "appflowy",
    name: "AppFlowy",
    category: "knowledge_workspace",
    sourceUrl: "https://github.com/AppFlowy-IO/AppFlowy",
    referenceValue: "块编辑、数据库和工作区组织适合参考故事资产库、角色表和创作看板。",
    aiWritingLesson: "世界观、人物、章节、伏笔和平台包要能像数据库一样筛选、关联和复用。",
    productRisk: "通用工作区如果缺少网文模板，用户会不知道从哪一张表开始。",
    tags: ["workspace", "database", "blocks"],
  },
  {
    id: "logseq",
    name: "Logseq",
    category: "knowledge_workspace",
    sourceUrl: "https://github.com/logseq/logseq",
    referenceValue: "双链笔记和大纲式知识组织适合参考人物、事件、伏笔与章节之间的反向链接。",
    aiWritingLesson: "模型生成章节前应能追踪某个伏笔出现过哪些章节、哪些人物知道这件事。",
    productRisk: "双链过于自由会让新手迷路，需要平台化的固定关系类型。",
    tags: ["backlinks", "outline", "knowledge"],
  },
  {
    id: "joplin",
    name: "Joplin",
    category: "knowledge_workspace",
    sourceUrl: "https://github.com/laurent22/joplin",
    referenceValue: "笔记、同步、离线和附件管理完整，适合参考素材库、草稿备份和跨设备使用。",
    aiWritingLesson: "作者素材不只在网页里，图片、链接、片段和灵感都要能进入项目土壤。",
    productRisk: "笔记系统如果没有结构化抽取，AI 很难稳定使用素材。",
    tags: ["notes", "sync", "attachments"],
  },
  {
    id: "bookstack",
    name: "BookStack",
    category: "knowledge_workspace",
    sourceUrl: "https://github.com/BookStackApp/BookStack",
    referenceValue: "书本、章节、页面的层级隐喻清楚，适合参考世界观百科和项目文档层级。",
    aiWritingLesson: "长篇世界设定可按书、卷、势力、地点、规则组织，让设定有固定归档位置。",
    productRisk: "百科结构偏静态，需要和章节生产、伏笔状态和版本变化联动。",
    tags: ["wiki", "hierarchy", "docs"],
  },
  {
    id: "docmost",
    name: "Docmost",
    category: "knowledge_workspace",
    sourceUrl: "https://github.com/docmost/docmost",
    referenceValue: "协作文档和团队知识库体验现代，适合参考多人编辑、评论和权限。",
    aiWritingLesson: "未来工作室模式可让主笔、编辑、运营和模型角色在同一项目里交接任务。",
    productRisk: "协作功能太早做重会拖慢 MVP，需要先服务单作者闭环。",
    tags: ["collaboration", "docs", "teams"],
  },
  {
    id: "outline",
    name: "Outline",
    category: "knowledge_workspace",
    sourceUrl: "https://github.com/outline/outline",
    referenceValue: "团队知识库的搜索、文档树和权限成熟，适合参考项目文档导航与检索。",
    aiWritingLesson: "AI 写作助手必须能快速找到平台策略、人物卡、卷纲和历史复盘，而不是靠用户复制粘贴。",
    productRisk: "企业知识库气质较重，需要降低网文作者的配置感。",
    tags: ["search", "docs", "permissions"],
  },
  {
    id: "hedgedoc",
    name: "HedgeDoc",
    category: "knowledge_workspace",
    sourceUrl: "https://github.com/hedgedoc/hedgedoc",
    referenceValue: "Markdown 协作编辑和实时预览简单直接，适合参考章节审阅和轻量共创。",
    aiWritingLesson: "章节正文、改稿意见和模型版本对比可以用轻量 Markdown 流程承载。",
    productRisk: "纯 Markdown 对非技术作者不够友好，需要可视化字段和导出模板。",
    tags: ["markdown", "collaboration", "preview"],
  },
  {
    id: "mdbook",
    name: "mdBook",
    category: "publishing_pipeline",
    sourceUrl: "https://github.com/rust-lang/mdBook",
    referenceValue: "把 Markdown 组织成可发布书籍站点，适合参考长篇归档、目录和静态预览。",
    aiWritingLesson: "平台应能把作品按卷、章、番外导出为可预览结构，便于检查整体阅读顺序。",
    productRisk: "技术文档导向明显，需要改造成网文平台包和投稿材料。",
    tags: ["book", "markdown", "export"],
  },
  {
    id: "honkit",
    name: "HonKit",
    category: "publishing_pipeline",
    sourceUrl: "https://github.com/honkit/honkit",
    referenceValue: "GitBook 风格出版流程适合参考多章节内容构建、插件和版本发布。",
    aiWritingLesson: "不同平台的投稿包可以像构建目标一样生成，保留同一作品的多版本输出。",
    productRisk: "插件生态会增加复杂度，MVP 应优先固定几个平台导出模板。",
    tags: ["gitbook", "plugins", "publishing"],
  },
  {
    id: "gitbook",
    name: "GitBook",
    category: "publishing_pipeline",
    sourceUrl: "https://github.com/GitbookIO/gitbook",
    referenceValue: "早期开源 GitBook 展示了从 Markdown 到书籍站点的完整思路，适合参考内容结构构建。",
    aiWritingLesson: "作品正文、作者简介、卖点、分卷简介和样章可以通过统一目录生成。",
    productRisk: "项目较老，不能直接当现代前端架构参考，只取出版结构思想。",
    tags: ["markdown", "book", "legacy"],
  },
  {
    id: "pandoc",
    name: "Pandoc",
    category: "publishing_pipeline",
    sourceUrl: "https://github.com/jgm/pandoc",
    referenceValue: "多格式文档转换能力强，适合参考 Markdown、HTML、docx、epub 等导出方向。",
    aiWritingLesson: "网文平台最终要支持面向平台投稿、编辑审稿和海外翻译的多格式产物。",
    productRisk: "转换能力强但产品体验不直接，需要封装成作者能理解的一键导出。",
    tags: ["conversion", "docx", "epub"],
  },
  {
    id: "zola",
    name: "Zola",
    category: "publishing_pipeline",
    sourceUrl: "https://github.com/getzola/zola",
    referenceValue: "静态站点生成速度快、模板清晰，适合参考作品官网、试读页和平台外展示页。",
    aiWritingLesson: "高质量作品可以生成对外试读页、设定页和更新公告，用于海外或私域传播。",
    productRisk: "站点生成不是核心写作流程，优先级应低于稿件质量和平台包。",
    tags: ["static-site", "templates", "preview"],
  },
  {
    id: "zotero",
    name: "Zotero",
    category: "publishing_pipeline",
    sourceUrl: "https://github.com/zotero/zotero",
    referenceValue: "资料收集、引用和来源管理成熟，适合参考现实题材、历史题材和海外资料的证据链。",
    aiWritingLesson: "素材来源要能沉淀为土壤，模型引用现实资料时应保留来源和使用场景。",
    productRisk: "学术资料管理偏重，网文平台只需要轻量来源卡和素材可信度提示。",
    tags: ["research", "sources", "references"],
  },
];

const categoryPriority: ReferenceCaseCategory[] = [
  "writing_tool",
  "ai_workflow",
  "knowledge_workspace",
  "publishing_pipeline",
];

const lockedCorePlatformIds: PlatformId[] = [
  "fanqie",
  "qidian",
  "qimao",
  "jjwxc",
  "zhihu_yanxuan",
  "webnovel",
  "royal_road",
  "wattpad",
];

export function buildReferenceCasePlatformScope(): ReferenceCasePlatformScope {
  const platformNames = lockedCorePlatformIds.map((id) => getPlatformProfile(id).name);

  return {
    corePlatformCount: platformNames.length,
    completedPlatformCount: platformNames.length,
    pausedExpansionCount: 10,
    statusLabel: `${platformNames.length}/${platformNames.length} 核心平台已完成`,
    scopeDecision: "剩余 10 个扩展平台暂停，不再进入当前开发范围；先把 8 个核心平台的写作、投稿、复盘闭环做扎实。",
    platformNames,
    platformCards: lockedCorePlatformIds.map(buildPlatformExecutionCard),
  };
}

function isReferenceCaseCategory(value: string | null | undefined): value is ReferenceCaseCategory {
  return referenceCaseCategories.some((category) => category.id === value);
}

export function buildReferenceCaseDevelopmentPlan(
  cases: OpenSourceReferenceCase[] = openSourceReferenceCases,
): ReferenceCaseDevelopmentPlan {
  const categoryBlocks = categoryPriority.map((category) => {
    const meta = referenceCaseCategories.find((item) => item.id === category);

    return {
      category,
      label: meta?.label ?? category,
      question: meta?.productQuestion ?? "",
      cases: cases.filter((item) => item.category === category),
    };
  });

  return {
    totalCases: cases.length,
    categoryBlocks,
    nextBuildMoves: [
      "写作工作台：参考 novelWriter、bibisco、Manuskript，把开书、人物弧光、大纲树、章节卡和正文编辑放进同一个工作区。",
      "模型路由：参考 Dify、Flowise、LangChain，把 Claude、DeepSeek、Kimi、GPT 的任务分工接到开头钩子、正文生成、复审和二改。",
      "知识库：参考 Logseq、Joplin、Outline，把世界观、伏笔、人物关系和历史章节做成可召回的项目土壤。",
      "发布流水线：参考 mdBook、HonKit、Pandoc，把起点、番茄、七猫、知乎盐选、WebNovel、Royal Road、Wattpad 的投稿包做成可导出版本。",
    ],
  };
}

export function buildReferenceCaseLibraryView(input?: {
  selectedCategory?: string | null;
  cases?: OpenSourceReferenceCase[];
}): ReferenceCaseLibraryView {
  const cases = input?.cases ?? openSourceReferenceCases;
  const plan = buildReferenceCaseDevelopmentPlan(cases);
  const selectedCategory = isReferenceCaseCategory(input?.selectedCategory)
    ? input.selectedCategory
    : "all";
  const visibleCases = selectedCategory === "all"
    ? cases
    : cases.filter((item) => item.category === selectedCategory);
  const categoryTabs: ReferenceCaseLibraryView["categoryTabs"] = [
    {
      id: "all",
      label: "全部案例",
      count: cases.length,
      href: "/references",
      productQuestion: "从传统写作、AI 工作流、知识库和发布流水线四条线看产品缺口。",
    },
    ...referenceCaseCategories.map((category) => ({
      id: category.id,
      label: category.label,
      count: cases.filter((item) => item.category === category.id).length,
      href: `/references?category=${category.id}`,
      productQuestion: category.productQuestion,
    })),
  ];
  const tagCounts = new Map<string, number>();

  for (const item of visibleCases) {
    for (const tag of item.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }

  return {
    totalCases: plan.totalCases,
    platformScope: buildReferenceCasePlatformScope(),
    selectedCategory,
    categoryTabs,
    visibleCases,
    productManagerNotes: [
      "别抄聊天产品。网文作者要的是作品生产系统，不是另一个对话框。",
      "传统写作资产要先站稳：大纲树、人物弧光、伏笔、章节正文都得能单独使用。",
      "AI 必须任务化：模型按开书、审稿、二改、发布包和复盘分工，失败后有替代路线。",
      "平台适配要闭环：国内与海外平台的标题、简介、标签、样章和效果复盘要分别沉淀。",
    ],
    nextBuildMoves: plan.nextBuildMoves,
    topTags: [...tagCounts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
      .slice(0, 12),
  };
}
