import type { PublishRepairAction, PublishRepairActionKind } from "./platformPublishExport";

export interface PublishRepairRunResult {
  id: string;
  action: PublishRepairActionKind;
  chapterId: string | null;
  chapterTitle: string;
  status: "pending" | "succeeded" | "failed";
  message?: string;
  error?: string;
  taskId?: string;
  score?: number | null;
  issueCount?: number;
  wordCount?: number;
  shouldSecondPass?: boolean;
  candidateRevisionId?: string;
}

export type RawPublishRepairRunResult = Omit<PublishRepairRunResult, "id"> & { id?: string };

export interface PublishRepairNextAction {
  kind: "retry_failed" | "run_chapter_review" | "run_second_pass" | "adopt_candidate" | "recheck_publish";
  label: string;
  detail: string;
  href?: string;
  action?: PublishRepairAction;
}

export function labelForAction(kind: PublishRepairActionKind) {
  if (kind === "run_second_pass") return "执行二改";
  if (kind === "run_chapter_review") return "补章节审稿";
  if (kind === "adopt_candidate") return "采纳候选稿";
  if (kind === "edit_chapter") return "人工改章";
  if (kind === "add_publish_chapters") return "补发布章节";
  return "打开发布包";
}

function resultId(result: Omit<PublishRepairRunResult, "id">) {
  return `${result.chapterId ?? "project"}-${result.action}`;
}

export function pendingResultFromAction(action: PublishRepairAction): PublishRepairRunResult {
  const result = {
    action: action.kind,
    chapterId: action.chapterId ?? null,
    chapterTitle: action.chapterTitle ?? "项目资料",
    status: "pending" as const,
    message: "等待处理",
    candidateRevisionId: action.candidateRevisionId,
  };
  return { ...result, id: resultId(result) };
}

export function normalizeRunResult(result: RawPublishRepairRunResult): PublishRepairRunResult {
  return {
    ...result,
    id: result.id ?? resultId(result),
    status: result.status === "succeeded" ? "succeeded" : result.status === "pending" ? "pending" : "failed",
    chapterTitle: result.chapterTitle || "项目资料",
    chapterId: result.chapterId ?? null,
  };
}

export function actionFromRunResult(result: PublishRepairRunResult): PublishRepairAction {
  return {
    id: result.id,
    kind: result.action,
    priority: "high",
    label: labelForAction(result.action),
    detail: result.error ?? result.message ?? "根据发布前质检结果重试。",
    chapterId: result.chapterId ?? undefined,
    chapterTitle: result.chapterTitle,
    candidateRevisionId: result.candidateRevisionId,
  };
}

function chapterHref(projectId: string | undefined, chapterId: string | null, hash: string) {
  if (!projectId || !chapterId) return undefined;
  return `/projects/${projectId}/chapters/${chapterId}${hash}`;
}

function publishHref(projectId: string | undefined) {
  return projectId ? `/projects/${projectId}#platform-export` : "#platform-export";
}

export function buildPublishRepairNextAction(
  results: PublishRepairRunResult[],
  projectId?: string,
): PublishRepairNextAction | null {
  const failed = results.find((result) => result.status === "failed");
  if (failed) {
    const action = actionFromRunResult(failed);
    return {
      kind: "retry_failed",
      label: "重试失败项",
      detail: `${failed.chapterTitle} 的${labelForAction(failed.action)}失败，先重试或切换模型后再回发布质检。`,
      href: chapterHref(projectId, failed.chapterId, failed.action === "run_second_pass" ? "#chapter-second-pass" : "#chapter-workflow"),
      action,
    };
  }

  const secondPass = results.find((result) => result.status === "succeeded" && result.action === "run_second_pass");
  if (secondPass) {
    if (secondPass.shouldSecondPass) {
      return {
        kind: "run_second_pass",
        label: "继续二改",
        detail: `${secondPass.chapterTitle} 复检仍未过线${typeof secondPass.score === "number" ? `，当前 ${secondPass.score} 分` : ""}，继续按发布质检问题二改。`,
        href: chapterHref(projectId, secondPass.chapterId, "#chapter-second-pass"),
        action: actionFromRunResult(secondPass),
      };
    }
    if (secondPass.candidateRevisionId) {
      const action = actionFromRunResult({
        ...secondPass,
        action: "adopt_candidate",
        message: "采纳二改候选稿。",
      });
      return {
        kind: "adopt_candidate",
        label: "采纳二改候选稿",
        detail: `${secondPass.chapterTitle} 已生成二改候选稿，先采纳进正文，再重新跑发布质检。`,
        href: chapterHref(projectId, secondPass.chapterId, "#chapter-revisions"),
        action,
      };
    }
  }

  const adoptedCandidate = results.find((result) => result.status === "succeeded" && result.action === "adopt_candidate");
  if (adoptedCandidate) {
    const action = {
      ...actionFromRunResult(adoptedCandidate),
      kind: "run_chapter_review" as const,
      label: "重新审稿",
      detail: "候选稿已进入正文，旧审稿不能继续当发布通行证；先补一次章节审稿。",
      candidateRevisionId: undefined,
    };
    return {
      kind: "run_chapter_review",
      label: "重新审稿",
      detail: `${adoptedCandidate.chapterTitle} 已采纳候选稿，先重新审稿，再决定是否还要二改。`,
      href: chapterHref(projectId, adoptedCandidate.chapterId, "#chapter-workflow"),
      action,
    };
  }

  const weakReview = results.find((result) => (
    result.status === "succeeded"
    && result.action === "run_chapter_review"
    && typeof result.score === "number"
    && result.score < 85
  ));
  if (weakReview) {
    return {
      kind: "run_second_pass",
      label: "执行二改",
      detail: `${weakReview.chapterTitle} 审稿 ${weakReview.score} 分，先按问题清单二改，再回发布质检。`,
      href: chapterHref(projectId, weakReview.chapterId, "#chapter-second-pass"),
      action: {
        ...actionFromRunResult(weakReview),
        kind: "run_second_pass",
        label: "执行二改",
      },
    };
  }

  if (results.some((result) => result.status === "succeeded")) {
    return {
      kind: "recheck_publish",
      label: "回发布质检",
      detail: "自动修复动作已完成，刷新发布包质检；如果无阻塞，就保存发布基准并下载。",
      href: publishHref(projectId),
    };
  }

  return null;
}
