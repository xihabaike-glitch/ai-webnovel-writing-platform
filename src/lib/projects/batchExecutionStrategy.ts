export type BatchExecutionStrategyId = "conservative" | "standard" | "aggressive";

export interface BatchExecutionStrategy {
  id: BatchExecutionStrategyId;
  label: string;
  description: string;
  maxBatchSize: number;
  maxEstimatedTokens: number;
  runningWarnThreshold: number;
  runningBlockThreshold: number;
  failureWarnPercent: number;
  failureBlockPercent: number;
  allowCrossProject: boolean;
}

export const batchExecutionStrategies: BatchExecutionStrategy[] = [
  {
    id: "conservative",
    label: "保守",
    description: "适合刚接入模型或近期失败较多，只跑最小同项目小批次。",
    maxBatchSize: 3,
    maxEstimatedTokens: 10000,
    runningWarnThreshold: 1,
    runningBlockThreshold: 2,
    failureWarnPercent: 10,
    failureBlockPercent: 20,
    allowCrossProject: false,
  },
  {
    id: "standard",
    label: "标准",
    description: "适合日常生产，保持同项目上下文，按安全阀推进。",
    maxBatchSize: 5,
    maxEstimatedTokens: 20000,
    runningWarnThreshold: 3,
    runningBlockThreshold: 4,
    failureWarnPercent: 20,
    failureBlockPercent: 40,
    allowCrossProject: false,
  },
  {
    id: "aggressive",
    label: "激进",
    description: "适合模型路线稳定后放量，同类任务可跨项目补齐批次。",
    maxBatchSize: 8,
    maxEstimatedTokens: 32000,
    runningWarnThreshold: 5,
    runningBlockThreshold: 7,
    failureWarnPercent: 25,
    failureBlockPercent: 45,
    allowCrossProject: true,
  },
];

export const defaultBatchExecutionStrategy = batchExecutionStrategies[1];

export function getBatchExecutionStrategy(value: string | null | undefined): BatchExecutionStrategy {
  return batchExecutionStrategies.find((strategy) => strategy.id === value) ?? defaultBatchExecutionStrategy;
}
