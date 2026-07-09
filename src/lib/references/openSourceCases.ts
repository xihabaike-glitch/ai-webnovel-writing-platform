import { getPlatformProfile, platformDeliveryScope } from "../platforms/platformProfiles.ts";
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
  rolePlaybook: ReferenceCaseRolePlaybookItem[];
  developmentPath: ReferenceCaseDevelopmentPathItem[];
  qualityNextFocus: ReferenceCaseQualityNextFocus;
  selectedCategory: ReferenceCaseCategory | "all";
  categoryTabs: Array<{
    id: ReferenceCaseCategory | "all";
    label: string;
    count: number;
    href: string;
    productQuestion: string;
  }>;
  visibleCases: OpenSourceReferenceCase[];
  acceptanceNotes: string[];
  nextBuildMoves: string[];
  topTags: Array<{
    tag: string;
    count: number;
  }>;
  invalidCategoryNotice: string | null;
}

export interface ReferenceCaseDevelopmentPathItem {
  id: "writing_workbench" | "model_routing" | "knowledge_recall" | "publishing_pipeline";
  title: string;
  status: "已落地" | "继续打磨";
  ownerRole: string;
  roleIds: string[];
  roleSummaries: Array<{
    id: string;
    roleName: string;
    modelOwner: string;
  }>;
  currentEvidence: string;
  nextAction: string;
  acceptance: string;
  qualityCheckpoint: {
    risk: string;
    mustShip: string;
    proof: string;
    actionLabel: string;
  };
  href: string;
}

export interface ReferenceCaseQualityNextFocus {
  pathId: ReferenceCaseDevelopmentPathItem["id"];
  headline: string;
  reason: string;
  proof: string;
  href: string;
  actionLabel: string;
}

export interface ReferenceCasePlatformScope {
  corePlatformCount: number;
  completedPlatformCount: number;
  pausedExpansionCount: number;
  statusLabel: string;
  expansionLabel: string;
  scopeDecision: string;
  qualityFocus: ReferenceCasePlatformScopeQualityFocus;
  platformNames: string[];
  platformCards: ReferenceCasePlatformCard[];
}

export type ReferenceCasePlatformCard = PlatformExecutionCard;

export interface ReferenceCasePlatformScopeQualityFocus {
  remainingPlatformCount: number;
  headline: string;
  detail: string;
  actionHref: string;
  actionLabel: string;
}

export interface ReferenceCaseRolePlaybookItem {
  id: string;
  roleName: string;
  modelOwner: string;
  skillOwner: string;
  whenToUse: string;
  inputs: string[];
  outputs: string[];
  skillBrief: {
    trigger: string;
    steps: string[];
    acceptance: string;
  };
  referenceCaseIds: string[];
  workflowHref: string;
  workflowActionLabel: string;
  nextAction: string;
}

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
    aiWritingLesson: "可以把产品验收闸门、主编、爽点编辑、设定编辑、海外本地化编辑拆成不同模型角色。",
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

export function buildReferenceCasePlatformScope(): ReferenceCasePlatformScope {
  const platformNames = platformDeliveryScope.corePlatformIds.map((id) => getPlatformProfile(id).name);
  const remainingPlatformCount = Math.max(0, platformDeliveryScope.corePlatformCount - platformDeliveryScope.completedPlatformCount);

  return {
    corePlatformCount: platformDeliveryScope.corePlatformCount,
    completedPlatformCount: platformDeliveryScope.completedPlatformCount,
    pausedExpansionCount: platformDeliveryScope.pausedExpansionCount,
    statusLabel: platformDeliveryScope.statusLabel,
    expansionLabel: platformDeliveryScope.expansionLabel,
    scopeDecision: platformDeliveryScope.scopeDecision,
    qualityFocus: {
      remainingPlatformCount,
      headline: `${platformDeliveryScope.corePlatformCount} 个核心平台已锁定，不再扩范围。`,
      detail: `${platformDeliveryScope.statusLabel}，剩余 10 个平台不再添加；现在只把 ${platformDeliveryScope.corePlatformCount} 个核心平台的写作、投稿、复盘闭环做扎实。`,
      actionHref: "/projects#platform-export",
      actionLabel: "推进发布闭环",
    },
    platformNames,
    platformCards: platformDeliveryScope.corePlatformIds.map(buildPlatformExecutionCard),
  };
}

export function buildReferenceCaseRolePlaybook(): ReferenceCaseRolePlaybookItem[] {
  return [
    {
      id: "toxic_pm",
      roleName: "产品验收闸门",
      modelOwner: "GPT / Claude",
      skillOwner: "产品梳理 Skill",
      whenToUse: "开书前、阶段复盘和功能取舍时使用，负责把炫技想法压回可交付闭环。",
      inputs: ["用户目标", "平台范围", "30 个参考案例", "当前项目指标"],
      outputs: ["优先级判断", "下一步开发动作", "风险提醒", "验收口径"],
      skillBrief: {
        trigger: "当需求发散、平台范围膨胀或页面只剩漂亮展示时启动。",
        steps: ["先砍掉不服务写作闭环的功能", "把下一步绑定到可验证产物", "写清验收证据和失败退回条件"],
        acceptance: "每次结论都必须说明谁执行、产物在哪里、缺什么证据就不放行。",
      },
      referenceCaseIds: ["autogen", "crewai", "dify"],
      workflowHref: "/gate",
      workflowActionLabel: "进入总闸门",
      nextAction: "把每个页面的下一步动作都绑定到真实写作、投稿或复盘产物。",
    },
    {
      id: "structure_editor",
      roleName: "长篇结构主编",
      modelOwner: "Claude 优先",
      skillOwner: "结构审稿 Skill",
      whenToUse: "设计开头结尾、主干支线、人物弧光和伏笔回收时使用。",
      inputs: ["大纲树", "人物卡", "伏笔线", "历史章节"],
      outputs: ["人物弧光审校", "主线支线诊断", "前三章结构复审", "结尾回收清单"],
      skillBrief: {
        trigger: "当开头钩子、结尾回收、人物弧光或主线支线没有互相咬住时启动。",
        steps: ["先审开头和结尾是否构成承诺与回收", "再检查主干、分支、伏笔和人物变化是否能支撑篇幅", "把诊断落到前三章改写或结构修复任务"],
        acceptance: "必须输出可回写的大纲节点、人物弧光风险和下一章/前三章修订动作。",
      },
      referenceCaseIds: ["novelwriter", "bibisco", "manuskript", "langchain"],
      workflowHref: "/projects#story-structure",
      workflowActionLabel: "进入结构诊断",
      nextAction: "把结构诊断结果直接回写到大纲树和前三章改写任务。",
    },
    {
      id: "draft_writer",
      roleName: "中文网文写手",
      modelOwner: "DeepSeek 优先",
      skillOwner: "正文生产 Skill",
      whenToUse: "章节初稿、小样本试写、爽点补强和中文节奏改写时使用。",
      inputs: ["章节卡", "平台土壤", "人物当前状态", "上一章悬念"],
      outputs: ["章节初稿", "开头钩子候选", "爽点补强段落", "二改候选稿"],
      skillBrief: {
        trigger: "当章节卡已齐、需要生成章节小样本或补强网文节奏时启动。",
        steps: ["先按平台土壤写 1 章样本", "每 300-500 字推进目标、冲突或爽点", "输出候选稿并等待审稿和人工采用"],
        acceptance: "章节不得直接覆盖正文，必须经过审稿、二改或人工采用后才能进入生产批量。",
      },
      referenceCaseIds: ["wavemaker", "writer", "flowise"],
      workflowHref: "/projects",
      workflowActionLabel: "进入写作工作台",
      nextAction: "先跑 1 章小样本，审稿通过后再进入批量章节生产。",
    },
    {
      id: "context_librarian",
      roleName: "长上下文资料官",
      modelOwner: "Kimi 优先",
      skillOwner: "资料召回 Skill",
      whenToUse: "整理世界观、压缩长资料、召回历史章节和连续性检查时使用。",
      inputs: ["世界观条目", "人物关系", "历史章节", "素材来源"],
      outputs: ["项目土壤摘要", "上下文召回包", "连续性风险", "资料引用说明"],
      skillBrief: {
        trigger: "当长篇上下文变多、模型容易忘设定或历史章节需要被召回时启动。",
        steps: ["先按人物、势力、伏笔和章节历史整理资料包", "标注每条资料来源和使用场景", "把召回结果交给审稿、初稿或二改链路"],
        acceptance: "输出必须能追溯来源，并说明哪些资料进入了模型上下文、哪些风险仍未解决。",
      },
      referenceCaseIds: ["llama-index", "logseq", "joplin", "outline"],
      workflowHref: "/projects#context-recall",
      workflowActionLabel: "查看项目土壤",
      nextAction: "把每次模型调用需要的资料包变成可审计的上下文来源。",
    },
    {
      id: "overseas_packager",
      roleName: "海外投稿包装编辑",
      modelOwner: "GPT 优先",
      skillOwner: "海外平台包装 Skill",
      whenToUse: "适配 WebNovel、Royal Road、Wattpad 的英文简介、标签和章节标题时使用。",
      inputs: ["中文卖点", "目标海外平台", "样章", "平台反馈"],
      outputs: ["WebNovel synopsis", "Royal Road progression pitch", "Wattpad tags", "英文章节标题包"],
      skillBrief: {
        trigger: "当中文卖点需要转成 WebNovel、Royal Road 或 Wattpad 投稿包装时启动。",
        steps: ["先识别目标海外平台的读者预期", "把中文爽点改写成英文 synopsis、progression pitch 或情绪标签", "保存为投稿资产版本等待采纳和发布基准"],
        acceptance: "必须分别覆盖 WebNovel、Royal Road、Wattpad 的包装口径，并进入平台发布版本记录。",
      },
      referenceCaseIds: ["lobe-chat", "librechat", "pandoc"],
      workflowHref: "/projects#platform-export",
      workflowActionLabel: "进入平台发布",
      nextAction: "把海外包装产物接到发布包版本，而不是停留在翻译文本。",
    },
    {
      id: "feedback_operator",
      roleName: "数据复盘运营",
      modelOwner: "Kimi / GPT",
      skillOwner: "发布复盘 Skill",
      whenToUse: "发布后回填点击、收藏、读完、评论和签约反馈时使用。",
      inputs: ["发布包版本", "平台效果数据", "A/B 候选", "历史复盘"],
      outputs: ["下一轮优化建议", "标题简介 A/B 判断", "平台知识反馈", "是否放量结论"],
      skillBrief: {
        trigger: "当发布包已有版本基准，需要用真实数据判断是否继续、修复或换平台时启动。",
        steps: ["先回填曝光、点击、收藏、追读、评论和签约等真实数据", "再对比发布包版本和 A/B 候选效果", "把结论回写到平台知识库和下一轮优化任务"],
        acceptance: "没有真实数据不允许放量；复盘必须给出继续、观察、修复或暂停的明确判断。",
      },
      referenceCaseIds: ["n8n", "zola", "mdbook", "honkit"],
      workflowHref: "/gate",
      workflowActionLabel: "进入复盘闸门",
      nextAction: "把真实平台效果回写到平台知识库，驱动下一轮包装或前三章修订。",
    },
  ];
}

function isReferenceCaseCategory(value: string | null | undefined): value is ReferenceCaseCategory {
  return referenceCaseCategories.some((category) => category.id === value);
}

export function buildReferenceCaseDevelopmentPlan(
  cases: OpenSourceReferenceCase[] = openSourceReferenceCases,
): ReferenceCaseDevelopmentPlan {
  const platformScope = buildReferenceCasePlatformScope();
  const platformList = platformScope.platformNames.join("、");
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
      `发布流水线：参考 mdBook、HonKit、Pandoc，只覆盖当前锁定的 ${platformScope.corePlatformCount} 个核心平台：${platformList}，把投稿包做成可导出版本。`,
    ],
  };
}

export function buildReferenceCaseDevelopmentPath(): ReferenceCaseDevelopmentPathItem[] {
  const roles = buildReferenceCaseRolePlaybook();
  const roleById = new Map(roles.map((role) => [role.id, role]));
  const withRoleSummaries = (
    item: Omit<ReferenceCaseDevelopmentPathItem, "roleSummaries">,
  ): ReferenceCaseDevelopmentPathItem => ({
    ...item,
    roleSummaries: item.roleIds.flatMap((roleId) => {
      const role = roleById.get(roleId);
      if (!role) return [];
      return {
        id: role.id,
        roleName: role.roleName,
        modelOwner: role.modelOwner,
      };
    }),
  });

  const pathItems: Array<Omit<ReferenceCaseDevelopmentPathItem, "roleSummaries">> = [
    {
      id: "writing_workbench",
      title: "传统写作工作台",
      status: "已落地",
      ownerRole: "长篇结构主编",
      roleIds: ["structure_editor", "draft_writer", "context_librarian"],
      currentEvidence: "作品页已有大纲树、人物弧光、世界观、伏笔、章节生产和结构诊断入口。",
      nextAction: "继续把结构诊断结果回写到大纲树、前三章改写和章节卡。",
      acceptance: "作者不调用 AI 也能管理一部长篇；调用 AI 后只是在关键节点提速。",
      qualityCheckpoint: {
        risk: "别把作者赶进聊天框，写作工作台必须先像传统写作工具一样可用。",
        mustShip: "大纲树、章节卡、人物弧光和正文入口保持在同一个作品工作流里。",
        proof: "作品页能看到结构诊断、章节生产、人物弧光和项目土壤的连续入口。",
        actionLabel: "检查工作台",
      },
      href: "/projects#story-structure",
    },
    {
      id: "model_routing",
      title: "多模型任务路由",
      status: "继续打磨",
      ownerRole: "产品验收闸门",
      roleIds: ["toxic_pm", "structure_editor", "draft_writer", "context_librarian", "overseas_packager"],
      currentEvidence: "模型设置已覆盖 Claude、DeepSeek、Kimi、GPT 等岗位矩阵和任务路由。",
      nextAction: "把每个角色入口都绑定到可复核的模型岗位、失败替代路线和成本记录。",
      acceptance: "用户能看懂每次 AI 任务由哪个模型执行、为什么选它、失败后去哪补救。",
      qualityCheckpoint: {
        risk: "别做多模型聊天壳；模型必须按任务分工，否则 Claude、DeepSeek、Kimi、GPT 只是供应商名单。",
        mustShip: "每个写作角色都要有首选模型、备用模型、失败原因和复检入口。",
        proof: "模型岗位矩阵能解释任务分工、成本压力、失败替代路线和后续复检。",
        actionLabel: "检查模型岗位",
      },
      href: "/settings/models#model-role-matrix",
    },
    {
      id: "knowledge_recall",
      title: "项目土壤召回",
      status: "已落地",
      ownerRole: "长上下文资料官",
      roleIds: ["context_librarian", "structure_editor", "draft_writer"],
      currentEvidence: "具体作品页已有项目土壤召回，汇总人物、设定、线索和历史章节来源。",
      nextAction: "把每次草稿、审稿、二改使用的上下文来源继续沉淀到任务时间线。",
      acceptance: "长篇续写不会凭空改设定，用户能追到模型参考了哪些资料。",
      qualityCheckpoint: {
        risk: "别让模型凭感觉续写；长篇一旦改坏设定，后面的章节都会背锅。",
        mustShip: "世界观、人物关系、伏笔和历史章节要能组成可审计的上下文包。",
        proof: "项目土壤召回能说明模型引用了哪些人物、设定、线索和历史章节来源。",
        actionLabel: "检查项目土壤",
      },
      href: "/projects#context-recall",
    },
    {
      id: "publishing_pipeline",
      title: "8 平台发布闭环",
      status: "继续打磨",
      ownerRole: "平台包装官",
      roleIds: ["overseas_packager", "feedback_operator", "toxic_pm"],
      currentEvidence: "参考库和发布中心已锁定 8 个核心平台，覆盖写作、投稿、复盘三段动作。",
      nextAction: "继续把标题、简介、标签、样章、版本和发布效果变成可回滚的发布包记录。",
      acceptance: "8 个核心平台已锁定；每个平台都有可导出的发布包和可回填的效果复盘。",
      qualityCheckpoint: {
        risk: "别只生成一份万能投稿包；平台差异不进版本和复盘，就没有发布闭环。",
        mustShip: "8 个核心平台都要有独立标题、简介、标签、样章、版本和效果回填口径。",
        proof: "8 个核心平台能导出发布包、保存基准版本，并回填真实曝光、点击、收藏或追读。",
        actionLabel: "检查发布闭环",
      },
      href: "/projects#platform-export",
    },
  ];

  return pathItems.map(withRoleSummaries);
}

export function buildReferenceCaseQualityNextFocus(path: ReferenceCaseDevelopmentPathItem[]): ReferenceCaseQualityNextFocus {
  const focus = path.find((item) => item.status === "继续打磨" && item.roleIds.includes("toxic_pm"))
    ?? path.find((item) => item.status === "继续打磨")
    ?? path[0];

  if (!focus) {
    return {
      pathId: "writing_workbench",
      headline: "先补作品工作台，不要先做聊天。",
      reason: "没有开发路径时，默认回到传统写作工作台，先保证作者能管理一部长篇。",
      proof: "至少能看到大纲树、章节卡、人物弧光和正文入口。",
      href: "/projects#story-structure",
      actionLabel: "检查工作台",
    };
  }

  return {
    pathId: focus.id,
    headline: focus.id === "model_routing"
      ? "当前优先：模型任务化，别再做聊天壳。"
      : `当前优先：${focus.title}`,
    reason: focus.id === "model_routing"
      ? "写作平台的下一步不是增加聊天入口，而是让 Claude、DeepSeek、Kimi、GPT 按写作任务分工并可复检。"
      : focus.qualityCheckpoint.risk,
    proof: focus.id === "model_routing"
      ? "模型岗位矩阵能说明首选模型、备用模型、失败替代路线、成本压力和后续复检入口。"
      : focus.qualityCheckpoint.proof,
    href: focus.href,
    actionLabel: focus.qualityCheckpoint.actionLabel,
  };
}

export function buildReferenceCaseLibraryView(input?: {
  selectedCategory?: string | null;
  cases?: OpenSourceReferenceCase[];
}): ReferenceCaseLibraryView {
  const cases = input?.cases ?? openSourceReferenceCases;
  const plan = buildReferenceCaseDevelopmentPlan(cases);
  const developmentPath = buildReferenceCaseDevelopmentPath();
  const invalidCategoryNotice = input?.selectedCategory && !isReferenceCaseCategory(input.selectedCategory)
    ? `参考分类「${input.selectedCategory}」不存在，已显示全部案例。`
    : null;
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
    rolePlaybook: buildReferenceCaseRolePlaybook(),
    developmentPath,
    qualityNextFocus: buildReferenceCaseQualityNextFocus(developmentPath),
    selectedCategory,
    categoryTabs,
    visibleCases,
    acceptanceNotes: [
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
    invalidCategoryNotice,
  };
}
