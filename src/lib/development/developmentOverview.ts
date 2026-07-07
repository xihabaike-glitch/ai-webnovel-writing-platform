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
