import assert from "node:assert/strict";
import test from "node:test";
import { saveModelProviderSchema } from "./modelProvider.ts";

test("OpenAI-compatible provider save requires an explicit Base URL", () => {
  const result = saveModelProviderSchema.safeParse({
    providerId: "openai_compatible",
    displayName: "Gateway",
    defaultModel: "model",
  });

  assert.equal(result.success, false);
  if (!result.success) {
    assert.deepEqual(result.error.issues.map((issue) => issue.path), [["baseUrl"]]);
  }
});

test("named OpenAI-compatible providers may use their documented Base URL", () => {
  const result = saveModelProviderSchema.safeParse({
    providerId: "deepseek",
    displayName: "DeepSeek",
    defaultModel: "deepseek-chat",
  });

  assert.equal(result.success, true);
});
