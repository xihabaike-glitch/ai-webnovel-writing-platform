import type { GenerateRequest, GenerateResult, ModelAdapter } from "./types.ts";

export class MockAdapter implements ModelAdapter {
  async generate(request: GenerateRequest): Promise<GenerateResult> {
    const text = JSON.stringify(
      {
        score: 72,
        issues: [
          {
            severity: "medium",
            type: "hook",
            message: "开头有事件，但主角处境压力还不够具体。",
            suggestion: "在前三百字内加入一个不可回避的损失或倒计时。",
          },
          {
            severity: "medium",
            type: "platform_fit",
            message: "章节信息量可读，但平台爽点不够集中。",
            suggestion: "把本章目标、冲突和章末悬念收束到同一个强期待上。",
          },
        ],
        summary: `Mock review for ${request.model}: chapter needs a sharper hook and clearer platform fit.`,
      },
      null,
      2,
    );

    return {
      text,
      usage: {
        inputTokens: request.systemPrompt.length + request.userPrompt.length,
        outputTokens: text.length,
        costUsd: 0,
      },
    };
  }
}

