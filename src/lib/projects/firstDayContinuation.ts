import type { FirstDayWorkflow } from "./firstDayWorkflow.ts";
import { buildTaskQueueCenter, type QueueItem, type TaskQueueProject } from "./taskQueueCenter.ts";

export interface FirstDayContinuationAction {
  status: "first_day_active" | "ready" | "blocked" | "complete";
  headline: string;
  detail: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
  queueCategory: QueueItem["category"] | null;
  itemCount: number;
  warnings: string[];
}

function categoryAction(category: QueueItem["category"]) {
  if (category === "draft") return { label: "进入批量初稿", href: "#ai-pipeline" };
  if (category === "review") return { label: "进入批量审稿", href: "#ai-pipeline" };
  if (category === "second_pass") return { label: "进入批量二改", href: "#ai-pipeline" };
  if (category === "export") return { label: "进入平台导出", href: "#platform-export" };
  return { label: "处理阻塞", href: "" };
}

function absoluteProjectHref(projectId: string, href: string) {
  if (href.startsWith("/")) return href;
  if (href.startsWith("#")) return `/projects/${projectId}${href}`;
  return `/projects/${projectId}`;
}

function activeFirstDayAction(projectId: string, workflow: FirstDayWorkflow): FirstDayContinuationAction {
  const execution = workflow.executionPackage;
  const riskCopy = execution.riskLevel === "blocked"
    ? {
      headline: "先做止损恢复验证",
      detail: `当前卡在「${workflow.nextStep.label}」。这是避坑恢复，不是正文完成；先证明入口卖点、前三章兑现或平台匹配度已经改掉。`,
      warning: "止损恢复未完成前，不允许生成正文或扩大批量。",
    }
    : execution.riskLevel === "watch"
      ? {
        headline: execution.riskLabel === "恢复观察" ? "恢复后先跑小样本" : "观察平台先跑小样本",
        detail: `当前卡在「${workflow.nextStep.label}」。${execution.riskLabel === "恢复观察" ? "恢复条件已过线，但" : ""}这里只验证首轮样本、通过线和复查证据，不进入放量。`,
        warning: "观察期只看小样本证据，首轮通过前不要批量生成或多平台加码。",
      }
      : {
        headline: "先把首日链路跑完",
        detail: `当前卡在「${workflow.nextStep.label}」。别急着放大批量，先让首章完成生成、审稿、二改和发布预检。`,
        warning: "首日链路未完成前，不建议扩大批量生产。",
      };

  return {
    status: "first_day_active",
    headline: riskCopy.headline,
    detail: riskCopy.detail,
    primaryLabel: workflow.nextStep.actionLabel,
    primaryHref: workflow.nextStep.href,
    secondaryLabel: "回到首日工作流",
    secondaryHref: `/projects/${projectId}#first-day-workflow`,
    queueCategory: null,
    itemCount: 0,
    warnings: [riskCopy.warning],
  };
}

function blockedAction(projectId: string, item: QueueItem, itemCount: number): FirstDayContinuationAction {
  if (item.blockerType === "first_day_gate") {
    return {
      status: "blocked",
      headline: "先完成首日生产闸门",
      detail: `${item.projectTitle} · ${item.chapterTitle}：${item.evidence}`,
      primaryLabel: item.actionLabel,
      primaryHref: item.href,
      secondaryLabel: "查看任务队列",
      secondaryHref: "/tasks",
      queueCategory: item.category,
      itemCount,
      warnings: ["首日验收没有收口前，不建议进入批量初稿、批量审稿、批量二改或多平台导出。"],
    };
  }

  return {
    status: "blocked",
    headline: item.blockerType === "publish_repair" ? "发布前先修阻塞" : "批量前先补章节卡",
    detail: `${item.projectTitle} · ${item.chapterTitle}：${item.evidence}`,
    primaryLabel: item.actionLabel,
    primaryHref: item.href,
    secondaryLabel: "查看任务队列",
    secondaryHref: "/tasks",
    queueCategory: item.category,
    itemCount,
    warnings: [
      item.blockerType === "publish_repair"
        ? "平台包质检未过，不要把未处理风险直接推到发布。"
        : "章节卡缺口会让批量正文空转，先补目标、钩子、冲突和章末悬念。",
    ],
  };
}

function projectWithCompletedFirstDayGate(project: TaskQueueProject, workflow: FirstDayWorkflow): TaskQueueProject {
  if (workflow.completedCount < workflow.totalSteps) return project;
  const existingTasks = project.gateDispatchTasks ?? [];
  const publishPrecheckKey = `first-day:${project.id}:publish-precheck`;
  if (existingTasks.some((task) => task.dispatchKey === publishPrecheckKey && task.state === "completed")) return project;

  return {
    ...project,
    gateDispatchTasks: [
      ...existingTasks,
      {
        dispatchKey: publishPrecheckKey,
        state: "completed",
        completionEvidence: "首日工作流已完成，平台包预检已收口，可以进入后续小批量生产判断。",
      },
    ],
  };
}

export function buildFirstDayContinuationAction(input: {
  project: TaskQueueProject;
  workflow: FirstDayWorkflow;
}): FirstDayContinuationAction {
  if (input.workflow.completedCount < input.workflow.totalSteps) {
    return activeFirstDayAction(input.project.id, input.workflow);
  }

  const queue = buildTaskQueueCenter([projectWithCompletedFirstDayGate(input.project, input.workflow)]);
  const next = queue.recommendedNext;

  if (!next) {
    return {
      status: "complete",
      headline: "首日链路已收口",
      detail: "当前项目暂无可直接批量执行的章节。下一步可以补更多章节卡、检查平台包，或去任务队列看跨项目机会。",
      primaryLabel: "补章节生产排期",
      primaryHref: `/projects/${input.project.id}#chapter-production`,
      secondaryLabel: "查看任务队列",
      secondaryHref: "/tasks",
      queueCategory: null,
      itemCount: 0,
      warnings: ["没有可执行批次时，先补卡或做平台包复检。"],
    };
  }

  const itemCount = queue.items.filter((item) => item.category === next.category).length;
  if (next.category === "blocked") {
    return blockedAction(input.project.id, next, itemCount);
  }

  const action = categoryAction(next.category);
  return {
    status: "ready",
    headline: "首日已跑通，可以小批量推进",
    detail: `${next.projectTitle} · ${next.label}：${next.chapterTitle}。${next.evidence}`,
    primaryLabel: action.label,
    primaryHref: absoluteProjectHref(input.project.id, action.href),
    secondaryLabel: "查看任务队列",
    secondaryHref: "/tasks",
    queueCategory: next.category,
    itemCount,
    warnings: [
      itemCount > 1 ? `同类可执行任务 ${itemCount} 个，先按安全批量跑，不要一次性放大。` : "先跑小样本，确认质量和成本后再扩大。",
      next.strategyBasis ? `沿用首轮打法：${next.strategyBasis.label}。` : "暂无可复用打法记录，执行后要回填效果。",
    ],
  };
}
