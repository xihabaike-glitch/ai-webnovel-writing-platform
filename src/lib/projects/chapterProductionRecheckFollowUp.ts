import type {
  GateEvidenceLoopRecheck,
  GatePlatformGrowthDispatchItem,
  GateStoryTreeRecheck,
  GateStructureDiagnosticRecheck,
} from "./gateActionReceipts.ts";

export interface ChapterProductionRecheckFollowUpTaskInput {
  projectTitle: string;
  platformId: string;
  platformName: string;
  sourceDispatchKey: string;
  existingDispatchKeys?: string[];
  storyTreeRecheck?: GateStoryTreeRecheck | null;
  evidenceLoopRecheck?: GateEvidenceLoopRecheck | null;
  structureDiagnosticRecheck?: GateStructureDiagnosticRecheck | null;
  now?: string;
}

function safeKeyPart(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80);
}

function shouldCreateStoryTreeFollowUp(recheck: GateStoryTreeRecheck) {
  return recheck.verdict === "declined" || recheck.verdict === "unchanged" || recheck.currentScore < 80;
}

function shouldCreateEvidenceLoopFollowUp(recheck: GateEvidenceLoopRecheck) {
  return recheck.verdict === "declined" || recheck.verdict === "unchanged" || recheck.status === "pause" || recheck.status === "repair";
}

function shouldCreateStructureDiagnosticFollowUp(recheck: GateStructureDiagnosticRecheck) {
  return recheck.verdict === "declined" || recheck.verdict === "unchanged" || recheck.currentScore < 80;
}

function storyTreePriority(recheck: GateStoryTreeRecheck) {
  const verdictBoost = recheck.verdict === "declined" ? 12 : recheck.verdict === "unchanged" ? 8 : 0;
  return Math.min(99, Math.max(70, 100 - recheck.currentScore + verdictBoost));
}

function evidenceLoopPriority(recheck: GateEvidenceLoopRecheck) {
  const statusBoost = recheck.status === "pause" ? 18 : recheck.status === "repair" ? 12 : 6;
  return Math.min(99, Math.max(72, 100 - recheck.currentScore + statusBoost));
}

function structureDiagnosticPriority(recheck: GateStructureDiagnosticRecheck) {
  const verdictBoost = recheck.verdict === "declined" ? 12 : recheck.verdict === "unchanged" ? 8 : 4;
  return Math.min(99, Math.max(74, 100 - recheck.currentScore + verdictBoost));
}

export function buildChapterProductionRecheckFollowUpTasks(
  input: ChapterProductionRecheckFollowUpTaskInput,
): GatePlatformGrowthDispatchItem[] {
  const now = input.now ?? new Date().toISOString();
  const existingDispatchKeys = new Set(input.existingDispatchKeys ?? []);
  const sourceKey = safeKeyPart(input.sourceDispatchKey);
  const dispatches: GatePlatformGrowthDispatchItem[] = [];

  if (input.storyTreeRecheck && shouldCreateStoryTreeFollowUp(input.storyTreeRecheck)) {
    const recheck = input.storyTreeRecheck;
    const dispatchKey = `story-tree-followup:${recheck.projectId}:${recheck.chapterId}:${sourceKey}:${recheck.currentScore}`;
    if (!existingDispatchKeys.has(dispatchKey)) {
      dispatches.push({
        id: dispatchKey,
        platformId: input.platformId,
        platformName: input.platformName,
        stage: "start_rewrite_opening",
        state: "assigned",
        priorityScore: storyTreePriority(recheck),
        ownerRole: "作者",
        title: `${input.projectTitle} · 大树复查未解除`,
        detail: `大树复查 ${recheck.previousScore ?? "无基准"} -> ${recheck.currentScore} 分，结论「${recheck.label}」。下一轮先处理：${recheck.topAction}`,
        dueLabel: recheck.verdict === "declined" ? "今天返工" : "下次改稿前",
        actionLabel: "进入二改",
        href: `/projects/${recheck.projectId}/chapters/${recheck.chapterId}#chapter-second-pass`,
        acceptanceCriteria: [
          "把本章大树结构复查提升到 80 分以上，或写清无法提升的具体原因。",
          "返工说明必须包含：改了哪一段、服务哪条主线、如何推进人物选择。",
          "完成后从项目页重新执行一键复查，确认卡点是否解除。",
        ],
        evidence: [
          `来源派单：${input.sourceDispatchKey}`,
          `大树复查：${recheck.previousScore ?? "无基准"} -> ${recheck.currentScore} 分，${recheck.verdict}`,
          `返工动作：${recheck.topAction}`,
          ...recheck.axisSummary.slice(0, 3),
        ],
        reviewLatestAt: now,
      });
    }
  }

  if (input.evidenceLoopRecheck && shouldCreateEvidenceLoopFollowUp(input.evidenceLoopRecheck)) {
    const recheck = input.evidenceLoopRecheck;
    const dispatchKey = `submission-recheck-followup:${recheck.projectId}:${recheck.platformId}:${sourceKey}:${recheck.currentScore}`;
    if (!existingDispatchKeys.has(dispatchKey)) {
      dispatches.push({
        id: dispatchKey,
        platformId: recheck.platformId,
        platformName: recheck.platformName,
        stage: recheck.status === "pause" ? "pause_platform" : "start_repair_packaging",
        state: "assigned",
        priorityScore: evidenceLoopPriority(recheck),
        ownerRole: recheck.status === "pause" ? "主编" : "运营",
        title: `${input.projectTitle} · 投稿复查未解除`,
        detail: `平台证据复查 ${recheck.previousScore ?? "无基准"} -> ${recheck.currentScore} 分，状态「${recheck.label}」。下一步：${recheck.nextAction}`,
        dueLabel: recheck.status === "pause" ? "今天止损" : "今天修包",
        actionLabel: recheck.status === "pause" ? "处理平台" : "修投稿包",
        href: `/projects/${recheck.projectId}#submission-precheck`,
        acceptanceCriteria: [
          "让投稿前检查的风险项减少，或补充平台暂缓/暂停的明确证据。",
          "保存投稿包、平台导出资产或发布指标修复结果。",
          "完成后从项目页重新执行一键复查，确认卡点是否解除。",
        ],
        evidence: [
          `来源派单：${input.sourceDispatchKey}`,
          `平台证据复查：${recheck.previousScore ?? "无基准"} -> ${recheck.currentScore} 分，${recheck.verdict}`,
          recheck.headline,
          recheck.nextAction,
          ...recheck.evidence.slice(0, 2),
        ],
        reviewLatestAt: now,
      });
    }
  }

  if (input.structureDiagnosticRecheck && shouldCreateStructureDiagnosticFollowUp(input.structureDiagnosticRecheck)) {
    const recheck = input.structureDiagnosticRecheck;
    const dispatchKey = `structure-recheck-followup:${recheck.projectId}:${sourceKey}:${recheck.currentScore}`;
    if (!existingDispatchKeys.has(dispatchKey)) {
      dispatches.push({
        id: dispatchKey,
        platformId: recheck.platformId,
        platformName: recheck.platformName,
        stage: "start_repair_packaging",
        state: "assigned",
        priorityScore: structureDiagnosticPriority(recheck),
        ownerRole: "结构主编",
        title: `${input.projectTitle} · 整书结构复查未解除`,
        detail: `整书结构复查 ${recheck.previousScore ?? "无基准"} -> ${recheck.currentScore} 分，结论「${recheck.label}」。下一轮先处理：${recheck.topAction}`,
        dueLabel: recheck.verdict === "declined" ? "今天返工" : "投稿前",
        actionLabel: "继续补结构",
        href: `/projects/${recheck.projectId}#story-structure`,
        acceptanceCriteria: [
          "把整书结构诊断提升到 80 分以上，或写清暂时不能提升的具体原因。",
          "优先修复人物弧光、主干压力、支线覆盖、伏笔回收中仍未通过的项目。",
          "完成后从项目页重新执行结构复查，确认投稿篇幅结构卡点是否解除。",
        ],
        evidence: [
          `来源派单：${input.sourceDispatchKey}`,
          `整书结构复查：${recheck.previousScore ?? "无基准"} -> ${recheck.currentScore} 分，${recheck.verdict}`,
          `返工动作：${recheck.topAction}`,
          ...recheck.weakItems.slice(0, 4).map((item) => `${item.label}：${item.status}，${item.evidence}`),
        ],
        reviewLatestAt: now,
      });
    }
  }

  return dispatches.sort((left, right) => right.priorityScore - left.priorityScore);
}
