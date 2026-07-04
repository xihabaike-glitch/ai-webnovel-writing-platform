export interface ModelSetupProviderSummary {
  ready: number;
  needsKey: number;
  needsTest: number;
}

export interface ModelSetupFirstDayRouteSummary {
  configured: number;
  needsRoute: number;
  mockFallback: number;
  applicableRecommendations: number;
}

export interface ModelSetupOnboardingStep {
  id: "providers" | "connection" | "routes" | "first_day";
  title: string;
  detail: string;
  status: "done" | "actionable" | "blocked";
  actionLabel: string;
  action: "select_provider" | "test_provider" | "apply_routes" | "open_projects";
}

export interface ModelSetupOnboarding {
  summary: {
    total: number;
    done: number;
    actionable: number;
    blocked: number;
  };
  currentStep: ModelSetupOnboardingStep;
  steps: ModelSetupOnboardingStep[];
}

function step(input: ModelSetupOnboardingStep): ModelSetupOnboardingStep {
  return input;
}

export function buildModelSetupOnboarding(input: {
  providerSummary: ModelSetupProviderSummary;
  firstDayRouteSummary: ModelSetupFirstDayRouteSummary;
}): ModelSetupOnboarding {
  const providersReady = input.providerSummary.ready >= 2;
  const connectionReady = providersReady && input.providerSummary.needsTest === 0;
  const routesReady = input.firstDayRouteSummary.needsRoute === 0
    && input.firstDayRouteSummary.mockFallback === 0
    && input.firstDayRouteSummary.applicableRecommendations === 0;
  const routeActionable = input.firstDayRouteSummary.applicableRecommendations > 0;
  const steps = [
    step({
      id: "providers",
      title: "准备真实模型",
      detail: providersReady
        ? `已有 ${input.providerSummary.ready} 个可用模型，能承接首日路线。`
        : `还需要至少 2 个真实模型；当前可用 ${input.providerSummary.ready} 个，缺 Key ${input.providerSummary.needsKey} 个。`,
      status: providersReady ? "done" : "actionable",
      actionLabel: providersReady ? "已准备" : "打开模型配置",
      action: "select_provider",
    }),
    step({
      id: "connection",
      title: "保存并测试连接",
      detail: connectionReady
        ? "已通过基础配置门槛，可以进入路线应用。"
        : input.providerSummary.needsTest > 0
          ? `${input.providerSummary.needsTest} 个模型还需要保存上下文上限并测试连接。`
          : "先准备至少 2 个真实模型，再测试连接。",
      status: connectionReady ? "done" : providersReady ? "actionable" : "blocked",
      actionLabel: connectionReady ? "已测试" : "打开连接测试",
      action: "test_provider",
    }),
    step({
      id: "routes",
      title: "应用首日推荐路线",
      detail: routesReady
        ? "首日四条模型路线已就绪。"
        : routeActionable
          ? `有 ${input.firstDayRouteSummary.applicableRecommendations} 条首日推荐路线可一键应用。`
          : "模型还没达到冷启动蓝图条件，暂时不能应用首日路线。",
      status: routesReady ? "done" : routeActionable ? "actionable" : "blocked",
      actionLabel: routesReady ? "路线就绪" : "应用推荐",
      action: "apply_routes",
    }),
    step({
      id: "first_day",
      title: "进入作品首日工作流",
      detail: routesReady ? "去作品页执行首日骨架、初稿、审稿和二改链路。" : "先把模型路线跑通，再进入作品首日执行。",
      status: routesReady ? "actionable" : "blocked",
      actionLabel: "去作品",
      action: "open_projects",
    }),
  ];
  const done = steps.filter((item) => item.status === "done").length;
  const actionable = steps.filter((item) => item.status === "actionable").length;
  const blocked = steps.filter((item) => item.status === "blocked").length;
  const currentStep = steps.find((item) => item.status === "actionable") ?? steps[steps.length - 1];

  return {
    summary: {
      total: steps.length,
      done,
      actionable,
      blocked,
    },
    currentStep,
    steps,
  };
}
