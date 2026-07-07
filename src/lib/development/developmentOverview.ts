import { platformDeliveryScope } from "../platforms/platformProfiles.ts";
import { openSourceReferenceCases } from "../references/openSourceCases.ts";

export interface DevelopmentOverviewModelInterface {
  providerId: "claude" | "deepseek" | "kimi" | "gpt";
  providerName: string;
  ownerRole: string;
  reservedFor: string;
  href: string;
}

export interface DevelopmentOverviewSection {
  id: "product_scope" | "writing_workflow" | "model_interfaces" | "platform_delivery" | "pm_gates";
  title: string;
  summary: string;
  evidenceItems: string[];
  acceptance: string;
  href: string;
}

export interface DevelopmentOverviewTreeStep {
  id: "opening" | "ending" | "trunk" | "branches" | "leaves" | "soil";
  name: string;
  productMeaning: string;
  pmRule: string;
}

export interface DevelopmentOverviewAction {
  label: string;
  detail: string;
  href: string;
}

export type DevelopmentOverviewAuditStatus = "ready" | "watch" | "blocked";

export interface DevelopmentOverviewAuditItem {
  id:
    | "reference_cases"
    | "platform_scope"
    | "length_modes"
    | "tree_workflow"
    | "model_interfaces"
    | "ai_roles"
    | "writing_pipeline"
    | "pm_gates";
  title: string;
  status: DevelopmentOverviewAuditStatus;
  requirement: string;
  evidence: string;
  nextStep: string;
  href: string;
}

export interface DevelopmentOverviewDeliveryAudit {
  headline: string;
  pmVerdict: string;
  summary: {
    total: number;
    ready: number;
    watch: number;
    blocked: number;
  };
  items: DevelopmentOverviewAuditItem[];
}

export interface DevelopmentOverviewPipelineProofStep {
  id: "project_start" | "sample_draft" | "task_dispatch" | "gate_check" | "failure_repair" | "publish_package";
  order: number;
  title: string;
  owner: string;
  href: string;
  evidence: string;
  passCondition: string;
  stopRule: string;
}

export interface DevelopmentOverviewPipelineProofRoute {
  headline: string;
  pmRule: string;
  steps: DevelopmentOverviewPipelineProofStep[];
}

export interface DevelopmentOverview {
  referenceCount: number;
  platformScope: typeof platformDeliveryScope;
  pmFocus: {
    headline: string;
    detail: string;
    proof: string;
    actionHref: string;
    actionLabel: string;
  };
  modelInterfaces: {
    total: number;
    readyLabel: string;
    items: DevelopmentOverviewModelInterface[];
  };
  docSections: DevelopmentOverviewSection[];
  treeWorkflow: DevelopmentOverviewTreeStep[];
  deliveryAudit: DevelopmentOverviewDeliveryAudit;
  pipelineProofRoute: DevelopmentOverviewPipelineProofRoute;
  nextActions: DevelopmentOverviewAction[];
}

const modelInterfaces: DevelopmentOverviewModelInterface[] = [
  {
    providerId: "claude",
    providerName: "Claude",
    ownerRole: "长篇结构主编",
    reservedFor: "人物弧光、主线支线、前三章结构复审和长上下文审稿。",
    href: "/settings/models#model-role-matrix",
  },
  {
    providerId: "deepseek",
    providerName: "DeepSeek",
    ownerRole: "中文网文写手",
    reservedFor: "章节初稿、爽点补强、中文节奏改写和小样本试写。",
    href: "/settings/models#model-role-matrix",
  },
  {
    providerId: "kimi",
    providerName: "Kimi",
    ownerRole: "长上下文资料官",
    reservedFor: "世界观整理、历史章节召回、资料压缩和连续性检查。",
    href: "/settings/models#model-role-matrix",
  },
  {
    providerId: "gpt",
    providerName: "GPT",
    ownerRole: "海外投稿包装编辑",
    reservedFor: "WebNovel、Royal Road、Wattpad 的英文简介、标签和包装改写。",
    href: "/settings/models#model-role-matrix",
  },
];

const treeWorkflow: DevelopmentOverviewTreeStep[] = [
  {
    id: "opening",
    name: "开头：抓人钩子",
    productMeaning: "先判断读者为什么愿意继续看，尤其是番茄、知乎盐选和 Wattpad 的开场情绪。",
    pmRule: "没有钩子就别批量写，第一章必须能证明读者会往下滑。",
  },
  {
    id: "ending",
    name: "结尾：回收承诺",
    productMeaning: "先定终局、情绪偿还和主角变化，避免长篇写到后面散架。",
    pmRule: "结尾不是摆设，是主干和分支的验收标准。",
  },
  {
    id: "trunk",
    name: "主干：长期推进",
    productMeaning: "主线、卷结构、升级体系、关系推进和阶段 Boss 共同组成长篇骨架。",
    pmRule: "主干不清，起点、Royal Road 这类长线平台一定会掉。",
  },
  {
    id: "branches",
    name: "分支：支线与人物弧光",
    productMeaning: "人物弧光、支线事件、伏笔链和情感线从主干生长出来。",
    pmRule: "分支必须服务主线，不允许为了热闹乱开坑。",
  },
  {
    id: "leaves",
    name: "叶片：章节内容填充",
    productMeaning: "每章的爽点、冲突、章末悬念、台词和细节都属于叶片。",
    pmRule: "叶片可以多，但每片都要给读者即时反馈。",
  },
  {
    id: "soil",
    name: "土壤：设定与素材",
    productMeaning: "世界观、平台规则、历史章节、素材来源和复盘经验为模型提供上下文。",
    pmRule: "土壤不够，模型就会胡写；土壤必须能被召回、审计和复用。",
  },
];

const docSections: DevelopmentOverviewSection[] = [
  {
    id: "product_scope",
    title: "产品范围",
    summary: "当前产品不是聊天框，而是面向网文作者的 AI 写作生产平台，范围锁定为作品、章节、大纲、角色、平台策略、模型接口和复盘闭环。",
    evidenceItems: ["已有作品工作台、任务中心、派单中心、总闸门、失败复盘和参考库页面。", platformDeliveryScope.scopeDecision],
    acceptance: "用户能从首页进入真实写作流程，而不是停在模型聊天入口。",
    href: "/projects",
  },
  {
    id: "writing_workflow",
    title: "写作流程",
    summary: "采用大树写作法：先开头和结尾，再主干、分支、叶片和土壤，最终落到章节卡、审稿、二改和发布包。",
    evidenceItems: ["大纲树、人物弧光、世界观、伏笔、前三章改写和章节生产流程已进入项目页。", "开篇钩子、爽点密度、人物弧光和伏笔回收已进入审稿指标。"],
    acceptance: "作者能按开头、结尾、主干、分支、叶片、土壤顺序推进作品。",
    href: "/projects",
  },
  {
    id: "model_interfaces",
    title: "模型接口",
    summary: "Claude、DeepSeek、Kimi、GPT 作为四类模型岗位预留接口，分别负责结构、正文、长上下文和海外包装。",
    evidenceItems: ["模型设置页已有 provider 配置、角色矩阵、任务路由和失败替代。", "模型调用必须服务具体写作任务，不做泛聊天中心。"],
    acceptance: "四个模型接口都有明确岗位、任务、备用和人工验收入口。",
    href: "/settings/models#model-role-matrix",
  },
  {
    id: "platform_delivery",
    title: "平台交付",
    summary: "平台范围固定为起点、番茄、七猫、晋江、知乎盐选、WebNovel、Royal Road、Wattpad，不再扩剩余 10 个平台。",
    evidenceItems: [`${platformDeliveryScope.statusLabel}。`, platformDeliveryScope.expansionLabel],
    acceptance: "每个平台都必须有写作抓手、投稿抓手和复盘指标。",
    href: "/references",
  },
  {
    id: "pm_gates",
    title: "毒舌 PM 闸门",
    summary: "每个关键中心都必须回答下一步、风险、验收证据和不能做什么，避免产品变成漂亮但不能交付的展示页。",
    evidenceItems: ["总闸门、任务中心、失败复盘和参考库已经有 PM 焦点卡。", "批量生产必须经过样本、复查、失败修复和恢复观察。"],
    acceptance: "任何批量生产前都有明确阻塞原因、验收证据和下一步入口。",
    href: "/gate",
  },
];

const deliveryAuditItems: DevelopmentOverviewAuditItem[] = [
  {
    id: "reference_cases",
    title: "30 个开源参考案例",
    status: "ready",
    requirement: "筛选最少 30 个 GitHub 写作、AI 工作流、知识库和发布流水线项目作为参考。",
    evidence: `${openSourceReferenceCases.length} 个参考案例已进入参考库，并按传统写作、AI 工作流、知识库、发布流水线分类。`,
    nextStep: "继续只抽取能服务网文生产的产品动作，不为了资料数量继续堆项目。",
    href: "/references",
  },
  {
    id: "platform_scope",
    title: "8 个核心平台范围",
    status: "ready",
    requirement: "覆盖起点、番茄、七猫、晋江、知乎盐选、WebNovel、Royal Road、Wattpad，并停止扩展剩余平台。",
    evidence: `${platformDeliveryScope.statusLabel}；${platformDeliveryScope.expansionLabel}；扩展平台不再作为待补缺口。`,
    nextStep: "把 8 个平台的写作、投稿、复盘闭环继续打磨，不扩范围。",
    href: "/references",
  },
  {
    id: "length_modes",
    title: "短中长篇篇幅",
    status: "ready",
    requirement: "支持一万字左右短篇、5-6 万字中篇、30 万字以上长篇和百万字级超长篇规划。",
    evidence: "篇幅模板已覆盖 short_10k、mid_50k、long_300k_plus、mega_1m_plus，并绑定平台默认篇幅。",
    nextStep: "继续把篇幅选择落到章节数量、首章钩子和发布包验收。",
    href: "/projects",
  },
  {
    id: "tree_workflow",
    title: "大树写作流程",
    status: "ready",
    requirement: "先写开头和结尾，再写主干，最后做分支，叶片和土壤用于章节内容与设定填充。",
    evidence: "开发总览已展示开头、结尾、主干、分支、叶片、土壤六步，并把钩子和土壤作为 PM 规则。",
    nextStep: "从作品工作台继续验证每本书是否按这棵树补齐材料。",
    href: "/docs",
  },
  {
    id: "model_interfaces",
    title: "四类模型接口",
    status: "ready",
    requirement: "对接 Claude、DeepSeek、Kimi、GPT 等模型，并预留对应接口。",
    evidence: "Claude、DeepSeek、Kimi、GPT 已在模型岗位中分别承担结构、正文、长上下文和海外包装。",
    nextStep: "进入模型设置检查接口、备用模型、任务路由和失败替代。",
    href: "/settings/models",
  },
  {
    id: "ai_roles",
    title: "AI 编辑部角色",
    status: "ready",
    requirement: "把不同角色分配到不同 Skill 或模型岗位，服务策划、结构、正文、资料、海外包装和复盘。",
    evidence: "参考库已沉淀毒舌产品经理、长篇结构主编、中文网文写手、长上下文资料官、海外投稿包装编辑、反馈运营等角色。",
    nextStep: "继续把角色产物绑定到任务回执，避免只停留在角色名。",
    href: "/references",
  },
  {
    id: "writing_pipeline",
    title: "写作到投稿流水线",
    status: "watch",
    requirement: "形成从开书、章节生产、审稿二改、导出投稿到平台反馈复盘的完整路径。",
    evidence: "作品、任务、派单、总闸门、失败修复、发布包和导出页面已串联，仍需用真实作品持续验收流转体验。",
    nextStep: "从作品工作台跑一条首章样本到发布包的完整验收，不跳过人工采用。",
    href: "/projects",
  },
  {
    id: "pm_gates",
    title: "毒舌 PM 闸门",
    status: "ready",
    requirement: "按照毒舌产品经理路径，所有批量生产前必须有样本、复查、失败修复和可点击下一步。",
    evidence: "总闸门、任务中心、失败修复中心、模型设置和参考库均有 PM 焦点；失败中心会在高风险时暂停批量。",
    nextStep: "继续让每个新功能先写清阻塞原因和验收证据，再允许批量扩大。",
    href: "/gate",
  },
];

function buildDeliveryAudit(): DevelopmentOverviewDeliveryAudit {
  const summary = {
    total: deliveryAuditItems.length,
    ready: deliveryAuditItems.filter((item) => item.status === "ready").length,
    watch: deliveryAuditItems.filter((item) => item.status === "watch").length,
    blocked: deliveryAuditItems.filter((item) => item.status === "blocked").length,
  };

  return {
    headline: "原始需求交付验收清单",
    pmVerdict: `${summary.ready}/${summary.total} 项已覆盖，${summary.watch} 项观察中；剩余 10 个平台不再添加，下一步验真实作品流水线。`,
    summary,
    items: deliveryAuditItems,
  };
}

const pipelineProofSteps: DevelopmentOverviewPipelineProofStep[] = [
  {
    id: "project_start",
    order: 1,
    title: "开书与大树骨架",
    owner: "作者 + 毒舌产品经理",
    href: "/projects",
    evidence: "作品必须有目标平台、篇幅、开头钩子、结尾承诺、主干和基础土壤。",
    passCondition: "章节卡可进入首章样本，且不是空白项目或纯聊天记录。",
    stopRule: "没有目标平台、开头钩子或结尾承诺时停在作品工作台，不进入模型生成。",
  },
  {
    id: "sample_draft",
    order: 2,
    title: "首章样本生成",
    owner: "中文网文写手 + 长篇结构主编",
    href: "/projects",
    evidence: "首章样本必须进入候选稿、审稿和二改链路，不能直接覆盖正文。",
    passCondition: "样本通过钩子、爽点、人物弧光、平台适配和人工采用检查。",
    stopRule: "样本质量不足时只允许二改或重写，不允许批量生产。",
  },
  {
    id: "task_dispatch",
    order: 3,
    title: "任务与派单回执",
    owner: "派单中心 + AI 编辑部角色",
    href: "/dispatch",
    evidence: "模型执行、人工验收、回执接受和下一步任务必须能在任务/派单链路中闭合。",
    passCondition: "任务有明确执行角色、输入、输出、验收证据和下一步入口。",
    stopRule: "回执证据太薄或没有人工采用时停在派单中心，不进入总闸门放大。",
  },
  {
    id: "gate_check",
    order: 4,
    title: "总闸门放大检查",
    owner: "毒舌产品经理",
    href: "/gate",
    evidence: "总闸门必须看到样本、复查、成本、质量、失败率和恢复证据。",
    passCondition: "样本稳定、质量过线、成本可控、没有未解决阻塞后才允许小批量。",
    stopRule: "缺少样本、复查或失败修复证据时不允许批量。",
  },
  {
    id: "failure_repair",
    order: 5,
    title: "失败修复与恢复观察",
    owner: "失败修复中心",
    href: "/failures",
    evidence: "失败按模型配置、提示词上下文、样本重试和人工复盘分泳道处理。",
    passCondition: "未恢复失败清空后，先跑单章样本和小批量观察。",
    stopRule: "模型配置或上下文失败未修复时暂停批量。",
  },
  {
    id: "publish_package",
    order: 6,
    title: "发布包与平台复盘",
    owner: "海外投稿包装编辑 + 反馈运营",
    href: "/projects",
    evidence: "发布包、导出、平台策略、版本基线和效果复盘必须能回到作品。",
    passCondition: "8 个核心平台都有写作抓手、投稿抓手、复盘指标和版本证据。",
    stopRule: "发布包缺平台卖点、样章、标签或反馈记录时停在发布修复，不扩范围。",
  },
];

function buildPipelineProofRoute(): DevelopmentOverviewPipelineProofRoute {
  return {
    headline: "写作到投稿流水线验收路线",
    pmRule: "按这 6 步验真实作品样本；不跳过人工采用，不用新增平台掩盖流水线问题。",
    steps: pipelineProofSteps,
  };
}

export function buildDevelopmentOverview(): DevelopmentOverview {
  return {
    referenceCount: openSourceReferenceCases.length,
    platformScope: platformDeliveryScope,
    pmFocus: {
      headline: "开发文档先收束，别再加戏。",
      detail: "当前重点是把写作、投稿、复盘三段闭环解释清楚，并让每个入口都能回到真实作品生产；剩余 10 个平台不再添加。",
      proof: `${platformDeliveryScope.statusLabel}；${openSourceReferenceCases.length} 个开源参考案例已沉淀；4 个模型接口已按岗位预留。`,
      actionHref: "/projects",
      actionLabel: "进入作品工作台",
    },
    modelInterfaces: {
      total: modelInterfaces.length,
      readyLabel: "Claude / DeepSeek / Kimi / GPT 接口已预留",
      items: modelInterfaces,
    },
    docSections,
    treeWorkflow,
    deliveryAudit: buildDeliveryAudit(),
    pipelineProofRoute: buildPipelineProofRoute(),
    nextActions: [
      {
        label: "从作品工作台验收真实写作流程",
        detail: "开书、首章、审稿、二改和发布包必须能串起来。",
        href: "/projects",
      },
      {
        label: "确认模型岗位接口",
        detail: "检查 Claude、DeepSeek、Kimi、GPT 是否分别承担结构、正文、资料和海外包装。",
        href: "/settings/models",
      },
      {
        label: "回看参考库与 8 平台范围",
        detail: "30 个参考案例只服务当前 8 平台闭环，不再引入新的平台债。",
        href: "/references",
      },
      {
        label: "用总闸门卡住批量生产",
        detail: "没有样本、复查和失败修复证据时，不允许扩大批量。",
        href: "/gate",
      },
    ],
  };
}
