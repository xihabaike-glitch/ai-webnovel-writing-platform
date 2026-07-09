export type ModelProviderId =
  | "claude"
  | "deepseek"
  | "gemini"
  | "gpt"
  | "openai_compatible"
  | "ollama"
  | "mock";

export interface GenerateRequest {
  providerId: ModelProviderId;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
}

export interface GenerateResult {
  text: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    costUsd?: number;
  };
}

export interface ModelAdapter {
  generate(request: GenerateRequest): Promise<GenerateResult>;
}

