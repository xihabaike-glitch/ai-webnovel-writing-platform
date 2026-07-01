import type { PlatformProfile } from "@/lib/platforms/platformProfiles";

export const OUTLINE_NODE_TYPES = [
  "root",
  "opening",
  "ending",
  "trunk",
  "branch",
  "leaf",
  "soil",
] as const;

export type OutlineNodeType = (typeof OUTLINE_NODE_TYPES)[number];

export interface OutlineNodeSeed {
  id: string;
  parentId: string | null;
  type: OutlineNodeType;
  title: string;
  summary: string;
  goal: string;
  hook: string;
  conflict: string;
  valueShift: string;
  platformNote: string;
  order: number;
  depth: number;
  status: string;
}

export interface DefaultOutlineInput {
  projectId: string;
  title: string;
  genre: string;
  sellingPoint: string;
  platform: PlatformProfile;
}

function nodeId(projectId: string, slug: string) {
  return `${projectId}-outline-${slug}`;
}

export function buildDefaultOutlineNodes(input: DefaultOutlineInput): OutlineNodeSeed[] {
  const rootId = nodeId(input.projectId, "root");
  const openingId = nodeId(input.projectId, "opening");
  const endingId = nodeId(input.projectId, "ending");
  const trunkId = nodeId(input.projectId, "trunk");
  const branchArcId = nodeId(input.projectId, "branch-character-arc");
  const branchPressureId = nodeId(input.projectId, "branch-pressure");
  const branchRelationId = nodeId(input.projectId, "branch-relation");
  const soilId = nodeId(input.projectId, "soil");

  const sellingPoint = input.sellingPoint || "用高密度事件和清晰情绪承诺抓住目标读者";
  const platformHook = input.platform.openingRules.join("；");
  const platformFocus = input.platform.reviewFocus.join("、");

  return [
    {
      id: rootId,
      parentId: null,
      type: "root",
      title: `${input.title}：作品大树`,
      summary: `以${input.genre}为外壳，围绕“${sellingPoint}”搭建可连载结构。`,
      goal: "统一题材承诺、人物弧光、主线推进和平台读者预期。",
      hook: "第一屏必须给读者一个明确问题：主角为什么现在非行动不可。",
      conflict: "主角长期欲望和外部压力持续互相挤压。",
      valueShift: "从失控开局走向主动掌控终局。",
      platformNote: `${input.platform.name}：${platformFocus}`,
      order: 0,
      depth: 0,
      status: "planned",
    },
    {
      id: openingId,
      parentId: rootId,
      type: "opening",
      title: "开头钩子",
      summary: "先写前 300-1000 字的强问题、强危机、强期待。",
      goal: "让读者在第一章内知道主角困境、看点和继续读的理由。",
      hook: platformHook,
      conflict: "主角不能退，退就会失去人、钱、命、尊严或唯一机会。",
      valueShift: "日常状态被不可逆事件打破。",
      platformNote: `按${input.platform.name}开头规则校准，不写慢热解释。`,
      order: 1,
      depth: 1,
      status: "planned",
    },
    {
      id: endingId,
      parentId: rootId,
      type: "ending",
      title: "终局回响",
      summary: "先定最后的胜负、情感落点和主题回收。",
      goal: "确保中段所有支线都能回收到终局，不写散。",
      hook: "终局要兑现开头提出的核心问题。",
      conflict: "最终选择必须让主角付出代价，而不是机械赢。",
      valueShift: "从被系统/命运推着走，到主动定义自己的规则。",
      platformNote: "终局服务长线留存，也为番外或下一部留下余味。",
      order: 2,
      depth: 1,
      status: "planned",
    },
    {
      id: trunkId,
      parentId: rootId,
      type: "trunk",
      title: "主干主线",
      summary: "用连续升级的目标、阻碍、反转支撑全书推进。",
      goal: "每 3-5 章推进一次明确结果，每 20-30 章完成一个阶段跃迁。",
      hook: "主线问题持续升级，不让读者觉得故事原地转圈。",
      conflict: "外部敌人、资源压力、身份秘密和道德选择轮流压迫主角。",
      valueShift: "小胜利换来更大的代价和更大的舞台。",
      platformNote: `优先匹配${input.platform.name}的节奏和读者爽点。`,
      order: 3,
      depth: 1,
      status: "planned",
    },
    {
      id: branchArcId,
      parentId: trunkId,
      type: "branch",
      title: "人物弧光线",
      summary: "主角从缺陷、误判或执念出发，逐步完成内在转变。",
      goal: "每个关键剧情不只推动事件，也改变主角选择方式。",
      hook: "人物不是被剧情拖走，而是因欲望做错选择。",
      conflict: "想要的东西和真正需要的东西发生冲突。",
      valueShift: "从逃避、逞强或依赖，到承担、选择和掌控。",
      platformNote: "人物弧光要服务爽点，不能变成纯说教。",
      order: 1,
      depth: 2,
      status: "planned",
    },
    {
      id: branchPressureId,
      parentId: trunkId,
      type: "branch",
      title: "反派压力线",
      summary: "为主角设置可见压力源，让每次胜利都引来更强反扑。",
      goal: "制造持续对抗、升级和反转，不让主线松掉。",
      hook: "反派每次出手都改变局面。",
      conflict: "主角的成长会威胁既有秩序，敌人因此加码。",
      valueShift: "从被动挨打，到主动布局。",
      platformNote: "反派越具体，爽点越容易落地。",
      order: 2,
      depth: 2,
      status: "planned",
    },
    {
      id: branchRelationId,
      parentId: trunkId,
      type: "branch",
      title: "关系与情绪线",
      summary: "安排亲情、友情、爱情或师徒关系，给爽点和反转提供情绪重量。",
      goal: "让角色关系影响选择，而不是只负责聊天。",
      hook: "重要关系要有误解、亏欠、守护或背叛的钩子。",
      conflict: "情感需求和主线目标不能永远同向。",
      valueShift: "从互相利用或误解，到形成真正同盟或彻底决裂。",
      platformNote: "根据平台选择甜宠、虐恋、兄弟情或群像权谋的比例。",
      order: 3,
      depth: 2,
      status: "planned",
    },
    {
      id: nodeId(input.projectId, "leaf-first-three"),
      parentId: openingId,
      type: "leaf",
      title: "前三章叶片",
      summary: "拆成第一章钩子、第二章验证、第三章升级。",
      goal: "完成首轮留存测试，让读者看到设定可持续产生剧情。",
      hook: "每章末尾都留一个具体问题。",
      conflict: "主角的每个解法都制造新麻烦。",
      valueShift: "从遭遇危机，到发现规则，再到主动利用规则。",
      platformNote: "适合作为首秀、推荐位或海外连载的开局样章。",
      order: 1,
      depth: 2,
      status: "planned",
    },
    {
      id: nodeId(input.projectId, "leaf-midpoint"),
      parentId: trunkId,
      type: "leaf",
      title: "中段爆点叶片",
      summary: "提前规划一次身份揭露、地图升级或关系翻盘。",
      goal: "防止 5-6 万字后疲软，为中篇和长篇都保留续航。",
      hook: "读者以为答案出现，其实只是更大问题的入口。",
      conflict: "旧规则失效，新敌人或新代价登场。",
      valueShift: "从局部胜利转向全局危机。",
      platformNote: "中段要用爆点修正追读，不靠灌水拖字数。",
      order: 4,
      depth: 2,
      status: "planned",
    },
    {
      id: soilId,
      parentId: rootId,
      type: "soil",
      title: "平台土壤",
      summary: "记录题材标签、读者预期、平台禁忌和更新策略。",
      goal: "保证内容填充不偏离目标平台。",
      hook: "每次扩写前先确认这一段在满足哪类读者期待。",
      conflict: "作者表达和平台爽点之间要做取舍。",
      valueShift: "从灵感散写，变成可复用生产流程。",
      platformNote: `${input.platform.name}风险：${input.platform.risks.join("、")}`,
      order: 4,
      depth: 1,
      status: "planned",
    },
  ];
}
