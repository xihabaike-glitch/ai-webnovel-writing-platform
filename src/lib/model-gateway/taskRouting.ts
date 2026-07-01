export type RoutedModelTaskType =
  | "chapter_draft"
  | "chapter_review"
  | "chapter_second_pass"
  | "submission_package_optimize"
  | "first_three_rewrite";

export interface ModelTaskRouteOption {
  taskType: RoutedModelTaskType;
  label: string;
  description: string;
}

export const modelTaskRouteOptions: ModelTaskRouteOption[] = [
  {
    taskType: "chapter_draft",
    label: "正文初稿",
    description: "偏创作和长文本输出，优先选择写作能力稳定、成本可控的模型。",
  },
  {
    taskType: "chapter_review",
    label: "章节审稿",
    description: "偏结构化判断和 JSON 输出，优先选择遵循格式稳定的模型。",
  },
  {
    taskType: "chapter_second_pass",
    label: "章节二改",
    description: "偏改写和风格保持，优先选择上下文更长、中文表达更稳的模型。",
  },
  {
    taskType: "submission_package_optimize",
    label: "投稿资料优化",
    description: "偏卖点包装、简介、标签和平台适配，优先选择文案判断强的模型。",
  },
  {
    taskType: "first_three_rewrite",
    label: "前三章改写",
    description: "偏高压钩子和整段改写，优先选择强创作模型，备用模型负责兜底。",
  },
];

export function isRoutedModelTaskType(taskType: string): taskType is RoutedModelTaskType {
  return modelTaskRouteOptions.some((option) => option.taskType === taskType);
}

export function labelForRoutedTask(taskType: string) {
  return modelTaskRouteOptions.find((option) => option.taskType === taskType)?.label ?? taskType;
}
