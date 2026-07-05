import type { GatePlatformGrowthDispatchItem } from "../projects/gateActionReceipts.ts";

export interface FirstThreeAdoptionFollowupInput {
  projectId: string;
  projectTitle: string;
  platformId: string;
  platformName: string;
  chapterId: string;
  chapterOrder: number;
  chapterTitle: string;
  revisionId: string;
  createdAt?: Date | string;
}

function isoTime(value: Date | string | undefined) {
  return value ? new Date(value).toISOString() : new Date().toISOString();
}

export function buildFirstThreeAdoptionFollowupDispatches(
  input: FirstThreeAdoptionFollowupInput,
): GatePlatformGrowthDispatchItem[] {
  const reviewLatestAt = isoTime(input.createdAt);
  const projectHref = `/projects/${input.projectId}`;
  const chapterHref = `${projectHref}/chapters/${input.chapterId}`;
  const evidence = [
    `采纳版本：${input.revisionId}`,
    `章节：第 ${input.chapterOrder} 章 · ${input.chapterTitle}`,
    `项目：${input.projectTitle}`,
  ];

  return [
    {
      id: `first-three-adoption:${input.projectId}:${input.chapterId}:${input.revisionId}:review`,
      platformId: input.platformId,
      platformName: input.platformName,
      stage: "start_first_three_review",
      state: "assigned",
      priorityScore: 94,
      ownerRole: "首轮审稿编辑",
      title: `第 ${input.chapterOrder} 章采纳后重新审稿`,
      detail: "前三章改写候选已经写入正文，旧审稿不能继续当发布通行证。先重新审稿，再决定是否二改。",
      dueLabel: "今天",
      actionLabel: "重新审稿",
      href: `${chapterHref}#chapter-workflow`,
      acceptanceCriteria: [
        "新正文已完成章节审稿",
        "钩子、冲突、章末追读和人物选择有明确判断",
        "低分问题进入二改或前三章重写队列",
      ],
      evidence,
      reviewLatestAt,
    },
    {
      id: `first-three-adoption:${input.projectId}:${input.chapterId}:${input.revisionId}:publish-check`,
      platformId: input.platformId,
      platformName: input.platformName,
      stage: "start_publish_finalize",
      state: "assigned",
      priorityScore: 88,
      ownerRole: "发布质检编辑",
      title: `第 ${input.chapterOrder} 章采纳后发布质检`,
      detail: "采纳后的前三章会改变投稿包判断。重新审稿后回发布质检，确认标题、简介、标签和前三章兑现一致。",
      dueLabel: "审稿后",
      actionLabel: "回发布质检",
      href: `${projectHref}#platform-export`,
      acceptanceCriteria: [
        "采纳后章节已重新审稿",
        "发布包质检已刷新",
        "标题简介标签与前三章新兑现点一致",
      ],
      evidence,
      reviewLatestAt,
    },
  ];
}
