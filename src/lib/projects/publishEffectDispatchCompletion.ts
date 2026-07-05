export interface PublishEffectDispatchCompletionMetric {
  id?: string | null;
  platformName: string;
  views: number;
  clicks: number;
  favorites: number;
  follows: number;
  comments: number;
  paidReads: number;
  editorFeedback?: string | null;
  publishUrl?: string | null;
  snapshotDate: Date | string;
}

export interface PublishEffectDispatchCompletionReview {
  headline: string;
  nextAction: string;
}

function compact(value?: string | null) {
  return value?.trim() ?? "";
}

function dateLabel(value: Date | string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

export function buildPublishEffectDispatchCompletionEvidence(input: {
  metric: PublishEffectDispatchCompletionMetric;
  review?: PublishEffectDispatchCompletionReview | null;
}) {
  const { metric, review } = input;
  const snapshot = dateLabel(metric.snapshotDate);
  const feedback = compact(metric.editorFeedback);
  const publishUrl = compact(metric.publishUrl);
  return [
    `真实数据：曝光 ${metric.views}，点击 ${metric.clicks}，收藏 ${metric.favorites}，追读 ${metric.follows}，评论 ${metric.comments}，付费阅读 ${metric.paidReads}。`,
    snapshot ? `记录日期：${snapshot}。` : null,
    `结论：${review?.headline ?? `${metric.platformName} 首轮数据已回收`}；${review?.nextAction ?? "刷新总闸门进入首轮数据决策。"}`,
    feedback ? `平台反馈：${feedback}` : null,
    publishUrl ? `发布链接：${publishUrl}` : null,
    metric.id ? `指标记录：${metric.id}` : null,
  ].filter((line): line is string => Boolean(line)).join("\n");
}
