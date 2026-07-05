type FirstDayRouteFocusStatus = "configured" | "needs_route" | "mock_fallback";

export interface FirstDayRouteFocusItem {
  stage: string;
  status: FirstDayRouteFocusStatus;
  canApplyRecommendation: boolean;
}

export interface FirstDayRouteFocusNotice {
  headline: string;
  detail: string;
  badges: string[];
  returnHref: string | null;
}

function statusLabel(status: FirstDayRouteFocusStatus) {
  if (status === "configured") return "已配置";
  if (status === "mock_fallback") return "Mock 兜底";
  return "缺路线";
}

export function buildFirstDayRouteFocusNotice(input: {
  isFocused: boolean;
  projectId?: string | null;
  focusedItem?: FirstDayRouteFocusItem | null;
}): FirstDayRouteFocusNotice | null {
  if (!input.isFocused) return null;

  const returnHref = input.projectId
    ? `/projects/${encodeURIComponent(input.projectId)}?firstDayRoute=repaired#first-day-workflow`
    : null;
  const returnCopy = returnHref ? " 修好后可直接回到原作品继续执行。" : "";

  if (!input.focusedItem) {
    return {
      headline: "首日路线修复入口",
      detail: `从首日工作流跳转而来：先检查四条关键路线。${returnCopy}`,
      badges: ["来自首日执行保护", "检查四条关键路线"],
      returnHref,
    };
  }

  return {
    headline: "首日路线修复入口",
    detail: `从首日工作流跳转而来：优先修复「${input.focusedItem.stage}」路线。${returnCopy}`,
    badges: [
      "来自首日执行保护",
      `优先：${input.focusedItem.stage}`,
      `状态：${statusLabel(input.focusedItem.status)}`,
      input.focusedItem.canApplyRecommendation ? "可一键修复" : "需先补真实模型",
    ],
    returnHref,
  };
}
