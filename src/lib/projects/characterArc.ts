export interface CharacterArcInput {
  id: string;
  name: string;
  role: string;
  desire: string;
  need: string;
  flaw: string;
  arcStart: string;
  arcEnd: string;
  voice: string;
  relationshipNotes: string;
}

export interface CharacterArcSummary {
  id: string;
  name: string;
  role: string;
  completeness: number;
  status: "complete" | "partial" | "empty";
  missingFields: string[];
  pressureNote: string;
}

export interface CharacterArcDashboard {
  totalCharacters: number;
  completeCharacters: number;
  averageCompleteness: number;
  summaries: CharacterArcSummary[];
  relationshipWarnings: string[];
  nextActions: string[];
}

const fieldLabels: Array<[keyof CharacterArcInput, string]> = [
  ["name", "姓名"],
  ["role", "定位"],
  ["desire", "欲望"],
  ["need", "真正需求"],
  ["flaw", "缺陷"],
  ["arcStart", "弧光起点"],
  ["arcEnd", "弧光终点"],
  ["voice", "人物声音"],
  ["relationshipNotes", "关系压力"],
];

function hasText(value: string) {
  return value.trim().length > 0;
}

function summarizeCharacter(character: CharacterArcInput): CharacterArcSummary {
  const missingFields = fieldLabels
    .filter(([field]) => !hasText(character[field]))
    .map(([, label]) => label);
  const completed = fieldLabels.length - missingFields.length;
  const completeness = Math.round((completed / fieldLabels.length) * 100);
  const hasCoreArc = ["desire", "need", "flaw", "arcStart", "arcEnd"].every((field) => (
    hasText(character[field as keyof CharacterArcInput])
  ));

  return {
    id: character.id,
    name: character.name || "未命名人物",
    role: character.role || "未定定位",
    completeness,
    status: hasCoreArc && completeness >= 80 ? "complete" : completeness > 0 ? "partial" : "empty",
    missingFields,
    pressureNote: hasText(character.relationshipNotes)
      ? character.relationshipNotes
      : "缺少关系压力，人物容易只在主线里当工具人。",
  };
}

function buildWarnings(characters: CharacterArcInput[], summaries: CharacterArcSummary[]) {
  const warnings: string[] = [];
  if (characters.length === 0) {
    warnings.push("还没有人物卡，整书结构诊断会持续判定人物弧光不足。");
  }
  if (!summaries.some((summary) => summary.status === "complete")) {
    warnings.push("至少需要一个完整主角弧光：欲望、真正需求、缺陷、起点、终点。");
  }
  if (!characters.some((character) => hasText(character.relationshipNotes))) {
    warnings.push("关系网没有压力点，情绪线和反转会缺少抓手。");
  }
  if (characters.length === 1) {
    warnings.push("只有一个人物，适合短篇雏形；中长篇建议补反派、盟友或关系镜像。");
  }
  return warnings;
}

function buildNextActions(summaries: CharacterArcSummary[], warnings: string[]) {
  const weakest = [...summaries].sort((left, right) => left.completeness - right.completeness)[0];
  return [
    weakest
      ? `先补「${weakest.name}」缺失字段：${weakest.missingFields.slice(0, 3).join("、") || "关系压力和人物声音"}。`
      : "先创建主角人物卡，写清欲望、缺陷和终局转变。",
    warnings[0] ?? "把人物关系压力绑定到下一轮章节冲突里。",
    "每个关键人物都要回答：他想要什么、真正缺什么、会因什么做错选择。",
  ];
}

export function buildCharacterArcDashboard(characters: CharacterArcInput[]): CharacterArcDashboard {
  const summaries = characters.map(summarizeCharacter);
  const completeCharacters = summaries.filter((summary) => summary.status === "complete").length;
  const averageCompleteness = summaries.length
    ? Math.round(summaries.reduce((sum, summary) => sum + summary.completeness, 0) / summaries.length)
    : 0;
  const relationshipWarnings = buildWarnings(characters, summaries);

  return {
    totalCharacters: characters.length,
    completeCharacters,
    averageCompleteness,
    summaries,
    relationshipWarnings,
    nextActions: buildNextActions(summaries, relationshipWarnings),
  };
}
