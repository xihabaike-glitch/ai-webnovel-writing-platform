import { getPlatformProfile, type LengthType, type PlatformId } from "../platforms/platformProfiles.ts";

export type ProjectTemplateId =
  | "fanqie_system_reversal"
  | "qidian_epic_progression"
  | "qimao_emotion_stable"
  | "jjwxc_relationship_arc"
  | "zhihu_twist_short"
  | "webnovel_system_fantasy"
  | "royal_road_litrpg"
  | "wattpad_romance_hook";

export interface ProjectTemplate {
  id: ProjectTemplateId;
  label: string;
  platformId: PlatformId;
  lengthType: LengthType;
  genre: string;
  titleSeed: string;
  sellingPoint: string;
  updateCadence: string;
  positioning: string;
  protagonist: {
    name: string;
    role: string;
    desire: string;
    need: string;
    flaw: string;
    arcStart: string;
    arcEnd: string;
    voice: string;
    relationshipNotes: string;
  };
  firstThree: Array<{
    title: string;
    goal: string;
    hook: string;
    conflict: string;
    valueShift: string;
    cliffhanger: string;
  }>;
  worldSeeds: Array<{
    type: string;
    title: string;
    content: string;
  }>;
}

export const projectTemplates: ProjectTemplate[] = [
  {
    id: "fanqie_system_reversal",
    label: "番茄都市系统爽文",
    platformId: "fanqie",
    lengthType: "long_300k_plus",
    genre: "都市系统",
    titleSeed: "夜雨系统",
    sellingPoint: "雨夜危机中觉醒系统，主角用一次次选择翻盘。",
    updateCadence: "daily_4000",
    positioning: "高频钩子、强冲突、前三章连续给爽点，适合先跑首秀数据。",
    protagonist: {
      name: "林晚",
      role: "主角",
      desire: "查清系统降临的真相并翻盘人生",
      need: "学会主动承担选择的代价",
      flaw: "习惯逃避冲突，害怕牵连身边人",
      arcStart: "被系统和现实压力推着走",
      arcEnd: "主动制定规则，反过来利用系统",
      voice: "克制、警觉、关键时刻狠",
      relationshipNotes: "和旧友、债主、系统任务对象形成持续拉扯",
    },
    firstThree: [
      {
        title: "第一章 雨夜系统",
        goal: "让主角在雨夜遭遇不可逆危机并绑定系统。",
        hook: "门外倒计时和陌生求救同时出现。",
        conflict: "主角必须在自保和救人之间立刻选择。",
        valueShift: "普通生活被系统任务击穿。",
        cliffhanger: "系统提示：第一个选择已经失败过一次。",
      },
      {
        title: "第二章 第一次奖励",
        goal: "证明系统能带来爽点，但奖励伴随代价。",
        hook: "主角获得能力，却发现能力来自未来的自己。",
        conflict: "救下的人反而指认主角是凶手。",
        valueShift: "从被动逃命转向主动找证据。",
        cliffhanger: "系统刷新第二个任务：亲手交出证据。",
      },
      {
        title: "第三章 反杀证据",
        goal: "让主角完成第一次主动反击并抬高主线谜团。",
        hook: "证据袋里出现主角不可能知道的照片。",
        conflict: "交出证据能洗清嫌疑，却会害死关键证人。",
        valueShift: "从求自保转向布局救人。",
        cliffhanger: "照片背面写着：别相信系统。",
      },
    ],
    worldSeeds: [
      { type: "system_rule", title: "选择系统", content: "系统只在高压选择出现时发布任务。每次奖励都绑定代价，代价会制造下一轮冲突和更高风险。" },
      { type: "taboo", title: "回档禁忌", content: "回档不能无损使用。主角每次借用未来信息，都会失去一段关系信任或关键记忆线索。" },
      { type: "platform_soil", title: "番茄土壤", content: "每章前半段给危机，后半段给反击或新问题。解释必须短，章末必须留下明确追读钩子。" },
    ],
  },
  {
    id: "qidian_epic_progression",
    label: "起点长篇升级史诗",
    platformId: "qidian",
    lengthType: "mega_1m_plus",
    genre: "玄幻升级",
    titleSeed: "万象归墟",
    sellingPoint: "废脉少年发现旧纪元遗骨，沿着失落体系重建万象大道。",
    updateCadence: "daily_6000",
    positioning: "世界观厚、升级清楚、阶段 Boss 明确，适合长线 IP 化。",
    protagonist: {
      name: "沈照",
      role: "主角",
      desire: "修复废脉，证明家族旧案真相",
      need: "从只求个人翻身转向承担旧纪元因果",
      flaw: "过度相信力量能解决一切",
      arcStart: "被宗族放逐的废脉少年",
      arcEnd: "能约束力量并重建秩序的开道者",
      voice: "冷静、倔强、遇强更强",
      relationshipNotes: "师承、宗族、旧敌和同盟共同构成长期势力网",
    },
    firstThree: [
      { title: "第一章 废脉验骨", goal: "建立主角低谷、旧案和力量体系入口。", hook: "验骨石碎裂，露出不属于本纪元的骨纹。", conflict: "主角被逐出宗祠，却必须保住母亲遗物。", valueShift: "从被判废物到触碰旧纪元力量。", cliffhanger: "遗骨里传出一句：你不是第一个失败者。" },
      { title: "第二章 旧纪元残火", goal: "展示升级体系的第一条规则和代价。", hook: "残火能修脉，也会烧掉寿数。", conflict: "主角必须用寿数换一次公开反击。", valueShift: "从忍耐受辱到第一次亮出锋芒。", cliffhanger: "宗门长老认出残火，立刻下封口令。" },
      { title: "第三章 山门赌命", goal: "用赌斗完成首个爽点并打开宗门地图。", hook: "主角拿自己的废脉当赌注。", conflict: "赢能进山门，输会被夺走遗骨。", valueShift: "从孤立无援到获得入局资格。", cliffhanger: "山门深处也有同样骨纹。" },
    ],
    worldSeeds: [
      { type: "system_rule", title: "万象修行体系", content: "修行分为骨纹、脉火、象台、归墟四条主线。每次突破都必须付出资源、寿数或关系代价。" },
      { type: "taboo", title: "旧纪元禁术", content: "旧纪元力量不能连续使用。过度调用会唤醒遗骨原主意识，并污染主角的判断。" },
      { type: "platform_soil", title: "起点土壤", content: "每卷必须有地图升级、阶段敌人、资源体系和长期伏笔。爽点服务成长线，不靠单章反转硬撑。" },
    ],
  },
  {
    id: "qimao_emotion_stable",
    label: "七猫稳定女频情绪文",
    platformId: "qimao",
    lengthType: "long_300k_plus",
    genre: "年代种田言情",
    titleSeed: "春风有信",
    sellingPoint: "重回小镇的女主靠手艺翻身，也修复一段被误会毁掉的感情。",
    updateCadence: "daily_4000",
    positioning: "情绪稳定、生活流推进、保底向长篇节奏。",
    protagonist: {
      name: "许知春",
      role: "女主",
      desire: "靠自己的手艺在小镇站稳",
      need: "接受被爱，也学会主动表达需求",
      flaw: "凡事独自硬扛，不愿解释委屈",
      arcStart: "带着误会回乡的失败者",
      arcEnd: "能经营事业和关系的掌舵人",
      voice: "温和、有韧劲、遇事不卖惨",
      relationshipNotes: "和旧恋人、家人、邻里形成长期情绪供给",
    },
    firstThree: [
      { title: "第一章 回镇", goal: "让女主带着现实压力回到小镇。", hook: "她刚下车，就看见旧恋人的订婚告示。", conflict: "家里欠债，镇上流言把她逼到台前。", valueShift: "从逃离失败到不得不面对旧关系。", cliffhanger: "旧恋人当众买下她唯一的摊位。" },
      { title: "第二章 第一炉糕", goal: "用手艺建立女主能力和生活流卖点。", hook: "没人敢买她的糕，只有一个孩子偷偷排队。", conflict: "竞争摊主造谣她用坏料。", valueShift: "从被排斥到用作品争取第一批信任。", cliffhanger: "孩子的母亲正是旧恋人的未婚对象。" },
      { title: "第三章 误会账本", goal: "揭开旧误会一角并留下情绪钩子。", hook: "女主在旧账本里发现当年欠款不是父亲签的。", conflict: "查真相会再次牵扯旧恋人。", valueShift: "从只想谋生到决定查清往事。", cliffhanger: "账本最后一页夹着旧恋人写给她的信。" },
    ],
    worldSeeds: [
      { type: "system_rule", title: "小镇生意规则", content: "生意成长依靠口碑、人情和手艺迭代。每次赚钱机会都会引出关系压力或旧误会。" },
      { type: "taboo", title: "情绪禁忌", content: "不能靠强行误会拖剧情。每个误会都必须带来新的选择、证据或关系变化。" },
      { type: "platform_soil", title: "七猫土壤", content: "保持稳定更新和情绪供给。每章要有生活细节、关系推进或小爽点，避免长时间低压叙事。" },
    ],
  },
  {
    id: "jjwxc_relationship_arc",
    label: "晋江人物关系弧光",
    platformId: "jjwxc",
    lengthType: "mid_50k",
    genre: "现言悬疑言情",
    titleSeed: "雾中来信",
    sellingPoint: "女主收到已故好友来信，与昔日搭档重查旧案并修复彼此信任。",
    updateCadence: "daily_3000",
    positioning: "人物关系先行，悬疑推动情感变化，适合中篇完成度。",
    protagonist: {
      name: "闻栀",
      role: "女主",
      desire: "查清好友死亡真相",
      need: "重新相信他人并承认自己的愧疚",
      flaw: "把所有失去都归咎于自己",
      arcStart: "封闭、警惕、拒绝合作",
      arcEnd: "能与搭档共同承担真相代价",
      voice: "敏感、锋利、内心克制",
      relationshipNotes: "和昔日搭档从互相指责到重新并肩",
    },
    firstThree: [
      { title: "第一章 死者来信", goal: "用来信钩子启动旧案和关系线。", hook: "已故三年的好友寄来一封今天才写的信。", conflict: "女主必须找最不想见的旧搭档验信。", valueShift: "从封闭生活到被旧案重新拖回。", cliffhanger: "信里提到的地点刚发生第二起死亡。" },
      { title: "第二章 旧搭档", goal: "建立双主角关系裂痕和合作理由。", hook: "旧搭档保存着她以为早被销毁的录音。", conflict: "两人互不信任，却只有合在一起才有完整证据。", valueShift: "从拒绝见面到被迫同行。", cliffhanger: "录音里出现第三个人的呼吸声。" },
      { title: "第三章 雾中名单", goal: "扩大嫌疑网并推进情感压力。", hook: "名单上第一个名字是女主自己。", conflict: "继续查会暴露她当年的隐瞒。", valueShift: "从追查别人到面对自己的责任。", cliffhanger: "旧搭档问她：那晚你到底删了什么。" },
    ],
    worldSeeds: [
      { type: "system_rule", title: "旧案推进规则", content: "每个线索必须同时推动案件和人物关系。真相不能只靠解释出现，要通过选择暴露。" },
      { type: "taboo", title: "审核与情绪边界", content: "悬疑压力要服务人物，不用过度血腥细节。情绪虐点必须有修复或成长方向。" },
      { type: "platform_soil", title: "晋江土壤", content: "读者关注人物动机、关系张力和情感可信度。每章要让关系状态发生微小变化。" },
    ],
  },
  {
    id: "zhihu_twist_short",
    label: "知乎盐选反转短篇",
    platformId: "zhihu_yanxuan",
    lengthType: "short_10k",
    genre: "第一人称悬疑复仇",
    titleSeed: "她替我活着",
    sellingPoint: "我参加自己的葬礼，发现最爱我的人都在撒谎。",
    updateCadence: "short_serial",
    positioning: "第一段进矛盾，三段内给付费期待，结尾必须回收反转。",
    protagonist: {
      name: "我",
      role: "第一人称主角",
      desire: "查清自己被替代的真相",
      need: "承认复仇之外还有要保护的人",
      flaw: "只相信自己看到的证据",
      arcStart: "以为自己是唯一受害者",
      arcEnd: "发现自己也是局的一部分并反手设局",
      voice: "冷、快、带一点自嘲",
      relationshipNotes: "姐姐、未婚夫、母亲都可能是保护者或加害者",
    },
    firstThree: [
      { title: "第一节 我的葬礼", goal: "第一段进入荒诞矛盾并给出核心谜题。", hook: "我站在自己的遗像前，听见未婚夫喊另一个女人叫我的名字。", conflict: "我不能暴露身份，却必须确认谁偷走了我的人生。", valueShift: "从旁观葬礼到决定追查替身。", cliffhanger: "遗像背后贴着一张我亲手签的死亡同意书。" },
      { title: "第二节 替身", goal: "制造第一轮反转，让替身不是单纯加害者。", hook: "替身看见我，没有害怕，只说你终于回来了。", conflict: "她握有真相，却要求我先救她。", valueShift: "从复仇对象明确到敌友难辨。", cliffhanger: "她说：真正死的人不是你，是我。" },
      { title: "第三节 同意书", goal: "把家庭、爱情和身份谜团连成付费钩子。", hook: "死亡同意书上的日期，是我失忆前一天。", conflict: "继续查会证明我自愿参与骗局。", valueShift: "从被害者视角转为共犯嫌疑。", cliffhanger: "母亲发来短信：别相信活着的你。" },
    ],
    worldSeeds: [
      { type: "system_rule", title: "反转链规则", content: "每一节必须推翻上一节的单一判断，但不能推翻核心情绪。反转来自证据重组，不靠作者耍赖。" },
      { type: "taboo", title: "短篇禁忌", content: "不能铺垫过长，不能让反转只靠新增陌生信息。每个关键证据都要提前露面。" },
      { type: "platform_soil", title: "知乎盐选土壤", content: "第一人称强代入，开头即矛盾，前一千字建立付费期待，结尾回收情绪和逻辑。" },
    ],
  },
  {
    id: "webnovel_system_fantasy",
    label: "WebNovel System Fantasy",
    platformId: "webnovel",
    lengthType: "long_300k_plus",
    genre: "System Fantasy",
    titleSeed: "The Last Choice System",
    sellingPoint: "A failed trainee receives a choice system that rewards victories with dangerous future debts.",
    updateCadence: "daily_1500_en",
    positioning: "Clear power fantasy, simple English hook, fast chapter-end questions.",
    protagonist: {
      name: "Kael",
      role: "protagonist",
      desire: "become strong enough to survive the academy trial",
      need: "learn that every shortcut creates a debt",
      flaw: "chooses fast power before trust",
      arcStart: "desperate trainee with no rank",
      arcEnd: "leader who controls the system instead of obeying it",
      voice: "direct, tense, determined",
      relationshipNotes: "rival, mentor, and hidden system owner create long-term pressure",
    },
    firstThree: [
      { title: "Chapter 1: The Red Choice", goal: "Introduce the system and immediate survival stakes.", hook: "A red window appears above the monster that already killed him once.", conflict: "Kael must choose between saving a rival or taking the reward alone.", valueShift: "from powerless trainee to system holder", cliffhanger: "the system says the first reward belongs to his future corpse." },
      { title: "Chapter 2: Debt Reward", goal: "Show the first reward and its hidden cost.", hook: "The skill works, but the debt timer starts counting down.", conflict: "Using the skill exposes Kael to academy hunters.", valueShift: "from escape to tactical use of power", cliffhanger: "his rival can see the system window too." },
      { title: "Chapter 3: Trial Gate", goal: "Move the story into academy progression.", hook: "The trial gate opens only for people marked to die.", conflict: "Kael needs the gate, but entering confirms the system's death mark.", valueShift: "from hunted student to active contender", cliffhanger: "the gate lists him as already deceased." },
    ],
    worldSeeds: [
      { type: "system_rule", title: "Choice System", content: "The system offers two to three choices under pressure. Rewards are immediate, but every reward creates a future debt or enemy." },
      { type: "taboo", title: "Power Limit", content: "No free power jumps. Every new skill must reveal a limit, a cost, or a stronger opponent who understands it." },
      { type: "platform_soil", title: "WebNovel Soil", content: "Use clear hooks, short explanations, visible progression, and chapter-end questions that translate across cultures." },
    ],
  },
  {
    id: "royal_road_litrpg",
    label: "Royal Road LitRPG Progression",
    platformId: "royal_road",
    lengthType: "long_300k_plus",
    genre: "LitRPG Progression",
    titleSeed: "Patch Notes for the Broken World",
    sellingPoint: "A bug tester enters a broken LitRPG world and exploits patch notes before the system patches him out.",
    updateCadence: "3_chapters_weekly_en",
    positioning: "Harder rules, transparent progression, skill constraints and tactical combat.",
    protagonist: {
      name: "Mara Voss",
      role: "protagonist",
      desire: "escape the broken world and expose the system flaw",
      need: "stop treating people like test cases",
      flaw: "over-optimizes every human choice",
      arcStart: "detached bug tester",
      arcEnd: "leader who values people over perfect builds",
      voice: "analytical, dry, practical",
      relationshipNotes: "party members challenge her exploit-first mindset",
    },
    firstThree: [
      { title: "Chapter 1: Known Issue", goal: "Introduce the broken system and the first exploit.", hook: "The tutorial patch note says she died three minutes ago.", conflict: "Mara can exploit a bug, but it will crash another player's quest.", valueShift: "from tester to trapped participant", cliffhanger: "the next patch note names her as the bug." },
      { title: "Chapter 2: Hotfix", goal: "Show system constraints and tactical progression.", hook: "The system patches her exploit mid-combat.", conflict: "She must win without relying on the same trick twice.", valueShift: "from exploit dependence to adaptive combat", cliffhanger: "a party invite arrives from an impossible admin account." },
      { title: "Chapter 3: Admin Ghost", goal: "Build party pressure and larger mystery.", hook: "The admin account belongs to a player erased last season.", conflict: "Trusting the ghost gives her a route out and a target on her back.", valueShift: "from solo survival to risky alliance", cliffhanger: "the ghost says the world is not a game anymore." },
    ],
    worldSeeds: [
      { type: "system_rule", title: "Patch System", content: "Every exploit can work once, then the world patches around it. Progression requires learning limits, not repeating tricks." },
      { type: "taboo", title: "Fair Progression", content: "No vague numbers. Skills, cooldowns, costs, and enemy counters must stay consistent enough for Royal Road readers to trust." },
      { type: "platform_soil", title: "Royal Road Soil", content: "Readers expect transparent mechanics, tactical payoffs, and meaningful constraints on every build advantage." },
    ],
  },
  {
    id: "wattpad_romance_hook",
    label: "Wattpad Romance Hook",
    platformId: "wattpad",
    lengthType: "mid_50k",
    genre: "Billionaire Romance",
    titleSeed: "Signed Under Midnight",
    sellingPoint: "A contract marriage begins as revenge, then forces two wounded people to choose truth over image.",
    updateCadence: "3_chapters_weekly_en",
    positioning: "Immediate chemistry, mobile pacing, clear emotional promise and tag-friendly setup.",
    protagonist: {
      name: "Elena Rose",
      role: "protagonist",
      desire: "save her family name without losing herself",
      need: "choose honest intimacy over public perfection",
      flaw: "performs confidence while hiding fear",
      arcStart: "cornered heiress signing a cold contract",
      arcEnd: "woman who defines love and power on her own terms",
      voice: "emotional, sharp, vulnerable",
      relationshipNotes: "contract husband, ex, and family pressure create romantic tension",
    },
    firstThree: [
      { title: "Chapter 1: The Midnight Contract", goal: "Start with the contract and immediate chemistry.", hook: "Elena signs the marriage contract at midnight, then realizes the groom is the man she humiliated years ago.", conflict: "She needs his name, he wants public revenge.", valueShift: "from desperate deal to emotional danger", cliffhanger: "he adds one final clause: she must live in his house tonight." },
      { title: "Chapter 2: His House Rule", goal: "Create close-proximity tension and vulnerability.", hook: "His first rule is no lies, but the house is full of portraits of her family.", conflict: "Elena must hide the real reason her family is collapsing.", valueShift: "from controlled performance to exposed fear", cliffhanger: "he already knows the secret she came to hide." },
      { title: "Chapter 3: The Public Kiss", goal: "Deliver romantic spectacle and deeper stakes.", hook: "Their first public kiss is staged, but he whispers her childhood nickname.", conflict: "The performance saves her reputation and threatens her heart.", valueShift: "from fake intimacy to real confusion", cliffhanger: "her ex announces he can prove the marriage is fraud." },
    ],
    worldSeeds: [
      { type: "system_rule", title: "Contract Romance Rules", content: "Every romantic beat must change the power balance. Public image, private wounds, and contract clauses create recurring conflict." },
      { type: "taboo", title: "Chemistry Limit", content: "Do not rely on status alone. The relationship needs vulnerability, banter, jealousy, and choices with emotional consequence." },
      { type: "platform_soil", title: "Wattpad Soil", content: "Lead with emotion, tags, chemistry, and mobile-friendly chapters. Each chapter should end with a relationship question." },
    ],
  },
];

export function getProjectTemplate(id: string): ProjectTemplate {
  const template = projectTemplates.find((item) => item.id === id);
  if (!template) {
    throw new Error(`Unknown project template: ${id}`);
  }
  return template;
}

export function getDefaultTemplateForPlatform(platformId: PlatformId) {
  return projectTemplates.find((template) => template.platformId === platformId) ?? projectTemplates[0];
}

export function buildTemplateChapterSeeds(template: ProjectTemplate) {
  return template.firstThree.map((chapter, index) => ({
    order: index + 1,
    title: chapter.title,
    content: "",
    wordCount: 0,
    goal: chapter.goal,
    hook: chapter.hook,
    conflict: chapter.conflict,
    valueShift: chapter.valueShift,
    cliffhanger: chapter.cliffhanger,
    status: "outline",
  }));
}

export function buildTemplateCharacterSeed(template: ProjectTemplate) {
  return template.protagonist;
}

export function buildTemplateWorldEntrySeeds(template: ProjectTemplate) {
  const platform = getPlatformProfile(template.platformId);
  return template.worldSeeds.map((entry) => ({
    ...entry,
    content: `${entry.content} 平台参考：${platform.reviewFocus.join("、")}。`,
  }));
}
