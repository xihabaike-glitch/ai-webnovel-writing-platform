import type { PlatformProfile } from "../platforms/platformProfiles.ts";
import { buildOpeningDiagnostic, type OpeningDiagnostic, type OpeningDiagnosticInput } from "./openingDiagnostic.ts";

export interface OpeningRewriteInput extends OpeningDiagnosticInput {}

export interface OpeningRewriteVariant {
  id: string;
  name: string;
  strategy: string;
  targetReader: string;
  estimatedScore: number;
  openingText: string;
  fixes: string[];
  platformNote: string;
}

export interface OpeningRewritePackage {
  diagnostic: OpeningDiagnostic;
  variants: OpeningRewriteVariant[];
  recommendedVariantId: string;
  markdown: string;
}

function compact(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function trimEndingPunctuation(text: string) {
  return text.replace(/[。！？!?.,，、；;：:]+$/u, "");
}

function inferProtagonist(content: string) {
  const match = content.match(/([\u4e00-\u9fa5]{2,3})(?=推|站|看|听|握|抬|转|跑|醒|拿|深吸|意识)/u);
  return match?.[1] ?? "林晚";
}

function firstProblem(diagnostic: OpeningDiagnostic) {
  return diagnostic.items.find((item) => item.status !== "pass")?.suggestion ?? "把选择、代价和章末新问题写得更具体。";
}

function startTacticStrategy(input: OpeningRewriteInput) {
  return input.startTactic ? `首轮平台打法要求：${input.startTactic.openingMove}` : null;
}

function platformPrimaryName(platform: PlatformProfile) {
  if (platform.id === "qidian") return "起点长期期待版";
  if (platform.id === "zhihu_yanxuan") return "知乎反转付费版";
  if (platform.category === "overseas") return "海外直白版";
  if (platform.category === "female") return "情绪张力版";
  return "番茄强钩子版";
}

function platformPrimaryStrategy(platform: PlatformProfile) {
  if (platform.id === "qidian") return "第一屏给出长期升级方向和世界规则，不急着解释，但必须让读者看到大目标。";
  if (platform.id === "zhihu_yanxuan") return "第一段直接抛矛盾，结尾留一个付费反转问题。";
  if (platform.category === "overseas") return "直白说明系统规则、风险和 progression promise，减少文化语境负担。";
  if (platform.category === "female") return "把人物关系和情绪代价放到事件前面，让读者先站队。";
  return "第一句出异常，前三百字内给倒计时、选择、惩罚和章末新问题。";
}

function buildChineseOpening(input: OpeningRewriteInput, diagnostic: OpeningDiagnostic, mode: "hook" | "long" | "twist") {
  const protagonist = inferProtagonist(input.chapter.content);
  const hook = trimEndingPunctuation(input.chapter.hook || input.platform.openingRules[0] || "系统倒计时只剩十秒");
  const conflict = trimEndingPunctuation(input.chapter.conflict || "她必须在逃跑和救人之间选择");
  const cliffhanger = trimEndingPunctuation(input.chapter.cliffhanger || "系统给出第二个选择");
  const goal = trimEndingPunctuation(input.chapter.goal || "活过这一夜，并弄清系统从何而来");

  if (mode === "long") {
    return [
      `${protagonist}第一次听见系统音时，窗外的雨正把整座城洗成黑色。`,
      `屏幕上只有一行字：完成第一次选择，开启完整权限；失败，永久失去进入真相的资格。`,
      `她原本只想从门后那阵急促的敲击声里脱身，可${conflict}。这不是一场临时意外，而像某个庞大规则终于把她从普通生活里拽了出来。`,
      `如果${goal}，她就必须顺着这条线查下去，直到知道是谁把系统塞进她的人生。`,
      `就在她伸手碰到门锁的瞬间，任务面板忽然刷新：${cliffhanger}。`,
    ].join("\n\n");
  }

  if (mode === "twist") {
    return [
      `${protagonist}后来才知道，系统第一次响起时，就已经在撒谎。`,
      `那天雨夜，门后的人明明在求救，屏幕却冷冰冰地跳出倒计时：十、九、八。`,
      `${hook}。她盯着奖励栏里的“新手保护”，又看见惩罚栏里那句“记忆抹除”，终于明白自己不是被选中，而是被逼进局里。`,
      `${conflict}。可当她咬牙做出选择，门缝里伸出来的那只手，竟然戴着她明天才会买到的戒指。`,
      `下一秒，系统给出新的提示：${cliffhanger}。`,
    ].join("\n\n");
  }

  return [
    `${hook}，${protagonist}的手机屏幕在雨夜里亮得刺眼。`,
    `门后传来压低的求救声，门外的脚步声却越来越近。她只要转身下楼，就能假装今晚什么都没有发生。`,
    `可系统面板没有给她退路：救人，获得新手技能；逃跑，永久抹除关键记忆。`,
    `${conflict}。她的手指悬在门锁上，雨水顺着袖口往下滴，每一秒都像有人在替她倒数。`,
    `当倒计时归零前一刻，她终于按下门把。门开了，里面的人抬起头，说出的第一句话却是：${cliffhanger}。`,
  ].join("\n\n");
}

function buildOverseasOpening(input: OpeningRewriteInput) {
  const protagonist = inferProtagonist(input.chapter.content);
  const hook = trimEndingPunctuation(input.chapter.hook || "the system countdown hit ten seconds");
  const conflict = trimEndingPunctuation(input.chapter.conflict || "she had to choose between running away and saving someone");
  const cliffhanger = trimEndingPunctuation(input.chapter.cliffhanger || "the system offered a second choice");

  return [
    `The countdown appeared the moment ${protagonist} touched the door.`,
    `Ten seconds. One system mission. Two outcomes.`,
    `If she opened the door, she would gain her first skill and step into a rule set she did not understand. If she ran, the system would erase the memory that could save her life tomorrow.`,
    `${conflict}. The rain drowned the footsteps behind her, but not the voice begging from the other side.`,
    `At one second, she turned the handle. The door opened, and the system changed the mission: ${cliffhanger}.`,
  ].join("\n\n");
}

function variantScore(diagnostic: OpeningDiagnostic, bonus: number) {
  return Math.min(100, Math.max(0, diagnostic.score + bonus));
}

function fixesFor(diagnostic: OpeningDiagnostic, fallback: string) {
  const fixes = diagnostic.items
    .filter((item) => item.status !== "pass")
    .map((item) => item.suggestion);
  return fixes.length > 0 ? fixes.slice(0, 3) : [fallback];
}

function buildVariants(input: OpeningRewriteInput, diagnostic: OpeningDiagnostic): OpeningRewriteVariant[] {
  const primaryName = platformPrimaryName(input.platform);
  const primaryIsOverseas = input.platform.category === "overseas";
  const tacticStrategy = startTacticStrategy(input);
  const primaryOpening = primaryIsOverseas
    ? buildOverseasOpening(input)
    : buildChineseOpening(input, diagnostic, input.platform.id === "qidian" ? "long" : input.platform.id === "zhihu_yanxuan" ? "twist" : "hook");

  const variants: OpeningRewriteVariant[] = [
    {
      id: "platform-primary",
      name: primaryName,
      strategy: [tacticStrategy, platformPrimaryStrategy(input.platform)].filter(Boolean).join(" "),
      targetReader: `${input.platform.name} 的首章读者，优先满足 ${input.platform.reviewFocus.slice(0, 3).join("、")}。`,
      estimatedScore: variantScore(diagnostic, 16),
      openingText: primaryOpening,
      fixes: [
        ...(input.startTactic ? [`执行首轮打法：${input.startTactic.openingMove}`] : []),
        ...fixesFor(diagnostic, firstProblem(diagnostic)),
      ].slice(0, 4),
      platformNote: [
        input.platform.openingRules.join("；"),
        input.startTactic ? `首轮打法：${input.startTactic.label}｜${input.startTactic.openingMove}` : "",
      ].filter(Boolean).join("；"),
    },
    {
      id: "long-promise",
      name: "长期期待版",
      strategy: "不只解决眼前危机，还在第一屏埋下系统来源、长期敌人和升级方向。",
      targetReader: "喜欢长篇主线、升级体系、世界观谜团和阶段目标的读者。",
      estimatedScore: variantScore(diagnostic, input.platform.id === "qidian" ? 18 : 10),
      openingText: buildChineseOpening(input, diagnostic, "long"),
      fixes: fixesFor(diagnostic, "补出长期目标和系统规则，让读者知道后面为什么值得追。"),
      platformNote: "适合起点、七猫长篇、Royal Road 等更吃长期结构的平台。",
    },
    {
      id: primaryIsOverseas ? "twist-short" : "twist-or-overseas",
      name: primaryIsOverseas ? "反转短篇版" : "反转/海外直白版",
      strategy: primaryIsOverseas
        ? "在英文直白规则之外，加入一个第一屏反转，制造评论区讨论点。"
        : "如果要投知乎盐选或海外平台，把秘密、规则和选择写得更直白。",
      targetReader: primaryIsOverseas ? "喜欢规则清楚但第一章有反转的海外读者。" : "喜欢反转、系统秘密和高风险选择的读者。",
      estimatedScore: variantScore(diagnostic, input.platform.category === "short" || input.platform.category === "overseas" ? 14 : 9),
      openingText: primaryIsOverseas ? buildChineseOpening(input, diagnostic, "twist") : buildOverseasOpening(input),
      fixes: fixesFor(diagnostic, "把第一屏结尾改成一个和系统真相有关的新问题。"),
      platformNote: primaryIsOverseas ? "适合保留反转脑洞，再回译成英文简介。" : "适合知乎盐选、WebNovel、Royal Road 的直白卖点包装。",
    },
  ];

  return variants.sort((left, right) => right.estimatedScore - left.estimatedScore);
}

function buildMarkdown(input: OpeningRewriteInput, diagnostic: OpeningDiagnostic, variants: OpeningRewriteVariant[]) {
  return [
    `# ${input.projectTitle} / ${input.chapter.title} 首章开头重写`,
    "",
    `诊断原分：${diagnostic.score}`,
    `平台：${input.platform.name}`,
    input.startTactic ? `首轮打法：${input.startTactic.label}｜${input.startTactic.openingMove}` : null,
    "",
    "## 推荐排序",
    ...variants.map((variant, index) => `${index + 1}. ${variant.name}｜预估 ${variant.estimatedScore}｜${variant.strategy}`),
    "",
    ...variants.flatMap((variant) => [
      `## ${variant.name}`,
      `预估分：${variant.estimatedScore}`,
      `策略：${variant.strategy}`,
      `读者：${variant.targetReader}`,
      `平台提醒：${variant.platformNote}`,
      "",
      "### 改写正文",
      variant.openingText,
      "",
      "### 修复点",
      ...variant.fixes.map((fix) => `- ${fix}`),
      "",
    ]),
  ].filter((line): line is string => line !== null).join("\n");
}

export function buildOpeningRewritePackage(input: OpeningRewriteInput): OpeningRewritePackage {
  const diagnostic = buildOpeningDiagnostic(input);
  const variants = buildVariants(input, diagnostic);

  return {
    diagnostic,
    variants,
    recommendedVariantId: variants[0]?.id ?? "platform-primary",
    markdown: buildMarkdown(input, diagnostic, variants),
  };
}
