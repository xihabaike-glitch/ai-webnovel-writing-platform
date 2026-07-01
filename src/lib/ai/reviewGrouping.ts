export interface ReviewIssue {
  severity: string;
  type: string;
  message: string;
  suggestion: string;
}

export interface ReviewIssueGroup {
  label: string;
  issues: ReviewIssue[];
}

export interface GroupedReviewIssues {
  hook: ReviewIssueGroup;
  conflict: ReviewIssueGroup;
  pacing: ReviewIssueGroup;
  character: ReviewIssueGroup;
  platform: ReviewIssueGroup;
  foreshadow: ReviewIssueGroup;
  other: ReviewIssueGroup;
}

const groupByType: Record<string, keyof GroupedReviewIssues> = {
  hook: "hook",
  conflict: "conflict",
  pacing: "pacing",
  arc: "character",
  character: "character",
  platform_fit: "platform",
  platform: "platform",
  foreshadow: "foreshadow",
};

export function groupReviewIssues(issues: ReviewIssue[]): GroupedReviewIssues {
  const grouped: GroupedReviewIssues = {
    hook: { label: "钩子", issues: [] },
    conflict: { label: "冲突", issues: [] },
    pacing: { label: "节奏", issues: [] },
    character: { label: "人物弧光", issues: [] },
    platform: { label: "平台适配", issues: [] },
    foreshadow: { label: "伏笔", issues: [] },
    other: { label: "其他", issues: [] },
  };

  for (const issue of issues) {
    const key = groupByType[issue.type] ?? "other";
    grouped[key].issues.push(issue);
  }

  return grouped;
}

export function nonEmptyReviewGroups(grouped: GroupedReviewIssues): ReviewIssueGroup[] {
  return Object.values(grouped).filter((group) => group.issues.length > 0);
}

