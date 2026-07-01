import type { PlatformId } from "./platformProfiles.ts";

export interface PlatformWritingStyleTemplate {
  platformId: PlatformId;
  audiencePromise: string;
  openingHook: string;
  firstScreen: string;
  chapterRhythm: string;
  conflictDensity: string;
  characterFocus: string;
  branchHandling: string;
  endingBeat: string;
  languageStyle: string;
  mustHave: string[];
  avoid: string[];
  promptDirectives: string[];
}

export const platformWritingStyleTemplates: PlatformWritingStyleTemplate[] = [
  {
    platformId: "qidian",
    audiencePromise: "长期升级、宏大世界和清晰成长路线。",
    openingHook: "用一个能影响全书的大问题开场，让读者看到主角未来能走多远。",
    firstScreen: "首屏先放危机、规则异常或身份变化，再给出世界观冰山一角。",
    chapterRhythm: "每章完成一个阶段推进，同时留下更大的体系问题。",
    conflictDensity: "中等偏高，爽点不能太碎，要服务升级线和世界规则。",
    characterFocus: "主角要有长期欲望、阶段目标和可持续成长空间。",
    branchHandling: "支线围绕功法、势力、秘境、历史谜团展开，最后回到主线升级。",
    endingBeat: "章末抛出新等级、新敌人、新规则或新地图。",
    languageStyle: "稳、燃、信息量足，避免像短视频梗概一样跳跃。",
    mustHave: ["升级体系", "长期伏笔", "阶段 Boss", "世界规则"],
    avoid: ["只靠金手指秒杀", "前三章没有方向", "世界观只堆名词"],
    promptDirectives: [
      "把本章写成长期大树结构的一段主干，不要只追求单章反转。",
      "每个爽点都要让升级体系、势力关系或主角选择更清楚。",
    ],
  },
  {
    platformId: "fanqie",
    audiencePromise: "快进入、快反转、快获得情绪回报。",
    openingHook: "第一段直接给危机、倒计时、背叛、重生节点或不可逆选择。",
    firstScreen: "300 字内出现主角困境、外部压力和一个明确期待。",
    chapterRhythm: "每 300-500 字推动一次信息、冲突、选择或奖励。",
    conflictDensity: "高密度，少铺垫，多现场，多即时反馈。",
    characterFocus: "主角目标要直白，情绪要爽、痛、急、恨或甜得明确。",
    branchHandling: "支线只保留能制造爽点、误会、反杀或情绪补偿的部分。",
    endingBeat: "章末必须给新麻烦、新奖励、新身份暴露或下一次反杀空间。",
    languageStyle: "短句、强动作、强情绪，不要慢热散文化。",
    mustHave: ["强钩子", "连续爽点", "章末悬念", "即时情绪回报"],
    avoid: ["背景说明过长", "人物闲聊开局", "爽点兑现太晚"],
    promptDirectives: [
      "第一段必须进入事件现场，不要从天气、设定或人物履历写起。",
      "把每个自然段都压向冲突、选择、反击或新的代价。",
    ],
  },
  {
    platformId: "qimao",
    audiencePromise: "稳定情绪供给、清晰目标和可持续追更。",
    openingHook: "用家庭矛盾、婚恋压力、金钱困境、命案疑点或身份落差开场。",
    firstScreen: "先让读者知道主角想要什么、被谁压住、马上要失去什么。",
    chapterRhythm: "节奏稳定，情绪线不能断，每章有小目标和小回报。",
    conflictDensity: "中高密度，重稳定推进，不追求过度花活。",
    characterFocus: "人物动机要朴素可信，读者能理解委屈和反击。",
    branchHandling: "支线服务家庭、事业、感情或案件推进，不要离主角太远。",
    endingBeat: "章末给关系变化、证据出现、秘密松动或下一步行动。",
    languageStyle: "清楚、顺滑、情绪直接，避免晦涩表达。",
    mustHave: ["稳定更新感", "明确目标", "情绪补偿", "关系推进"],
    avoid: ["节奏忽快忽慢", "人物动机悬空", "长篇设定压过情绪"],
    promptDirectives: [
      "保证每章都有可追的生活目标、关系目标或案件目标。",
      "冲突要直给，但人物反应要符合现实情绪。",
    ],
  },
  {
    platformId: "jjwxc",
    audiencePromise: "人物关系、情感张力和可讨论的人物弧光。",
    openingHook: "用关系错位、重逢、误解、秘密或情感选择开场。",
    firstScreen: "首屏先让读者看见人物之间的张力，而不是先解释设定。",
    chapterRhythm: "节奏可以细，但每章必须推进关系状态或人物认知。",
    conflictDensity: "中等，外部事件要服务人物内心和关系变化。",
    characterFocus: "主角要有缺口、边界、欲望和成长痛点。",
    branchHandling: "支线围绕配角镜像、关系压力、过去创伤或价值选择展开。",
    endingBeat: "章末给关系误差、情绪悬而未决或新认知冲击。",
    languageStyle: "细腻、克制、有情绪余味，避免油腻和强行工业糖精。",
    mustHave: ["人物弧光", "情感张力", "关系推进", "内心选择"],
    avoid: ["只靠误会水文", "人设口号化", "情绪线突然转向"],
    promptDirectives: [
      "每场戏都要让人物关系发生微妙变化。",
      "用动作和选择体现情绪，不要只让角色自我解释。",
    ],
  },
  {
    platformId: "zhihu_yanxuan",
    audiencePromise: "短篇强代入、强反转和结尾回收。",
    openingHook: "第一句就进入矛盾、死亡、背叛、复仇或荒诞脑洞。",
    firstScreen: "1000 字内建立付费期待：谁骗了我、我怎么翻盘、真相是什么。",
    chapterRhythm: "短篇要快，信息一层层翻，每段都服务反转链。",
    conflictDensity: "极高，铺垫必须带钩子，不能空转。",
    characterFocus: "第一人称代入要强，主角的情绪和判断要推动真相显形。",
    branchHandling: "支线只保留证据、误导、反证和情绪加压。",
    endingBeat: "结尾必须回收前文细节，完成认知反转或情绪审判。",
    languageStyle: "像亲历讲述，句子干净，信息精准，避免长篇网文式注水。",
    mustHave: ["第一人称代入", "反转链", "付费期待", "结尾回收"],
    avoid: ["铺垫过长", "反转靠硬拗", "结尾只喊口号"],
    promptDirectives: [
      "用第一人称或强贴脸视角制造真实感。",
      "每个细节都要么误导读者，要么在结尾回收。",
    ],
  },
  {
    platformId: "webnovel",
    audiencePromise: "clear power fantasy, readable progression, and fast comprehension.",
    openingHook: "Open with a visible crisis, system trigger, betrayal, reincarnation, or power gap.",
    firstScreen: "Make the premise understandable without requiring Chinese webnovel background knowledge.",
    chapterRhythm: "Keep chapters direct: scene goal, obstacle, power hint, payoff, cliffhanger.",
    conflictDensity: "High, but explain rules clearly before escalating them.",
    characterFocus: "The protagonist needs a strong desire, readable emotions, and a visible growth path.",
    branchHandling: "Side branches should expand power, factions, romance, or world stakes without confusing readers.",
    endingBeat: "End with a status change, new skill, enemy reveal, or urgent next objective.",
    languageStyle: "Plain, cinematic English-friendly pacing; avoid stiff direct translation.",
    mustHave: ["power fantasy", "system clarity", "chapter cliffhanger", "simple premise"],
    avoid: ["dense cultural shorthand", "unclear cultivation tiers", "slow exposition opening"],
    promptDirectives: [
      "Write in clear web-serial English logic even when the source idea is Chinese webnovel-style.",
      "Explain power rules through action instead of glossary dumping.",
    ],
  },
  {
    platformId: "royal_road",
    audiencePromise: "fair progression, crunchy systems, and earned competence.",
    openingHook: "Start with a test of survival, a system limitation, a build choice, or a failed plan.",
    firstScreen: "Show the progression promise and the constraint that prevents easy victory.",
    chapterRhythm: "Scene by scene: objective, rule, tactic, consequence, learning.",
    conflictDensity: "Medium-high; readers tolerate setup if the system logic is sharp.",
    characterFocus: "The protagonist should solve problems, learn, and pay costs for growth.",
    branchHandling: "Side branches should deepen skill trees, party dynamics, world rules, or tactical stakes.",
    endingBeat: "End with a new constraint, build option, dungeon threat, or strategic dilemma.",
    languageStyle: "Concrete, tactical, readable; avoid vague power upgrades.",
    mustHave: ["earned progression", "system limits", "tactical choices", "world rules"],
    avoid: ["unearned overpowered wins", "soft magic without constraints", "stats with no story effect"],
    promptDirectives: [
      "Make every progression gain earned by a decision, cost, or solved problem.",
      "When using stats or skills, show how they change the scene outcome.",
    ],
  },
  {
    platformId: "wattpad",
    audiencePromise: "immediate emotion, relationship tension, and mobile-friendly drama.",
    openingHook: "Open with attraction, humiliation, forbidden contact, breakup, secret, or status collision.",
    firstScreen: "Let readers feel the character's want and the relationship pressure immediately.",
    chapterRhythm: "Short emotional beats, strong scene turns, easy mobile reading.",
    conflictDensity: "Medium-high, driven by desire, jealousy, secrets, status, and vulnerability.",
    characterFocus: "Characters need chemistry, flaws, longing, and clear emotional stakes.",
    branchHandling: "Side branches should intensify romance, friendship, family pressure, or identity secrets.",
    endingBeat: "End with an emotional reversal, confession risk, public embarrassment, or forbidden choice.",
    languageStyle: "Intimate, direct, sensory, emotionally readable; avoid cold summary.",
    mustHave: ["chemistry", "emotional stakes", "mobile pacing", "tag-friendly trope"],
    avoid: ["slow chemistry", "unclear trope promise", "detached narration"],
    promptDirectives: [
      "Keep paragraphs mobile-friendly and emotionally immediate.",
      "Every scene should change attraction, trust, shame, jealousy, or vulnerability.",
    ],
  },
];

export function getPlatformWritingStyle(platformId: PlatformId): PlatformWritingStyleTemplate {
  const template = platformWritingStyleTemplates.find((item) => item.platformId === platformId);
  if (!template) {
    throw new Error(`Unknown platform writing style: ${platformId}`);
  }
  return template;
}

export function buildPlatformWritingStylePromptBlock(platformId: PlatformId): string {
  const style = getPlatformWritingStyle(platformId);

  return [
    "平台风格模板：",
    `读者承诺：${style.audiencePromise}`,
    `首屏钩子：${style.openingHook}`,
    `第一屏执行：${style.firstScreen}`,
    `章节节奏：${style.chapterRhythm}`,
    `冲突密度：${style.conflictDensity}`,
    `人物重点：${style.characterFocus}`,
    `支线处理：${style.branchHandling}`,
    `章末处理：${style.endingBeat}`,
    `语言风格：${style.languageStyle}`,
    `必须具备：${style.mustHave.join("、")}`,
    `必须避开：${style.avoid.join("、")}`,
    ...style.promptDirectives.map((directive, index) => `风格指令 ${index + 1}：${directive}`),
  ].join("\n");
}
